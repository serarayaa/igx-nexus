import { parseTechnologySnapshot, technologySnapshotHttpSchema } from "@igx-nexus/types";
import type { FastifyInstance } from "fastify";
import { ApiHttpError } from "./http-error.js";
import { ProviderUnavailableError, type TechnologyProvider } from "./provider.js";
import { permissionRouteSecurity } from "./security.js";

export function registerTechnologyRoutes(app: FastifyInstance, provider: TechnologyProvider): void {
  app.get(
    "/api/v1/technology/snapshot",
    {
      config: { security: permissionRouteSecurity("technology:read") },
      schema: {
        tags: ["Technology"],
        summary: "Snapshot canónico read-only del Technology Provider activo",
        security: [{ nexusBearer: [] }],
        response: {
          200: technologySnapshotHttpSchema,
          401: { $ref: "ApiErrorResponse#" },
          403: { $ref: "ApiErrorResponse#" },
          503: { $ref: "ApiErrorResponse#" },
        },
      },
    },
    async () => {
      try {
        return parseTechnologySnapshot(await provider.getSnapshot());
      } catch (error) {
        if (error instanceof ProviderUnavailableError) {
          throw new ApiHttpError(503, "TECHNOLOGY_PROVIDER_UNAVAILABLE", "Technology provider unavailable");
        }
        throw error;
      }
    },
  );
}
