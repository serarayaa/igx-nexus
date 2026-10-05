import { describe, expect, it } from "vitest";
import type {
  OperationalContextReference,
  SourceReference,
  TechnologyAsset,
  TechnologyTaxonomyAssessment,
} from "@igx-nexus/types";
import { projectCanonicalAsset } from "./reconciliation.js";

const OBSERVED_AT = "2026-09-15T20:00:00Z";

function source(system: "glpi" | "intune", id: string): SourceReference {
  return Object.freeze({
    source: system,
    externalId: id,
    entityType: "SyntheticAsset",
    observedAt: OBSERVED_AT,
    authority: "trusted",
  });
}

function itTaxonomy(): TechnologyTaxonomyAssessment {
  return Object.freeze({
    taxonomyVersion: "2",
    domain: Object.freeze({ state: "classified", value: "IT", method: "normalized", reviewRequired: false, ruleId: "test.it" }),
    assetClass: Object.freeze({ state: "classified", value: "endpoint", method: "normalized", reviewRequired: false, ruleId: "test.it" }),
    role: Object.freeze({ state: "classified", value: "user_endpoint", method: "normalized", reviewRequired: false, ruleId: "test.it" }),
  });
}

function otTaxonomy(): TechnologyTaxonomyAssessment {
  return Object.freeze({
    taxonomyVersion: "2",
    domain: Object.freeze({ state: "classified", value: "OT", method: "normalized", reviewRequired: false, ruleId: "test.ot" }),
    assetClass: Object.freeze({ state: "classified", value: "operator_interface", method: "normalized", reviewRequired: false, ruleId: "test.ot" }),
    role: Object.freeze({ state: "classified", value: "supervision", method: "normalized", reviewRequired: false, ruleId: "test.ot" }),
  });
}

function asset(
  id: string,
  src: SourceReference,
  taxonomy: TechnologyTaxonomyAssessment | undefined,
  contexts?: readonly OperationalContextReference[],
): TechnologyAsset {
  const isOt = taxonomy?.domain.state === "classified" && taxonomy.domain.value === "OT";
  return Object.freeze({
    id,
    displayName: `Synthetic ${id}`,
    domain: isOt ? "OT" : "IT",
    assetClass: isOt ? "operator_interface" : "endpoint",
    role: isOt ? "supervision" : "user_endpoint",
    ...(taxonomy === undefined ? {} : { taxonomy }),
    lifecycle: "active",
    criticality: "medium",
    ...(contexts === undefined ? {} : { operationalContexts: Object.freeze([...contexts]) }),
    identifiers: Object.freeze([]),
    sourceReferences: Object.freeze([src]),
    attributes: Object.freeze({}),
    provenance: Object.freeze([
      Object.freeze({ fieldPath: "domain", source: src, observedAt: OBSERVED_AT, authority: "trusted" as const, derivation: "normalized" as const }),
      Object.freeze({ fieldPath: "assetClass", source: src, observedAt: OBSERVED_AT, authority: "trusted" as const, derivation: "normalized" as const }),
      Object.freeze({ fieldPath: "role", source: src, observedAt: OBSERVED_AT, authority: "trusted" as const, derivation: "normalized" as const }),
    ]),
  });
}

describe("V02-010 taxonomy-aware reconciliation", () => {
  it("preserves a compatible v2 assessment instead of dropping it", () => {
    const anchor = asset("NXS-ANCHOR", source("glpi", "a"), itTaxonomy());
    const incoming = asset("NXS-INCOMING", source("intune", "b"), itTaxonomy());
    const result = projectCanonicalAsset(anchor, [incoming]);

    expect(result.asset.id).toBe(anchor.id);
    expect(result.asset.taxonomy).toMatchObject({
      taxonomyVersion: "2",
      domain: { state: "classified", value: "IT" },
      assetClass: { state: "classified", value: "endpoint" },
      role: { state: "classified", value: "user_endpoint" },
    });
  });

  it("surfaces unresolved IT/OT disagreement as taxonomy conflict", () => {
    const anchor = asset("NXS-ANCHOR", source("glpi", "a"), itTaxonomy());
    const incoming = asset("NXS-INCOMING", source("intune", "b"), otTaxonomy());
    const result = projectCanonicalAsset(anchor, [incoming]);

    expect(result.asset.domain).toBe("IT");
    expect(result.asset.taxonomy?.domain).toMatchObject({
      state: "conflict",
      reviewRequired: true,
      reasonCode: "multisource_taxonomy_conflict",
    });
    expect(result.asset.taxonomy?.assetClass.state).toBe("conflict");
    expect(result.asset.taxonomy?.role.state).toBe("conflict");
    expect(result.conflicts.map((conflict) => conflict.fieldPath)).toEqual(expect.arrayContaining(["domain", "assetClass", "role"]));
  });

  it("merges operational contexts independently from asset class", () => {
    const anchor = asset("NXS-ANCHOR", source("glpi", "a"), itTaxonomy(), [
      Object.freeze({ id: "site-demo", kind: "site", displayName: "Synthetic Site" }),
    ]);
    const incoming = asset("NXS-INCOMING", source("intune", "b"), itTaxonomy(), [
      Object.freeze({ id: "system-demo", kind: "system", displayName: "Synthetic System" }),
    ]);
    const result = projectCanonicalAsset(anchor, [incoming]);

    expect(result.asset.operationalContexts).toEqual([
      expect.objectContaining({ id: "site-demo", kind: "site" }),
      expect.objectContaining({ id: "system-demo", kind: "system" }),
    ]);
  });

  it("keeps operational context unavailable when no reconciled source covers it", () => {
    const anchor = asset("NXS-ANCHOR", source("glpi", "a"), undefined);
    const incoming = asset("NXS-INCOMING", source("intune", "b"), undefined);
    const result = projectCanonicalAsset(anchor, [incoming]);

    expect(result.asset.taxonomy).toBeUndefined();
    expect(result.asset.operationalContexts).toBeUndefined();
  });

  it("preserves a known-empty operational context collection when another source is unavailable", () => {
    const anchor = asset("NXS-ANCHOR", source("glpi", "a"), itTaxonomy());
    const incoming = asset("NXS-INCOMING", source("intune", "b"), itTaxonomy(), []);
    const result = projectCanonicalAsset(anchor, [incoming]);

    expect(result.asset.operationalContexts).toEqual([]);
  });
});
