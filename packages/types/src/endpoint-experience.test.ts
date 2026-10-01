import { describe, expect, it } from "vitest";
import type { Observation, TechnologyAsset, TechnologySnapshot } from "./model.js";
import { buildEndpointExperienceReport } from "./endpoint-experience.js";

const at = "2026-10-01T12:00:00.000Z";

function asset(id: string, options: { domain?: "IT" | "OT"; assetClass?: TechnologyAsset["assetClass"]; lifecycle?: TechnologyAsset["lifecycle"] } = {}): TechnologyAsset {
  const domain = options.domain ?? "IT";
  const assetClass = options.assetClass ?? "endpoint";
  const role = domain === "OT" ? "supervision" : "user_endpoint";
  return {
    id, displayName: id, domain, assetClass, role,
    taxonomy: {
      taxonomyVersion: "2",
      domain: { state: "classified", value: domain, method: "observed", reviewRequired: false, ruleId: "test" },
      assetClass: { state: "classified", value: assetClass, method: "observed", reviewRequired: false, ruleId: "test" },
      role: { state: "classified", value: role, method: "observed", reviewRequired: false, ruleId: "test" },
    },
    lifecycle: options.lifecycle ?? "active", criticality: "medium", identifiers: [],
    sourceReferences: [{ source: "demo", sourceInstanceId: "endpoint-test", externalId: id, observedAt: at, authority: "trusted" }],
    attributes: {}, provenance: [],
  };
}

function observation(id: string, assetId: string, name: Observation["name"], value: Observation["value"], observedAt = at, category: Observation["category"] = "metric"): Observation {
  return {
    id, assetId, category, name, value, observedAt,
    source: { source: "demo", sourceInstanceId: "endpoint-test", externalId: id, observedAt, authority: "trusted" },
    authority: "trusted",
  };
}

function snapshot(assets: readonly TechnologyAsset[], observations: readonly Observation[]): TechnologySnapshot {
  return { schemaVersion: "0.2", asOf: at, assets, relationships: [], observations };
}

