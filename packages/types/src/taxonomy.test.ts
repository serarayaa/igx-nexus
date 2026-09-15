import { describe, expect, it } from "vitest";
import {
  technologySchemaVersion,
  technologyTaxonomyVersion,
  type TechnologyAsset,
  type TechnologyTaxonomyAssessment,
} from "./model.js";
import {
  assetClassBelongsToDomain,
  technologyRoleBelongsToDomain,
  validateAssetTaxonomyProjection,
  validateOperationalContextReference,
  validateTechnologySnapshotTaxonomy,
  validateTechnologyTaxonomyAssessment,
} from "./taxonomy.js";

function classifiedAssessment(overrides: Partial<TechnologyTaxonomyAssessment> = {}): TechnologyTaxonomyAssessment {
  return {
    taxonomyVersion: technologyTaxonomyVersion,
    domain: { state: "classified", value: "IT", method: "inferred", reviewRequired: false, ruleId: "test.it" },
    assetClass: { state: "classified", value: "endpoint", method: "normalized", reviewRequired: false, ruleId: "test.it" },
    role: { state: "classified", value: "user_endpoint", method: "inferred", reviewRequired: false, ruleId: "test.it" },
    ...overrides,
  };
}

function asset(overrides: Partial<TechnologyAsset> = {}): TechnologyAsset {
  const source = {
    source: "demo" as const,
    externalId: "taxonomy-test",
    observedAt: "2026-09-15T19:30:00Z",
    authority: "trusted" as const,
  };
  return {
    id: "NXS-TAXONOMY-TEST",
    displayName: "Synthetic taxonomy asset",
    domain: "IT",
    assetClass: "endpoint",
    role: "user_endpoint",
    taxonomy: classifiedAssessment(),
    lifecycle: "active",
    criticality: "medium",
    operationalContexts: [],
    identifiers: [],
    sourceReferences: [source],
    attributes: {},
    provenance: [],
    ...overrides,
  };
}

describe("IT/OT taxonomy v2 domain invariants", () => {
  it("keeps IT and OT class catalogs distinct", () => {
    expect(assetClassBelongsToDomain("IT", "endpoint")).toBe(true);
    expect(assetClassBelongsToDomain("OT", "endpoint")).toBe(false);
    expect(assetClassBelongsToDomain("OT", "controller")).toBe(true);
    expect(assetClassBelongsToDomain("IT", "controller")).toBe(false);
  });

  it("treats role as function and validates it against domain", () => {
    expect(technologyRoleBelongsToDomain("IT", "network_core")).toBe(true);
    expect(technologyRoleBelongsToDomain("OT", "network_core")).toBe(false);
    expect(technologyRoleBelongsToDomain("OT", "control")).toBe(true);
    expect(technologyRoleBelongsToDomain("OT", "custom:vendor-specific-function")).toBe(true);
  });

  it("does not allow legacy v0.2 values inside a v2 assessment", () => {
    const assessment = classifiedAssessment({
      assetClass: { state: "classified", value: "compute", method: "normalized", reviewRequired: true, ruleId: "legacy" },
      role: { state: "classified", value: "laptop", method: "normalized", reviewRequired: true, ruleId: "legacy" },
    });
    const codes = validateTechnologyTaxonomyAssessment(assessment).map((entry) => entry.code);
    expect(codes).toContain("taxonomy.value_invalid");
  });

  it("rejects an OT class projected into the IT domain", () => {
    const assessment = classifiedAssessment({
      assetClass: { state: "classified", value: "controller", method: "normalized", reviewRequired: false, ruleId: "bad" },
    });
    expect(validateTechnologyTaxonomyAssessment(assessment)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "taxonomy.domain_class_mismatch" }),
    ]));
  });

  it("keeps unknown and unclassified as states instead of fake domain values", () => {
    const assessment: TechnologyTaxonomyAssessment = {
      taxonomyVersion: technologyTaxonomyVersion,
      domain: { state: "unknown", reviewRequired: true, ruleId: "source.missing", reasonCode: "domain_not_observed" },
      assetClass: { state: "unclassified", reviewRequired: true, ruleId: "source.missing", reasonCode: "class_not_mapped" },
      role: { state: "unclassified", reviewRequired: true, ruleId: "source.missing", reasonCode: "role_not_mapped" },
    };
    expect(validateTechnologyTaxonomyAssessment(assessment)).toEqual([]);
    expect("value" in assessment.domain).toBe(false);
  });
});

describe("taxonomy projection and operational context", () => {
  it("requires scalar projection to match the assessment", () => {
    const inconsistent = asset({ role: "database_server" });
    expect(validateAssetTaxonomyProjection(inconsistent)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "taxonomy.projection_mismatch", path: "asset.role" }),
    ]));
  });

  it("models system and security-zone context outside assetClass", () => {
    expect(validateOperationalContextReference({ id: "ctx-scada", kind: "system", displayName: "SCADA" })).toEqual([]);
    expect(validateOperationalContextReference({ id: "zone-a", kind: "security_zone" })).toEqual([]);
    expect(validateOperationalContextReference({ id: "", kind: "system" })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "context.id_required" }),
    ]));
  });

  it("requires taxonomy assessment for providers claiming v2 output", () => {
    const { taxonomy: _taxonomy, ...legacyAsset } = asset();
    const snapshot = {
      schemaVersion: technologySchemaVersion,
      asOf: "2026-09-15T19:30:00Z",
      assets: [legacyAsset],
      relationships: [],
      observations: [],
    };
    expect(validateTechnologySnapshotTaxonomy(snapshot)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "taxonomy.assessment_required" }),
    ]));
  });
});
