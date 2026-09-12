import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import {
  authenticatedRouteSecurity,
  buildSecurityAuditEvent,
  getSecurityPrincipal,
  permissionRouteSecurity,
  type AuthenticationProvider,
  type NexusPermission,
  type SecurityPrincipal,
} from "./security.js";

const testConfig = loadConfig({ NEXUS_API_ENV: "test" });

function principal(permissions: readonly NexusPermission[] = []): SecurityPrincipal {
  return {
    subject: "test-subject",
    kind: "user",
    authSource: "test-provider",
    roles: ["test-role"],
    permissions: new Set(permissions),
  };
}

function staticProvider(value: SecurityPrincipal | null): AuthenticationProvider {
  return {
    async authenticate() {
      return value;
    },
  };
}

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

describe("NEXUS API security policy", () => {
  it.each(["/api", "/api/v1/__test/unsecured"])(
    "fails route registration when %s has no explicit security policy",
    async (url) => {
      app = await buildApp({ config: testConfig });

      expect(() => {
        app?.get(url, async () => ({ ok: true }));
      }).toThrow("Security policy required");
    },
  );

  it("denies authenticated routes with the default deny-all provider", async () => {
    app = await buildApp({ config: testConfig });
    app.get(
      "/api/v1/__test/authenticated",
      { config: { security: authenticatedRouteSecurity } },
      async () => ({ ok: true }),
    );

    const response = await app.inject({ method: "GET", url: "/api/v1/__test/authenticated" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
      statusCode: 401,
      message: "Authentication required",
    });
  });

  it("returns 403 when the principal lacks an effective permission", async () => {
    app = await buildApp({
      config: testConfig,
      authenticationProvider: staticProvider(principal()),
    });
    app.get(
      "/api/v1/__test/permission",
      { config: { security: permissionRouteSecurity("technology:read") } },
      async () => ({ ok: true }),
    );

    const response = await app.inject({ method: "GET", url: "/api/v1/__test/permission" });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
      message: "Forbidden",
    });
  });

  it("authorizes by effective permission and exposes the resolved principal to handlers", async () => {
    app = await buildApp({
      config: testConfig,
      authenticationProvider: staticProvider(principal(["technology:read"])),
    });
    app.get(
      "/api/v1/__test/permission",
      { config: { security: permissionRouteSecurity("technology:read") } },
      async (request) => ({ subject: getSecurityPrincipal(request)?.subject }),
    );

    const response = await app.inject({ method: "GET", url: "/api/v1/__test/permission" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ subject: "test-subject" });
  });

  it("fails closed when the authentication provider errors and hides provider details", async () => {
    const authenticationProvider: AuthenticationProvider = {
      async authenticate() {
        throw new Error("private identity provider detail");
      },
    };
    app = await buildApp({ config: testConfig, authenticationProvider });
    app.get(
      "/api/v1/__test/authenticated",
      { config: { security: authenticatedRouteSecurity } },
      async () => ({ ok: true }),
    );

    const response = await app.inject({ method: "GET", url: "/api/v1/__test/authenticated" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      code: "INTERNAL_ERROR",
      statusCode: 503,
      message: "Internal server error",
    });
    expect(response.body).not.toContain("private identity provider detail");
  });

  it("builds minimal audit events without headers, tokens, bodies or query data", () => {
    const event = buildSecurityAuditEvent("authorization.denied", "denied", {
      requestId: "req-123",
      method: "GET",
      route: "/api/v1/assets/:id",
      remoteIp: "127.0.0.1",
      principalSubject: "user-123",
      requiredPermission: "technology:read",
    });

    expect(event).toEqual({
      category: "security",
      event: "authorization.denied",
      outcome: "denied",
      requestId: "req-123",
      method: "GET",
      route: "/api/v1/assets/:id",
      remoteIp: "127.0.0.1",
      principalSubject: "user-123",
      requiredPermission: "technology:read",
    });
    expect(Object.keys(event)).not.toEqual(expect.arrayContaining(["headers", "authorization", "body", "query"]));
  });
});
