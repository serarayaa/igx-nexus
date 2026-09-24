import {
  isIsoTimestamp,
  sourceReferenceKey,
  technologyTaxonomyVersion,
  validateAssetTaxonomyProjection,
  validateCanonicalProjectionResult,
  validateOperationalContextReference,
  validateReconciliationDecision,
  validateTechnologyAsset,
  validateTechnologyTaxonomyAssessment,
  type AssetIdentifier,
  type AssetIdentifierKind,
  type AttributeClaim,
  type AttributeConflict,
  type AttributeResolution,
  type AuthorityLevel,
  type CandidateDecisionKind,
  type CanonicalProjectionResult,
  type OperationalContextReference,
  type ProvenanceRecord,
  type ReconciliationCandidateEvaluation,
  type ReconciliationDecision,
  type ReconciliationEvidence,
  type ReconciliationEvidenceStrength,
  type SourceReference,
  type SourceSystem,
  type TaxonomyDecision,
  type TechnologyAsset,
  type TechnologyAttributeValue,
  type TechnologyTaxonomyAssessment,
} from "@igx-nexus/types";

export const reconciliationRuleVersion = "v02-009.3" as const;

const STRONG_IDENTIFIER_KINDS = new Set<AssetIdentifierKind>([
  "serial_number",
  "hardware_uuid",
  "bios_uuid",
  "imei",
]);
const AUXILIARY_IDENTIFIER_KINDS = new Set<AssetIdentifierKind>([
  "asset_tag",
  "mac_address",
]);
const VOLATILE_IDENTIFIER_KINDS = new Set<AssetIdentifierKind>(["ip_address"]);
const INSUFFICIENT_IDENTIFIER_KINDS = new Set<AssetIdentifierKind>(["hostname"]);

const PLACEHOLDER_IDENTIFIER_FINGERPRINTS = new Set([
  "unknown",
  "none",
  "null",
  "notavailable",
  "notapplicable",
  "notspecified",
  "unspecified",
  "defaultstring",
  "tobefilledbyoem",
  "systemserialnumber",
]);

const AUTHORITY_RANK: Readonly<Record<AuthorityLevel, number>> = Object.freeze({
  authoritative: 0,
  trusted: 1,
  observed: 2,
  inferred: 3,
  unknown: 4,
});

const MANAGEMENT_SOURCE_PRIORITY: readonly SourceSystem[] = Object.freeze([
  "manual",
  "glpi",
  "import",
  "intune",
  "entra",
]);
const TECHNICAL_SOURCE_PRIORITY: readonly SourceSystem[] = Object.freeze([
  "intune",
  "windows",
  "defender",
  "dell",
  "glpi",
  "manual",
  "import",
]);

type SelectionDimension = "source" | "authority" | "recency";
type TaxonomyField = "domain" | "assetClass" | "role";

interface AttributePolicy {
  readonly id: string;
  readonly dimensions: readonly SelectionDimension[];
  readonly sourcePriority: readonly SourceSystem[];
}

const MANAGEMENT_POLICY: AttributePolicy = Object.freeze({
  id: "management-source-authority-recency",
  dimensions: Object.freeze(["source", "authority", "recency"] as const),
  sourcePriority: MANAGEMENT_SOURCE_PRIORITY,
});
const TECHNICAL_POLICY: AttributePolicy = Object.freeze({
  id: "technical-source-authority-recency",
  dimensions: Object.freeze(["source", "authority", "recency"] as const),
  sourcePriority: TECHNICAL_SOURCE_PRIORITY,
});
const TAXONOMY_POLICY: AttributePolicy = Object.freeze({
  id: "taxonomy-authority-only",
  dimensions: Object.freeze(["authority"] as const),
  sourcePriority: Object.freeze([]),
});
const DEFAULT_POLICY: AttributePolicy = Object.freeze({
  id: "authority-recency",
  dimensions: Object.freeze(["authority", "recency"] as const),
  sourcePriority: Object.freeze([]),
});

/**
 * Errores del motor nunca contienen valores de serial, UUID, MAC, IMEI, hostname
 * ni IP. Los códigos permiten diagnosticar forma/contrato sin filtrar evidencia.
 */
export class ReconciliationInputError extends Error {
  readonly issueCodes: readonly string[];

  constructor(issueCodes: readonly string[]) {
    super("Reconciliation input is invalid");
    this.name = "ReconciliationInputError";
    this.issueCodes = Object.freeze([...new Set(issueCodes)].sort());
  }
}

export class ReconciliationOutputError extends Error {
  readonly issueCodes: readonly string[];

  constructor(issueCodes: readonly string[]) {
    super("Reconciliation output is invalid");
    this.name = "ReconciliationOutputError";
    this.issueCodes = Object.freeze([...new Set(issueCodes)].sort());
  }
}

export interface ReconciliationRun {
  readonly decision: ReconciliationDecision;
  readonly projection?: CanonicalProjectionResult;
}

