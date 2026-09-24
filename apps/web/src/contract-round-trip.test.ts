import { describe, expect, it } from "vitest";
import { buildApp } from "../../../services/api/src/app";
import { loadConfig } from "../../../services/api/src/config";
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
});
