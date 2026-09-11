import swagger from "@fastify/swagger";
import Fastify, { type FastifyInstance } from "fastify";
import { loadConfig, type ApiConfig } from "./config.js";
import { API_SERVICE_VERSION } from "./contracts.js";
import { registerErrorHandlers } from "./errors.js";
import { registerBaseRoutes } from "./routes.js";

export interface BuildAppOptions {
  readonly config?: ApiConfig;
}

function loggerOptions(config: ApiConfig) {
  return {
    level: config.logLevel,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-api-key']",
        "res.headers['set-cookie']",
      ],
      censor: "[REDACTED]",
    },
  };
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({ logger: loggerOptions(config) });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
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
  registerBaseRoutes(app);

  return app;
}
