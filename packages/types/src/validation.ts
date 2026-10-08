import {
  assetIdentifierKinds,
  authorityLevels,
  criticalityLevels,
  evidenceKinds,
  knownObservationNames,
  knownRelationshipTypes,
  knownSourceSystems,
  knownTechnologyRoles,
  lifecycleStates,
  observationCategories,
  sourceReferenceKey,
  taxonomyClassificationMethods,
  technologyAssetClasses,
  technologyDomains,
  technologySchemaVersion,
  type AuthorityLevel,
  type EvidenceReference,
  type Observation,
  type ProvenanceRecord,
  type RelationshipEvidence,
  type SourceReference,
  type TechnologyAsset,
  type TechnologyRelationship,
  type TechnologySnapshot,
} from "./model.js";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
}

const ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/;
const DAYS_BY_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** Valida forma, calendario y zona horaria; Date.parse por sí solo normaliza fechas inválidas. */
export function isIsoTimestamp(value: string): boolean {
  const match = ISO_TIMESTAMP.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const timezone = match[7];
  const offsetHour = Number(match[9] ?? 0);
  const offsetMinute = Number(match[10] ?? 0);

  if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const monthDays = month === 2 && isLeapYear(year) ? 29 : DAYS_BY_MONTH[month - 1];
  if (monthDays === undefined || day < 1 || day > monthDays) return false;

  if (timezone !== "Z") {
    if (offsetHour > 14 || offsetMinute > 59) return false;
    if (offsetHour === 14 && offsetMinute !== 0) return false;
  }

  return Number.isFinite(Date.parse(value));
}

function issue(code: string, path: string, message: string, severity: ValidationSeverity = "error"): ValidationIssue {
  return { code, path, message, severity };
}

function isKnownOrCustom(value: string, known: readonly string[]): boolean {
  return known.includes(value) || (value.startsWith("custom:") && value.slice("custom:".length).trim().length > 0);
}

function validateConfidence(value: number | undefined, path: string): ValidationIssue[] {
  if (value === undefined) return [];
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return [issue("confidence.invalid", path, "confidence must be a finite number between 0 and 1")];
  }
  return [];
}

function validateAuthority(value: AuthorityLevel, path: string): ValidationIssue[] {
  return authorityLevels.includes(value)
    ? []
    : [issue("authority.invalid", path, `unsupported authority level: ${String(value)}`)];
}

function validateDerivation(value: string | undefined, path: string): ValidationIssue[] {
  if (value === undefined) return [];
  return taxonomyClassificationMethods.includes(value as (typeof taxonomyClassificationMethods)[number])
    ? []
    : [issue("derivation.invalid", path, `unsupported derivation method: ${String(value)}`)];
}

export function validateSourceReference(reference: SourceReference, path = "source"): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isKnownOrCustom(reference.source, knownSourceSystems)) {
    issues.push(issue("source.system_invalid", `${path}.source`, "source must be known or use custom:<name>"));
  }
  if (reference.sourceInstanceId !== undefined && !reference.sourceInstanceId.trim()) {
    issues.push(issue("source.instance_id_empty", `${path}.sourceInstanceId`, "sourceInstanceId cannot be empty when provided"));
  }
  if (!reference.externalId.trim()) {
    issues.push(issue("source.external_id_required", `${path}.externalId`, "externalId is required"));
  }
  if (reference.entityType !== undefined && !reference.entityType.trim()) {
    issues.push(issue("source.entity_type_empty", `${path}.entityType`, "entityType cannot be empty when provided"));
  }
  if (reference.sourceScope !== undefined && !reference.sourceScope.trim()) {
    issues.push(issue("source.scope_empty", `${path}.sourceScope`, "sourceScope cannot be empty when provided"));
  }
  if (!isIsoTimestamp(reference.observedAt)) {
    issues.push(issue("timestamp.invalid", `${path}.observedAt`, "observedAt must be an ISO-8601 timestamp with timezone"));
  }
  issues.push(...validateAuthority(reference.authority, `${path}.authority`));
  return issues;
}

function validateEvidence(reference: EvidenceReference, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!evidenceKinds.includes(reference.kind)) {
    issues.push(issue("evidence.kind_invalid", `${path}.kind`, "unsupported evidence kind"));
  }
  if (!reference.reference.trim()) {
    issues.push(issue("evidence.reference_required", `${path}.reference`, "evidence reference is required"));
  }
  if (reference.label !== undefined && !reference.label.trim()) {
    issues.push(issue("evidence.label_empty", `${path}.label`, "label cannot be empty when provided"));
  }
  if (reference.observedAt !== undefined && !isIsoTimestamp(reference.observedAt)) {
    issues.push(issue("timestamp.invalid", `${path}.observedAt`, "evidence observedAt must be an ISO-8601 timestamp with timezone"));
  }
  return issues;
}

