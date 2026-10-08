import { parseTechnologySnapshot, validateHardwareInventoryV2 } from "@igx-nexus/types";
import type { FastifyInstance } from "fastify";
import { GlpiHardwareAnchorError, glpiHardwareSections, type GlpiHardwareAdapter } from "./glpi-hardware.js";
import { registerHardwareHttpSchemas } from "./hardware-http-schema.js";
import { ApiHttpError } from "./http-error.js";
import type { TechnologyProvider } from "./provider.js";
import { permissionRouteSecurity } from "./security.js";

const unavailable = () => new ApiHttpError(503, "HARDWARE_PROVIDER_UNAVAILABLE", "Hardware provider unavailable");
const notFound = () => new ApiHttpError(404, "ASSET_NOT_FOUND", "Asset not found");

/** Exact lookup in the configured provider's authorized inventory, never client ID decoding. */
export function registerHardwareRoutes(app: FastifyInstance, provider: TechnologyProvider, adapter?: GlpiHardwareAdapter): void {
  registerHardwareHttpSchemas(app);
  app.get(
    "/api/v2/technology/assets/:assetId/hardware",
    {
      config: { security: permissionRouteSecurity("technology:read") },
      schema: {
        tags: ["Technology"],
        summary: "Inventario Hardware V2 del activo canónico dentro del provider GLPI configurado",
        security: [{ nexusBearer: [] }],
        params: { type: "object", required: ["assetId"], properties: { assetId: { type: "string", minLength: 1, maxLength: 1024 } } },
        response: {
          200: { $ref: "HardwareInventoryV2#" },
          ...Object.fromEntries([400, 401, 403, 404, 503].map((status) => [status, { $ref: "ApiErrorResponse#" }])),
        },
      },
    },
    async (request) => {
      // No client-selected provider, instance, entity, section or source scope.
      if (Object.keys(request.query as Record<string, unknown>).length) throw new ApiHttpError(400, "VALIDATION_ERROR", "Request validation failed");
      if (provider.descriptor.mode !== "live" || provider.descriptor.availability !== "ready" || !provider.descriptor.sourceSystems.includes("glpi") || !adapter) throw unavailable();
      let snapshot;
      try { snapshot = parseTechnologySnapshot(await provider.getSnapshot()); }
      catch { throw unavailable(); }
      const { assetId } = request.params as { assetId: string };
      const matches = snapshot.assets.filter((asset) => asset.id === assetId);
      if (matches.length !== 1) throw notFound();
      const asset = matches[0]!;
      if (!asset.sourceReferences.some((s) => s.source === "glpi" && s.sourceInstanceId && s.entityType === "Computer" && s.sourceScope === "Assets/Computer")) throw notFound();
      try {
        const inventory = await adapter.getInventory(asset);
        if (inventory.assetId !== asset.id || validateHardwareInventoryV2(inventory).some((issue) => issue.severity === "error")) throw unavailable();
        const sections = glpiHardwareSections.map((section) => inventory[section]);
        // Upstream authorization is a service failure, not a challenge to the NEXUS user.
        // Discard the whole HTTP response rather than exposing other acquired sections.
        if (sections.some((s) => s.state === "unavailable" && s.reason === "unauthorized") || !sections.some((s) => s.state === "complete" || s.state === "partial")) throw unavailable();
        return inventory;
      } catch (error) {
        // The adapter rejects absent/ambiguous anchors or a foreign configured instance before I/O.
        if (error instanceof GlpiHardwareAnchorError) throw notFound();
        throw unavailable();
      }
    },
  );
}