interface IdentifierObservation {
  readonly kind: AssetIdentifierKind;
  readonly normalizedValue: string;
  readonly source?: SourceReference;
}

interface CandidateEvaluationInternal {
  readonly discovered: boolean;
  readonly evaluation: ReconciliationCandidateEvaluation;
}

function identifierStrength(kind: AssetIdentifierKind): ReconciliationEvidenceStrength {
  if (STRONG_IDENTIFIER_KINDS.has(kind)) return "strong";
  if (VOLATILE_IDENTIFIER_KINDS.has(kind)) return "volatile";
  if (INSUFFICIENT_IDENTIFIER_KINDS.has(kind)) return "insufficient";
  if (AUXILIARY_IDENTIFIER_KINDS.has(kind) || kind.startsWith("custom:")) return "auxiliary";
  return "auxiliary";
}

function normalizeIdentifierValue(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function placeholderFingerprint(value: string): string {
  return normalizeIdentifierValue(value).replace(/[^a-z0-9]+/g, "");
}

function isDegenerateZeroIdentifier(kind: AssetIdentifierKind, value: string): boolean {
  const compact = normalizeIdentifierValue(value).replace(/[\s:._{}-]+/g, "");
  if (!/^0+$/.test(compact)) return false;
  if (kind === "hardware_uuid" || kind === "bios_uuid") return compact.length === 32;
  if (kind === "imei") return compact.length === 15 || compact.length === 16;
  if (kind === "mac_address") return compact.length === 12;
  if (kind === "serial_number" || kind === "asset_tag" || kind.startsWith("custom:")) {
    return compact.length >= 6;
  }
  return false;
}

function isIdentifierUsableForIdentity(kind: AssetIdentifierKind, value: string): boolean {
  const normalized = normalizeIdentifierValue(value);
  const separatedNaPlaceholder = /^n[\s./_-]+a$/.test(normalized);
  if (separatedNaPlaceholder || PLACEHOLDER_IDENTIFIER_FINGERPRINTS.has(placeholderFingerprint(value))) return false;
  return !isDegenerateZeroIdentifier(kind, value);
}

function identifierObservations(asset: TechnologyAsset): Map<AssetIdentifierKind, readonly IdentifierObservation[]> {
  const grouped = new Map<AssetIdentifierKind, IdentifierObservation[]>();
  asset.identifiers.forEach((identifier) => {
    if (!isIdentifierUsableForIdentity(identifier.kind, identifier.value)) return;
    const entry: IdentifierObservation = Object.freeze({
      kind: identifier.kind,
      normalizedValue: normalizeIdentifierValue(identifier.value),
      ...(identifier.source === undefined ? {} : { source: identifier.source }),
    });
    const existing = grouped.get(identifier.kind) ?? [];
    existing.push(entry);
    grouped.set(identifier.kind, existing);
  });
  const result = new Map<AssetIdentifierKind, readonly IdentifierObservation[]>();
  for (const [kind, entries] of grouped) {
    result.set(kind, Object.freeze([...entries].sort((left, right) => {
      const byValue = left.normalizedValue.localeCompare(right.normalizedValue);
      if (byValue !== 0) return byValue;
      return sourceKey(left.source).localeCompare(sourceKey(right.source));
    })));
  }
  return result;
}

function sourceKey(source: SourceReference | undefined): string {
  return source === undefined ? "" : sourceReferenceKey(source);
}

function sourceReferences(asset: TechnologyAsset): readonly SourceReference[] {
  return Object.freeze([...asset.sourceReferences].sort((left, right) => sourceReferenceKey(left).localeCompare(sourceReferenceKey(right))));
}

function makeEvidence(
  ruleId: string,
  strength: ReconciliationEvidenceStrength,
  outcome: ReconciliationEvidence["outcome"],
  reason: string,
  identifierKind?: AssetIdentifierKind,
  leftSource?: SourceReference,
  rightSource?: SourceReference,
): ReconciliationEvidence {
  return Object.freeze({
    ruleId,
    strength,
    outcome,
    reason,
    ...(identifierKind === undefined ? {} : { identifierKind }),
    ...(leftSource === undefined ? {} : { leftSource }),
    ...(rightSource === undefined ? {} : { rightSource }),
  });
}

function evidenceSortKey(evidence: ReconciliationEvidence): string {
  return JSON.stringify([
    evidence.ruleId,
    evidence.identifierKind ?? "",
    evidence.strength,
    evidence.outcome,
    sourceKey(evidence.leftSource),
    sourceKey(evidence.rightSource),
  ]);
}

function firstObservationForValue(
  observations: readonly IdentifierObservation[],
  normalizedValue: string,
): IdentifierObservation | undefined {
  return observations.find((entry) => entry.normalizedValue === normalizedValue);
}

function collectPairEvidence(left: TechnologyAsset, right: TechnologyAsset): readonly ReconciliationEvidence[] {
  const evidence: ReconciliationEvidence[] = [];
  const leftSources = sourceReferences(left);
  const rightSources = sourceReferences(right);
  const rightSourcesByKey = new Map(rightSources.map((source) => [sourceReferenceKey(source), source] as const));

  leftSources.forEach((leftSource) => {
    const rightSource = rightSourcesByKey.get(sourceReferenceKey(leftSource));
    if (rightSource === undefined) return;

    const qualified = leftSource.sourceInstanceId !== undefined && rightSource.sourceInstanceId !== undefined;
    evidence.push(makeEvidence(
      qualified ? "source_reference.exact" : "source_reference.legacy_unqualified",
      qualified ? "strong" : "insufficient",
      qualified ? "supporting" : "insufficient",
      qualified
        ? "exact source reference match within the same source instance"
        : "legacy source reference match lacks source instance identity",
      undefined,
      leftSource,
      rightSource,
    ));
  });

  const leftIdentifiers = identifierObservations(left);
  const rightIdentifiers = identifierObservations(right);
  const kinds = [...new Set<AssetIdentifierKind>([
    ...leftIdentifiers.keys(),
    ...rightIdentifiers.keys(),
  ])].sort((a, b) => a.localeCompare(b));

  kinds.forEach((kind) => {
    const leftEntries = leftIdentifiers.get(kind) ?? [];
    const rightEntries = rightIdentifiers.get(kind) ?? [];
    if (leftEntries.length === 0 || rightEntries.length === 0) return;

    const leftValues = new Set(leftEntries.map((entry) => entry.normalizedValue));
    const rightValues = new Set(rightEntries.map((entry) => entry.normalizedValue));
    const matches = [...leftValues].filter((value) => rightValues.has(value)).sort();
    const strength = identifierStrength(kind);

    matches.forEach((value) => {
      const leftEntry = firstObservationForValue(leftEntries, value);
      const rightEntry = firstObservationForValue(rightEntries, value);
      const exactOutcome = strength === "strong" || strength === "auxiliary" ? "supporting" : "insufficient";
      const ruleId = strength === "strong"
        ? "identifier.strong.exact"
        : strength === "auxiliary"
          ? "identifier.auxiliary.exact"
          : strength === "volatile"
            ? "identifier.volatile.exact"
            : "identifier.insufficient.exact";
      const reason = strength === "strong"
        ? `exact ${kind} match`
        : strength === "auxiliary"
          ? `exact ${kind} match requires corroboration`
          : strength === "volatile"
            ? `exact ${kind} match is volatile and insufficient by itself`
            : `exact ${kind} match is insufficient by itself`;
      evidence.push(makeEvidence(
        ruleId,
        strength,
        exactOutcome,
        reason,
        kind,
        leftEntry?.source,
        rightEntry?.source,
      ));
    });

    const setsDiffer = leftValues.size !== rightValues.size
      || [...leftValues].some((value) => !rightValues.has(value));
    if (!setsDiffer) return;

    if (strength === "strong") {
      evidence.push(makeEvidence(
        "identifier.strong.contradiction",
        "strong",
        "contradicting",
        `${kind} values contradict across records`,
        kind,
        leftEntries[0]?.source,
        rightEntries[0]?.source,
      ));
      return;
    }

    evidence.push(makeEvidence(
      strength === "auxiliary" ? "identifier.auxiliary.mismatch" : "identifier.weak.mismatch",
      strength,
      "ignored",
      `${kind} mismatch is not sufficient to prove identity or non-identity`,
      kind,
      leftEntries[0]?.source,
      rightEntries[0]?.source,
    ));
  });

  return Object.freeze(evidence.sort((left, right) => evidenceSortKey(left).localeCompare(evidenceSortKey(right))));
}

function evaluateCandidate(incoming: TechnologyAsset, candidate: TechnologyAsset): CandidateEvaluationInternal {
  const evidence = collectPairEvidence(incoming, candidate);
  const strongSupporting = evidence.some((entry) => entry.strength === "strong" && entry.outcome === "supporting");
  const strongContradiction = evidence.some((entry) => entry.strength === "strong" && entry.outcome === "contradicting");
  const weakSignal = evidence.some((entry) => entry.outcome === "supporting" || entry.outcome === "insufficient");
  const discovered = weakSignal;

  let decision: CandidateDecisionKind;
  let reason: string;
  if (strongSupporting && strongContradiction) {
    decision = "conflict";
    reason = "strong identity evidence is internally contradictory";
  } else if (strongSupporting) {
    decision = "matched";
    reason = "at least one strong exact identity signal matches without strong contradiction";
  } else if (strongContradiction) {
    decision = "not_matched";
    reason = "strong identifiers contradict and no strong identity signal matches";
  } else if (weakSignal) {
    decision = "manual_review_required";
    reason = "only auxiliary, volatile, or insufficient identity signals are available";
  } else {
    decision = "not_matched";
    reason = "no comparable identity evidence was found";
  }

  return Object.freeze({
    discovered,
    evaluation: Object.freeze({
      candidateAssetId: candidate.id,
      decision,
      evidence,
      reasons: Object.freeze([reason]),
    }),
  });
}

function validateInputAssets(incoming: TechnologyAsset, candidates: readonly TechnologyAsset[], evaluatedAt: string): void {
  const issueCodes: string[] = [];
  if (!isIsoTimestamp(evaluatedAt)) issueCodes.push("timestamp.invalid");

  validateTechnologyAsset(incoming, "incoming").forEach((issue) => issueCodes.push(issue.code));
  const ids = new Set<string>();
  candidates.forEach((candidate, index) => {
    validateTechnologyAsset(candidate, `candidates[${index}]`).forEach((issue) => issueCodes.push(issue.code));
    if (ids.has(candidate.id)) issueCodes.push("reconciliation.candidate_duplicate");
    ids.add(candidate.id);
  });
  if (ids.has(incoming.id)) issueCodes.push("reconciliation.incoming_id_collides_with_candidate");

  if (issueCodes.length > 0) throw new ReconciliationInputError(issueCodes);
}

/**
 * Descubre candidatos y toma una decisión sin mutar ningún activo. El orden de
 * entrada no participa de la decisión: candidatos/evidencia se ordenan por claves
 * estables antes de producir el contrato auditable.
 */
export function reconcileAssetIdentity(
  incoming: TechnologyAsset,
  candidates: readonly TechnologyAsset[],
  evaluatedAt: string,
): ReconciliationDecision {
  validateInputAssets(incoming, candidates, evaluatedAt);

  const evaluations = candidates
    .map((candidate) => evaluateCandidate(incoming, candidate))
    .filter((entry) => entry.discovered)
    .map((entry) => entry.evaluation)
    .sort((left, right) => left.candidateAssetId.localeCompare(right.candidateAssetId));

  const matched = evaluations.filter((entry) => entry.decision === "matched");
  const conflicts = evaluations.filter((entry) => entry.decision === "conflict");
  const manual = evaluations.filter((entry) => entry.decision === "manual_review_required");

  let kind: ReconciliationDecision["kind"];
  let matchedAssetId: string | undefined;
  let reason: string;

  if (matched.length > 1) {
    kind = "ambiguous";
    reason = "multiple candidates satisfy strong matching rules";
  } else if (conflicts.length > 0) {
    kind = "conflict";
    reason = "candidate evidence contains a strong identity conflict";
  } else if (matched.length === 1) {
    kind = "matched";
    matchedAssetId = matched[0]?.candidateAssetId;
    reason = "exact strong evidence identifies one canonical candidate";
  } else if (manual.length > 1) {
    kind = "ambiguous";
    reason = "multiple candidates are plausible but none has sufficient evidence for automatic matching";
  } else if (manual.length === 1) {
    kind = "manual_review_required";
    reason = "candidate evidence is plausible but insufficient for automatic matching";
  } else {
    kind = "not_matched";
    reason = "no candidate has sufficient evidence for automatic matching";
  }

  const decision: ReconciliationDecision = Object.freeze({
    kind,
    incomingAssetId: incoming.id,
    candidateAssetIds: Object.freeze(evaluations.map((entry) => entry.candidateAssetId)),
    ...(matchedAssetId === undefined ? {} : { matchedAssetId }),
    evaluatedAt,
    ruleVersion: reconciliationRuleVersion,
    evaluations: Object.freeze(evaluations),
    reasons: Object.freeze([reason]),
  });

  const errors = validateReconciliationDecision(decision).filter((issue) => issue.severity === "error");
  if (errors.length > 0) throw new ReconciliationOutputError(errors.map((issue) => issue.code));
  return decision;
}

function stableValueKey(value: TechnologyAttributeValue): string {
  return JSON.stringify(value);
}

function policyForField(fieldPath: string): AttributePolicy {
  if (fieldPath === "domain" || fieldPath === "assetClass" || fieldPath === "role") return TAXONOMY_POLICY;
  if (
    fieldPath === "displayName"
    || fieldPath === "lifecycle"
    || fieldPath === "criticality"
    || fieldPath === "attributes.owner"
    || fieldPath === "attributes.location"
    || fieldPath === "attributes.costCenter"
    || fieldPath.startsWith("attributes.management.")
  ) return MANAGEMENT_POLICY;
  if (
    fieldPath === "attributes.manufacturer"
    || fieldPath === "attributes.model"
    || fieldPath === "attributes.compliance"
    || fieldPath.startsWith("attributes.hardware.")
    || fieldPath.startsWith("attributes.os.")
    || fieldPath.startsWith("attributes.technical.")
    || fieldPath.startsWith("attributes.health.")
  ) return TECHNICAL_POLICY;
  return DEFAULT_POLICY;
}

function sourceRank(source: SourceSystem, policy: AttributePolicy): number {
  const rank = policy.sourcePriority.indexOf(source);
  return rank === -1 ? policy.sourcePriority.length + 100 : rank;
}

function dimensionRank(claim: AttributeClaim, dimension: SelectionDimension, policy: AttributePolicy): number {
  if (dimension === "source") return sourceRank(claim.source.source, policy);
  if (dimension === "authority") return AUTHORITY_RANK[claim.authority];
  return -Date.parse(claim.observedAt);
}

function compareClaimsMeaningfully(left: AttributeClaim, right: AttributeClaim, policy: AttributePolicy): number {
  for (const dimension of policy.dimensions) {
    const leftRank = dimensionRank(left, dimension, policy);
    const rightRank = dimensionRank(right, dimension, policy);
    if (leftRank !== rightRank) return leftRank - rightRank;
  }
  return 0;
}

function claimStableKey(claim: AttributeClaim): string {
  return JSON.stringify([
    claim.fieldPath,
    sourceReferenceKey(claim.source),
    claim.observedAt,
    claim.authority,
    stableValueKey(claim.value),
  ]);
}

function sortClaims(claims: readonly AttributeClaim[], policy: AttributePolicy): readonly AttributeClaim[] {
  return Object.freeze([...claims].sort((left, right) => {
    const meaningful = compareClaimsMeaningfully(left, right, policy);
    if (meaningful !== 0) return meaningful;
    return claimStableKey(left).localeCompare(claimStableKey(right));
  }));
}

function findFieldProvenance(asset: TechnologyAsset, fieldPath: string): ProvenanceRecord | undefined {
  const exact = asset.provenance
    .filter((record) => record.fieldPath === fieldPath)
    .sort((left, right) => {
      const authority = AUTHORITY_RANK[left.authority] - AUTHORITY_RANK[right.authority];
      if (authority !== 0) return authority;
      const recency = Date.parse(right.observedAt) - Date.parse(left.observedAt);
      if (recency !== 0) return recency;
      return sourceReferenceKey(left.source).localeCompare(sourceReferenceKey(right.source));
    });
  if (exact[0] !== undefined) return exact[0];

  if (fieldPath.startsWith("attributes.")) {
    return asset.provenance
      .filter((record) => record.fieldPath === "attributes")
      .sort((left, right) => sourceReferenceKey(left.source).localeCompare(sourceReferenceKey(right.source)))[0];
  }
  return undefined;
}

function primarySource(asset: TechnologyAsset): SourceReference {
  const source = sourceReferences(asset)[0];
  if (source === undefined) throw new ReconciliationInputError(["asset.source_required"]);
  return source;
}

function makeAttributeClaim(
  asset: TechnologyAsset,
  fieldPath: string,
  value: TechnologyAttributeValue,
): AttributeClaim {
  const provenance = findFieldProvenance(asset, fieldPath);
  const source = provenance?.source ?? primarySource(asset);
  const authority = provenance?.authority
    ?? ((fieldPath === "lifecycle" || fieldPath === "criticality") && value === "unknown" ? "unknown" : source.authority);
  return Object.freeze({
    fieldPath,
    value,
    source,
    observedAt: provenance?.observedAt ?? source.observedAt,
    authority,
    ...(provenance?.ingestedAt === undefined ? {} : { ingestedAt: provenance.ingestedAt }),
    ...(provenance?.confidence === undefined ? {} : { confidence: provenance.confidence }),
    ...(provenance?.evidence === undefined ? {} : { evidence: provenance.evidence }),
  });
}

function fieldValues(asset: TechnologyAsset): ReadonlyMap<string, TechnologyAttributeValue> {
  const values = new Map<string, TechnologyAttributeValue>([
    ["displayName", asset.displayName],
    ["domain", asset.domain],
    ["assetClass", asset.assetClass],
    ["role", asset.role],
    ["lifecycle", asset.lifecycle],
    ["criticality", asset.criticality],
  ]);
  Object.entries(asset.attributes)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => values.set(`attributes.${key}`, value));
  return values;
}