function validateProvenance(record: ProvenanceRecord, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [...validateSourceReference(record.source, `${path}.source`)];
  if (!record.fieldPath.trim()) {
    issues.push(issue("provenance.field_required", `${path}.fieldPath`, "fieldPath is required"));
  }
  if (!isIsoTimestamp(record.observedAt)) {
    issues.push(issue("timestamp.invalid", `${path}.observedAt`, "observedAt must be an ISO-8601 timestamp with timezone"));
  }
  if (record.ingestedAt !== undefined && !isIsoTimestamp(record.ingestedAt)) {
    issues.push(issue("timestamp.invalid", `${path}.ingestedAt`, "ingestedAt must be an ISO-8601 timestamp with timezone"));
  }
  issues.push(...validateAuthority(record.authority, `${path}.authority`));
  issues.push(...validateDerivation(record.derivation, `${path}.derivation`));
  issues.push(...validateConfidence(record.confidence, `${path}.confidence`));
  record.evidence?.forEach((evidence, index) => {
    issues.push(...validateEvidence(evidence, `${path}.evidence[${index}]`));
  });
  return issues;
}

export function validateTechnologyAsset(asset: TechnologyAsset, path = "asset"): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!asset.id.trim()) issues.push(issue("asset.id_required", `${path}.id`, "canonical NEXUS id is required"));
  if (!asset.displayName.trim()) issues.push(issue("asset.name_required", `${path}.displayName`, "displayName is required"));
  if (!technologyDomains.includes(asset.domain)) issues.push(issue("asset.domain_invalid", `${path}.domain`, "unsupported technology domain"));
  if (!technologyAssetClasses.includes(asset.assetClass)) issues.push(issue("asset.class_invalid", `${path}.assetClass`, "unsupported asset class"));
  if (!isKnownOrCustom(asset.role, knownTechnologyRoles)) issues.push(issue("asset.role_invalid", `${path}.role`, "role must be known or use custom:<name>"));
  if (!lifecycleStates.includes(asset.lifecycle)) issues.push(issue("asset.lifecycle_invalid", `${path}.lifecycle`, "unsupported lifecycle state"));
  if (!criticalityLevels.includes(asset.criticality)) issues.push(issue("asset.criticality_invalid", `${path}.criticality`, "unsupported criticality"));

  if (asset.sourceReferences.length === 0) {
    issues.push(issue("asset.source_required", `${path}.sourceReferences`, "at least one source reference is required"));
  }

  const sourceKeys = new Set<string>();
  asset.sourceReferences.forEach((reference, index) => {
    issues.push(...validateSourceReference(reference, `${path}.sourceReferences[${index}]`));
    const key = sourceReferenceKey(reference);
    if (sourceKeys.has(key)) {
      issues.push(issue("asset.source_duplicate", `${path}.sourceReferences[${index}]`, "duplicate source reference"));
    }
    sourceKeys.add(key);
  });

  const identifierKeys = new Set<string>();
  asset.identifiers.forEach((identifier, index) => {
    const identifierPath = `${path}.identifiers[${index}]`;
    if (!isKnownOrCustom(identifier.kind, assetIdentifierKinds)) {
      issues.push(issue("identifier.kind_invalid", `${identifierPath}.kind`, "identifier kind must be known or use custom:<name>"));
    }
    if (!identifier.value.trim()) {
      issues.push(issue("identifier.value_required", `${identifierPath}.value`, "identifier value is required"));
    }
    const key = JSON.stringify([identifier.kind, identifier.value.trim().toLocaleLowerCase("en-US")]);
    if (identifierKeys.has(key)) {
      issues.push(issue("identifier.duplicate", identifierPath, "duplicate identifier on canonical asset"));
    }
    identifierKeys.add(key);
    if (identifier.source) issues.push(...validateSourceReference(identifier.source, `${identifierPath}.source`));
  });

  Object.keys(asset.attributes).forEach((key) => {
    if (!key.trim()) issues.push(issue("attribute.key_empty", `${path}.attributes`, "attribute keys cannot be empty"));
    const value = asset.attributes[key];
    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry, index) => {
      if (typeof entry === "number" && !Number.isFinite(entry)) {
        issues.push(issue("attribute.number_invalid", `${path}.attributes.${key}[${index}]`, "numeric attribute values must be finite"));
      }
    });
  });

  asset.provenance.forEach((record, index) => {
    const recordPath = `${path}.provenance[${index}]`;
    issues.push(...validateProvenance(record, recordPath));
    if (!sourceKeys.has(sourceReferenceKey(record.source))) {
      issues.push(issue("provenance.source_unlinked", `${recordPath}.source`, "provenance source must also appear in asset.sourceReferences"));
    }
  });

  return issues;
}

