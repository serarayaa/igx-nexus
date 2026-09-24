import { describe, expect, it } from "vitest";
import {
  emptyMetricScope,
  evaluateReferenceMetric,
  metricDimensionValues,
  referenceMetricDefinitions,
  type MetricScope,
} from "./analytics.js";
import {
  technologySchemaVersion,
  technologyTaxonomyVersion,
  type SourceReference,
  type TechnologyAsset,
  type TechnologySnapshot,
} from "./model.js";

const at = "2026-09-24T18:00:00Z";

function source(source: SourceReference["source"], externalId: string, sourceInstanceId?: string): SourceReference {
  return {
    source,
    ...(sourceInstanceId ? { sourceInstanceId } : {}),
    externalId,
    observedAt: at,
    authority: "trusted",
  };
}

const glpiPrimary = source("glpi", "Computer/1", "glpi-primary");
const glpiSecondary = source("glpi", "Computer/1", "glpi-secondary");
const demo = source("demo", "DEMO-0002", "demo-v0.2");
const intune = source("intune", "managedDevice/4", "tenant-lab");

const classified = <T extends string>(value: T) => ({
  state: "classified" as const,
  value,
  method: "normalized" as const,
  reviewRequired: false,
  ruleId: "test.classified",
});

const unresolved = (state: "unknown" | "unclassified") => ({
  state,
  reviewRequired: true as const,
  ruleId: `test.${state}`,
  reasonCode: `test.${state}`,
});

function asset(
  id: string,
  overrides: Partial<TechnologyAsset> = {},
): TechnologyAsset {
  return {
    id,
    displayName: id,
    domain: "IT",
    assetClass: "endpoint",
    role: "user_endpoint",
    taxonomy: {
      taxonomyVersion: technologyTaxonomyVersion,
      domain: classified("IT"),
      assetClass: classified("endpoint"),
      role: classified("user_endpoint"),
    },
    lifecycle: "active",
    criticality: "medium",
    identifiers: [],
    sourceReferences: [glpiPrimary],
    attributes: {},
    provenance: [],
    operationalContexts: [{ id: "SCL-01", kind: "site", displayName: "Site demo" }],
    ...overrides,
  };
}

function snapshot(assets: readonly TechnologyAsset[] = fixtureAssets()): TechnologySnapshot {
  return {
    schemaVersion: technologySchemaVersion,
    asOf: at,
    assets,
    relationships: [],
    observations: [],
  };
}

function fixtureAssets(): readonly TechnologyAsset[] {
  return [
    asset("A-IT"),
    asset("A-OT", {
      domain: "OT",
      assetClass: "controller",
      role: "control",
      taxonomy: {
        taxonomyVersion: technologyTaxonomyVersion,
        domain: classified("OT"),
        assetClass: classified("controller"),
        role: classified("control"),
      },
      lifecycle: "unknown",
      sourceReferences: [demo],
      operationalContexts: [{ id: "PLANT-01", kind: "site" }],
    }),
    asset("A-FALLBACK", {
      // Scalars remain compatibility values; the assessment is deliberately unresolved.
      domain: "IT",
      assetClass: "endpoint",
      role: "user_endpoint",
      taxonomy: {
        taxonomyVersion: technologyTaxonomyVersion,
        domain: unresolved("unknown"),
        assetClass: unresolved("unclassified"),
        role: unresolved("unknown"),
      },
      lifecycle: "maintenance",
      sourceReferences: [glpiSecondary],
      operationalContexts: [],
    }),
    (() => {
      const historical = asset("A-HISTORICAL", {
        lifecycle: "active",
        sourceReferences: [intune],
      });
      const { taxonomy: _taxonomy, operationalContexts: _operationalContexts, ...withoutOptionalEvidence } = historical;
      return withoutOptionalEvidence;
    })(),
  ];
}

function ok(id: Parameters<typeof evaluateReferenceMetric>[0], data = snapshot(), scope: MetricScope = emptyMetricScope) {
  const evaluation = evaluateReferenceMetric(id, data, scope);
  expect(evaluation.status).toBe("ok");
  if (evaluation.status !== "ok") throw new Error("expected metric evaluation to succeed");
  return evaluation.result;
}

