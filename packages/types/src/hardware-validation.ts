import { assetIdentifierKinds, type ProvenanceRecord, type SourceReference } from "./model.js";
import {
  hardwareCoverageReasons, hardwareInventoryVersion, memoryTechnologies, memoryFormFactors,
  storageMedia, storageProtocols, storageInterfaces, storageFormFactors,
  peripheralCategories, peripheralConnectionTypes,
} from "./hardware.js";
import { isIsoTimestamp, validateProvenanceRecord, validateSourceReference, type ValidationIssue } from "./validation.js";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/** Pure validation at the import boundary. No coercion, identity assignment or inferred defaults. */
export function validateHardwareInventoryV2(input: unknown, path = "hardware"): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fail = (code: string, at: string, message: string) => issues.push({ code: `hardware.${code}`, path: at, message, severity: "error" });
  const string = (value: unknown, at: string, nullable = false) => {
    if (!(nullable && value === null) && !text(value)) fail("string_invalid", at, "expected a non-empty string");
  };
  const number = (value: unknown, at: string, integer: boolean, positive = false) => {
    if (value === null) return;
    if (typeof value !== "number" || !Number.isFinite(value) || value < (positive ? 1 : 0) || (integer && !Number.isSafeInteger(value))) {
      fail("number_invalid", at, "expected a finite non-negative value (safe integer for counts and bytes), or null");
    }
  };
  const enumeration = (value: unknown, values: readonly string[], at: string, nullable = true) => {
    if (!(nullable && value === null) && (typeof value !== "string" || !values.includes(value))) fail("enum_invalid", at, "unsupported value");
  };
  const timestamp = (value: unknown, at: string, nullable = false) => {
    if (!(nullable && value === null) && (typeof value !== "string" || !isIsoTimestamp(value))) fail("timestamp_invalid", at, "expected an ISO timestamp with timezone");
  };
  const array = (value: unknown, at: string): readonly unknown[] => {
    if (Array.isArray(value)) return value;
    fail("array_required", at, "expected an array");
    return [];
  };
  // Existing typed validators own source/provenance semantics. Malformed imported shapes are errors.
  const source = (value: unknown, at: string) => {
    try {
      const result = validateSourceReference(value as SourceReference, at);
      issues.push(...result);
      return result.length === 0;
    }
    catch { fail("source_structure", at, "invalid source reference structure"); return false; }
  };
  const acquisition = (item: RecordValue, at: string) => {
    timestamp(item.collectedAt, `${at}.collectedAt`);
    timestamp(item.observedAt, `${at}.observedAt`, true);
    if (typeof item.collectedAt === "string" && typeof item.observedAt === "string" && Date.parse(item.observedAt) > Date.parse(item.collectedAt)) {
      fail("observation_after_collection", at, "original observation cannot be later than collection");
    }
    let validSources = 0;
    array(item.sourceReferences, `${at}.sourceReferences`).forEach((s, i) => {
      if (source(s, `${at}.sourceReferences[${i}]`)) validSources++;
    });
    return validSources;
  };
  const evidence = (item: RecordValue, at: string) => {
    let validSources = acquisition(item, at);
    array(item.provenance, `${at}.provenance`).forEach((p, i) => {
      const pp = `${at}.provenance[${i}]`;
      try {
        const result = validateProvenanceRecord(p as ProvenanceRecord, pp);
        issues.push(...result);
        if (result.length === 0) validSources++;
      }
      catch { fail("provenance_structure", pp, "invalid provenance structure"); }
    });
    if (validSources === 0) fail("evidence_required", at, "record requires a valid source reference or provenance record");
  };
  const component = (item: RecordValue, at: string) => {
    for (const field of ["componentId", "manufacturer", "model"]) string(item[field], `${at}.${field}`, true);
    array(item.identifiers, `${at}.identifiers`).forEach((id, i) => {
      const ip = `${at}.identifiers[${i}]`;
      if (!record(id)) { fail("identifier_structure", ip, "expected an identifier"); return; }
      string(id.value, `${ip}.value`);
      if (!(typeof id.kind === "string" && (assetIdentifierKinds.includes(id.kind as typeof assetIdentifierKinds[number]) || (id.kind.startsWith("custom:") && text(id.kind.slice(7)))))) {
        fail("identifier_kind", `${ip}.kind`, "unsupported identifier kind");
      }
      if (id.source !== undefined) source(id.source, `${ip}.source`);
    });
  };
  const measurement = (value: unknown, at: string, units: readonly string[]) => {
    if (value === null) return;
    if (!record(value)) { fail("measurement_structure", at, "expected value and unit, or null"); return; }
    if (value.value === null) fail("measurement_value", `${at}.value`, "known measurement requires a value");
    number(value.value, `${at}.value`, false);
    enumeration(value.unit, units, `${at}.unit`, false);
  };
  if (!record(input)) { fail("structure", path, "expected a hardware inventory"); return issues; }
  if (input.contractVersion !== hardwareInventoryVersion) fail("version", `${path}.contractVersion`, "unsupported hardware contract version");
  string(input.assetId, `${path}.assetId`);
  const sections = ["processors", "memoryModules", "physicalStorageDevices", "logicalVolumes", "peripherals", "peripheralConnections"] as const;
  const items = new Map<string, readonly RecordValue[]>();
  const identities = new Map<string, Set<string>>();
  for (const name of sections) {
    const at = `${path}.${name}`;
    const section = input[name];
    if (!record(section)) { fail("section_structure", at, "expected a coverage section"); continue; }
    enumeration(section.state, ["complete", "partial", "unavailable", "not_applicable", "not_requested"], `${at}.state`, false);
    const populated = section.state === "complete" || section.state === "partial";
    const allowed = populated ? (section.state === "partial" ? ["state", "items", "gaps", "collectedAt", "observedAt", "sourceReferences"] : ["state", "items", "collectedAt", "observedAt", "sourceReferences"]) : (section.state === "unavailable" ? ["state", "reason"] : ["state"]);
    for (const key of Object.keys(section)) if (!allowed.includes(key)) fail("coverage_inconsistent", `${at}.${key}`, "field incompatible with coverage state");
    if (section.state === "unavailable") enumeration(section.reason, hardwareCoverageReasons, `${at}.reason`, false);
    if (section.state === "partial") {
      const gaps = array(section.gaps, `${at}.gaps`);
      if (gaps.length === 0) fail("gaps_required", `${at}.gaps`, "partial coverage requires identified gaps");
      gaps.forEach((gap, i) => {
        const gp = `${at}.gaps[${i}]`;
        if (!record(gap)) { fail("gap_structure", gp, "expected fieldPath and reason"); return; }
        string(gap.fieldPath, `${gp}.fieldPath`);
        enumeration(gap.reason, hardwareCoverageReasons, `${gp}.reason`, false);
      });
    }
    if (!populated) continue;
    if (acquisition(section, at) === 0) fail("section_source_required", at, "collected section requires a valid source reference");
    const values: RecordValue[] = [];
    const ids = new Set<string>();
    identities.set(name, ids);
    array(section.items, `${at}.items`).forEach((item, i) => {
      const ip = `${at}.items[${i}]`;
      if (!record(item)) { fail("item_structure", ip, "expected a record"); return; }
      values.push(item);
      evidence(item, ip);
      if (name !== "logicalVolumes" && name !== "peripheralConnections") component(item, ip);
      const identityField = name === "logicalVolumes" ? "volumeId" : name === "peripherals" ? "detectionId" : "componentId";
      if (name !== "peripheralConnections") {
        const id = item[identityField];
        string(id, `${ip}.${identityField}`, true);
        if (text(id)) {
          if (ids.has(id)) fail("identity_duplicate", `${ip}.${identityField}`, "duplicate explicit identity within section");
          ids.add(id);
        }
      }
      if (name === "processors") {
        number(item.cores, `${ip}.cores`, true, true);
        number(item.threads, `${ip}.threads`, true, true);
        measurement(item.baseFrequency, `${ip}.baseFrequency`, ["Hz", "MHz", "GHz"]);
        measurement(item.maxFrequency, `${ip}.maxFrequency`, ["Hz", "MHz", "GHz"]);
        const hz = (value: unknown): number | null => {
          if (!record(value) || typeof value.value !== "number") return null;
          const multiplier = value.unit === "Hz" ? 1 : value.unit === "MHz" ? 1e6 : value.unit === "GHz" ? 1e9 : null;
          return multiplier === null ? null : value.value * multiplier;
        };
        const base = hz(item.baseFrequency);
        const max = hz(item.maxFrequency);
        if (base !== null && max !== null && base > max) fail("frequency_range", ip, "base frequency exceeds maximum frequency");
        if (typeof item.cores === "number" && typeof item.threads === "number" && item.threads < item.cores) fail("processor_counts", ip, "threads cannot be fewer than cores");
      }
      if (name === "memoryModules") {
        enumeration(item.technology, memoryTechnologies, `${ip}.technology`);
        enumeration(item.formFactor, memoryFormFactors, `${ip}.formFactor`);
        measurement(item.speed, `${ip}.speed`, ["MT/s", "MHz"]);
        string(item.slot, `${ip}.slot`, true);
      }
      if (name === "physicalStorageDevices") {
        enumeration(item.medium, storageMedia, `${ip}.medium`);
        enumeration(item.protocol, storageProtocols, `${ip}.protocol`);
        enumeration(item.interface, storageInterfaces, `${ip}.interface`);
        enumeration(item.formFactor, storageFormFactors, `${ip}.formFactor`);
        if (item.protocol === "NVMe" && (item.interface === "SATA" || item.interface === "SAS")) {
          fail("storage_transport", ip, "NVMe cannot use SATA or SAS interface");
        }
      }
      if (["memoryModules", "physicalStorageDevices", "logicalVolumes"].includes(name)) number(item.capacityBytes, `${ip}.capacityBytes`, true);
      if (name === "logicalVolumes") {
        string(item.name, `${ip}.name`, true);
        string(item.fileSystem, `${ip}.fileSystem`, true);
        number(item.availableBytes, `${ip}.availableBytes`, true);
        if (typeof item.capacityBytes === "number" && typeof item.availableBytes === "number" && item.availableBytes > item.capacityBytes) fail("volume_capacity", ip, "available bytes exceed capacity");
        if (item.physicalDeviceIds !== null) {
          const backing = array(item.physicalDeviceIds, `${ip}.physicalDeviceIds`);
          backing.forEach((id, j) => string(id, `${ip}.physicalDeviceIds[${j}]`));
          if (new Set(backing).size !== backing.length) fail("backing_duplicate", ip, "duplicate physical backing reference");
        }
      }
      if (name === "peripherals") {
        enumeration(item.category, peripheralCategories, `${ip}.category`);
        string(item.managedAssetId, `${ip}.managedAssetId`, true);
      }
      if (name === "peripheralConnections") {
        string(item.detectionId, `${ip}.detectionId`, true);
        enumeration(item.connectionType, peripheralConnectionTypes, `${ip}.connectionType`);
        string(item.port, `${ip}.port`, true);
      }
    });
    items.set(name, values);
  }
  // Check references after gathering every section; resolution never depends on input order.
  for (const [name, field, target] of [
    ["logicalVolumes", "physicalDeviceIds", "physicalStorageDevices"],
    ["peripheralConnections", "detectionId", "peripherals"],
  ] as const) {
    const targetSection = input[target];
    (items.get(name) ?? []).forEach((item, i) => {
      const refs = name === "logicalVolumes" ? (Array.isArray(item[field]) ? item[field] : []) : [item[field]];
      for (const id of refs) if (text(id) && !identities.get(target)?.has(id)) {
        const complete = record(targetSection) && targetSection.state === "complete";
        issues.push({ code: "hardware.reference_unresolved", path: `${path}.${name}.items[${i}].${field}`, message: "referenced record is absent from supplied coverage", severity: complete ? "error" : "warning" });
      }
    });
  }
  return issues;
}
