import { technologySchemaVersion } from "@igx-nexus/types";
import type { FastifyInstance } from "fastify";
import { API_SERVICE_NAME, API_SERVICE_VERSION, API_VERSION } from "./contracts.js";

const runtimeStatusSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "service", "apiVersion", "technologySchemaVersion"],
  properties: {
    status: { type: "string" },
    service: { type: "string" },
    apiVersion: { type: "string" },
    technologySchemaVersion: { type: "string" },
  },
} as const;

const metadataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["service", "serviceVersion", "apiVersion", "technologySchemaVersion"],
  properties: {
    service: { type: "string" },
    serviceVersion: { type: "string" },
    apiVersion: { type: "string" },
    technologySchemaVersion: { type: "string" },
  },
} as const;

export function registerBaseRoutes(app: FastifyInstance): void {
  app.get(
    "/health",
    {
      schema: {
        tags: ["Runtime"],
        summary: "Liveness del proceso NEXUS API",
        response: { 200: runtimeStatusSchema },
      },
    },
    async () => ({
      status: "ok",
      service: API_SERVICE_NAME,
      apiVersion: API_VERSION,
      technologySchemaVersion,
    }),
  );

  app.get(
    "/ready",
    {
      schema: {
        tags: ["Runtime"],
        summary: "Readiness del runtime NEXUS API",
        response: { 200: runtimeStatusSchema },
      },
    },
    async () => ({
      status: "ready",
      service: API_SERVICE_NAME,
      apiVersion: API_VERSION,
      technologySchemaVersion,
    }),
  );

  app.get(
    "/api/v1",
    {
      schema: {
        tags: ["Runtime"],
        summary: "Metadata de la frontera HTTP v1",
        response: { 200: metadataSchema },
      },
    },
    async () => ({
      service: API_SERVICE_NAME,
      serviceVersion: API_SERVICE_VERSION,
      apiVersion: API_VERSION,
      technologySchemaVersion,
    }),
  );

  app.get(
    "/openapi.json",
    {
      schema: {
        tags: ["Runtime"],
        summary: "Contrato OpenAPI generado por NEXUS API",
        response: {
          200: { type: "object", additionalProperties: true },
        },
      },
    },
    async () => app.swagger(),
  );
}