describe("analytics contract", () => {
  it("keeps reference metric definitions data-only with stable unique ids", () => {
    expect(new Set(referenceMetricDefinitions.map((definition) => definition.id)).size)
      .toBe(referenceMetricDefinitions.length);
    expect(referenceMetricDefinitions.every((definition) =>
      Object.values(definition).every((value) => typeof value !== "function"))).toBe(true);
  });

  it("evaluates inventory count without inventing a ratio denominator", () => {
    const result = ok("nexus.inventory.assets.count");
    expect(result.value).toBe(4);
    expect(result.numerator).toBe(4);
    expect(result.denominator).toBeNull();
    expect(result.coverage).toEqual({
      state: "known",
      known: 4,
      total: 4,
      ratio: 1,
      reason: "complete",
    });
  });

  it("separates taxonomy value from measurement coverage", () => {
    const result = ok("nexus.taxonomy.resolved.ratio");
    expect(result.numerator).toBe(2);
    expect(result.denominator).toBe(3);
    expect(result.value).toBeCloseTo(2 / 3);
    expect(result.population.unknown).toBe(1);
    expect(result.coverage.state).toBe("partial");
    expect(result.coverage.ratio).toBeCloseTo(3 / 4);
  });

  it("treats explicit lifecycle unknown as a measured value, not missing evidence", () => {
    const result = ok("nexus.lifecycle.known.ratio");
    expect(result.value).toBeCloseTo(3 / 4);
    expect(result.numerator).toBe(3);
    expect(result.denominator).toBe(4);
    expect(result.population.unknown).toBe(0);
    expect(result.coverage.state).toBe("known");
  });

  it("measures missing source references as a negative value rather than hiding them from coverage", () => {
    const assets = [...fixtureAssets()];
    assets[3] = asset("A-NO-SOURCE", { sourceReferences: [] });
    const result = ok("nexus.sources.reference_presence.ratio", snapshot(assets));
    expect(result.value).toBeCloseTo(3 / 4);
    expect(result.coverage.state).toBe("known");
    expect(result.population.unknown).toBe(0);
  });

  it("does not use compatibility scalar taxonomy as an analytical domain", () => {
    const result = ok("nexus.inventory.assets.count", snapshot(), {
      filters: [{ dimension: "domain", values: ["IT"] }],
    });
    expect(result.value).toBe(1);
    expect(result.population.scoped).toBe(1);
  });

  it("preserves source instance identity in analytical source dimensions", () => {
    expect(metricDimensionValues(fixtureAssets()[0]!, "source")).toEqual(["glpi@glpi-primary"]);
    expect(metricDimensionValues(fixtureAssets()[2]!, "source")).toEqual(["glpi@glpi-secondary"]);

    const primary = ok("nexus.inventory.assets.count", snapshot(), {
      filters: [{ dimension: "source", values: ["glpi@glpi-primary"] }],
    });
    const secondary = ok("nexus.inventory.assets.count", snapshot(), {
      filters: [{ dimension: "source", values: ["glpi@glpi-secondary"] }],
    });
    expect(primary.value).toBe(1);
    expect(secondary.value).toBe(1);
  });

  it("rejects dimensions whose segmentation would make a metric tautological", () => {
    const evaluation = evaluateReferenceMetric("nexus.sources.reference_presence.ratio", snapshot(), {
      filters: [{ dimension: "source", values: ["glpi@glpi-primary"] }],
    });
    expect(evaluation.status).toBe("invalid_scope");
    if (evaluation.status === "invalid_scope") {
      expect(evaluation.issues).toContainEqual(expect.objectContaining({
        code: "dimension_not_allowed",
        dimension: "source",
      }));
    }
  });

  it("makes an empty eligible population unavailable instead of returning a misleading percentage", () => {
    const result = ok("nexus.inventory.assets.count", snapshot(), {
      filters: [
        { dimension: "domain", values: ["OT"] },
        { dimension: "lifecycle", values: ["active"] },
      ],
    });
    expect(result.value).toBe(0);
    expect(result.coverage).toEqual({
      state: "unavailable",
      known: 0,
      total: 0,
      ratio: null,
      reason: "no_eligible_population",
    });
  });

  it("normalizes scope deterministically and never mutates the canonical snapshot", () => {
    const data = snapshot();
    const before = JSON.stringify(data);
    const result = ok("nexus.inventory.assets.count", data, {
      filters: [
        { dimension: "source", values: ["glpi@glpi-secondary", "glpi@glpi-primary", "glpi@glpi-primary"] },
        { dimension: "lifecycle", values: ["maintenance", "active"] },
      ],
    });

    expect(result.scope).toEqual({
      filters: [
        { dimension: "lifecycle", values: ["active", "maintenance"] },
        { dimension: "source", values: ["glpi@glpi-primary", "glpi@glpi-secondary"] },
      ],
    });
    expect(JSON.stringify(data)).toBe(before);
  });
});