function collectClaims(records: readonly TechnologyAsset[]): ReadonlyMap<string, readonly AttributeClaim[]> {
  const claims = new Map<string, AttributeClaim[]>();
  records.forEach((record) => {
    for (const [fieldPath, value] of fieldValues(record)) {
      const existing = claims.get(fieldPath) ?? [];
      existing.push(makeAttributeClaim(record, fieldPath, value));
      claims.set(fieldPath, existing);
    }
  });
  const result = new Map<string, readonly AttributeClaim[]>();
  [...claims.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([fieldPath, fieldClaims]) => {
      const policy = policyForField(fieldPath);
      result.set(fieldPath, sortClaims(fieldClaims, policy));
    });
  return result;
}

function anchorClaimForValue(
  claims: readonly AttributeClaim[],
  anchor: TechnologyAsset,
  anchorValue: TechnologyAttributeValue,
): AttributeClaim | undefined {
  const anchorSources = new Set(anchor.sourceReferences.map((source) => sourceReferenceKey(source)));
  return claims.find((claim) => anchorSources.has(sourceReferenceKey(claim.source)) && stableValueKey(claim.value) === stableValueKey(anchorValue));
}

function resolveFieldClaims(
  fieldPath: string,
  claims: readonly AttributeClaim[],
  anchor: TechnologyAsset,
  anchorValue: TechnologyAttributeValue | undefined,
): AttributeResolution {
  const policy = policyForField(fieldPath);
  const sorted = sortClaims(claims, policy);
  const best = sorted[0];
  if (best === undefined) throw new ReconciliationOutputError(["reconciliation.claims_required"]);

  const distinctValues = new Set(sorted.map((claim) => stableValueKey(claim.value)));
  if (distinctValues.size === 1) {
    return Object.freeze({
      fieldPath,
      value: best.value,
      claims: sorted,
      selectedClaim: best,
      selectionRule: `${policy.id}:equivalent-claims`,
    });
  }

  const tiedBest = sorted.filter((claim) => compareClaimsMeaningfully(claim, best, policy) === 0);
  const tiedValues = new Set(tiedBest.map((claim) => stableValueKey(claim.value)));
  if (tiedValues.size === 1) {
    const conflict: AttributeConflict = Object.freeze({
      fieldPath,
      claims: sorted,
      status: "resolved",
      resolutionRule: `${policy.id}:preferred-claim`,
      preferredClaim: best,
    });
    return Object.freeze({
      fieldPath,
      value: best.value,
      claims: sorted,
      selectedClaim: best,
      selectionRule: `${policy.id}:preferred-claim`,
      conflict,
    });
  }

  const preserved = anchorValue === undefined ? undefined : anchorClaimForValue(sorted, anchor, anchorValue);
  const selected = preserved ?? best;
  const conflict: AttributeConflict = Object.freeze({
    fieldPath,
    claims: sorted,
    status: "unresolved",
    resolutionRule: "preserve-existing-on-policy-tie",
  });
  return Object.freeze({
    fieldPath,
    value: selected.value,
    claims: sorted,
    selectedClaim: selected,
    selectionRule: "preserve-existing-on-policy-tie",
    conflict,
  });
}