describe("Endpoint Experience", () => {
  it("distingue cero observado de ausencia de cobertura", () => {
    const input = snapshot([asset("A"), asset("B")], [
      observation("A-WINDOW", "A", "endpoint.reliability.window.days", { kind: "number", value: 14, unit: "day" }),
    ]);
    const report = buildEndpointExperienceReport(input);
    expect(report.reliability.coverage).toEqual({ state: "partial", known: 1, total: 2, ratio: 0.5 });
    expect(report.reliability.crashes.eventCount).toBe(0);
    expect(report.reliability.crashes.affectedAssets).toBe(0);
    expect(report.reliability.crashes.affectedRatio).toBe(0);
  });

  it("cuenta crashes y hangs sólo dentro de la ventana y de assets cubiertos", () => {
    const input = snapshot([asset("A"), asset("B")], [
      observation("A-WINDOW", "A", "endpoint.reliability.window.days", { kind: "number", value: 14, unit: "day" }),
      observation("B-WINDOW", "B", "endpoint.reliability.window.days", { kind: "number", value: 7, unit: "day" }),
      observation("A-CRASH", "A", "application.crash", { kind: "none" }, "2026-09-28T12:00:00.000Z", "event"),
      observation("A-HANG", "A", "application.hang", { kind: "none" }, "2026-09-20T12:00:00.000Z", "event"),
      observation("B-CRASH", "B", "application.crash", { kind: "none" }, "2026-09-30T12:00:00.000Z", "event"),
    ]);
    const report = buildEndpointExperienceReport(input);
    expect(report.reliability.coverage.known).toBe(1);
    expect(report.reliability.crashes.eventCount).toBe(1);
    expect(report.reliability.crashes.affectedRatio).toBe(1);
    expect(report.reliability.hangs.eventCount).toBe(1);
  });

  it("separa reinicios inesperados de stop-error", () => {
    const input = snapshot([asset("A")], [
      observation("WINDOW", "A", "endpoint.event_log.window.days", { kind: "number", value: 30, unit: "day" }),
      observation("R1", "A", "system.unexpected_restart", { kind: "none" }, "2026-09-30T12:00:00.000Z", "event"),
      observation("R2", "A", "system.unexpected_restart", { kind: "none" }, "2026-09-29T12:00:00.000Z", "event"),
      observation("STOP", "A", "system.stop_error_restart", { kind: "none" }, "2026-09-28T12:00:00.000Z", "event"),
    ]);
    const report = buildEndpointExperienceReport(input);
    expect(report.restarts.unexpected.eventCount).toBe(2);
    expect(report.restarts.stopError.eventCount).toBe(1);
  });

  it("calcula startup sólo con muestras ms y cobertura declarada", () => {
    const input = snapshot([asset("A"), asset("B")], [
      observation("A-WINDOW", "A", "endpoint.startup.window.days", { kind: "number", value: 14, unit: "day" }),
      observation("A-S1", "A", "startup.duration.ms", { kind: "number", value: 40000, unit: "ms" }, "2026-09-30T12:00:00.000Z"),
      observation("A-S2", "A", "startup.duration.ms", { kind: "number", value: 60000, unit: "ms" }, "2026-09-29T12:00:00.000Z"),
      observation("B-S", "B", "startup.duration.ms", { kind: "number", value: 99999, unit: "ms" }, "2026-09-30T12:00:00.000Z"),
    ]);
    const report = buildEndpointExperienceReport(input);
    expect(report.startup.coverage).toEqual({ state: "partial", known: 1, total: 2, ratio: 0.5 });
    expect(report.startup.samples).toBe(2);
    expect(report.startup.assetsWithSamples).toBe(1);
    expect(report.startup.averageMs).toBe(50000);
  });

  it("trata battery present=false como capacidad no aplicable y conserva gaps", () => {
    const input = snapshot([asset("LAPTOP"), asset("DESKTOP"), asset("UNKNOWN")], [
      observation("LP-PRESENT", "LAPTOP", "battery.present", { kind: "boolean", value: true }),
      observation("DT-PRESENT", "DESKTOP", "battery.present", { kind: "boolean", value: false }),
      observation("LP-CAP", "LAPTOP", "battery.capacity.percent", { kind: "number", value: 82, unit: "percent" }, "2026-09-30T12:00:00.000Z"),
    ]);
    const report = buildEndpointExperienceReport(input);
    expect(report.battery.capabilityCoverage).toEqual({ state: "partial", known: 2, total: 3, ratio: 2 / 3 });
    expect(report.battery.present).toBe(1);
    expect(report.battery.absent).toBe(1);
    expect(report.battery.capacityCoverage).toEqual({ state: "known", known: 1, total: 1, ratio: 1 });
    expect(report.battery.averageCapacityPercent).toBe(82);
  });

  it("ignora capability de batería fuera de ventana y capacidad con unidad incorrecta", () => {
    const input = snapshot([asset("STALE"), asset("WRONG-UNIT")], [
      observation("STALE-PRESENT", "STALE", "battery.present", { kind: "boolean", value: true }, "2026-08-01T12:00:00.000Z", "state"),
      observation("WRONG-PRESENT", "WRONG-UNIT", "battery.present", { kind: "boolean", value: true }, at, "state"),
      observation("WRONG-CAP", "WRONG-UNIT", "battery.capacity.percent", { kind: "number", value: 88, unit: "%" }, "2026-09-30T12:00:00.000Z"),
    ]);
    const report = buildEndpointExperienceReport(input);
    expect(report.battery.capabilityCoverage).toEqual({ state: "partial", known: 1, total: 2, ratio: 0.5 });
    expect(report.battery.present).toBe(1);
    expect(report.battery.capacityCoverage).toEqual({ state: "unavailable", known: 0, total: 1, ratio: 0 });
    expect(report.battery.averageCapacityPercent).toBeNull();
  });
  it("respeta cohortes domain sólo desde Taxonomy v2 classified y lifecycle operacional", () => {
    const unresolved = asset("UNRESOLVED");
    const input = snapshot([
      asset("IT"),
      asset("OT", { domain: "OT", assetClass: "operator_interface" }),
      asset("RETIRED", { lifecycle: "retired" }),
      { ...unresolved, taxonomy: { ...unresolved.taxonomy!, domain: { state: "unknown", reviewRequired: true, ruleId: "test", reasonCode: "missing" } } },
    ], []);
    expect(buildEndpointExperienceReport(input, { domain: "IT" }).population.assetIds).toEqual(["IT"]);
    expect(buildEndpointExperienceReport(input, { domain: "OT" }).population.assetIds).toEqual(["OT"]);
  });

  it("no muta el snapshot", () => {
    const input = snapshot([asset("A")], []);
    const before = JSON.stringify(input);
    buildEndpointExperienceReport(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});
