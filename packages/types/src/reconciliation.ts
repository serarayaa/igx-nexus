import {
  assetIdentifierKinds,
  authorityLevels,
  sourceReferenceKey,
  type AssetIdentifierKind,
  type AuthorityLevel,
  type EvidenceReference,
  type SourceReference,
  type TechnologyAsset,
  type TechnologyAttributeValue,
} from "./model.js";
import {
  isIsoTimestamp,
  validateSourceReference,
  validateTechnologyAsset,
  type ValidationIssue,
} from "./validation.js";

export const reconciliationDecisionKinds = [
  "matched",
  "not_matched",
  "ambiguous",
  "conflict",
  "manual_review_required",
] as const;
export type ReconciliationDecisionKind = (typeof reconciliationDecisionKinds)[number];

export const candidateDecisionKinds = [
  "matched",
  "not_matched",
  "conflict",
  "manual_review_required",
] as const;
export type CandidateDecisionKind = (typeof candidateDecisionKinds)[number];

export const reconciliationEvidenceStrengths = [
  "strong",
  "auxiliary",
  "volatile",
  "insufficient",
] as const;
export type ReconciliationEvidenceStrength = (typeof reconciliationEvidenceStrengths)[number];

export const reconciliationEvidenceOutcomes = [
  "supporting",
  "contradicting",
  "insufficient",
  "ignored",
] as const;
export type ReconciliationEvidenceOutcome = (typeof reconciliationEvidenceOutcomes)[number];

/**
 * Evidencia explicable de matching. Deliberadamente no contiene el valor crudo
 * del identificador: el valor permanece en el activo/fuente, no en razones o logs.
 */
export interface ReconciliationEvidence {
  readonly ruleId: string;
  readonly strength: ReconciliationEvidenceStrength;
  readonly outcome: ReconciliationEvidenceOutcome;
  readonly reason: string;
  readonly identifierKind?: AssetIdentifierKind;
  readonly leftSource?: SourceReference;
  readonly rightSource?: SourceReference;
}

export interface ReconciliationCandidateEvaluation {
  readonly candidateAssetId: string;
  readonly decision: CandidateDecisionKind;
  readonly evidence: readonly ReconciliationEvidence[];
  readonly reasons: readonly string[];
}

/** Decisión auditable y determinista producida por el motor de reconciliación. */
export interface ReconciliationDecision {
  readonly kind: ReconciliationDecisionKind;
  readonly incomingAssetId: string;
  readonly candidateAssetIds: readonly string[];
  readonly matchedAssetId?: string;
  readonly evaluatedAt: string;
  readonly ruleVersion: string;
  readonly evaluations: readonly ReconciliationCandidateEvaluation[];
  readonly reasons: readonly string[];
}

/** Claim normalizado de un campo. Conserva su fuente y evidencia aunque no gane la proyección canónica. */
export interface AttributeClaim {
  readonly fieldPath: string;
  readonly value: TechnologyAttributeValue;
  readonly source: SourceReference;
  readonly observedAt: string;
  readonly ingestedAt?: string;
  readonly authority: AuthorityLevel;
  readonly confidence?: number;
  readonly evidence?: readonly EvidenceReference[];
}

export type AttributeConflictStatus = "resolved" | "unresolved";

export interface AttributeConflict {
  readonly fieldPath: string;
  readonly claims: readonly AttributeClaim[];
  readonly status: AttributeConflictStatus;
  readonly resolutionRule: string;
  readonly preferredClaim?: AttributeClaim;
}

export interface AttributeResolution {
  readonly fieldPath: string;
  readonly value: TechnologyAttributeValue;
  readonly claims: readonly AttributeClaim[];
  readonly selectedClaim: AttributeClaim;
  readonly selectionRule: string;
  readonly conflict?: AttributeConflict;
}

/** Resultado de una proyección que preserva el id del activo canónico ancla. */
export interface CanonicalProjectionResult {
  readonly asset: TechnologyAsset;
  readonly resolutions: readonly AttributeResolution[];
  readonly conflicts: readonly AttributeConflict[];
}

function validationIssue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message, severity: "error" };
}