function mergeSourceReferences(records: readonly TechnologyAsset[]): readonly SourceReference[] {
  const references = new Map<string, SourceReference>();
  records.flatMap((record) => record.sourceReferences).forEach((reference) => {
    const key = sourceReferenceKey(reference);
    const existing = references.get(key);
    if (existing === undefined || Date.parse(reference.observedAt) > Date.parse(existing.observedAt)) {
      references.set(key, reference);
    }
  });
  return Object.freeze([...references.values()].sort((left, right) => sourceReferenceKey(left).localeCompare(sourceReferenceKey(right))));
}

function mergeIdentifiers(records: readonly TechnologyAsset[]): readonly AssetIdentifier[] {
  const observations = records
    .flatMap((record) => record.identifiers)
    .sort((left, right) => {
      const byKind = left.kind.localeCompare(right.kind);
      if (byKind !== 0) return byKind;
      const byValue = normalizeIdentifierValue(left.value).localeCompare(normalizeIdentifierValue(right.value));
      if (byValue !== 0) return byValue;
      return sourceKey(left.source).localeCompare(sourceKey(right.source));
    });
  const identifiers = new Map<string, AssetIdentifier>();
  observations.forEach((identifier) => {
    const key = JSON.stringify([identifier.kind, normalizeIdentifierValue(identifier.value)]);
    if (!identifiers.has(key)) identifiers.set(key, identifier);
  });
  return Object.freeze([...identifiers.values()]);
}

