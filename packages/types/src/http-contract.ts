import {
  technologySchemaVersion, technologyTaxonomyVersion, technologyDomains, technologyAssetClasses,
  lifecycleStates, criticalityLevels, authorityLevels, taxonomyClassificationMethods,
  evidenceKinds, observationCategories,
  type SourceReference, type EvidenceReference, type ProvenanceRecord, type AssetIdentifier,
  type OperationalContextReference, type TaxonomyDecision, type TechnologyTaxonomyAssessment,
  type TechnologyAsset, type RelationshipEvidence, type TechnologyRelationship,
  type ObservationValue, type Observation, type TechnologySnapshot,
} from "./model.js";
import { isIsoTimestamp, validateTechnologySnapshot } from "./validation.js";
import { validateAssetTaxonomyProjection, validateOperationalContextReference } from "./taxonomy.js";

/** The small JSON-schema subset used by this contract (no independent schema library). */
interface ContractSchema {
  readonly type?: "object" | "array" | "string" | "number" | "boolean" | "null";
  readonly properties?: Readonly<Record<string, ContractSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: false | ContractSchema;
  readonly items?: ContractSchema;
  readonly enum?: readonly (string | number | boolean | null)[];
  readonly anyOf?: readonly ContractSchema[];
  readonly format?: "date-time";
}
type Keys<T> = T extends unknown ? keyof T : never;
/** Adding even an optional field to a canonical interface requires updating its serializer. */
function objectSchema<T>(properties: Record<Keys<T>, ContractSchema>, required: readonly Keys<T>[]): ContractSchema {
  return { type: "object", additionalProperties: false, properties, required: required as readonly string[] };
}
const text = { type: "string" } as const;
const number = { type: "number" } as const;
const boolean = { type: "boolean" } as const;
const timestamp = { type: "string", format: "date-time" } as const;
const nullableTimestamp = { anyOf: [timestamp, { type: "null" }] } as const;
const values = (entries: readonly string[]): ContractSchema => ({ type: "string", enum: entries });
const array = (items: ContractSchema): ContractSchema => ({ type: "array", items });
const source = objectSchema<SourceReference>({
  source: text, externalId: text, entityType: text, sourceScope: text,
  observedAt: timestamp, authority: values(authorityLevels),
}, ["source", "externalId", "observedAt", "authority"]);
const evidence = objectSchema<EvidenceReference>({
  kind: values(evidenceKinds), reference: text, label: text, observedAt: timestamp,
}, ["kind", "reference"]);
const provenance = objectSchema<ProvenanceRecord>({
  fieldPath: text, source, observedAt: timestamp, ingestedAt: timestamp,
  authority: values(authorityLevels), derivation: values(taxonomyClassificationMethods), confidence: number, evidence: array(evidence),
}, ["fieldPath", "source", "observedAt", "authority"]);
const decision = objectSchema<TaxonomyDecision<string>>({
  state: values(["classified", "unknown", "unclassified", "conflict"]), value: text,
  method: values(taxonomyClassificationMethods), reviewRequired: boolean, ruleId: text, reasonCode: text,
}, ["state", "reviewRequired", "ruleId"]);
const taxonomy = objectSchema<TechnologyTaxonomyAssessment>({
  taxonomyVersion: values([technologyTaxonomyVersion]), domain: decision, assetClass: decision, role: decision,
}, ["taxonomyVersion", "domain", "assetClass", "role"]);
const context = objectSchema<OperationalContextReference>({ id: text, kind: text, displayName: text, source }, ["id", "kind"]);
const identifier = objectSchema<AssetIdentifier>({ kind: text, value: text, source }, ["kind", "value"]);
const scalar: ContractSchema = { anyOf: [text, number, boolean, { type: "null" }] };
const asset = objectSchema<TechnologyAsset>({
  id: text, displayName: text, domain: values(technologyDomains), assetClass: values(technologyAssetClasses), role: text,
  taxonomy, operationalContexts: array(context), lifecycle: values(lifecycleStates), criticality: values(criticalityLevels),
  identifiers: array(identifier), sourceReferences: array(source), provenance: array(provenance),
  // Attributes are the canonical namespaced dictionary, not an escape hatch on the asset schema.
  attributes: { type: "object", additionalProperties: { anyOf: [scalar, array(scalar)] } },
}, ["id", "displayName", "domain", "assetClass", "role", "lifecycle", "criticality", "identifiers", "sourceReferences", "attributes", "provenance"]);
const relationshipEvidence = objectSchema<RelationshipEvidence>({
  source, observedAt: nullableTimestamp, authority: values(authorityLevels), derivation: values(taxonomyClassificationMethods),
  confidence: number, evidence: array(evidence),
}, ["source", "observedAt", "authority"]);
const relationship = objectSchema<TechnologyRelationship>({
  id: text, sourceAssetId: text, targetAssetId: text, type: text, direction: values(["directed", "bidirectional"]),
  status: values(["active", "degraded", "inactive", "unknown"]), observedAt: nullableTimestamp, evidence: array(relationshipEvidence),
}, ["id", "sourceAssetId", "targetAssetId", "type", "direction", "status", "observedAt", "evidence"]);
const observationValue = objectSchema<ObservationValue>({ kind: values(["none", "number", "string", "boolean"]), value: scalar, unit: text }, ["kind"]);
const observation = objectSchema<Observation>({
  id: text, assetId: text, category: values(observationCategories), name: text, value: observationValue,
  observedAt: timestamp, ingestedAt: timestamp, source, authority: values(authorityLevels), confidence: number, evidence: array(evidence),
}, ["id", "assetId", "category", "name", "value", "observedAt", "source", "authority"]);

