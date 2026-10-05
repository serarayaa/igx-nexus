import { describe, expect, it } from "vitest";
import { buildApp } from "../../../services/api/src/app";
import { loadConfig } from "../../../services/api/src/config";
import { createGlpiTechnologyProvider, type GlpiApiTransport } from "../../../services/api/src/glpi";
import { demoTechnologyProvider } from "../../../services/api/src/provider";
import { projectCanonicalSnapshot } from "./live-provider";
import { canonicalSnapshotFixture } from "./test/canonical-snapshot";

describe("AUD-API-001 canonical → Fastify HTTP → Web", () => {
  it("preserves taxonomy and operational contexts through serialization and consumption", async () => {
    const canonical = canonicalSnapshotFixture();
    const app = await buildApp({
      config: loadConfig({ NEXUS_API_ENV: "test" }),
      authenticationProvider: { async authenticate() { return { subject: "contract-test", kind: "service", authSource: "test", roles: ["reader"], permissions: new Set(["technology:read"]) }; } },
      technologyProvider: { descriptor: demoTechnologyProvider.descriptor, async getSnapshot() { return canonical; } },
    });
    try {
      const response = await app.inject("/api/v1/technology/snapshot");
      expect(response.statusCode).toBe(200);
      const wire = response.json();
      expect.soft(wire.assets[0].taxonomy).toEqual(canonical.assets[0]!.taxonomy);
      expect.soft(wire.assets[0].operationalContexts).toEqual(canonical.assets[0]!.operationalContexts);
      expect.soft(wire).toEqual(canonical);
      const web = projectCanonicalSnapshot(wire);
      expect(web.canonical).toEqual(canonical);
      expect(web.assets[0]).toMatchObject({ lifecycle: "active", criticality: "medium", serial: "SER-CONTRACT-123", sourceReferences: canonical.assets[0]!.sourceReferences, taxonomyState: "classified", taxonomyReviewRequired: false, taxonomyCompatibilityFallback: false, lastSeen: "2026-08-24T12:00:00Z" });
      expect.soft(web.assets[0]).toMatchObject({ taxonomy: canonical.assets[0]!.taxonomy, operationalContexts: canonical.assets[0]!.operationalContexts });
    } finally { await app.close(); }
  });
  it("keeps an ambiguous GLPI wall-clock timestamp from blanking the Live inventory", async () => {
    const transport: GlpiApiTransport = {
      async get(_path, query = {}) {
        return Number(query.start ?? 0) === 0
          ? [{
              id: 42,
              name: "AUD-API-001",
              serial: "SYNTH-AUD-API-001",
              last_inventory_update: "2026-10-05 12:00:00",
              date_mod: "0000-00-00 00:00:00",
              type: { id: 9, name: "Notebook" },
            }]
          : [];
      },
    };
    const provider = createGlpiTechnologyProvider({
      transport,
      sourceInstanceId: "glpi-aud-api-001",
      pageSize: 10,
      maxRecords: 10,
      now: () => new Date("2026-10-05T15:00:00.000Z"),
    });
    const app = await buildApp({
      config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }),
      authenticationProvider: { async authenticate() { return { subject: "contract-test", kind: "service", authSource: "test", roles: ["reader"], permissions: new Set(["technology:read"]) }; } },
      technologyProvider: provider,
    });

    try {
      const response = await app.inject("/api/v1/technology/snapshot");
      expect(response.statusCode).toBe(200);
      const wire = response.json();
      const attributes = wire.assets[0].attributes as Record<string, unknown>;

      expect(attributes["glpi.lastInventoryUpdate"]).toBeUndefined();
      expect(attributes["glpi.raw.lastInventoryUpdate"]).toBe("2026-10-05 12:00:00");
      expect(attributes["glpi.dateModified"]).toBeUndefined();
      expect(attributes["glpi.raw.dateModified"]).toBe("0000-00-00 00:00:00");

      const web = projectCanonicalSnapshot(wire);
      expect(web.assets).toHaveLength(1);
      expect(web.assets[0]).toMatchObject({
        name: "AUD-API-001",
        serial: "SYNTH-AUD-API-001",
        lastSeen: null,
        dataMode: "live",
      });
    } finally {
      await app.close();
    }
  });

});
