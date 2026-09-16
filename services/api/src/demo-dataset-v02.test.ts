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

describe("V02-011 canonical demo dataset", () => {
  it("preserves all 240 stable synthetic identities", () => {
    expect(snapshot.asOf).toBe(DEMO_AS_OF);
    expect(snapshot.assets).toHaveLength(240);
    expect(snapshot.assets.map((asset) => asset.id)).toEqual(
      Array.from({ length: 240 }, (_, index) => `DEMO-${String(index + 1).padStart(4, "0")}`),
    );
    expect(new Set(snapshot.assets.map((asset) => asset.id)).size).toBe(240);
    expect(demoHeroes).toHaveLength(11);
    expect(demoRelationshipFixtures).toHaveLength(18);
  });

  it("passes canonical and taxonomy v2 gates for every asset", () => {
    expect(validateTechnologySnapshot(snapshot).filter((issue) => issue.severity === "error")).toEqual([]);
    expect(validateTechnologySnapshotTaxonomy(snapshot)).toEqual([]);
    expect(snapshot.assets.every((asset) => asset.taxonomy?.taxonomyVersion === "2")).toBe(true);
  });

  it("keeps the synthetic boundary explicit and free from corporate identifiers", () => {
    for (const asset of snapshot.assets) {
      expect(asset.id).toMatch(/^DEMO-\d{4}$/);
      expect(asset.sourceReferences).toHaveLength(1);
      expect(asset.sourceReferences[0]).toMatchObject({ source: "demo", sourceScope: "demo-v0.2" });
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

  it("is deterministic, immutable and protected by a canonical digest", () => {
    const second = createCanonicalDemoSnapshot();
    expect(second).not.toBe(snapshot);
    expect(second).toEqual(snapshot);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.assets)).toBe(true);
    expect(Object.isFrozen(snapshot.assets[0])).toBe(true);

    // Review semantic changes before intentionally updating this digest.
    const digest = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
    expect(digest).toBe("16031e20423ff29f64b658ed56cea3b78f9b92039850d811879dac49822d9033");
  });
});
