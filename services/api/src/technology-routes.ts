import type { FastifyInstance } from "fastify";
import { ApiHttpError } from "./http-error.js";
import { ProviderUnavailableError, type TechnologyProvider } from "./provider.js";
import { permissionRouteSecurity } from "./security.js";

const sourceReferenceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["source", "externalId", "observedAt", "authority"],
  properties: {
    source: { type: "string" },
    externalId: { type: "string" },
    entityType: { type: "string" },
    sourceScope: { type: "string" },
    observedAt: { type: "string" },
    authority: { type: "string" },
  },
} as const;

const technologySnapshotSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "asOf", "assets", "relationships", "observations"],
  properties: {
    schemaVersion: { type: "string" },
    asOf: { type: "string" },
    assets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "displayName",
          "domain",
          "assetClass",
          "role",
          "lifecycle",
          "criticality",
          "identifiers",
          "sourceReferences",
          "attributes",
          "provenance",
        ],
        properties: {
          id: { type: "string" },
          displayName: { type: "string" },
          domain: { type: "string" },
          assetClass: { type: "string" },
          role: { type: "string" },
          lifecycle: { type: "string" },
          criticality: { type: "string" },
          identifiers: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["kind", "value"],
              properties: {
                kind: { type: "string" },
                value: { type: "string" },
                source: sourceReferenceSchema,
              },
            },
          },
          sourceReferences: { type: "array", items: sourceReferenceSchema },
          attributes: { type: "object", additionalProperties: true },
          provenance: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
        },
      },
    },
    relationships: { type: "array", items: { type: "object", additionalProperties: true } },
    observations: { type: "array", items: { type: "object", additionalProperties: true } },
  },
} as const;

export function registerTechnologyRoutes(app: FastifyInstance, provider: TechnologyProvider): void {
  app.get(
    "/api/v1/technology/snapshot",
    {
      config: { security: permissionRouteSecurity("technology:read") },
      schema: {
        tags: ["Technology"],
        summary: "Snapshot canónico read-only del Technology Provider activo",
        response: { 200: technologySnapshotSchema },
      },
    },
    async () => {
      try {
        return await provider.getSnapshot();
      } catch (error) {
        if (error instanceof ProviderUnavailableError) {
          throw new ApiHttpError(503, "TECHNOLOGY_PROVIDER_UNAVAILABLE", "Technology provider unavailable");
        }
        throw error;
      }
    },
  );
}