function isKnownOrCustomIdentifier(kind: string): boolean {
  return assetIdentifierKinds.includes(kind as (typeof assetIdentifierKinds)[number])
    || (kind.startsWith("custom:") && kind.slice("custom:".length).trim().length > 0);
}

function valueKey(value: TechnologyAttributeValue): string {
  return JSON.stringify(value);
}

function validateAttributeValue(value: TechnologyAttributeValue, path: string): ValidationIssue[] {
  const values = Array.isArray(value) ? value : [value];
  const issues: ValidationIssue[] = [];
  values.forEach((entry, index) => {
    if (typeof entry === "number" && !Number.isFinite(entry)) {
      issues.push(validationIssue("reconciliation.claim_value_invalid", `${path}[${index}]`, "numeric claim values must be finite"));
    }
  });
  return issues;
}

function validateEvidenceReference(reference: EvidenceReference, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!reference.reference.trim()) {
    issues.push(validationIssue("reconciliation.evidence_reference_required", `${path}.reference`, "evidence reference is required"));
  }
  if (reference.observedAt !== undefined && !isIsoTimestamp(reference.observedAt)) {
    issues.push(validationIssue("timestamp.invalid", `${path}.observedAt`, "evidence observedAt must be an ISO-8601 timestamp with timezone"));
  }
  return issues;
}

function validateMatchEvidence(evidence: ReconciliationEvidence, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!evidence.ruleId.trim()) {
    issues.push(validationIssue("reconciliation.rule_required", `${path}.ruleId`, "matching rule id is required"));
  }
  if (!reconciliationEvidenceStrengths.includes(evidence.strength)) {
    issues.push(validationIssue("reconciliation.strength_invalid", `${path}.strength`, "unsupported evidence strength"));
  }
  if (!reconciliationEvidenceOutcomes.includes(evidence.outcome)) {
    issues.push(validationIssue("reconciliation.outcome_invalid", `${path}.outcome`, "unsupported evidence outcome"));
  }
  if (!evidence.reason.trim()) {
    issues.push(validationIssue("reconciliation.reason_required", `${path}.reason`, "evidence reason is required"));
  }
  if (evidence.identifierKind !== undefined && !isKnownOrCustomIdentifier(evidence.identifierKind)) {
    issues.push(validationIssue("reconciliation.identifier_kind_invalid", `${path}.identifierKind`, "identifier kind must be known or use custom:<name>"));
  }
  if (evidence.leftSource !== undefined) {
    issues.push(...validateSourceReference(evidence.leftSource, `${path}.leftSource`));
  }
  if (evidence.rightSource !== undefined) {
    issues.push(...validateSourceReference(evidence.rightSource, `${path}.rightSource`));
  }
  return issues;
}