function operationalContextKey(context: OperationalContextReference): string {
  return JSON.stringify([context.kind, context.id]);
}

function operationalContextStableKey(context: OperationalContextReference): string {
  return JSON.stringify([
    operationalContextKey(context),
    context.displayName ?? "",
    sourceKey(context.source),
  ]);
}

function mergeOperationalContexts(records: readonly TechnologyAsset[]): readonly OperationalContextReference[] {
  const contexts = records
    .flatMap((record) => record.operationalContexts ?? [])
    .sort((left, right) => operationalContextStableKey(left).localeCompare(operationalContextStableKey(right)));
  const merged = new Map<string, OperationalContextReference>();
  contexts.forEach((context) => {
    const key = operationalContextKey(context);
    if (!merged.has(key)) merged.set(key, context);
  });
  return Object.freeze([...merged.values()].sort((left, right) => operationalContextKey(left).localeCompare(operationalContextKey(right))));
}

function claimToProvenance(claim: AttributeClaim): ProvenanceRecord {
  return Object.freeze({
    fieldPath: claim.fieldPath,
    source: claim.source,
    observedAt: claim.observedAt,
    authority: claim.authority,
    ...(claim.ingestedAt === undefined ? {} : { ingestedAt: claim.ingestedAt }),
    ...(claim.confidence === undefined ? {} : { confidence: claim.confidence }),
    ...(claim.evidence === undefined ? {} : { evidence: claim.evidence }),
  });
}

