import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createDemoDataset, demoDataset, demoHeroes, DEMO_AS_OF } from "./demo-dataset";
import { demoProvider, demoSnapshot } from "./demo-provider";
import { demoRelationshipInventoryProvider, demoRelationshipProvider } from "./demo-relationship-provider";
import { buildCmdbHealth, validHealthDate } from "./health-engine";
import { summarize, warrantyDays } from "./dashboard-model";
import { explore, emptyFilters, type ExplorerQuery } from "./explorer-model";
import { buildQrPayload, demoLocatorForAsset, resolveDemoLocator, DEMO_QR_ENVIRONMENT } from "./qr-locator";
import { validateRelationship, relationshipsWithinDepth } from "./relationship-model";

const assets = demoDataset.inventory.assets;
const relations = demoDataset.relationships.relationships;
const byId = new Map(assets.map(a => [a.id, a]));
const health = buildCmdbHealth(demoDataset.inventory, demoDataset.relationships);
const query: ExplorerQuery = { search: "", filters: emptyFilters, page: 1, pageSize: 25, sort: { columnId: "name", direction: "ascending" } };

describe("CMDB-012 catalog integrity", () => {
  it.each(["id", "hostname", "serial", "assetTag", "ipAddress"] as const)("keeps known %s values unique", field => {
    const values = assets.flatMap(a => a[field] ? [a[field]!.trim().toLowerCase()] : []);
    expect(new Set(values).size).toBe(values.length);
  });
  it("preserves the 240 established identities in stable order", () => {
    expect(assets.map(a => a.id)).toEqual(Array.from({ length: 240 }, (_, i) => `DEMO-${String(i + 1).padStart(4, "0")}`));
    expect(relations).toHaveLength(18);
    expect(new Set(relations.map(r => r.id)).size).toBe(18);
  });
  it("uses valid dates and a shared, fixed cut without future observations", () => {
    expect(demoDataset.inventory.asOf).toBe(DEMO_AS_OF);
    expect(demoDataset.relationships.asOf).toBe(DEMO_AS_OF);
    for (const value of assets.flatMap(a => [a.lastSeen, a.warrantyEnds]).concat(relations.map(r => r.observedAt))) {
      if (value !== null) expect(validHealthDate(value), value).toBe(true);
    }
    for (const value of assets.map(a => a.lastSeen).concat(relations.map(r => r.observedAt))) {
      if (value !== null) expect(Date.parse(value)).toBeLessThanOrEqual(Date.parse(DEMO_AS_OF));
    }
  });
  it("has valid endpoints, directions, no self edges or duplicate semantic edges", () => {
    const edges = new Set<string>();
    for (const r of relations) {
      expect(validateRelationship(r)).toEqual([]);
      const source = byId.get(r.sourceId)!, target = byId.get(r.targetId)!;
      expect(source).toBeDefined(); expect(target).toBeDefined();
      expect(source.id).not.toBe(target.id);
      const endpoints = r.direction === "bidirectional" ? [r.sourceId, r.targetId].sort() : [r.sourceId, r.targetId];
      const key = `${r.type}:${endpoints.join(":")}`;
      expect(edges.has(key)).toBe(false); edges.add(key);
      expect(source.lifecycle).toBe("assigned"); expect(target.lifecycle).toBe("assigned");
      expect(source.domain).toBe(target.domain); expect(source.location).toBe(target.location);
      if (r.type === "uses") { expect(source.type).toBe("Computer"); expect(target.type).toBe("Monitor"); }
      if (r.type === "depends_on") { expect(source.type).toBe("Computer"); expect(target.type).toBe("NetworkEquipment"); }
    }
  });
  it("keeps connected components small enough for the existing graph", () => {
    for (const asset of assets) {
      const visited = new Set([asset.id]);
      let previous = 0;
      while (visited.size !== previous) {
        previous = visited.size;
        for (const r of relations) if (visited.has(r.sourceId) || visited.has(r.targetId)) { visited.add(r.sourceId); visited.add(r.targetId); }
      }
      expect(visited.size).toBeLessThanOrEqual(7);
    }
  });
});

