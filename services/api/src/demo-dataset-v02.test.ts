import { createHash } from "node:crypto";
import {
  DEMO_AS_OF,
  DEMO_DATASET_VERSION,
  createCanonicalDemoSnapshot,
  demoHeroes,
  demoRelationshipFixtures,
} from "../../../packages/demo-data/index.mjs";
import {
  validateTechnologySnapshot,
  validateTechnologySnapshotTaxonomy,
} from "@igx-nexus/types";
import { describe, expect, it } from "vitest";

const snapshot = createCanonicalDemoSnapshot();

describe("V02-011/V02-012 canonical demo dataset", () => {
  it("preserves all 240 stable synthetic identities and 18 canonical relationships", () => {
    expect(snapshot.asOf).toBe(DEMO_AS_OF);
    expect(snapshot.assets).toHaveLength(240);
    expect(snapshot.assets.map((asset) => asset.id)).toEqual(
      Array.from({ length: 240 }, (_, index) => `DEMO-${String(index + 1).padStart(4, "0")}`),
    );
    expect(new Set(snapshot.assets.map((asset) => asset.id)).size).toBe(240);
    expect(demoHeroes).toHaveLength(11);
    expect(demoRelationshipFixtures).toHaveLength(18);
    expect(snapshot.relationships).toHaveLength(18);
    expect(snapshot.relationships.map((relationship) => relationship.id)).toEqual(
      Array.from({ length: 18 }, (_, index) => `DEMO-REL-${String(index + 1).padStart(3, "0")}`),
    );
  });

  it("passes canonical and taxonomy v2 gates without unresolved relationship endpoints", () => {
    expect(validateTechnologySnapshot(snapshot)).toEqual([]);
    expect(validateTechnologySnapshotTaxonomy(snapshot)).toEqual([]);
    expect(snapshot.assets.every((asset) => asset.taxonomy?.taxonomyVersion === "2")).toBe(true);

    const assetIds = new Set(snapshot.assets.map((asset) => asset.id));
    for (const relationship of snapshot.relationships) {
      expect(assetIds.has(relationship.sourceAssetId)).toBe(true);
      expect(assetIds.has(relationship.targetAssetId)).toBe(true);
    }
  });

  it("keeps relationship evidence explicit without inventing unknown observation time", () => {
    for (const relationship of snapshot.relationships) {
      expect(relationship.evidence).toHaveLength(1);
      const record = relationship.evidence[0]!;
      expect(record).toMatchObject({
        authority: "trusted",
        derivation: "manual",
        confidence: 1,
      });
      expect(record.source).toMatchObject({
        source: "demo",
        externalId: relationship.id,
        entityType: "synthetic_relationship",
        sourceScope: "demo-v0.2",
        observedAt: DEMO_AS_OF,
        authority: "trusted",
      });
      expect(record.evidence?.[0]).toMatchObject({
        kind: "source_record",
        reference: `demo-dataset:${relationship.id}`,
        label: "Synthetic relationship fixture",
      });
    }

    const unknownTime = snapshot.relationships.find((relationship) => relationship.id === "DEMO-REL-013");
    expect(unknownTime?.observedAt).toBeNull();
    expect(unknownTime?.evidence[0]?.observedAt).toBeNull();
    expect(unknownTime?.evidence[0]?.evidence?.[0]?.observedAt).toBeUndefined();

    const oldRelationship = snapshot.relationships.find((relationship) => relationship.id === "DEMO-REL-016");
    expect(oldRelationship?.observedAt).toBe("2026-08-20T12:00:00.000Z");
    expect(oldRelationship?.evidence[0]?.observedAt).toBe(oldRelationship?.observedAt);
  });

  it("keeps the synthetic boundary explicit and free from corporate identifiers", () => {
    for (const asset of snapshot.assets) {
      expect(asset.id).toMatch(/^DEMO-\d{4}$/);
      expect(asset.sourceReferences).toHaveLength(1);
      expect(asset.sourceReferences[0]).toMatchObject({
        source: "demo",
        sourceInstanceId: "demo-v0.2",
        sourceScope: "demo-v0.2",
      });
      expect(asset.attributes["demo.datasetVersion"]).toBe(DEMO_DATASET_VERSION);
      expect(asset.attributes["demo.synthetic"]).toBe(true);

      const hostname = asset.identifiers.find((entry) => entry.kind === "hostname")?.value;
      const serial = asset.identifiers.find((entry) => entry.kind === "serial_number")?.value;
      const tag = asset.identifiers.find((entry) => entry.kind === "asset_tag")?.value;
      const ip = asset.identifiers.find((entry) => entry.kind === "ip_address")?.value;
      if (hostname) expect(hostname).toMatch(/^demo-cl-\d{4}$/);
      if (serial) expect(serial).toMatch(/^SYNTH-SN-\d{6}$/);
      if (tag) expect(tag).toMatch(/^DEMO-TAG-\d{4}$/);
      if (ip) expect(ip).toMatch(/^192\.0\.2\.(?:[1-9]|[1-9]\d|1\d\d|2[0-3]\d|240)$/);
    }

    const serialized = JSON.stringify(snapshot).toLocaleLowerCase("en-US");
    expect(serialized).not.toContain("innergex");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("credential");
  });

  it("preserves domain distribution and governed family mappings", () => {
    const counts = snapshot.assets.reduce((result, asset) => {
      result[asset.domain] += 1;
      return result;
    }, { IT: 0, OT: 0 });
    expect(counts).toEqual({ IT: 199, OT: 41 });

    const byId = new Map(snapshot.assets.map((asset) => [asset.id, asset]));
    expect(byId.get("DEMO-0003")).toMatchObject({ domain: "IT", assetClass: "network_device", role: "network_access" });
    expect(byId.get("DEMO-0013")).toMatchObject({ domain: "OT", assetClass: "operator_interface", role: "supervision" });
    expect(byId.get("DEMO-0014")).toMatchObject({ domain: "OT", assetClass: "industrial_network_device", role: "industrial_network" });
    expect(byId.get("DEMO-0005")).toMatchObject({ domain: "IT", assetClass: "peripheral", role: "custom:display" });
    expect(byId.get("DEMO-0006")).toMatchObject({ domain: "IT", assetClass: "printer", role: "print_service" });
  });

  it("uses site contexts only when the authored fixture has a location", () => {
    const withoutLocation = snapshot.assets.find((asset) => asset.id === "DEMO-0001");
    expect(withoutLocation?.operationalContexts).toEqual([]);

    for (const asset of snapshot.assets.filter((candidate) => candidate.id !== "DEMO-0001")) {
      expect(asset.operationalContexts).toHaveLength(1);
      expect(asset.operationalContexts?.[0]?.kind).toBe("site");
      expect(asset.operationalContexts?.[0]?.source?.source).toBe("demo");
    }
  });

  it("authors lifecycle milestones with explicit evidence while preserving honest gaps", () => {
    const byId = new Map(snapshot.assets.map((asset) => [asset.id, asset]));
    const lifecycleKeys = [
      "nexus.lifecycle.purchaseAt",
      "nexus.lifecycle.commissionedAt",
      "nexus.lifecycle.warrantyEndAt",
      "nexus.lifecycle.eolAt",
      "nexus.lifecycle.eosAt",
      "nexus.lifecycle.replacementTargetAt",
    ] as const;

    const insufficient = byId.get("DEMO-0001");
    expect(insufficient).toBeDefined();
    for (const key of lifecycleKeys) expect(insufficient?.attributes[key]).toBeNull();

    expect(byId.get("DEMO-0002")?.attributes["nexus.lifecycle.warrantyEndAt"]).toBe("2026-08-10T12:00:00.000Z");
    expect(byId.get("DEMO-0004")?.attributes["nexus.lifecycle.warrantyEndAt"]).toBe("2026-09-29T12:00:00.000Z");

    for (const asset of snapshot.assets) {
      for (const key of lifecycleKeys) {
        const value = asset.attributes[key];
        if (value === null) continue;
        expect(typeof value).toBe("string");
        const records = asset.provenance.filter((record) => record.fieldPath === `attributes.${key}`);
        expect(records.length, `${asset.id} must evidence ${key}`).toBeGreaterThan(0);
        expect(records.every((record) => record.source.source === "demo")).toBe(true);
      }
    }
  });

  it("is deterministic, immutable and protected by a canonical digest", () => {
    const second = createCanonicalDemoSnapshot();
    expect(second).not.toBe(snapshot);
    expect(second).toEqual(snapshot);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.assets)).toBe(true);
    expect(Object.isFrozen(snapshot.assets[0])).toBe(true);
    expect(Object.isFrozen(snapshot.relationships)).toBe(true);
    expect(Object.isFrozen(snapshot.relationships[0])).toBe(true);
    expect(Object.isFrozen(snapshot.relationships[0]?.evidence)).toBe(true);

    // Review semantic changes before intentionally updating this digest.
    const digest = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
    expect(digest).toBe("b28a14f5db5009739af9b8ce9b883ec062bc3662c1bcfd673e1ffc4daa43b05d");
  });
});