export function validateReconciliationDecision(
  decision: ReconciliationDecision,
  path = "decision",
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!reconciliationDecisionKinds.includes(decision.kind)) {
    issues.push(validationIssue("reconciliation.decision_invalid", `${path}.kind`, "unsupported reconciliation decision"));
  }
  if (!decision.incomingAssetId.trim()) {
    issues.push(validationIssue("reconciliation.incoming_asset_required", `${path}.incomingAssetId`, "incoming asset id is required"));
  }
  if (!decision.ruleVersion.trim()) {
    issues.push(validationIssue("reconciliation.rule_version_required", `${path}.ruleVersion`, "ruleVersion is required"));
  }
  if (!isIsoTimestamp(decision.evaluatedAt)) {
    issues.push(validationIssue("timestamp.invalid", `${path}.evaluatedAt`, "evaluatedAt must be an ISO-8601 timestamp with timezone"));
  }

  const candidateIds = new Set<string>();
  decision.candidateAssetIds.forEach((candidateId, index) => {
    if (!candidateId.trim()) {
      issues.push(validationIssue("reconciliation.candidate_required", `${path}.candidateAssetIds[${index}]`, "candidate asset id is required"));
    }
    if (candidateIds.has(candidateId)) {
      issues.push(validationIssue("reconciliation.candidate_duplicate", `${path}.candidateAssetIds[${index}]`, "candidate asset ids must be unique"));
    }
    candidateIds.add(candidateId);
  });

  const evaluatedCandidates = new Set<string>();
  decision.evaluations.forEach((evaluation, index) => {
    const evaluationPath = `${path}.evaluations[${index}]`;
    if (!evaluation.candidateAssetId.trim()) {
      issues.push(validationIssue("reconciliation.candidate_required", `${evaluationPath}.candidateAssetId`, "candidate asset id is required"));
    }
    if (!candidateIds.has(evaluation.candidateAssetId)) {
      issues.push(validationIssue("reconciliation.candidate_unlinked", `${evaluationPath}.candidateAssetId`, "evaluated candidate must appear in candidateAssetIds"));
    }
    if (evaluatedCandidates.has(evaluation.candidateAssetId)) {
      issues.push(validationIssue("reconciliation.evaluation_duplicate", `${evaluationPath}.candidateAssetId`, "candidate may only be evaluated once"));
    }
    evaluatedCandidates.add(evaluation.candidateAssetId);
    if (!candidateDecisionKinds.includes(evaluation.decision)) {
      issues.push(validationIssue("reconciliation.candidate_decision_invalid", `${evaluationPath}.decision`, "unsupported candidate decision"));
    }
    if (evaluation.reasons.length === 0 || evaluation.reasons.some((reason) => !reason.trim())) {
      issues.push(validationIssue("reconciliation.reason_required", `${evaluationPath}.reasons`, "candidate evaluation requires non-empty reasons"));
    }
    evaluation.evidence.forEach((evidence, evidenceIndex) => {
      issues.push(...validateMatchEvidence(evidence, `${evaluationPath}.evidence[${evidenceIndex}]`));
    });
  });

  if (decision.evaluations.length !== decision.candidateAssetIds.length) {
    issues.push(validationIssue("reconciliation.evaluation_count_invalid", `${path}.evaluations`, "every candidate must have exactly one evaluation"));
  }
  if (decision.reasons.length === 0 || decision.reasons.some((reason) => !reason.trim())) {
    issues.push(validationIssue("reconciliation.reason_required", `${path}.reasons`, "decision requires non-empty reasons"));
  }

  if (decision.kind === "matched") {
    if (decision.matchedAssetId === undefined || !candidateIds.has(decision.matchedAssetId)) {
      issues.push(validationIssue("reconciliation.match_target_required", `${path}.matchedAssetId`, "matched decision requires a candidate matchedAssetId"));
    }
    if (decision.evaluations.filter((entry) => entry.decision === "matched").length !== 1) {
      issues.push(validationIssue("reconciliation.match_count_invalid", `${path}.evaluations`, "matched decision requires exactly one matched candidate"));
    }
  } else if (decision.matchedAssetId !== undefined) {
    issues.push(validationIssue("reconciliation.match_target_forbidden", `${path}.matchedAssetId`, "only matched decisions may expose matchedAssetId"));
  }

  if (decision.kind === "ambiguous" && decision.candidateAssetIds.length < 2) {
    issues.push(validationIssue("reconciliation.ambiguity_requires_candidates", `${path}.candidateAssetIds`, "ambiguous decision requires at least two candidates"));
  }
  if (decision.kind === "conflict" && !decision.evaluations.some((entry) => entry.decision === "conflict")) {
    issues.push(validationIssue("reconciliation.conflict_evidence_required", `${path}.evaluations`, "conflict decision requires a conflicting candidate evaluation"));
  }
  if (decision.kind === "manual_review_required" && !decision.evaluations.some((entry) => entry.decision === "manual_review_required")) {
    issues.push(validationIssue("reconciliation.manual_review_evidence_required", `${path}.evaluations`, "manual review decision requires a manual-review candidate"));
  }

  return issues;
}

function claimKey(claim: AttributeClaim): string {
  return JSON.stringify([
    claim.fieldPath,
    sourceReferenceKey(claim.source),
    claim.observedAt,
    claim.authority,
    claim.value,
  ]);
}

function conflictKey(conflict: AttributeConflict): string {
  return JSON.stringify([
    conflict.fieldPath,
    conflict.status,
    conflict.resolutionRule,
    [...conflict.claims].map(claimKey).sort(),
    conflict.preferredClaim === undefined ? null : claimKey(conflict.preferredClaim),
  ]);
}

