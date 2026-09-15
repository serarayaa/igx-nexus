import { describe, expect, it } from "vitest";
import {
  validateAttributeResolution,
  validateReconciliationDecision,
  type AttributeClaim,
  type ReconciliationDecision,
  type SourceReference,
} from "./index.js";

const observedAt = "2026-09-15T18:00:00Z";

function source(system: "glpi" | "intune", externalId: string): SourceReference {
  return {
    source: system,
    externalId,
    entityType: "SyntheticAsset",
    sourceScope: "v02-009-contract-tests",
    observedAt,
    authority: system === "glpi" ? "authoritative" : "trusted",
  };
}

describe("reconciliation contracts", () => {
  it("accepts an explainable manual-review decision without raw identifier values", () => {
    const decision: ReconciliationDecision = {
      kind: "manual_review_required",
      incomingAssetId: "NXS-SYNTH-INCOMING",
      candidateAssetIds: ["NXS-SYNTH-CANDIDATE"],
      evaluatedAt: observedAt,
      ruleVersion: "v02-009.1",
      evaluations: [{
        candidateAssetId: "NXS-SYNTH-CANDIDATE",
        decision: "manual_review_required",
        evidence: [{
          ruleId: "identifier.insufficient.exact",
          strength: "insufficient",
          outcome: "insufficient",
          reason: "exact hostname match is insufficient by itself",
          identifierKind: "hostname",
          leftSource: source("intune", "synthetic-intune-1"),
          rightSource: source("glpi", "synthetic-glpi-1"),
        }],
        reasons: ["only insufficient identity evidence is available"],
      }],
      reasons: ["candidate evidence is plausible but insufficient for automatic matching"],
    };

    expect(validateReconciliationDecision(decision)).toEqual([]);
    expect(JSON.stringify(decision)).not.toContain("SYNTHETIC-HOSTNAME-VALUE");
  });

  it("rejects a matched output that does not identify exactly one matched candidate", () => {
    const invalid = {
      kind: "matched",
      incomingAssetId: "NXS-SYNTH-INCOMING",
      candidateAssetIds: ["NXS-SYNTH-CANDIDATE"],
      evaluatedAt: observedAt,
      ruleVersion: "v02-009.1",
      evaluations: [{
        candidateAssetId: "NXS-SYNTH-CANDIDATE",
        decision: "manual_review_required",
        evidence: [],
        reasons: ["synthetic reason"],
      }],
      reasons: ["synthetic invalid decision"],
    } as const satisfies ReconciliationDecision;

    const issues = validateReconciliationDecision(invalid);
    expect(issues.some((issue) => issue.code === "reconciliation.match_target_required")).toBe(true);
    expect(issues.some((issue) => issue.code === "reconciliation.match_count_invalid")).toBe(true);
  });

  it("rejects invalid claim timestamps and non-finite claim values", () => {
    const claim: AttributeClaim = {
      fieldPath: "attributes.syntheticMetric",
      value: Number.NaN,
      source: source("intune", "synthetic-intune-2"),
      observedAt: "not-a-timestamp",
      authority: "observed",
    };
    const resolution = {
      fieldPath: claim.fieldPath,
      value: claim.value,
      claims: [claim],
      selectedClaim: claim,
      selectionRule: "synthetic-test-rule",
    } as const;

    const issues = validateAttributeResolution(resolution);
    expect(issues.some((issue) => issue.code === "timestamp.invalid")).toBe(true);
    expect(issues.some((issue) => issue.code === "reconciliation.claim_value_invalid")).toBe(true);
  });

  it("rejects a selected claim that is not preserved in the claim set", () => {
    const glpiClaim: AttributeClaim = {
      fieldPath: "attributes.manufacturer",
      value: "SyntheticVendor-A",
      source: source("glpi", "synthetic-glpi-3"),
      observedAt,
      authority: "authoritative",
    };
    const intuneClaim: AttributeClaim = {
      ...glpiClaim,
      value: "SyntheticVendor-B",
      source: source("intune", "synthetic-intune-3"),
      authority: "trusted",
    };

    const issues = validateAttributeResolution({
      fieldPath: glpiClaim.fieldPath,
      value: intuneClaim.value,
      claims: [glpiClaim],
      selectedClaim: intuneClaim,
      selectionRule: "synthetic-test-rule",
    });
    expect(issues.some((issue) => issue.code === "reconciliation.selected_claim_unlinked")).toBe(true);
  });
});
