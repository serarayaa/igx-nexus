import type { ProvenanceRecord, SourceReference } from "./model.js";
import { hardwareCoverageReasons } from "./hardware.js";
import { networkInventoryVersion } from "./network.js";
import { isIsoTimestamp, validateProvenanceRecord, validateSourceReference, type ValidationIssue } from "./validation.js";

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const acquisitionFields = ["collectedAt", "observedAt", "sourceReferences"];
const evidenceFields = [...acquisitionFields, "provenance"];
const attachmentFields = ["attachmentId", "definitionId", "designation", "macAddress", "busId", "definition"];
const definitionFields = ["definitionId", "designation", "manufacturer", "model", "defaultMacAddress", "bandwidthLabel"];

/** Pure validation of card-only imports. Never normalizes, assigns identity, resolves
 * a catalog, merges MACs, infers relations or fills missing evidence/timestamps.
 */
export function validateNetworkInventoryV2(input: unknown, path = "network"): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fail = (code: string, at: string, message: string) => issues.push({ code: `network.${code}`, path: at, message, severity: "error" });
  const keys = (value: ObjectValue, allowed: readonly string[], at: string) => {
    for (const key of Object.keys(value)) if (!allowed.includes(key)) fail("field_unsupported", `${at}.${key}`, "field is outside the card-only contract variant");
  };
  const string = (value: unknown, at: string, nullable = true) => {
    if (!(nullable && value === null) && !text(value)) fail("string_invalid", at, "expected a non-empty string, or explicit null when unknown");
  };
  const id = (value: unknown, at: string, nullable = true) => {
    string(value, at, nullable);
    if (text(value) && value !== value.trim()) fail("identifier_invalid", at, "identity cannot contain surrounding whitespace");
  };
  const timestamp = (value: unknown, at: string, nullable = false) => {
    if (!(nullable && value === null) && (typeof value !== "string" || !isIsoTimestamp(value))) fail("timestamp_invalid", at, "expected an ISO timestamp with timezone");
  };
  const array = (value: unknown, at: string): readonly unknown[] => {
    if (Array.isArray(value)) return value;
    fail("array_required", at, "expected an array");
    return [];
  };
  const source = (value: unknown, at: string): boolean => {
    const before = issues.length;
    if (object(value)) keys(value, ["source", "sourceInstanceId", "externalId", "entityType", "sourceScope", "observedAt", "authority"], at);
    try { issues.push(...validateSourceReference(value as SourceReference, at)); }
    catch { fail("source_structure", at, "invalid source structure"); }
    return issues.length === before;
  };
  const acquisition = (value: ObjectValue, at: string) => {
    timestamp(value.collectedAt, `${at}.collectedAt`);
    timestamp(value.observedAt, `${at}.observedAt`, true);
    if (typeof value.observedAt === "string" && typeof value.collectedAt === "string" && Date.parse(value.observedAt) > Date.parse(value.collectedAt)) {
      fail("observation_after_collection", at, "original observation cannot be later than collection");
    }
    return array(value.sourceReferences, `${at}.sourceReferences`).filter((s, i) => source(s, `${at}.sourceReferences[${i}]`)).length;
  };
  const evidence = (value: ObjectValue, at: string, fields: readonly string[]) => {
    let valid = acquisition(value, at);
    array(value.provenance, `${at}.provenance`).forEach((p, i) => {
      const pp = `${at}.provenance[${i}]`;
      const before = issues.length;
      if (object(p)) {
        keys(p, ["fieldPath", "source", "observedAt", "ingestedAt", "authority", "derivation", "confidence", "evidence"], pp);
        source(p.source, `${pp}.source`);
        const allowed = [...acquisitionFields, ...fields, ...(fields.includes("definition") ? definitionFields.map(field => `definition.${field}`) : [])];
        if (typeof p.fieldPath === "string" && !allowed.includes(p.fieldPath)) fail("provenance_field", `${pp}.fieldPath`, "provenance must describe a field of this card-only record");
        if (Array.isArray(p.evidence)) p.evidence.forEach((e, n) => {
          if (object(e)) keys(e, ["kind", "reference", "label", "observedAt"], `${pp}.evidence[${n}]`);
        });
      }
      try { issues.push(...validateProvenanceRecord(p as ProvenanceRecord, pp)); }
      catch { fail("provenance_structure", pp, "invalid provenance structure"); }
      if (issues.length === before) valid++;
    });
    if (!valid) fail("evidence_required", at, "record requires a valid source reference or provenance record");
  };
  const pagination = (value: unknown, length: number, state: unknown, at: string) => {
    if (value === null) return;
    if (!object(value)) { fail("pagination_invalid", at, "expected an aggregate source window or null"); return; }
    keys(value, ["offset", "retrieved", "total", "nextOffset"], at);
    for (const field of ["offset", "retrieved", "total", "nextOffset"]) {
      if ((field === "total" || field === "nextOffset") && value[field] === null) continue;
      if (!count(value[field])) fail("pagination_invalid", `${at}.${field}`, "expected a non-negative safe integer");
    }
    if (value.retrieved !== length) fail("pagination_count", at, "retrieved must equal supplied attachment count");
    if (!count(value.offset) || !count(value.retrieved)) return;
    const end = value.offset + value.retrieved;
    if (!Number.isSafeInteger(end) || (count(value.total) && value.total < end)) fail("pagination_range", at, "source window exceeds known total or safe integer range");
    if (count(value.nextOffset) && (value.nextOffset !== end || value.retrieved === 0 || (count(value.total) && value.nextOffset >= value.total))) fail("pagination_continuation", at, "continuation must advance immediately beyond a nonempty window within known total");
    if (state === "complete" && (value.offset !== 0 || value.nextOffset !== null || (count(value.total) && value.total !== end))) fail("pagination_incomplete", at, "complete coverage requires the entire collection and no continuation");
  };
  if (!object(input)) { fail("structure", path, "expected a card-only network inventory"); return issues; }
  keys(input, ["contractVersion", "assetId", "networkCards"], path);
  if (input.contractVersion !== networkInventoryVersion) fail("version", `${path}.contractVersion`, "unsupported network contract version");
  id(input.assetId, `${path}.assetId`, false);
  const at = `${path}.networkCards`;
  const section = input.networkCards;
  if (!object(section)) { fail("section_structure", at, "expected a coverage section"); return issues; }
  const populated = section.state === "complete" || section.state === "partial";
  keys(section, populated ? ["state", "items", "pagination", ...acquisitionFields, ...(section.state === "partial" ? ["gaps"] : [])] : section.state === "unavailable" ? ["state", "reason"] : ["state"], at);
  if (typeof section.state !== "string" || !["complete", "partial", "unavailable", "not_applicable", "not_requested"].includes(section.state)) fail("coverage_state", `${at}.state`, "unsupported coverage state");
  const reason = (value: unknown, rp: string) => {
    if (!hardwareCoverageReasons.includes(value as typeof hardwareCoverageReasons[number])) fail("coverage_reason", rp, "unsupported coverage reason");
  };
  if (section.state === "unavailable") reason(section.reason, `${at}.reason`);
  if (!populated) return issues;
  if (!acquisition(section, at)) fail("section_source_required", at, "collected section requires a valid source reference, including empty results");
  if (section.state === "partial") {
    const gaps = array(section.gaps, `${at}.gaps`);
    if (!gaps.length) fail("gaps_required", `${at}.gaps`, "partial coverage requires explicit gaps");
    gaps.forEach((gap, i) => {
      const gp = `${at}.gaps[${i}]`;
      if (!object(gap)) { fail("gap_structure", gp, "expected fieldPath and reason"); return; }
      keys(gap, ["fieldPath", "reason"], gp);
      string(gap.fieldPath, `${gp}.fieldPath`, false);
      reason(gap.reason, `${gp}.reason`);
      if (gap.reason === "unauthorized") fail("authorization_coverage", gp, "authorization failure requires unavailable coverage without retained data");
    });
  }
  const items = array(section.items, `${at}.items`);
  pagination(section.pagination, items.length, section.state, `${at}.pagination`);
  const ids = new Set<string>();
  items.forEach((item, i) => {
    const ip = `${at}.items[${i}]`;
    if (!object(item)) { fail("record_structure", ip, "expected a card attachment"); return; }
    keys(item, [...evidenceFields, ...attachmentFields], ip);
    evidence(item, ip, attachmentFields);
    id(item.attachmentId, `${ip}.attachmentId`);
    id(item.definitionId, `${ip}.definitionId`);
    if (text(item.attachmentId)) {
      if (ids.has(item.attachmentId)) fail("attachment_duplicate", `${ip}.attachmentId`, "duplicate explicit association identity within section");
      ids.add(item.attachmentId);
    }
    for (const field of ["designation", "macAddress", "busId"]) string(item[field], `${ip}.${field}`);
    if (item.definition === null) return;
    const dp = `${ip}.definition`;
    if (!object(item.definition)) { fail("record_structure", dp, "expected an evidence-backed definition or explicit null"); return; }
    keys(item.definition, [...evidenceFields, ...definitionFields], dp);
    evidence(item.definition, dp, definitionFields);
    id(item.definition.definitionId, `${dp}.definitionId`);
    for (const field of definitionFields.filter(f => f !== "definitionId")) string(item.definition[field], `${dp}.${field}`);
    if (item.definitionId !== item.definition.definitionId) fail("definition_mismatch", `${dp}.definitionId`, "nested definition must match the explicit association reference");
  });
  return issues;
}
