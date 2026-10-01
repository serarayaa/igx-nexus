import { describe, expect, it } from "vitest";
import type { Observation, TechnologyAsset, TechnologySnapshot } from "./model.js";
import { buildProactiveFindingsReport } from "./proactive-findings.js";

const at = "2026-10-01T12:00:00.000Z";

function asset(
  id: string,
  options: {
    domain?: "IT" | "OT";
    assetClass?: TechnologyAsset["assetClass"];
    lifecycle?: TechnologyAsset["lifecycle"];
    taxonomyResolved?: boolean;
  } = {},
): TechnologyAsset {
  const domain = options.domain ?? "IT";
  const assetClass = options.assetClass ?? "endpoint";
  const role = domain === "OT" ? "supervision" : "user_endpoint";
  const taxonomyResolved = options.taxonomyResolved ?? true;
  return {
    id,
    displayName: id,
    domain,
    assetClass,
    role,
    taxonomy: {
      taxonomyVersion: "2",
      domain: taxonomyResolved
        ? { state: "classified", value: domain, method: "observed", reviewRequired: false, ruleId: "test" }
        : { state: "unknown", reviewRequired: true, ruleId: "test", reasonCode: "missing" },
      assetClass: { state: "classified", value: assetClass, method: "observed", reviewRequired: false, ruleId: "test" },
      role: { state: "classified", value: role, method: "observed", reviewRequired: false, ruleId: "test" },
    },
    lifecycle: options.lifecycle ?? "active",
    criticality: "medium",
    identifiers: [],
    sourceReferences: [{
      source: "demo",
      sourceInstanceId: "finding-test",
      externalId: id,
      observedAt: at,
      authority: "trusted",
    }],
    attributes: {},
    provenance: [],
  };
}

function observation(
  id: string,
  assetId: string,
  name: Observation["name"],
  value: Observation["value"],
  observedAt = at,
  category: Observation["category"] = "metric",
): Observation {
  return {
    id,
    assetId,
    category,
    name,
    value,
    observedAt,
    source: {
      source: "demo",
      sourceInstanceId: "finding-test",
      externalId: id,
      observedAt,
      authority: "trusted",
    },
    authority: "trusted",
  };
}

function snapshot(
  assets: readonly TechnologyAsset[],
  observations: readonly Observation[],
): TechnologySnapshot {
  return { schemaVersion: "0.2", asOf: at, assets, relationships: [], observations };
}