export function validateObservation(observation: Observation, path = "observation"): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [...validateSourceReference(observation.source, `${path}.source`)];
  if (!observation.id.trim()) issues.push(issue("observation.id_required", `${path}.id`, "observation id is required"));
  if (!observation.assetId.trim()) issues.push(issue("observation.asset_required", `${path}.assetId`, "assetId is required"));
  if (!observationCategories.includes(observation.category)) issues.push(issue("observation.category_invalid", `${path}.category`, "unsupported observation category"));
  if (!isKnownOrCustom(observation.name, knownObservationNames)) issues.push(issue("observation.name_invalid", `${path}.name`, "name must be known or use custom:<name>"));
  if (!isIsoTimestamp(observation.observedAt)) issues.push(issue("timestamp.invalid", `${path}.observedAt`, "observedAt must be an ISO-8601 timestamp with timezone"));
  if (observation.ingestedAt !== undefined && !isIsoTimestamp(observation.ingestedAt)) {
    issues.push(issue("timestamp.invalid", `${path}.ingestedAt`, "ingestedAt must be an ISO-8601 timestamp with timezone"));
  }
  issues.push(...validateAuthority(observation.authority, `${path}.authority`));
  issues.push(...validateConfidence(observation.confidence, `${path}.confidence`));

  if (observation.value.kind === "number") {
    if (!Number.isFinite(observation.value.value)) {
      issues.push(issue("observation.number_invalid", `${path}.value.value`, "numeric observation values must be finite"));
    }
    if (observation.value.unit !== undefined && !observation.value.unit.trim()) {
      issues.push(issue("observation.unit_empty", `${path}.value.unit`, "unit cannot be empty when provided"));
    }
  }

  observation.evidence?.forEach((evidence, index) => {
    issues.push(...validateEvidence(evidence, `${path}.evidence[${index}]`));
  });
  return issues;
}

const BIDIRECTIONAL_TYPES = new Set(["connected_to", "communicates_with"]);
const DIRECTED_TYPES = new Set(["depends_on", "uses", "hosts", "controls", "monitors"]);
const RELATIONSHIP_DIRECTIONS = new Set(["directed", "bidirectional"]);
const RELATIONSHIP_STATUSES = new Set(["active", "degraded", "inactive", "unknown"]);

function validateRelationshipEvidence(record: RelationshipEvidence, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [...validateSourceReference(record.source, `${path}.source`)];
  if (record.observedAt !== null && !isIsoTimestamp(record.observedAt)) {
    issues.push(issue("timestamp.invalid", `${path}.observedAt`, "observedAt must be null or an ISO-8601 timestamp with timezone"));
  }
  issues.push(...validateAuthority(record.authority, `${path}.authority`));
  issues.push(...validateDerivation(record.derivation, `${path}.derivation`));
  issues.push(...validateConfidence(record.confidence, `${path}.confidence`));
  record.evidence?.forEach((evidence, index) => {
    issues.push(...validateEvidence(evidence, `${path}.evidence[${index}]`));
  });
  return issues;
}

export function validateTechnologyRelationship(relationship: TechnologyRelationship, path = "relationship"): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!relationship.id.trim()) issues.push(issue("relationship.id_required", `${path}.id`, "relationship id is required"));
  if (!relationship.sourceAssetId.trim()) issues.push(issue("relationship.source_required", `${path}.sourceAssetId`, "sourceAssetId is required"));
  if (!relationship.targetAssetId.trim()) issues.push(issue("relationship.target_required", `${path}.targetAssetId`, "targetAssetId is required"));
  if (relationship.sourceAssetId === relationship.targetAssetId) {
    issues.push(issue("relationship.self_reference", path, "self relationships are not supported"));
  }
  if (!isKnownOrCustom(relationship.type, knownRelationshipTypes)) {
    issues.push(issue("relationship.type_invalid", `${path}.type`, "relationship type must be known or use custom:<name>"));
  }
  if (!RELATIONSHIP_DIRECTIONS.has(relationship.direction)) {
    issues.push(issue("relationship.direction_invalid", `${path}.direction`, "unsupported relationship direction"));
  }
  if (!RELATIONSHIP_STATUSES.has(relationship.status)) {
    issues.push(issue("relationship.status_invalid", `${path}.status`, "unsupported relationship status"));
  }
  if (BIDIRECTIONAL_TYPES.has(relationship.type) && relationship.direction !== "bidirectional") {
    issues.push(issue("relationship.direction_invalid", `${path}.direction`, `${relationship.type} must be bidirectional`));
  }
  if (DIRECTED_TYPES.has(relationship.type) && relationship.direction !== "directed") {
    issues.push(issue("relationship.direction_invalid", `${path}.direction`, `${relationship.type} must be directed`));
  }
  if (relationship.observedAt !== null && !isIsoTimestamp(relationship.observedAt)) {
    issues.push(issue("timestamp.invalid", `${path}.observedAt`, "observedAt must be null or an ISO-8601 timestamp with timezone"));
  }
  if (relationship.evidence.length === 0) {
    issues.push(issue("relationship.evidence_required", `${path}.evidence`, "at least one evidence record is required"));
  }
  relationship.evidence.forEach((evidence, index) => {
    issues.push(...validateRelationshipEvidence(evidence, `${path}.evidence[${index}]`));
  });
  return issues;
}

