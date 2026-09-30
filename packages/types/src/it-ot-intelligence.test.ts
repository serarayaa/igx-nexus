import { describe, expect, it } from "vitest";
import type {
  OperationalContextReference,
  SourceReference,
  TaxonomyDecision,
  TechnologyAsset,
  TechnologyAssetClass,
  TechnologyDomain,
  TechnologyRole,
  TechnologySnapshot,
} from "./model.js";
import { buildItOtIntelligenceReport } from "./it-ot-intelligence.js";

const at = "2026-09-30T15:00:00.000Z";

function classified<T extends string>(value: T): TaxonomyDecision<T> {
  return {
    state: "classified",
    value,
    method: "observed",
    reviewRequired: false,
    ruleId: "test.classified",
  };
}

function unresolved<T extends string>(state: "unknown" | "unclassified"): TaxonomyDecision<T> {
  return {
    state,
    reviewRequired: true,
    ruleId: `test.${state}`,
    reasonCode: "test",
  };
}

function conflict<T extends string>(): TaxonomyDecision<T> {
  return {
    state: "conflict",
    reviewRequired: true,
    ruleId: "test.conflict",
    reasonCode: "test",
  };
}

interface AssetOptions {
  readonly scalarDomain?: TechnologyDomain;
  readonly taxonomyDomain?: TaxonomyDecision<TechnologyDomain> | null;
  readonly assetClass?: TaxonomyDecision<TechnologyAssetClass>;
  readonly role?: TaxonomyDecision<TechnologyRole>;
  readonly lifecycle?: TechnologyAsset["lifecycle"];
  readonly sourceInstanceId?: string | null;
  readonly operationalContexts?: readonly OperationalContextReference[];
}

function asset(id: string, options: AssetOptions = {}): TechnologyAsset {
  const scalarDomain = options.scalarDomain ?? "IT";
  const source: SourceReference = {
    source: "demo",
    ...(options.sourceInstanceId === null ? {} : { sourceInstanceId: options.sourceInstanceId ?? "it-ot-test" }),
    externalId: id,
    observedAt: at,
    authority: "trusted",
  };
  const taxonomyDomain = options.taxonomyDomain === undefined
    ? classified<TechnologyDomain>(scalarDomain)
    : options.taxonomyDomain;
  const defaults = scalarDomain === "OT"
    ? {
        assetClass: classified<TechnologyAssetClass>("controller"),
        role: classified<TechnologyRole>("control"),
      }
    : {
        assetClass: classified<TechnologyAssetClass>("endpoint"),
        role: classified<TechnologyRole>("user_endpoint"),
      };

  return {
    id,
    displayName: id,
    domain: scalarDomain,
    assetClass: scalarDomain === "OT" ? "controller" : "endpoint",
    role: scalarDomain === "OT" ? "control" : "user_endpoint",
    ...(taxonomyDomain === null
      ? {}
      : {
          taxonomy: {
            taxonomyVersion: "2",
            domain: taxonomyDomain,
            assetClass: options.assetClass ?? defaults.assetClass,
            role: options.role ?? defaults.role,
          },
        }),
    lifecycle: options.lifecycle ?? "active",
    criticality: "medium",
    ...(options.operationalContexts === undefined ? {} : { operationalContexts: options.operationalContexts }),
    identifiers: [],
    sourceReferences: [source],
    attributes: {},
    provenance: [],
  };
}

function snapshot(assets: readonly TechnologyAsset[]): TechnologySnapshot {
  return {
    schemaVersion: "0.2",
    asOf: at,
    assets,
    relationships: [],
    observations: [],
  };
}

