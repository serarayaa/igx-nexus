import type { MetricResult } from "@igx-nexus/types";
import type { Asset } from "./asset-model";

export const healthDimensions = ["completeness", "freshness", "identity", "relationships", "consistency"] as const;
export type HealthDimension = typeof healthDimensions[number];
export const healthWeights: Readonly<Record<HealthDimension, number>> = {
  completeness: 25, freshness: 25, identity: 25, relationships: 15, consistency: 10,
};
export const healthPolicy = { healthy: 90, attention: 70, minimumCoverage: 60, veryStaleDays: 30, staleScore: 50 } as const;
export const healthStates = ["healthy", "attention", "degraded", "insufficient", "unknown"] as const;
export type HealthState = typeof healthStates[number];
export type CheckStatus = "pass" | "missing" | "invalid" | "warning" | "unknown" | "not_applicable";
export type HealthSeverity = "info" | "warning" | "critical";
export const findingCodes = [
  "field_missing", "identity_duplicate", "observation_unknown", "observation_invalid", "observation_stale", "observation_very_stale",
  "relationship_invalid", "relationship_duplicate", "relationship_reference_missing", "relationship_observation_unknown",
  "relationship_observation_invalid", "relationship_observation_stale", "relationship_status_review", "relationships_unknown",
  "warranty_unknown", "warranty_invalid", "lifecycle_invalid",
  "source_instance_missing", "provenance_incomplete", "taxonomy_conflict",
] as const;
export type HealthFindingCode = typeof findingCodes[number];
export interface HealthFinding {
  readonly code: HealthFindingCode;
  readonly dimension: HealthDimension;
  /** canonical_evidence findings explain review needs but do not participate in the historical weighted score. */
  readonly scope?: "score" | "canonical_evidence";
  readonly severity: HealthSeverity;
  readonly field?: keyof Asset;
  readonly relationshipId?: string;
  readonly paths?: readonly string[];
}
export interface HealthCheck {
  readonly key: string;
  readonly dimension: HealthDimension;
  readonly status: CheckStatus;
  readonly value: number | null;
  readonly finding?: HealthFinding;
}
export interface DimensionHealth {
  readonly dimension: HealthDimension;
  readonly score: number | null;
  readonly coverage: number | null;
  readonly applicable: number;
  readonly evaluated: number;
  readonly checks: readonly HealthCheck[];
}
export interface HealthTotals {
  readonly earned: number;
  readonly evaluatedWeight: number;
  readonly evidenceWeight: number;
  readonly applicableWeight: number;
}
export interface AssetHealth {
  readonly asset: Asset;
  readonly score: number | null;
  readonly coverage: number;
  readonly state: HealthState;
  readonly dimensions: readonly DimensionHealth[];
  readonly findings: readonly HealthFinding[];
  readonly totals: HealthTotals;
}
export interface HealthSummary {
  readonly score: number | null;
  readonly coverage: number;
  readonly evaluated: number;
  readonly total: number;
  readonly state: HealthState;
  readonly distribution: Readonly<Record<HealthState, number>>;
  readonly dimensions: readonly { dimension: HealthDimension; score: number | null; coverage: number | null }[];
  readonly topFindings: readonly { code: HealthFindingCode; count: number }[];
}
export interface CanonicalQualitySummary {
  readonly sourceInstanceIdentity: MetricResult;
  readonly provenanceCoreFields: MetricResult;
  readonly taxonomyConflicts: MetricResult;
  /** AttributeConflict is not transported by TechnologySnapshot in schema 0.2. */
  readonly reconciliationAttributeConflicts: "unavailable";
}

export interface CmdbHealthReport {
  readonly asOf: string;
  readonly canonicalQuality: CanonicalQualitySummary | null;
  readonly assets: readonly AssetHealth[];
  /** Findings retained even when neither endpoint exists in inventory. */
  readonly relationshipFindings: readonly HealthFinding[];
  readonly orphanRelationships: number;
  readonly summary: HealthSummary;
}
export function healthState(score: number | null, coverage: number): HealthState {
  if (score === null) return "unknown";
  if (coverage < healthPolicy.minimumCoverage) return "insufficient";
  if (score >= healthPolicy.healthy) return "healthy";
  return score >= healthPolicy.attention ? "attention" : "degraded";
}