function duplicateIdIssues<T extends { readonly id: string }>(
  values: readonly T[],
  path: string,
  code: string,
): ValidationIssue[] {
  const seen = new Set<string>();
  const issues: ValidationIssue[] = [];
  values.forEach((value, index) => {
    if (seen.has(value.id)) issues.push(issue(code, `${path}[${index}].id`, `duplicate id: ${value.id}`));
    seen.add(value.id);
  });
  return issues;
}

function relationshipSemanticKey(relationship: TechnologyRelationship): string {
  if (relationship.direction === "bidirectional") {
    const endpoints = [relationship.sourceAssetId, relationship.targetAssetId].sort();
    return JSON.stringify([relationship.type, "bidirectional", endpoints[0], endpoints[1]]);
  }
  return JSON.stringify([
    relationship.type,
    "directed",
    relationship.sourceAssetId,
    relationship.targetAssetId,
  ]);
}

export function validateTechnologySnapshot(snapshot: TechnologySnapshot): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (snapshot.schemaVersion !== technologySchemaVersion) {
    issues.push(issue("snapshot.schema_version_invalid", "snapshot.schemaVersion", `schemaVersion must be ${technologySchemaVersion}`));
  }
  if (!isIsoTimestamp(snapshot.asOf)) issues.push(issue("timestamp.invalid", "snapshot.asOf", "asOf must be an ISO-8601 timestamp with timezone"));

  snapshot.assets.forEach((asset, index) => issues.push(...validateTechnologyAsset(asset, `snapshot.assets[${index}]`)));
  snapshot.relationships.forEach((relationship, index) => issues.push(...validateTechnologyRelationship(relationship, `snapshot.relationships[${index}]`)));
  snapshot.observations.forEach((observation, index) => issues.push(...validateObservation(observation, `snapshot.observations[${index}]`)));

  issues.push(...duplicateIdIssues(snapshot.assets, "snapshot.assets", "snapshot.asset_id_duplicate"));
  issues.push(...duplicateIdIssues(snapshot.relationships, "snapshot.relationships", "snapshot.relationship_id_duplicate"));
  issues.push(...duplicateIdIssues(snapshot.observations, "snapshot.observations", "snapshot.observation_id_duplicate"));

  const relationshipKeys = new Set<string>();
  snapshot.relationships.forEach((relationship, index) => {
    const key = relationshipSemanticKey(relationship);
    if (relationshipKeys.has(key)) {
      issues.push(issue(
        "snapshot.relationship_semantic_duplicate",
        `snapshot.relationships[${index}]`,
        "duplicate canonical relationship semantics; merge supporting evidence instead of duplicating the edge",
      ));
    }
    relationshipKeys.add(key);
  });

  const assetIds = new Set(snapshot.assets.map((asset) => asset.id));
  snapshot.relationships.forEach((relationship, index) => {
    if (!assetIds.has(relationship.sourceAssetId)) {
      issues.push(issue("snapshot.relationship_endpoint_missing", `snapshot.relationships[${index}].sourceAssetId`, "source asset is not present in snapshot", "warning"));
    }
    if (!assetIds.has(relationship.targetAssetId)) {
      issues.push(issue("snapshot.relationship_endpoint_missing", `snapshot.relationships[${index}].targetAssetId`, "target asset is not present in snapshot", "warning"));
    }
  });
  snapshot.observations.forEach((observation, index) => {
    if (!assetIds.has(observation.assetId)) {
      issues.push(issue("snapshot.observation_asset_missing", `snapshot.observations[${index}].assetId`, "observation references an asset not present in snapshot", "warning"));
    }
  });

  return issues;
}
export { validateProvenance as validateProvenanceRecord };