function identifierToProvenance(identifier: AssetIdentifier): ProvenanceRecord | undefined {
  if (identifier.source === undefined) return undefined;
  return Object.freeze({
    fieldPath: `identifiers.${identifier.kind}`,
    source: identifier.source,
    observedAt: identifier.source.observedAt,
    authority: identifier.source.authority,
  });
}

function provenanceKey(record: ProvenanceRecord): string {
  return JSON.stringify([
    record.fieldPath,
    sourceReferenceKey(record.source),
    record.observedAt,
    record.authority,
    record.derivation ?? "",
    record.ingestedAt ?? "",
    record.confidence ?? "",
    record.evidence ?? [],
  ]);
}

function mergeProvenance(
  records: readonly TechnologyAsset[],
  resolutions: readonly AttributeResolution[],
): readonly ProvenanceRecord[] {
  const merged = new Map<string, ProvenanceRecord>();
  const add = (record: ProvenanceRecord): void => {
    const key = provenanceKey(record);
    if (!merged.has(key)) merged.set(key, record);
  };

  records.flatMap((record) => record.provenance).forEach(add);
  resolutions.flatMap((resolution) => resolution.claims).map(claimToProvenance).forEach(add);
  records.flatMap((record) => record.identifiers).map(identifierToProvenance).forEach((record) => {
    if (record !== undefined) add(record);
  });

  return Object.freeze([...merged.values()].sort((left, right) => provenanceKey(left).localeCompare(provenanceKey(right))));
}