export const technologySnapshotHttpSchema = objectSchema<TechnologySnapshot>({
  schemaVersion: values([technologySchemaVersion]), asOf: timestamp,
  assets: array(asset), relationships: array(relationship), observations: array(observation),
}, ["schemaVersion", "asOf", "assets", "relationships", "observations"]);

export class TechnologyContractError extends Error {
  constructor(readonly path: string, readonly code = "contract.invalid") {
    // Never include payload values, tokens or upstream error text in diagnostics.
    super(`Invalid technology contract: ${path} (${code})`);
    this.name = "TechnologyContractError";
  }
}

/** Validate precisely the schema subset above before calling typed domain validators. */
function checkShape(value: unknown, schema: ContractSchema, path: string): void {
  const fail = (code?: string): never => { throw new TechnologyContractError(path, code); };
  if (schema.anyOf) {
    for (const option of schema.anyOf) {
      try { checkShape(value, option, path); return; } catch (error) { if (!(error instanceof TechnologyContractError)) throw error; }
    }
    fail();
  }
  if (schema.enum && !schema.enum.some(candidate => candidate === value)) fail("contract.unsupported_value");
  if (schema.type === "null") { if (value !== null) fail(); return; }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return fail();
    value.forEach((entry, index) => checkShape(entry, schema.items!, `${path}[${index}]`));
    return;
  }
  if (schema.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return fail();
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(record, key)) throw new TechnologyContractError(`${path}.${key}`, "contract.required");
    }
    for (const key of Object.keys(record)) {
      const property = schema.properties && Object.hasOwn(schema.properties, key) ? schema.properties[key] : undefined;
      if (property) checkShape(record[key], property, `${path}.${key}`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        // Dictionary keys may contain source data: avoid echoing them into diagnostics.
        checkShape(record[key], schema.additionalProperties, `${path}.*`);
      } else throw new TechnologyContractError(path, "contract.unexpected_field");
    }
    return;
  }
  if (typeof value !== schema.type) fail();
  if (schema.type === "number" && !Number.isFinite(value)) fail();
  if (schema.format === "date-time" && !isIsoTimestamp(value as string)) fail("timestamp.invalid");
}

/** Strict HTTP boundary. Historical 0.2 snapshots may omit optional taxonomy/context. */
export function parseTechnologySnapshot(value: unknown): TechnologySnapshot {
  checkShape(value, technologySnapshotHttpSchema, "snapshot");
  const snapshot = value as TechnologySnapshot;
  // Typed validators assume discriminated-union fields exist; enforce these first.
  snapshot.assets.forEach((item, index) => {
    if (item.taxonomy) for (const key of ["domain", "assetClass", "role"] as const) {
      const d = item.taxonomy[key];
      if (d.state === "classified" && (typeof d.value !== "string" || d.method === undefined)) {
        throw new TechnologyContractError(`snapshot.assets[${index}].taxonomy.${key}`, "taxonomy.classified_fields_required");
      }
      if ((d.state === "unknown" || d.state === "unclassified") && ("value" in d || "method" in d)) {
        throw new TechnologyContractError(`snapshot.assets[${index}].taxonomy.${key}`, "taxonomy.unresolved_value");
      }
      if (d.state !== "classified" && typeof d.reasonCode !== "string") {
        throw new TechnologyContractError(`snapshot.assets[${index}].taxonomy.${key}.reasonCode`, "contract.required");
      }
    }
  });
  snapshot.observations.forEach((item, index) => {
    const v = item.value;
    if (v.kind !== "none" && typeof v.value !== v.kind) throw new TechnologyContractError(`snapshot.observations[${index}].value`);
    if (v.kind === "none" && ("value" in v || "unit" in v)) throw new TechnologyContractError(`snapshot.observations[${index}].value`);
    if (v.kind !== "number" && "unit" in v) throw new TechnologyContractError(`snapshot.observations[${index}].value.unit`);
  });
  const issues = [
    ...validateTechnologySnapshot(snapshot).filter(issue => issue.severity === "error"),
    ...snapshot.assets.flatMap((item, i) => [
      ...validateAssetTaxonomyProjection(item, `snapshot.assets[${i}]`),
      ...(item.operationalContexts ?? []).flatMap((ctx, j) => validateOperationalContextReference(ctx, `snapshot.assets[${i}].operationalContexts[${j}]`)),
    ]),
  ];
  const first = issues[0];
  if (first) throw new TechnologyContractError(first.path, first.code);
  return snapshot;
}
