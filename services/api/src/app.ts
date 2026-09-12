import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import Fastify, { type FastifyInstance } from "fastify";
import { loadConfig, type ApiConfig } from "./config.js";
import { API_SERVICE_VERSION } from "./contracts.js";
import { registerErrorHandlers } from "./errors.js";
import { registerBaseRoutes } from "./routes.js";
import {
  auditRateLimitExceeded,
  denyAllAuthenticationProvider,
  registerSecurity,
  type AuthenticationProvider,
} from "./security.js";

export interface BuildAppOptions {
  readonly config?: ApiConfig;
  readonly authenticationProvider?: AuthenticationProvider;
}

function loggerOptions(config: ApiConfig) {
  return {
    level: config.logLevel,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-api-key']",
        "req.headers['x-auth-token']",
        "req.headers['x-client-secret']",
        "req.headers['proxy-authorization']",
        "res.headers['set-cookie']",
      ],
      censor: "[REDACTED]",
    },
  };
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const authenticationProvider = options.authenticationProvider ?? denyAllAuthenticationProvider;
  const app = Fastify({
    logger: loggerOptions(config),
    bodyLimit: config.bodyLimitBytes,
    requestTimeout: config.requestTimeoutMs,
    trustProxy: config.trustedProxies.length > 0 ? [...config.trustedProxies] : false,
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("cache-control", "no-store");
    return payload;
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: false,
  });

  await app.register(cors, {
    origin: config.corsOrigins.length > 0 ? [...config.corsOrigins] : false,
    credentials: false,
    methods: ["GET", "HEAD", "OPTIONS"],
    allowedHeaders: ["authorization", "content-type", "x-request-id"],
    exposedHeaders: ["x-request-id"],
    strictPreflight: true,
    maxAge: 600,
  });

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (request) => request.ip,
    onExceeded: (request) => {
      auditRateLimitExceeded(request);
    },
  });

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "IGX NEXUS API",
        description: "Frontera HTTP de Technology Intelligence para IGX NEXUS.",
        version: API_SERVICE_VERSION,
      },
      tags: [{ name: "Runtime", description: "Estado y metadata del runtime NEXUS API" }],
    },
  });

  registerErrorHandlers(app);
  registerSecurity(app, authenticationProvider);
  registerBaseRoutes(app);

  return app;
}