function resolvedString(resolutions: ReadonlyMap<string, AttributeResolution>, fieldPath: string): string {
  const value = resolutions.get(fieldPath)?.value;
  if (typeof value !== "string") throw new ReconciliationOutputError(["reconciliation.core_field_invalid"]);
  return value;
}

function unresolvedTaxonomyDecision<T extends string>(
  field: TaxonomyField,
  reasonCode: string,
): TaxonomyDecision<T> {
  return Object.freeze({
    state: "unclassified",
    reviewRequired: true,
    ruleId: `reconciliation.taxonomy.${field}.unclassified`,
    reasonCode,
  });
}

function conflictingTaxonomyDecision<T extends string>(field: TaxonomyField): TaxonomyDecision<T> {
  return Object.freeze({
    state: "conflict",
    reviewRequired: true,
    ruleId: `reconciliation.taxonomy.${field}.conflict`,
    reasonCode: "multisource_taxonomy_conflict",
  });
}

function recordScalarValue(record: TechnologyAsset, field: TaxonomyField): string {
  return record[field];
}

function selectedRecordForTaxonomy(
  field: TaxonomyField,
  resolution: AttributeResolution,
  records: readonly TechnologyAsset[],
): TechnologyAsset | undefined {
  const selectedSourceKey = sourceReferenceKey(resolution.selectedClaim.source);
  return [...records]
    .filter((record) => {
      if (stableValueKey(recordScalarValue(record, field)) !== stableValueKey(resolution.value)) return false;
      return record.sourceReferences.some((reference) => sourceReferenceKey(reference) === selectedSourceKey);
    })
    .sort((left, right) => left.id.localeCompare(right.id))[0];
}

function taxonomyDecisionFromResolution<T extends string>(
  field: TaxonomyField,
  resolution: AttributeResolution,
  records: readonly TechnologyAsset[],
): TaxonomyDecision<T> {
  if (resolution.conflict?.status === "unresolved") {
    return conflictingTaxonomyDecision<T>(field);
  }

  const selectedRecord = selectedRecordForTaxonomy(field, resolution, records);
  const decision = selectedRecord?.taxonomy?.[field] as TaxonomyDecision<T> | undefined;
  if (decision === undefined) {
    return unresolvedTaxonomyDecision<T>(field, "selected_claim_has_no_v2_taxonomy");
  }
  if (decision.state === "classified" && stableValueKey(decision.value) !== stableValueKey(resolution.value)) {
    return conflictingTaxonomyDecision<T>(field);
  }
  return decision;
}

function reconcileTaxonomyAssessment(
  records: readonly TechnologyAsset[],
  resolutionsByField: ReadonlyMap<string, AttributeResolution>,
): TechnologyTaxonomyAssessment | undefined {
  if (!records.some((record) => record.taxonomy !== undefined)) return undefined;

  const domainResolution = resolutionsByField.get("domain");
  const classResolution = resolutionsByField.get("assetClass");
  const roleResolution = resolutionsByField.get("role");
  if (!domainResolution || !classResolution || !roleResolution) {
    throw new ReconciliationOutputError(["reconciliation.taxonomy_resolution_missing"]);
  }

  const assessment: TechnologyTaxonomyAssessment = Object.freeze({
    taxonomyVersion: technologyTaxonomyVersion,
    domain: taxonomyDecisionFromResolution<TechnologyAsset["domain"]>("domain", domainResolution, records),
    assetClass: taxonomyDecisionFromResolution<TechnologyAsset["assetClass"]>("assetClass", classResolution, records),
    role: taxonomyDecisionFromResolution<TechnologyAsset["role"]>("role", roleResolution, records),
  });
  const issues = validateTechnologyTaxonomyAssessment(assessment);
  if (issues.length > 0) {
    throw new ReconciliationOutputError(issues.map((issue) => issue.code));
  }
  return assessment;
}

