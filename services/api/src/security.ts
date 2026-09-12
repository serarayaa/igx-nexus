import type { FastifyInstance, FastifyRequest } from "fastify";
import { ApiHttpError } from "./http-error.js";

export const nexusPermissions = [
  "technology:read",
  "technology:operate",
  "audit:read",
  "security:admin",
] as const;

export type NexusPermission = (typeof nexusPermissions)[number];
export type SecurityPrincipalKind = "user" | "service";

export interface SecurityPrincipal {
  readonly subject: string;
  readonly kind: SecurityPrincipalKind;
  readonly authSource: string;
  readonly roles: readonly string[];
  readonly permissions: ReadonlySet<NexusPermission>;
}

export interface AuthenticationProvider {
  authenticate(request: FastifyRequest): Promise<SecurityPrincipal | null>;
}

export type RouteSecurityPolicy =
  | { readonly access: "public" }
  | { readonly access: "authenticated" }
  | { readonly access: "permission"; readonly permission: NexusPermission };

export const publicRouteSecurity = Object.freeze({ access: "public" } as const);
export const authenticatedRouteSecurity = Object.freeze({ access: "authenticated" } as const);

export function permissionRouteSecurity(permission: NexusPermission): RouteSecurityPolicy {
  return Object.freeze({ access: "permission", permission });
}

export const denyAllAuthenticationProvider: AuthenticationProvider = Object.freeze({
  async authenticate(): Promise<null> {
    return null;
  },
});

const principals = new WeakMap<FastifyRequest, SecurityPrincipal>();

export function getSecurityPrincipal(request: FastifyRequest): SecurityPrincipal | undefined {
  return principals.get(request);
}

function isNexusPermission(value: unknown): value is NexusPermission {
  return typeof value === "string" && nexusPermissions.includes(value as NexusPermission);
}

function readRouteSecurityPolicy(config: unknown): RouteSecurityPolicy | undefined {
  if (typeof config !== "object" || config === null || !("security" in config)) return undefined;
  const security = (config as { readonly security?: unknown }).security;
  if (typeof security !== "object" || security === null || !("access" in security)) return undefined;

  const access = (security as { readonly access?: unknown }).access;
  if (access === "public") return publicRouteSecurity;
  if (access === "authenticated") return authenticatedRouteSecurity;
  if (access !== "permission" || !("permission" in security)) return undefined;

  const permission = (security as { readonly permission?: unknown }).permission;
  return isNexusPermission(permission) ? permissionRouteSecurity(permission) : undefined;
}

export type SecurityAuditEventName =
  | "authentication.denied"
  | "authentication.error"
  | "authorization.denied"
  | "rate_limit.exceeded";

export interface SecurityAuditEvent {
  readonly category: "security";
  readonly event: SecurityAuditEventName;
  readonly outcome: "denied" | "error";
  readonly requestId: string;
  readonly method: string;
  readonly route: string;
  readonly remoteIp: string;
  readonly principalSubject?: string;
  readonly requiredPermission?: NexusPermission;
}

export interface SecurityAuditContext {
  readonly requestId: string;
  readonly method: string;
  readonly route: string;
  readonly remoteIp: string;
  readonly principalSubject?: string;
  readonly requiredPermission?: NexusPermission;
}

export function buildSecurityAuditEvent(
  event: SecurityAuditEventName,
  outcome: SecurityAuditEvent["outcome"],
  context: SecurityAuditContext,
): SecurityAuditEvent {
  return Object.freeze({
    category: "security",
    event,
    outcome,
    requestId: context.requestId,
    method: context.method,
    route: context.route,
    remoteIp: context.remoteIp,
    ...(context.principalSubject ? { principalSubject: context.principalSubject } : {}),
    ...(context.requiredPermission ? { requiredPermission: context.requiredPermission } : {}),
  });
}

function auditContext(
  request: FastifyRequest,
  principal?: SecurityPrincipal,
  requiredPermission?: NexusPermission,
): SecurityAuditContext {
  return {
    requestId: request.id,
    method: request.method,
    route: request.routeOptions.url ?? "<unmatched>",
    remoteIp: request.ip,
    ...(principal ? { principalSubject: principal.subject } : {}),
    ...(requiredPermission ? { requiredPermission } : {}),
  };
}

function logSecurityEvent(
  request: FastifyRequest,
  event: SecurityAuditEventName,
  outcome: SecurityAuditEvent["outcome"],
  principal?: SecurityPrincipal,
  requiredPermission?: NexusPermission,
): void {
  const securityEvent = buildSecurityAuditEvent(
    event,
    outcome,
    auditContext(request, principal, requiredPermission),
  );
  request.log.warn({ securityEvent }, "security policy rejected request");
}

export function auditRateLimitExceeded(request: FastifyRequest): void {
  const securityEvent = buildSecurityAuditEvent(
    "rate_limit.exceeded",
    "denied",
    auditContext(request),
  );
  request.log.warn({ securityEvent }, "rate limit exceeded");
}

function hasPermission(principal: SecurityPrincipal, permission: NexusPermission): boolean {
  return principal.permissions.has(permission);
}

export function registerSecurity(
  app: FastifyInstance,
  authenticationProvider: AuthenticationProvider = denyAllAuthenticationProvider,
): void {
  app.addHook("onRoute", (routeOptions) => {
    if (!routeOptions.url.startsWith("/api/")) return;

    const policy = readRouteSecurityPolicy(routeOptions.config);
    if (!policy) {
      const methods = Array.isArray(routeOptions.method)
        ? routeOptions.method.join(",")
        : routeOptions.method;
      throw new Error(`Security policy required for ${methods} ${routeOptions.url}`);
    }
  });

  app.addHook("preHandler", async (request) => {
    const policy = readRouteSecurityPolicy(request.routeOptions.config);
    if (!policy || policy.access === "public") return;

    let principal: SecurityPrincipal | null;
    try {
      principal = await authenticationProvider.authenticate(request);
    } catch (error) {
      logSecurityEvent(request, "authentication.error", "error");
      request.log.error({ err: error }, "authentication provider failed");
      throw new ApiHttpError(503, "AUTHENTICATION_UNAVAILABLE", "Authentication service unavailable");
    }

    if (!principal) {
      logSecurityEvent(request, "authentication.denied", "denied");
      throw new ApiHttpError(401, "AUTHENTICATION_REQUIRED", "Authentication required");
    }

    principals.set(request, principal);

    if (policy.access === "permission" && !hasPermission(principal, policy.permission)) {
      logSecurityEvent(request, "authorization.denied", "denied", principal, policy.permission);
      throw new ApiHttpError(403, "FORBIDDEN", "Forbidden");
    }
  });
}