describe("synthetic boundary", () => {
  it("allowlists identifiers, fictional owners/sites and TEST-NET addressing", () => {
    for (const a of assets) {
      expect(a.id).toMatch(/^DEMO-\d{4}$/); expect(a.name).toContain("Demo");
      if (a.hostname) expect(a.hostname).toMatch(/^demo-cl-\d{4}$/);
      if (a.serial) expect(a.serial).toMatch(/^SYNTH-SN-\d{6}$/);
      if (a.assetTag) expect(a.assetTag).toMatch(/^DEMO-TAG-\d{4}$/);
      if (a.owner) expect(a.owner).toMatch(/^Responsable Demo [1-8]$/);
      if (a.location) expect(["Oficina Demo Centro", "Planta Demo Norte", "Planta Demo Sur", "Bodega Demo"]).toContain(a.location);
      if (a.manufacturer) expect(a.manufacturer).toMatch(/^Fabricante Demo [ABC]$/);
      if (a.model) expect(a.model).toMatch(/^Modelo Demo /);
      if (a.ipAddress) { expect(a.ipAddress).toMatch(/^192\.0\.2\.\d{1,3}$/); expect(Number(a.ipAddress.split(".")[3])).toBeGreaterThan(0); expect(Number(a.ipAddress.split(".")[3])).toBeLessThan(255); }
    }
    const serialized = JSON.stringify(demoDataset);
    expect(serialized).not.toMatch(/@|https?:\/\/|innergex|password|secret|token|credential|-----BEGIN|gh[pousr]_/i);
    for (const r of relations) expect(r.source).toBe("demo");
  });
  it("resolves every unique locator and contains no asset attributes in its payload", () => {
    const locators = assets.map(a => demoLocatorForAsset(a.id));
    expect(new Set(locators).size).toBe(240);
    for (const a of assets) {
      const locator = demoLocatorForAsset(a.id);
      expect(resolveDemoLocator(locator, assets)).toBe(a.id);
      const payload = buildQrPayload(locator, DEMO_QR_ENVIRONMENT);
      expect(new URL(payload).origin).toBe("https://nexus-demo.invalid");
      expect(new URL(payload).pathname).toBe(`/q/${locator}`);
      for (const value of [a.id, a.serial, a.hostname, a.owner, a.ipAddress]) if (value) expect(payload).not.toContain(value);
    }
  });
});

