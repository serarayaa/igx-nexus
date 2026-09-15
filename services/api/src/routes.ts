import { technologySchemaVersion } from "@igx-nexus/types";
import type { FastifyInstance } from "fastify";
import { API_SERVICE_NAME, API_SERVICE_VERSION, API_VERSION } from "./contracts.js";
import {
  publicProviderDescriptor,
  technologyProviderAvailability,
  type TechnologyProvider,
} from "./provider.js";
import { publicRouteSecurity } from "./security.js";

const runtimeStatusSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "service",
    "apiVersion",
    "technologySchemaVersion",
    "providerMode",
    "providerAvailability",
  ],
  properties: {
    status: { type: "string" },
    service: { type: "string" },
    apiVersion: { type: "string" },
    technologySchemaVersion: { type: "string" },
    providerMode: { type: "string", enum: ["demo", "live"] },
    providerAvailability: { type: "string", enum: ["ready", "unavailable"] },
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

const providerDescriptorSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "mode", "displayName", "availability", "capabilities", "sourceSystems"],
  properties: {
    id: { type: "string" },
    mode: { type: "string", enum: ["demo", "live"] },
    displayName: { type: "string" },
    availability: { type: "string", enum: ["ready", "unavailable"] },
    capabilities: {
      type: "array",
      items: { type: "string", enum: ["technology.snapshot.read"] },
    },
    sourceSystems: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

export function registerBaseRoutes(app: FastifyInstance, provider: TechnologyProvider): void {
  const descriptor = publicProviderDescriptor(provider.descriptor);
  const runtimeProviderFields = {
    providerMode: descriptor.mode,
    providerAvailability: descriptor.availability,
  } as const;

  app.get(
    "/health",
    {
      config: {
        security: publicRouteSecurity,
        rateLimit: false,
      },
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
      ...runtimeProviderFields,
    }),
  );

  app.get(
    "/ready",
    {
      config: {
        security: publicRouteSecurity,
        rateLimit: false,
      },
      schema: {
        tags: ["Runtime"],
        summary: "Readiness del runtime NEXUS API y su provider configurado",
        response: {
          200: runtimeStatusSchema,
          503: runtimeStatusSchema,
        },
      },
    },
    async (_request, reply) => {
      const providerAvailability = await technologyProviderAvailability(provider);
      const ready = providerAvailability === "ready";
      return reply.status(ready ? 200 : 503).send({
        status: ready ? "ready" : "not_ready",
        service: API_SERVICE_NAME,
        apiVersion: API_VERSION,
        technologySchemaVersion,
        providerMode: descriptor.mode,
        providerAvailability,
      });
    },
  );

  app.get(
    "/api/v1",
    {
      config: { security: publicRouteSecurity },
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
    "/api/v1/provider",
    {
      config: { security: publicRouteSecurity },
      schema: {
        tags: ["Runtime"],
        summary: "Descriptor público del Technology Provider activo",
        response: { 200: providerDescriptorSchema },
      },
    },
    async () => descriptor,
  );

  app.get(
    "/openapi.json",
    {
      config: { security: publicRouteSecurity },
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
