import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { ApiConfig } from "./config.js";
import type {
  AuthenticationProvider,
  NexusPermission,
  SecurityPrincipal,
} from "./security.js";

export class LabAuthenticationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabAuthenticationConfigurationError";
  }
}

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host.toLowerCase() === "localhost";
}

function safeTokenEquals(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

const labPrincipal: SecurityPrincipal = Object.freeze({
  subject: "nexus-web-live-lab",
  kind: "service",
  authSource: "local-lab-bearer",
  roles: Object.freeze(["live-lab-reader"]),
  permissions: new Set<NexusPermission>(["technology:read"]),
});

export function createLabAuthenticationProvider(
  config: ApiConfig,
  environment: NodeJS.ProcessEnv = process.env,
): AuthenticationProvider | undefined {
  const token = environment.NEXUS_LAB_AUTH_TOKEN?.trim();
  if (!token) return undefined;

  if (config.environment === "production") {
    throw new LabAuthenticationConfigurationError("NEXUS_LAB_AUTH_TOKEN is forbidden in production");
  }
  if (!isLoopbackHost(config.host)) {
    throw new LabAuthenticationConfigurationError(
      "NEXUS_LAB_AUTH_TOKEN requires NEXUS API to bind only to a loopback host",
    );
  }
  if (token.length < 32) {
    throw new LabAuthenticationConfigurationError("NEXUS_LAB_AUTH_TOKEN must contain at least 32 characters");
  }

  return Object.freeze({
    async authenticate(request: FastifyRequest) {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith("Bearer ")) return null;
      const candidate = authorization.slice("Bearer ".length);
      return safeTokenEquals(candidate, token) ? labPrincipal : null;
    },
  });
}