function validateAttributeClaim(claim: AttributeClaim, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [...validateSourceReference(claim.source, `${path}.source`)];
  if (!claim.fieldPath.trim()) {
    issues.push(validationIssue("reconciliation.claim_field_required", `${path}.fieldPath`, "claim fieldPath is required"));
  }
  if (!isIsoTimestamp(claim.observedAt)) {
    issues.push(validationIssue("timestamp.invalid", `${path}.observedAt`, "claim observedAt must be an ISO-8601 timestamp with timezone"));
  }
  if (claim.ingestedAt !== undefined && !isIsoTimestamp(claim.ingestedAt)) {
    issues.push(validationIssue("timestamp.invalid", `${path}.ingestedAt`, "claim ingestedAt must be an ISO-8601 timestamp with timezone"));
  }
  if (!authorityLevels.includes(claim.authority)) {
    issues.push(validationIssue("authority.invalid", `${path}.authority`, "unsupported claim authority"));
  }
  if (claim.confidence !== undefined && (!Number.isFinite(claim.confidence) || claim.confidence < 0 || claim.confidence > 1)) {
    issues.push(validationIssue("confidence.invalid", `${path}.confidence`, "claim confidence must be between 0 and 1"));
  }
  issues.push(...validateAttributeValue(claim.value, `${path}.value`));
  claim.evidence?.forEach((reference, index) => {
    issues.push(...validateEvidenceReference(reference, `${path}.evidence[${index}]`));
  });
  return issues;
}

export function validateAttributeResolution(
  resolution: AttributeResolution,
  path = "resolution",
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!resolution.fieldPath.trim()) {
    issues.push(validationIssue("reconciliation.resolution_field_required", `${path}.fieldPath`, "resolution fieldPath is required"));
  }
  if (!resolution.selectionRule.trim()) {
    issues.push(validationIssue("reconciliation.selection_rule_required", `${path}.selectionRule`, "selection rule is required"));
  }
  if (resolution.claims.length === 0) {
    issues.push(validationIssue("reconciliation.claims_required", `${path}.claims`, "attribute resolution requires at least one claim"));
  }

  const claimKeys = new Set<string>();
  resolution.claims.forEach((claim, index) => {
    issues.push(...validateAttributeClaim(claim, `${path}.claims[${index}]`));
    if (claim.fieldPath !== resolution.fieldPath) {
      issues.push(validationIssue("reconciliation.claim_field_mismatch", `${path}.claims[${index}].fieldPath`, "claim fieldPath must match its resolution"));
    }
    claimKeys.add(claimKey(claim));
  });

  issues.push(...validateAttributeClaim(resolution.selectedClaim, `${path}.selectedClaim`));
  const selectedKey = claimKey(resolution.selectedClaim);
  if (!claimKeys.has(selectedKey)) {
    issues.push(validationIssue("reconciliation.selected_claim_unlinked", `${path}.selectedClaim`, "selectedClaim must be one of the preserved claims"));
  }
  if (resolution.selectedClaim.fieldPath !== resolution.fieldPath) {
    issues.push(validationIssue("reconciliation.selected_claim_field_mismatch", `${path}.selectedClaim.fieldPath`, "selectedClaim fieldPath must match its resolution"));
  }
  issues.push(...validateAttributeValue(resolution.value, `${path}.value`));
  if (valueKey(resolution.value) !== valueKey(resolution.selectedClaim.value)) {
    issues.push(validationIssue("reconciliation.resolution_value_mismatch", `${path}.value`, "resolution value must equal selectedClaim value"));
  }

  if (resolution.conflict !== undefined) {
    const conflict = resolution.conflict;
    if (conflict.fieldPath !== resolution.fieldPath) {
      issues.push(validationIssue("reconciliation.conflict_field_mismatch", `${path}.conflict.fieldPath`, "conflict fieldPath must match its resolution"));
    }
    if (!conflict.resolutionRule.trim()) {
      issues.push(validationIssue("reconciliation.conflict_rule_required", `${path}.conflict.resolutionRule`, "conflict resolution rule is required"));
    }

    const conflictClaimKeys = new Set<string>();
    const distinctValues = new Set(conflict.claims.map((claim) => valueKey(claim.value)));
    if (conflict.claims.length < 2 || distinctValues.size < 2) {
      issues.push(validationIssue("reconciliation.conflict_claims_invalid", `${path}.conflict.claims`, "conflict requires at least two incompatible claims"));
    }
    conflict.claims.forEach((claim, index) => {
      const conflictClaimPath = `${path}.conflict.claims[${index}]`;
      issues.push(...validateAttributeClaim(claim, conflictClaimPath));
      if (claim.fieldPath !== resolution.fieldPath) {
        issues.push(validationIssue("reconciliation.conflict_claim_field_mismatch", `${conflictClaimPath}.fieldPath`, "conflict claim fieldPath must match its resolution"));
      }
      const key = claimKey(claim);
      conflictClaimKeys.add(key);
      if (!claimKeys.has(key)) {
        issues.push(validationIssue("reconciliation.conflict_claim_unlinked", conflictClaimPath, "conflict claims must be preserved by the resolution"));
      }
    });

    if (conflict.status === "resolved" && conflict.preferredClaim === undefined) {
      issues.push(validationIssue("reconciliation.conflict_preference_required", `${path}.conflict.preferredClaim`, "resolved conflict requires preferredClaim"));
    }
    if (conflict.status === "unresolved" && conflict.preferredClaim !== undefined) {
      issues.push(validationIssue("reconciliation.conflict_preference_forbidden", `${path}.conflict.preferredClaim`, "unresolved conflict must not expose preferredClaim"));
    }
    if (conflict.preferredClaim !== undefined) {
      issues.push(...validateAttributeClaim(conflict.preferredClaim, `${path}.conflict.preferredClaim`));
      const preferredKey = claimKey(conflict.preferredClaim);
      if (!conflictClaimKeys.has(preferredKey)) {
        issues.push(validationIssue("reconciliation.conflict_preference_unlinked", `${path}.conflict.preferredClaim`, "preferredClaim must be one of the conflict claims"));
      }
      if (conflict.status === "resolved" && preferredKey !== selectedKey) {
        issues.push(validationIssue("reconciliation.conflict_preference_mismatch", `${path}.conflict.preferredClaim`, "resolved conflict preferredClaim must equal selectedClaim"));
      }
    }
  }

  return issues;
}