describe("IT / OT Intelligence", () => {
  it("asigna cohortes sólo desde domain Taxonomy v2 classified y deja visible unresolved", () => {
    const report = buildItOtIntelligenceReport(snapshot([
      asset("IT-1", { scalarDomain: "IT" }),
      asset("OT-1", { scalarDomain: "OT" }),
      asset("LEGACY", { scalarDomain: "IT", taxonomyDomain: null }),
      asset("UNKNOWN", { scalarDomain: "IT", taxonomyDomain: unresolved("unknown") }),
      asset("CONFLICT", { scalarDomain: "OT", taxonomyDomain: conflict() }),
    ]));

    expect(report.population).toEqual({
      total: 5,
      classified: 2,
      unresolved: 3,
      domainCoverage: { state: "partial", known: 2, total: 5, ratio: 0.4 },
      unresolvedByReason: {
        assessmentMissing: 1,
        unknown: 1,
        unclassified: 0,
        conflict: 1,
      },
    });
    expect(report.cohorts.IT.population).toBe(1);
    expect(report.cohorts.OT.population).toBe(1);
  });

  it("mantiene coverage propio para class y role dentro de una cohorte", () => {
    const report = buildItOtIntelligenceReport(snapshot([
      asset("IT-1", {
        assetClass: classified("endpoint"),
        role: unresolved("unknown"),
      }),
      asset("IT-2", {
        assetClass: classified("server"),
        role: classified("application_server"),
      }),
    ]));

    expect(report.cohorts.IT.assetClass).toEqual({
      coverage: { state: "known", known: 2, total: 2, ratio: 1 },
      distribution: [
        { value: "endpoint", count: 1 },
        { value: "server", count: 1 },
      ],
    });
    expect(report.cohorts.IT.role).toEqual({
      coverage: { state: "partial", known: 1, total: 2, ratio: 0.5 },
      distribution: [{ value: "application_server", count: 1 }],
    });
    expect(report.cohorts.IT.metrics.taxonomyResolved).toMatchObject({
      value: 0.5,
      numerator: 1,
      denominator: 2,
      coverage: { state: "known", known: 2, total: 2, ratio: 1 },
    });
  });

  it("distingue ausencia histórica de operationalContexts de un array vacío conocido", () => {
    const site: OperationalContextReference = {
      id: "SCL-01",
      kind: "site",
      displayName: "Santiago",
    };
    const report = buildItOtIntelligenceReport(snapshot([
      asset("OT-UNKNOWN-CONTEXT", { scalarDomain: "OT" }),
      asset("OT-KNOWN-EMPTY", { scalarDomain: "OT", operationalContexts: [] }),
      asset("OT-SITE", { scalarDomain: "OT", operationalContexts: [site, site] }),
    ]));

    expect(report.cohorts.OT.operationalContext.coverage).toEqual({
      state: "partial",
      known: 2,
      total: 3,
      ratio: 2 / 3,
    });
    expect(report.cohorts.OT.operationalContext.distribution).toEqual([{
      key: JSON.stringify(["site", "SCL-01"]),
      kind: "site",
      id: "SCL-01",
      count: 1,
    }]);
  });

  it("reutiliza métricas gobernadas para source identity y lifecycle sin cambiar sus denominadores", () => {
    const report = buildItOtIntelligenceReport(snapshot([
      asset("IT-GOOD"),
      asset("IT-PARTIAL", { lifecycle: "unknown", sourceInstanceId: null }),
    ]));

    expect(report.cohorts.IT.metrics.sourceInstanceIdentity).toMatchObject({
      value: 0.5,
      numerator: 1,
      denominator: 2,
      population: { scoped: 2, eligible: 2, unknown: 0 },
    });
    expect(report.cohorts.IT.metrics.lifecycleKnown).toMatchObject({
      value: 0.5,
      numerator: 1,
      denominator: 2,
      population: { scoped: 2, eligible: 2, unknown: 0 },
    });
  });

  it("conserva población vacía como unavailable en vez de fabricar 0 %", () => {
    const report = buildItOtIntelligenceReport(snapshot([]));

    expect(report.population.domainCoverage).toEqual({
      state: "unavailable",
      known: 0,
      total: 0,
      ratio: null,
    });
    expect(report.cohorts.IT.population).toBe(0);
    expect(report.cohorts.OT.population).toBe(0);
    expect(report.cohorts.IT.metrics.inventoryCount.value).toBe(0);
    expect(report.cohorts.IT.metrics.inventoryCount.coverage.ratio).toBeNull();
  });
});
