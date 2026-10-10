import type { ProvenanceRecord, SourceReference } from "./model.js";
import { hardwareCoverageReasons } from "./hardware.js";
import { softwareInventoryVersion } from "./software.js";
import { isIsoTimestamp, validateProvenanceRecord, validateSourceReference, type ValidationIssue } from "./validation.js";

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const acquisitionFields = ["collectedAt", "observedAt", "sourceReferences"];
const evidenceFields = [...acquisitionFields, "provenance"];

/** Pure unknown-input boundary: no coercion, merging, defaults, timestamps or identifiers emitted. */
export function validateSoftwareInventoryV2(input: unknown, path = "software"): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fail = (code: string, at: string, message: string) => issues.push({ code: `software.${code}`, path: at, message, severity: "error" });
  const keys = (value: ObjectValue, allowed: readonly string[], at: string) => {
    for (const key of Object.keys(value)) if (!allowed.includes(key)) fail("field_unsupported", `${at}.${key}`, "field is outside this contract variant");
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
    try {
      const result = validateSourceReference(value as SourceReference, at);
      issues.push(...result);
      return result.length === 0;
    } catch { fail("source_structure", at, "invalid source structure"); return false; }
  };
  const acquisition = (value: ObjectValue, at: string) => {
    timestamp(value.collectedAt, `${at}.collectedAt`);
    timestamp(value.observedAt, `${at}.observedAt`, true);
    if (typeof value.observedAt === "string" && typeof value.collectedAt === "string" && Date.parse(value.observedAt) > Date.parse(value.collectedAt)) {
      fail("observation_after_collection", at, "original observation cannot be later than collection");
    }
    return array(value.sourceReferences, `${at}.sourceReferences`).filter((s, i) => source(s, `${at}.sourceReferences[${i}]`)).length;
  };
  const evidence = (value: ObjectValue, at: string) => {
    let valid = acquisition(value, at);
    array(value.provenance, `${at}.provenance`).forEach((p, i) => {
      const pp = `${at}.provenance[${i}]`;
      try {
        const result = validateProvenanceRecord(p as ProvenanceRecord, pp);
        issues.push(...result);
        if (result.length === 0) valid++;
      } catch { fail("provenance_structure", pp, "invalid provenance structure"); }
    });
    if (!valid) fail("evidence_required", at, "record requires a valid source reference or provenance record");
  };
  const installedAt = (value: unknown, at: string) => {
    if (value === null) return;
    if (!object(value)) { fail("installation_date_invalid", at, "expected precision and value, or null"); return; }
    keys(value, ["precision", "value"], at);
    if (value.precision === "timestamp") timestamp(value.value, `${at}.value`);
    else if (value.precision !== "date" || typeof value.value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.value) || !isIsoTimestamp(`${value.value}T00:00:00Z`)) {
      // The suffix is only a calendar-validation technique; it is never stored or returned.
      fail("installation_date_invalid", at, "expected a valid calendar date or timestamp with explicit precision");
    }
  };
  const nested = (value: unknown, at: string, identity: boolean) => {
    if (value === null) return;
    if (!object(value)) { fail("record_structure", at, "expected an evidence-backed record or null"); return; }
    keys(value, [...evidenceFields, ...(identity ? ["softwareId", "name", "publisher"] : ["versionId", "value", "architecture"])], at);
    evidence(value, at);
    id(value[identity ? "softwareId" : "versionId"], `${at}.${identity ? "softwareId" : "versionId"}`);
    for (const field of identity ? ["name", "publisher"] : ["value", "architecture"]) string(value[field], `${at}.${field}`);
  };
  const pagination = (value: unknown, length: number, state: unknown, at: string) => {
    if (value === null) return;
    if (!object(value)) { fail("pagination_invalid", at, "expected an aggregate source window or null"); return; }
    keys(value, ["offset", "retrieved", "total", "nextOffset"], at);
    for (const field of ["offset", "retrieved", "total", "nextOffset"]) {
      if ((field === "total" || field === "nextOffset") && value[field] === null) continue;
      if (!count(value[field])) fail("pagination_invalid", `${at}.${field}`, "expected a non-negative safe integer");
    }
    if (value.retrieved !== length) fail("pagination_count", at, "retrieved must equal supplied installation count");
    if (!count(value.offset) || !count(value.retrieved)) return;
    const end = value.offset + value.retrieved;
    if (!Number.isSafeInteger(end) || (count(value.total) && value.total < end)) fail("pagination_range", at, "source window exceeds known total or safe integer range");
    if (count(value.nextOffset) && (value.nextOffset !== end || value.retrieved === 0 || (count(value.total) && value.nextOffset >= value.total))) fail("pagination_continuation", at, "continuation must advance immediately beyond a nonempty window within known total");
    if (state === "complete" && (value.offset !== 0 || value.nextOffset !== null || (count(value.total) && value.total !== end))) fail("pagination_incomplete", at, "complete coverage requires the entire collection and no continuation");
  };
  if (!object(input)) { fail("structure", path, "expected a software inventory"); return issues; }
  keys(input, ["contractVersion", "assetId", "operatingSystems", "installations"], path);
  if (input.contractVersion !== softwareInventoryVersion) fail("version", `${path}.contractVersion`, "unsupported software contract version");
  id(input.assetId, `${path}.assetId`, false);
  for (const sectionName of ["operatingSystems", "installations"] as const) {
    const at = `${path}.${sectionName}`;
    const section = input[sectionName];
    if (!object(section)) { fail("section_structure", at, "expected a coverage section"); continue; }
    const populated = section.state === "complete" || section.state === "partial";
    keys(section, populated ? ["state", "items", "pagination", ...acquisitionFields, ...(section.state === "partial" ? ["gaps"] : [])] : section.state === "unavailable" ? ["state", "reason"] : ["state"], at);
    if (typeof section.state !== "string" || !["complete", "partial", "unavailable", "not_applicable", "not_requested"].includes(section.state)) fail("coverage_state", `${at}.state`, "unsupported coverage state");
    const reason = (value: unknown, rp: string) => {
      if (!hardwareCoverageReasons.includes(value as typeof hardwareCoverageReasons[number])) fail("coverage_reason", rp, "unsupported coverage reason");
    };
    if (section.state === "unavailable") reason(section.reason, `${at}.reason`);
    if (!populated) continue;
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
      });
    }
    const values = array(section.items, `${at}.items`);
    pagination(section.pagination, values.length, section.state, `${at}.pagination`);
    const ids = new Set<string>();
    values.forEach((value, i) => {
      const ip = `${at}.items[${i}]`;
      if (!object(value)) { fail("record_structure", ip, "expected an installation record"); return; }
      const os = sectionName === "operatingSystems";
      const fields = os ? ["operatingSystemId", "name", "version", "edition", "architecture", "servicePack", "kernelVersion"] : ["software", "version"];
      keys(value, [...evidenceFields, "installationId", "installedAt", ...fields], ip);
      evidence(value, ip);
      id(value.installationId, `${ip}.installationId`);
      if (text(value.installationId)) {
        if (ids.has(value.installationId)) fail("installation_duplicate", `${ip}.installationId`, "duplicate explicit installation identity within section");
        ids.add(value.installationId);
      }
      installedAt(value.installedAt, `${ip}.installedAt`);
      if (os) {
        id(value.operatingSystemId, `${ip}.operatingSystemId`);
        for (const field of fields.filter(f => f !== "operatingSystemId")) string(value[field], `${ip}.${field}`);
      } else {
        nested(value.software, `${ip}.software`, true);
        nested(value.version, `${ip}.version`, false);
      }
    });
  }
  return issues;
}