export function validateCanonicalProjectionResult(
  result: CanonicalProjectionResult,
  path = "projection",
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [...validateTechnologyAsset(result.asset, `${path}.asset`)];
  const resolutionPaths = new Set<string>();
  const expectedConflicts = new Map<string, string>();

  result.resolutions.forEach((resolution, index) => {
    issues.push(...validateAttributeResolution(resolution, `${path}.resolutions[${index}]`));
    if (resolutionPaths.has(resolution.fieldPath)) {
      issues.push(validationIssue("reconciliation.resolution_duplicate", `${path}.resolutions[${index}].fieldPath`, "field may only be resolved once"));
    }
    resolutionPaths.add(resolution.fieldPath);
    if (resolution.conflict !== undefined) {
      expectedConflicts.set(resolution.fieldPath, conflictKey(resolution.conflict));
    }
  });

  const exposedConflictFields = new Set<string>();
  result.conflicts.forEach((conflict, index) => {
    const conflictPath = `${path}.conflicts[${index}]`;
    if (exposedConflictFields.has(conflict.fieldPath)) {
      issues.push(validationIssue("reconciliation.conflict_duplicate", `${conflictPath}.fieldPath`, "field may only expose one conflict"));
    }
    exposedConflictFields.add(conflict.fieldPath);

    const expected = expectedConflicts.get(conflict.fieldPath);
    if (expected === undefined) {
      issues.push(validationIssue("reconciliation.conflict_unlinked", `${conflictPath}.fieldPath`, "conflict must belong to an attribute resolution"));
    } else if (expected !== conflictKey(conflict)) {
      issues.push(validationIssue("reconciliation.conflict_mismatch", conflictPath, "exposed conflict must equal the conflict preserved by its resolution"));
    }
  });

  expectedConflicts.forEach((_key, fieldPath) => {
    if (!exposedConflictFields.has(fieldPath)) {
      issues.push(validationIssue("reconciliation.conflict_missing", `${path}.conflicts`, `resolution conflict for ${fieldPath} must be exposed`));
    }
  });

  return issues;
}