describe("cross-view scenarios", () => {
  it("shares immutable snapshots through all provider entry points", async () => {
    const signal = new AbortController().signal;
    expect(await demoProvider(signal)).toBe(demoDataset.inventory);
    expect(await demoRelationshipInventoryProvider(signal)).toBe(demoDataset.relationships);
    expect(Object.isFrozen(assets)).toBe(true); expect(Object.isFrozen(assets[0])).toBe(true);
    expect(Object.isFrozen(relations)).toBe(true); expect(Object.isFrozen(relations[0])).toBe(true);
  });
  it("generates identical independent snapshots and processing results", () => {
    const first = createDemoDataset(), second = createDemoDataset();
    expect(first).not.toBe(second); expect(first).toEqual(second);
    expect(buildCmdbHealth(first.inventory, first.relationships)).toEqual(buildCmdbHealth(second.inventory, second.relationships));
    expect(explore(first.inventory, query)).toEqual(explore(second.inventory, query));
  });
  it("finds every hero by ID, known serial and hostname without identity drift", () => {
    expect(new Set(demoHeroes.map(h => h.assetId)).size).toBe(demoHeroes.length);
    for (const hero of demoHeroes) {
      const asset = byId.get(hero.assetId)!; expect(asset).toBeDefined();
      for (const search of [asset.id, asset.serial, asset.hostname]) if (search) expect(explore(demoSnapshot, { ...query, search }).rows).toEqual([asset]);
    }
    expect(explore(demoSnapshot, { ...query, filters: { ...emptyFilters, domain: "OT", type: "Computer" } }).rows.some(a => a.id === "DEMO-0013")).toBe(true);
  });
  it("derives the intended hero quality from actual evidence", () => {
    const result = (id: string) => health.assets.find(a => a.asset.id === id)!;
    for (const id of ["DEMO-0002", "DEMO-0007", "DEMO-0022", "DEMO-0023", "DEMO-0024"]) {
      expect(result(id).score).toBe(100); expect(result(id).coverage).toBe(100); expect(result(id).findings).toEqual([]);
    }
    expect(result("DEMO-0001").state).toBe("insufficient");
    expect(result("DEMO-0020").state).toBe("degraded");
    expect(result("DEMO-0020").findings.map(f => f.code)).toContain("observation_very_stale");
    expect(result("DEMO-0021").state).toBe("attention");
    expect(result("DEMO-0021").findings.map(f => f.code)).toEqual(["observation_stale"]);
    expect(warrantyDays(byId.get("DEMO-0004")!, DEMO_AS_OF)).toBe(20);
    expect(health.orphanRelationships).toBe(0);
    expect(health.relationshipFindings.map(f => f.code).sort()).toEqual(["relationship_observation_stale", "relationship_observation_unknown"]);
  });
  it("offers a connected OT neighborhood, all edge types and legitimate isolation", async () => {
    const signal = new AbortController().signal;
    const one = await demoRelationshipProvider({ assetId: "DEMO-0013", depth: 1 }, signal);
    const two = await demoRelationshipProvider({ assetId: "DEMO-0013", depth: 2 }, signal);
    expect(one.relationships.map(r => r.id)).toEqual(["DEMO-REL-007", "DEMO-REL-008"]);
    expect(two.relationships.map(r => r.id)).toEqual(["DEMO-REL-007", "DEMO-REL-008", "DEMO-REL-009", "DEMO-REL-010", "DEMO-REL-013"]);
    expect(new Set(two.relationships.map(r => r.type))).toEqual(new Set(["uses", "depends_on", "connected_to"]));
    expect(relationshipsWithinDepth(relations, "DEMO-0007", 2)).toEqual([]);
  });
  it("reconciles Dashboard counts and keeps Health separate from lifecycle", () => {
    const all = summarize(demoSnapshot, "all");
    expect(all.assets).toHaveLength(240);
    expect(all.active.length + assets.filter(a => a.lifecycle === "retired").length).toBe(240);
    for (const domain of ["IT", "OT"] as const) {
      const summary = summarize(demoSnapshot, domain);
      expect(summary.assets.length).toBe(assets.filter(a => a.domain === domain).length);
      for (const key of ["type", "domain", "location", "lifecycle"] as const) expect(summary.countBy(key).reduce((n, row) => n + row.value, 0)).toBe(summary.assets.length);
    }
    expect(health.summary.evaluated).toBe(240);
    expect(Object.values(health.summary.distribution).reduce((a, b) => a + b, 0)).toBe(240);
    for (const state of ["healthy", "attention", "degraded", "insufficient"] as const) expect(health.summary.distribution[state]).toBeGreaterThan(0);
    expect(health.assets.some(a => a.state === "degraded" && a.asset.lifecycle === "assigned")).toBe(true);
    expect(health.assets.some(a => a.state === "healthy" && a.asset.lifecycle === "repair")).toBe(true);
  });
});

// Deliberate dataset contract. Review semantic changes before updating these expectations.
it("locks the reviewed catalog content and distribution", () => {
  expect(createHash("sha256").update(JSON.stringify(demoDataset)).digest("hex")).toBe("290589c730513eec3c04c7db008bc4ff95d03eb7b142aab7c991f89117d087f1");
  const dashboard = summarize(demoSnapshot, "all");
  expect(Object.fromEntries(dashboard.countBy("type").map(r => [r.label, r.value]))).toEqual({ Computer: 100, Monitor: 49, NetworkEquipment: 37, Phone: 31, Printer: 23 });
  expect(Object.fromEntries(dashboard.countBy("domain").map(r => [r.label, r.value]))).toEqual({ IT: 199, OT: 41 });
  expect(Object.fromEntries(dashboard.countBy("lifecycle").map(r => [r.label, r.value]))).toEqual({ assigned: 196, stock: 26, repair: 9, retired: 9 });
  expect({ active: dashboard.active.length, fresh: dashboard.fresh, complete: dashboard.complete, due: dashboard.due.length, expired: dashboard.expired, unknownWarranty: dashboard.unknownWarranty, critical: dashboard.critical.length, criticalStale: dashboard.criticalStale })
    .toEqual({ active: 231, fresh: 162, complete: 194, due: 43, expired: 21, unknownWarranty: 13, critical: 12, criticalStale: 4 });
  expect(health.summary.distribution).toEqual({ healthy: 182, attention: 45, degraded: 12, insufficient: 1, unknown: 0 });
  expect(health.summary.score).toBeCloseTo(94.62012320328543, 8);
  expect(health.summary.coverage).toBeCloseTo(96.93035426731078, 8);
});
