import { parseTechnologySnapshot, validateSoftwareInventoryV2 } from "@igx-nexus/types";
import type { FastifyInstance } from "fastify";
import { createGlpiSoftwareAdapter, GlpiSoftwareAnchorError, glpiSoftwareSections } from "./glpi-software.js";
import { registerSoftwareHttpSchemas } from "./software-http-schema.js";
import { ApiHttpError } from "./http-error.js";
import type { TechnologyProvider } from "./provider.js";
import { permissionRouteSecurity } from "./security.js";
import { runSoftwareOperation, softwareCheckpoint, type SoftwareOperationLimits } from "./software-operation.js";

export type GlpiSoftwareAdapter = ReturnType<typeof createGlpiSoftwareAdapter>;
const unavailable = () => new ApiHttpError(503, "SOFTWARE_PROVIDER_UNAVAILABLE", "Software provider unavailable");
const notFound = () => new ApiHttpError(404, "ASSET_NOT_FOUND", "Asset not found");

export function registerSoftwareRoutes(app: FastifyInstance, provider: TechnologyProvider, adapter?: GlpiSoftwareAdapter, limits?: SoftwareOperationLimits): void {
  registerSoftwareHttpSchemas(app);
  app.get("/api/v2/technology/assets/:assetId/software", {
    config: { security: permissionRouteSecurity("technology:read") },
    schema: {
      tags: ["Technology"], summary: "Inventario Software/OS V2 del activo canónico en el provider configurado",
      security: [{ nexusBearer: [] }],
      // Only boundaries must be non-whitespace. The lookahead anchors the actual end, including line endings.
      params: { type: "object", required: ["assetId"], properties: { assetId: { type: "string", minLength: 1, maxLength: 1024, pattern: "^\\S(?:[\\s\\S]*\\S)?(?![\\s\\S])" } } },
      response: { 200: { $ref: "SoftwareInventoryV2#" }, ...Object.fromEntries([400, 401, 403, 404, 503].map(status => [status, { $ref: "ApiErrorResponse#" }])) },
    },
  }, async request => {
    if (Object.keys(request.query as Record<string, unknown>).length) throw new ApiHttpError(400, "VALIDATION_ERROR", "Request validation failed");
    if (provider.descriptor.mode !== "live" || provider.descriptor.availability !== "ready" || !provider.descriptor.sourceSystems.includes("glpi") || !adapter) throw unavailable();
    try {
      return await runSoftwareOperation(async () => {
        let snapshot;
        try { snapshot = parseTechnologySnapshot(await provider.getSnapshot()); }
        catch { throw unavailable(); }
        softwareCheckpoint();
        const { assetId } = request.params as { assetId: string };
        const matches = snapshot.assets.filter(asset => asset.id === assetId);
        if (matches.length !== 1) throw notFound();
        const asset = matches[0]!;
        let inventory;
        try { inventory = await adapter.getInventory(asset); }
        catch (error) { if (error instanceof GlpiSoftwareAnchorError) throw notFound(); throw unavailable(); }
        softwareCheckpoint();
        if (inventory.assetId !== asset.id || validateSoftwareInventoryV2(inventory).some(issue => issue.severity === "error")) throw unavailable();
        const sections = glpiSoftwareSections.map(section => inventory[section]);
        if (sections.some(section => (section.state === "unavailable" && section.reason === "unauthorized") || (section.state === "partial" && section.gaps.some(gap => gap.reason === "unauthorized"))) || !sections.some(section => section.state === "complete" || section.state === "partial")) throw unavailable();
        return inventory;
      }, limits);
    } catch (error) {
      if (error instanceof ApiHttpError && error.statusCode === 404) throw error;
      throw unavailable();
    }
  });
}