describe("Proactive Findings Engine", () => {
  it("levanta inestabilidad de aplicación sólo con recurrencia y coverage suficiente", () => {
    const input = snapshot([asset("A"), asset("B")], [
      observation("A-WINDOW", "A", "endpoint.reliability.window.days", { kind: "number", value: 14, unit: "day" }),
      observation("B-WINDOW", "B", "endpoint.reliability.window.days", { kind: "number", value: 14, unit: "day" }),
      observation("A-CRASH", "A", "application.crash", { kind: "none" }, "2026-09-30T12:00:00.000Z", "event"),
      observation("A-HANG", "A", "application.hang", { kind: "none" }, "2026-09-29T12:00:00.000Z", "event"),
      observation("B-CRASH", "B", "application.crash", { kind: "none" }, "2026-09-30T12:00:00.000Z", "event"),
    ]);

    const report = buildProactiveFindingsReport(input);
    const finding = report.findings.find(item => item.ruleId === "nexus.endpoint.application-instability");

    expect(finding?.assetId).toBe("A");
    expect(finding?.pattern).toMatchObject({ kind: "recurrence", observedCount: 2, threshold: 2 });
    expect(finding?.hypothesis.causal).toBe(false);
    expect(finding?.evidence.map(item => item.observationId)).toEqual(["A-HANG", "A-CRASH"]);
    expect(report.evaluations[0]).toMatchObject({
      state: "triggered",
      evaluatedAssets: 2,
      triggeredAssets: 1,
      coverage: { state: "known", known: 2, total: 2, ratio: 1 },
    });
  });

  it("no confunde ausencia de marker con cero observado", () => {
    const input = snapshot([asset("A")], [
      observation("CRASH", "A", "application.crash", { kind: "none" }, "2026-09-30T12:00:00.000Z", "event"),
      observation("HANG", "A", "application.hang", { kind: "none" }, "2026-09-29T12:00:00.000Z", "event"),
    ]);
    const report = buildProactiveFindingsReport(input);
    expect(report.findings).toHaveLength(0);
    expect(report.evaluations[0]).toMatchObject({
      state: "unavailable",
      evaluatedAssets: 0,
      triggeredAssets: 0,
      coverage: { state: "unavailable", known: 0, total: 1, ratio: 0 },
    });
  });

  it("levanta reinicios repetidos sin convertir stop-error en la causa del patrón", () => {
    const input = snapshot([asset("A")], [
      observation("WINDOW", "A", "endpoint.event_log.window.days", { kind: "number", value: 30, unit: "day" }),
      observation("R1", "A", "system.unexpected_restart", { kind: "none" }, "2026-09-30T12:00:00.000Z", "event"),
      observation("R2", "A", "system.unexpected_restart", { kind: "none" }, "2026-09-29T12:00:00.000Z", "event"),
      observation("STOP", "A", "system.stop_error_restart", { kind: "none" }, "2026-09-28T12:00:00.000Z", "event"),
    ]);
    const report = buildProactiveFindingsReport(input);
    const finding = report.findings.find(item => item.ruleId === "nexus.endpoint.repeated-unclean-restart");

    expect(finding?.pattern.observedCount).toBe(2);
    expect(finding?.summary).toContain("1 stop-error");
    expect(finding?.hypothesis.causal).toBe(false);
    expect(finding?.evidence.map(item => item.observationId)).toEqual(["R2", "R1", "STOP"]);
  });

  it("describe un gap de capacidad de batería sin llamarlo degradación", () => {
    const input = snapshot([asset("GAP"), asset("OK"), asset("DESKTOP")], [
      observation("GAP-PRESENT", "GAP", "battery.present", { kind: "boolean", value: true }),
      observation("OK-PRESENT", "OK", "battery.present", { kind: "boolean", value: true }),
      observation("OK-CAP", "OK", "battery.capacity.percent", { kind: "number", value: 84, unit: "percent" }),
      observation("DT-PRESENT", "DESKTOP", "battery.present", { kind: "boolean", value: false }),
    ]);
    const report = buildProactiveFindingsReport(input);
    const batteryFindings = report.findings.filter(item => item.ruleId === "nexus.endpoint.battery-capacity-evidence-gap");

    expect(batteryFindings.map(item => item.assetId)).toEqual(["GAP"]);
    expect(batteryFindings[0]?.pattern.kind).toBe("evidence_gap");
    expect(batteryFindings[0]?.hypothesis.text).toContain("no demuestra degradación");
    expect(report.evaluations[2]).toMatchObject({
      state: "triggered",
      evaluatedAssets: 3,
      triggeredAssets: 1,
      coverage: { state: "known", known: 3, total: 3, ratio: 1 },
    });
  });

  it("mantiene domain unresolved fuera de cohortes y lifecycle no operacional fuera de población", () => {
    const input = snapshot([
      asset("IT"),
      asset("OT", { domain: "OT", assetClass: "operator_interface" }),
      asset("UNRESOLVED", { taxonomyResolved: false }),
      asset("RETIRED", { lifecycle: "retired" }),
    ], []);

    expect(buildProactiveFindingsReport(input, { domain: "IT" }).population.assetIds).toEqual(["IT"]);
    expect(buildProactiveFindingsReport(input, { domain: "OT" }).population.assetIds).toEqual(["OT"]);
  });

  it("produce IDs deterministas y no muta el snapshot", () => {
    const input = snapshot([asset("A")], [
      observation("WINDOW", "A", "endpoint.reliability.window.days", { kind: "number", value: 14, unit: "day" }),
      observation("C1", "A", "application.crash", { kind: "none" }, "2026-09-30T12:00:00.000Z", "event"),
      observation("C2", "A", "application.crash", { kind: "none" }, "2026-09-29T12:00:00.000Z", "event"),
    ]);
    const before = JSON.stringify(input);
    const first = buildProactiveFindingsReport(input);
    const second = buildProactiveFindingsReport(input);

    expect(first.findings[0]?.id).toBe("nexus.endpoint.application-instability:A");
    expect(second).toEqual(first);
    expect(JSON.stringify(input)).toBe(before);
  });
});