/**
 * Proyecta un match ya aceptado sobre un activo canónico existente. El id del
 * anchor se preserva siempre; nuevas fuentes, atributos u orden de entrada no lo
 * regeneran. Conflictos de atributos permanecen en el envelope de auditoría.
 */
export function projectCanonicalAsset(
  anchor: TechnologyAsset,
  matchedRecords: readonly TechnologyAsset[],
): CanonicalProjectionResult {
  const records = Object.freeze([anchor, ...matchedRecords]);
  records.forEach((record, index) => {
    const errors = validateTechnologyAsset(record, `records[${index}]`).filter((issue) => issue.severity === "error");
    if (errors.length > 0) throw new ReconciliationInputError(errors.map((issue) => issue.code));
  });

  const claimsByField = collectClaims(records);
  const anchorValues = fieldValues(anchor);
  const resolutions = [...claimsByField.entries()]
    .map(([fieldPath, claims]) => resolveFieldClaims(fieldPath, claims, anchor, anchorValues.get(fieldPath)))
    .sort((left, right) => left.fieldPath.localeCompare(right.fieldPath));
  const resolutionsByField = new Map(resolutions.map((resolution) => [resolution.fieldPath, resolution] as const));

  const attributes: Record<string, TechnologyAttributeValue> = {};
  resolutions.forEach((resolution) => {
    if (resolution.fieldPath.startsWith("attributes.")) {
      attributes[resolution.fieldPath.slice("attributes.".length)] = resolution.value;
    }
  });

  const taxonomy = reconcileTaxonomyAssessment(records, resolutionsByField);
  const operationalContexts = mergeOperationalContexts(records);
  const asset: TechnologyAsset = Object.freeze({
    id: anchor.id,
    displayName: resolvedString(resolutionsByField, "displayName"),
    domain: resolvedString(resolutionsByField, "domain") as TechnologyAsset["domain"],
    assetClass: resolvedString(resolutionsByField, "assetClass") as TechnologyAsset["assetClass"],
    role: resolvedString(resolutionsByField, "role") as TechnologyAsset["role"],
    ...(taxonomy === undefined ? {} : { taxonomy }),
    lifecycle: resolvedString(resolutionsByField, "lifecycle") as TechnologyAsset["lifecycle"],
    criticality: resolvedString(resolutionsByField, "criticality") as TechnologyAsset["criticality"],
    operationalContexts,
    identifiers: mergeIdentifiers(records),
    sourceReferences: mergeSourceReferences(records),
    attributes: Object.freeze(attributes),
    provenance: mergeProvenance(records, resolutions),
  });

  const taxonomyIssues = taxonomy === undefined ? [] : validateAssetTaxonomyProjection(asset);
  const contextIssues = operationalContexts.flatMap((context, index) =>
    validateOperationalContextReference(context, `asset.operationalContexts[${index}]`),
  );
  if (taxonomyIssues.length > 0 || contextIssues.length > 0) {
    throw new ReconciliationOutputError([...taxonomyIssues, ...contextIssues].map((issue) => issue.code));
  }

  const conflicts = Object.freeze(resolutions.flatMap((resolution) => resolution.conflict === undefined ? [] : [resolution.conflict]));
  const result: CanonicalProjectionResult = Object.freeze({
    asset,
    resolutions: Object.freeze(resolutions),
    conflicts,
  });
  const errors = validateCanonicalProjectionResult(result).filter((issue) => issue.severity === "error");
  if (errors.length > 0) throw new ReconciliationOutputError(errors.map((issue) => issue.code));
  return result;
}

/** Ejecuta matching y sólo proyecta cuando existe un único match fuerte sin conflicto. */
export function reconcileTechnologyAsset(
  incoming: TechnologyAsset,
  candidates: readonly TechnologyAsset[],
  evaluatedAt: string,
): ReconciliationRun {
  const decision = reconcileAssetIdentity(incoming, candidates, evaluatedAt);
  if (decision.kind !== "matched" || decision.matchedAssetId === undefined) {
    return Object.freeze({ decision });
  }
  const anchor = candidates.find((candidate) => candidate.id === decision.matchedAssetId);
  if (anchor === undefined) throw new ReconciliationOutputError(["reconciliation.match_target_missing"]);
  return Object.freeze({
    decision,
    projection: projectCanonicalAsset(anchor, Object.freeze([incoming])),
  });
}
