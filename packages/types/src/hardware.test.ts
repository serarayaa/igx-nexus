import { describe, expect, it } from "vitest";
import { hardwareCoverageReasons, type HardwareInventoryV2, type HardwareComponentV2, type HardwareSectionV2 } from "./hardware.js";
import { validateHardwareInventoryV2 } from "./hardware-validation.js";
import { technologySchemaVersion, type TechnologySnapshot } from "./model.js";
import { validateTechnologySnapshot } from "./validation.js";

const at = "2026-10-01T12:00:00Z";
const observed = "2026-09-30T09:00:00Z";
const source = { source: "demo", sourceInstanceId: "synthetic-hardware-test", externalId: "synthetic-record", observedAt: at, authority: "trusted" } as const;
const acquisition = { collectedAt: at, observedAt: observed, sourceReferences: [source] } as const;
const evidence = { ...acquisition, provenance: [] } as const;
const component: HardwareComponentV2 = { ...evidence, componentId: null, manufacturer: null, model: null, identifiers: [] };
const complete = <T>(items: readonly T[]): HardwareSectionV2<T> => ({ ...acquisition, state: "complete", items });

/** All records are synthetic; factories return fresh inputs for mutation tests. */
function fixture(): HardwareInventoryV2 {
  return {
    contractVersion: "2", assetId: "SYNTH-ASSET-1",
    processors: complete([{ ...component, cores: 4, threads: 8, baseFrequency: { value: 2, unit: "GHz" }, maxFrequency: { value: 3500, unit: "MHz" } }]),
    memoryModules: complete([
      { ...component, capacityBytes: 8 * 1024 ** 3, technology: "DDR3", formFactor: "DIMM", speed: { value: 1600, unit: "MT/s" }, slot: "A" },
      { ...component, capacityBytes: 8 * 1024 ** 3, technology: "DDR4", formFactor: "DIMM", speed: { value: 3200, unit: "MT/s" }, slot: "B" },
    ]),
    physicalStorageDevices: complete([
      { ...component, componentId: "SYNTH-DISK-SATA", capacityBytes: 512 * 1024 ** 3, medium: "SSD", protocol: "ATA", interface: "SATA", formFactor: "M.2" },
      { ...component, componentId: "SYNTH-DISK-NVME", capacityBytes: 512 * 1024 ** 3, medium: "SSD", protocol: "NVMe", interface: "PCIe", formFactor: "M.2" },
    ]),
    logicalVolumes: complete([{ ...evidence, volumeId: "SYNTH-VOLUME", name: null, physicalDeviceIds: ["SYNTH-DISK-SATA", "SYNTH-DISK-NVME"], capacityBytes: 600 * 1024 ** 3, availableBytes: 100 * 1024 ** 3, fileSystem: "synthetic-fs" }]),
    peripherals: complete([{ ...component, detectionId: "SYNTH-DETECTION", category: "keyboard", managedAssetId: null }]),
    peripheralConnections: complete([{ ...evidence, detectionId: "SYNTH-DETECTION", connectionType: null, port: null }]),
  };
}
function items<T>(section: HardwareSectionV2<T>): readonly T[] {
  if (section.state !== "complete" && section.state !== "partial") throw new Error("test requires items");
  return section.items;
}
function errors(input: unknown) { return validateHardwareInventoryV2(input).filter((i) => i.severity === "error"); }

describe("Hardware & peripherals contracts V2", () => {
  it("accepts valid synthetic hardware without mutation and retains source/original times", () => {
    const input = fixture();
    const before = JSON.stringify(input);
    expect(validateHardwareInventoryV2(input)).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
    expect(items(input.processors)[0]?.collectedAt).not.toBe(items(input.processors)[0]?.observedAt);
  });
  it("keeps equal-capacity DDR3 and DDR4 distinct without assigning physical identity", () => {
    const ram = items(fixture().memoryModules);
    expect(ram[0]?.capacityBytes).toBe(ram[1]?.capacityBytes);
    expect(ram.map((m) => m.technology)).toEqual(["DDR3", "DDR4"]);
    expect(ram.map((m) => m.componentId)).toEqual([null, null]);
  });
  it("separates SATA SSD and NVMe SSD while allowing M.2 for both", () => {
    const disks = items(fixture().physicalStorageDevices);
    expect(disks.map((d) => [d.medium, d.protocol, d.interface, d.formFactor])).toEqual([
      ["SSD", "ATA", "SATA", "M.2"], ["SSD", "NVMe", "PCIe", "M.2"],
    ]);
  });
  it("represents physical devices and spanning logical volumes independently", () => {
    expect(items(fixture().logicalVolumes)[0]?.physicalDeviceIds).toHaveLength(2);
    expect(items(fixture().physicalStorageDevices)).toHaveLength(2);
  });
  it("represents detected peripherals without corporate identity or invented connection type", () => {
    const input = fixture();
    expect(items(input.peripherals)[0]?.managedAssetId).toBeNull();
    expect(items(input.peripheralConnections)[0]?.connectionType).toBeNull();
    expect(errors(input)).toEqual([]);
  });
  it("accepts explicitly unknown hardware fields and unknown original time", () => {
    const input = { ...fixture(), memoryModules: complete([{ ...component, observedAt: null, capacityBytes: null, technology: null, formFactor: null, speed: null, slot: null }]) };
    expect(errors(input)).toEqual([]);
    expect(items(input.memoryModules)[0]?.model).toBeNull();
  });
  it.each(hardwareCoverageReasons)("supports unavailable and identified partial coverage: %s", (reason) => {
    expect(errors({ ...fixture(), processors: { state: "unavailable", reason } })).toEqual([]);
    expect(errors({ ...fixture(), processors: { ...acquisition, state: "partial", items: [], gaps: [{ fieldPath: "processors", reason }] } })).toEqual([]);
  });
  it.each(["not_requested", "not_applicable"])("supports %s without items", (state) => {
    expect(errors({ ...fixture(), processors: { state } })).toEqual([]);
  });
  it.each([
    { state: "complete" }, { state: "complete", items: [], gaps: [] },
    { state: "partial", items: [], gaps: [] }, { state: "partial", items: [], gaps: [{ fieldPath: "", reason: "unsupported" }] },
    { state: "unavailable", reason: "unknown" }, { state: "unavailable", reason: "unsupported", items: [] },
    { state: "not_requested", items: [] }, { state: "not_applicable", reason: "unsupported" }, { state: "invalid" },
  ])("rejects inconsistent coverage %j", (processors) => {
    const collected = processors.state === "complete" || processors.state === "partial";
    expect(errors({ ...fixture(), processors: { ...(collected ? acquisition : {}), ...processors } }).length).toBeGreaterThan(0);
  });
  it.each([-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1, "1024", undefined])("rejects invalid bytes: %s", (capacityBytes) => {
    const memory = { ...items(fixture().memoryModules)[0], capacityBytes };
    expect(errors({ ...fixture(), memoryModules: complete([memory]) }).some((i) => i.code === "hardware.number_invalid")).toBe(true);
  });
  it.each(["2026-02-30T12:00:00Z", "2026-10-01", "invalid", undefined])("rejects invalid collection timestamps: %s", (collectedAt) => {
    expect(errors({ ...fixture(), processors: complete([{ ...items(fixture().processors)[0], collectedAt }]) }).length).toBeGreaterThan(0);
  });
  it("rejects invalid original, source and provenance timestamps", () => {
    for (const patch of [
      { observedAt: "invalid" }, { sourceReferences: [{ ...source, observedAt: "invalid" }] },
      { provenance: [{ fieldPath: "model", source, observedAt: "invalid", authority: "trusted" }] },
      { provenance: [{ fieldPath: "model", source, observedAt: observed, ingestedAt: "invalid", authority: "trusted" }] },
    ]) expect(errors({ ...fixture(), processors: complete([{ ...items(fixture().processors)[0], ...patch }]) }).length).toBeGreaterThan(0);
  });
  it("reuses existing provenance without substituting collection for original observation", () => {
    const provenance = [{ fieldPath: "cores", source, observedAt: observed, ingestedAt: at, authority: "trusted", derivation: "normalized", evidence: [{ kind: "source_record", reference: "synthetic-evidence" }] }] as const;
    expect(errors({ ...fixture(), processors: complete([{ ...items(fixture().processors)[0], provenance }]) })).toEqual([]);
  });
  it("rejects incompatible protocol/interface and mixed-unit frequency ranges", () => {
    expect(errors({ ...fixture(), physicalStorageDevices: complete([{ ...items(fixture().physicalStorageDevices)[0], protocol: "NVMe", interface: "SATA" }]) })).not.toEqual([]);
    expect(errors({ ...fixture(), processors: complete([{ ...items(fixture().processors)[0], baseFrequency: { value: 4, unit: "GHz" }, maxFrequency: { value: 3000, unit: "MHz" } }]) })).not.toEqual([]);
  });
  it("rejects missing fields, unsupported technologies and measurement units", () => {
    for (const patch of [{ technology: "DDR6" }, { technology: undefined }, { speed: { value: 100, unit: "bytes" } }, { speed: { value: null, unit: "MT/s" } }, { identifiers: [{ kind: "serial_number", value: "" }] }]) {
      expect(errors({ ...fixture(), memoryModules: complete([{ ...items(fixture().memoryModules)[0], ...patch }]) })).not.toEqual([]);
    }
  });
  it("rejects inconsistent counts, available space and observations after retrieval", () => {
    expect(errors({ ...fixture(), processors: complete([{ ...items(fixture().processors)[0], cores: 8, threads: 4 }]) })).not.toEqual([]);
    expect(errors({ ...fixture(), logicalVolumes: complete([{ ...items(fixture().logicalVolumes)[0], capacityBytes: 100, availableBytes: 101 }]) })).not.toEqual([]);
    expect(errors({ ...fixture(), processors: complete([{ ...items(fixture().processors)[0], observedAt: "2026-10-02T00:00:00Z" }]) })).not.toEqual([]);
  });
  it("rejects ambiguous identity duplicates, but allows identical unidentifiable modules", () => {
    const ram = items(fixture().memoryModules)[0]!;
    expect(errors({ ...fixture(), memoryModules: complete([ram, ram]) })).toEqual([]);
    expect(errors({ ...fixture(), memoryModules: complete([{ ...ram, componentId: "SYNTH-RAM" }, { ...ram, componentId: "SYNTH-RAM" }]) }).some((i) => i.code === "hardware.identity_duplicate")).toBe(true);
  });
  it("requires references within complete coverage, warns for incomplete target coverage", () => {
    const input = { ...fixture(), peripherals: complete([]) };
    expect(errors(input).some((i) => i.code === "hardware.reference_unresolved")).toBe(true);
    expect(validateHardwareInventoryV2({ ...input, peripherals: { state: "unavailable", reason: "not_observed" } }).map((i) => i.severity)).toEqual(["warning"]);
    expect(errors({ ...fixture(), physicalStorageDevices: complete([]) })).not.toEqual([]);
  });
  it("is deterministic and validates references independently of element order", () => {
    const input = fixture();
    const extraPeripheral = { ...items(input.peripherals)[0]!, detectionId: "SYNTH-DETECTION-2" };
    const extraConnection = { ...items(input.peripheralConnections)[0]!, detectionId: "SYNTH-DETECTION-2" };
    const baseline = { ...input, peripherals: complete([...items(input.peripherals), extraPeripheral]), peripheralConnections: complete([...items(input.peripheralConnections), extraConnection]) };
    const reordered = { ...baseline, memoryModules: complete([...items(baseline.memoryModules)].reverse()), physicalStorageDevices: complete([...items(baseline.physicalStorageDevices)].reverse()), peripherals: complete([...items(baseline.peripherals)].reverse()), peripheralConnections: complete([...items(baseline.peripheralConnections)].reverse()) };
    expect(validateHardwareInventoryV2(baseline)).toEqual([]);
    expect(validateHardwareInventoryV2(reordered)).toEqual([]);
    // Concrete unresolved-reference result remains a single warning, with no index-based linking.
    for (const variant of [baseline, reordered]) {
      expect(validateHardwareInventoryV2({ ...variant, peripherals: { state: "unavailable", reason: "not_observed" }, peripheralConnections: complete([extraConnection]) })).toEqual([{
        code: "hardware.reference_unresolved", path: "hardware.peripheralConnections.items[0].detectionId",
        message: "referenced record is absent from supplied coverage", severity: "warning",
      }]);
    }
  });
  it("preserves acquisition evidence for complete empty and partial collections", () => {
    const empty = { ...fixture(), processors: complete([]) };
    expect(validateHardwareInventoryV2(empty)).toEqual([]);
    expect(empty.processors).toEqual({ ...acquisition, state: "complete", items: [] });
    expect(validateHardwareInventoryV2({ ...empty, processors: { ...acquisition, observedAt: null, state: "partial", items: [], gaps: [{ fieldPath: "processors", reason: "pagination_incomplete" }] } })).toEqual([]);
  });
  it.each([
    [{ collectedAt: "invalid" }, "hardware.timestamp_invalid"],
    [{ observedAt: "2026-02-30T00:00:00Z" }, "hardware.timestamp_invalid"],
    [{ observedAt: undefined }, "hardware.timestamp_invalid"],
    [{ sourceReferences: [] }, "hardware.section_source_required"],
    [{ sourceReferences: [{ ...source, observedAt: "invalid" }] }, "timestamp.invalid"],
    [{ observedAt: "2026-10-02T00:00:00Z" }, "hardware.observation_after_collection"],
  ])("rejects invalid acquisition metadata for complete and partial sections: %j", (patch, code) => {
    for (const section of [complete([]), { ...acquisition, state: "partial", items: [], gaps: [{ fieldPath: "processors", reason: "pagination_incomplete" }] }]) {
      expect(errors({ ...fixture(), processors: { ...section, ...patch } }).map((i) => i.code)).toContain(code);
    }
  });
  it("rejects complete empty collections without acquisition metadata", () => {
    expect(errors({ ...fixture(), processors: { state: "complete", items: [] } }).map((i) => i.code)).toEqual([
      "hardware.timestamp_invalid", "hardware.timestamp_invalid", "hardware.array_required", "hardware.section_source_required",
    ]);
  });
  it("preserves multiple similar peripherals and uncorrelatable connections without identity assignment", () => {
    const peripheral = { ...items(fixture().peripherals)[0]!, detectionId: null };
    const connection = { ...items(fixture().peripheralConnections)[0]!, detectionId: null };
    const input = { ...fixture(), peripherals: complete([peripheral, peripheral]), peripheralConnections: complete([connection]) };
    const before = JSON.stringify(input);
    expect(validateHardwareInventoryV2(input)).toEqual([]);
    expect(items(input.peripherals)).toHaveLength(2);
    expect(JSON.stringify(input)).toBe(before);
    expect(validateHardwareInventoryV2({ ...input, peripheralConnections: complete([{ ...connection, detectionId: "SYNTH-DETECTION" }]) })).toEqual([{
      code: "hardware.reference_unresolved", path: "hardware.peripheralConnections.items[0].detectionId",
      message: "referenced record is absent from supplied coverage", severity: "error",
    }]);
  });
  it("rejects empty or omitted correlation IDs while accepting explicit unknown", () => {
    for (const detectionId of ["", undefined]) {
      expect(errors({ ...fixture(), peripherals: complete([{ ...items(fixture().peripherals)[0], detectionId }]) }).map((i) => i.code)).toContain("hardware.string_invalid");
      expect(errors({ ...fixture(), peripheralConnections: complete([{ ...items(fixture().peripheralConnections)[0], detectionId }]) }).map((i) => i.code)).toContain("hardware.string_invalid");
    }
  });
  it("requires record-level evidence even when the section has valid acquisition evidence", () => {
    const input = fixture();
    const patch = { sourceReferences: [], provenance: [] };
    for (const section of ["processors", "memoryModules", "physicalStorageDevices", "logicalVolumes", "peripherals", "peripheralConnections"] as const) {
      const records = items(input[section] as HardwareSectionV2<object>).map((item, index) => index === 0 ? { ...item, ...patch } : item);
      expect(errors({ ...input, [section]: complete(records) }).map((i) => i.code)).toEqual(["hardware.evidence_required"]);
    }
  });
  it("accepts provenance-only records and explicit manual sources with unknown original time", () => {
    const processor = items(fixture().processors)[0]!;
    const provenance = [{ fieldPath: "cores", source, observedAt: observed, authority: "trusted", derivation: "observed" }] as const;
    expect(validateHardwareInventoryV2({ ...fixture(), processors: complete([{ ...processor, sourceReferences: [], provenance }]) })).toEqual([]);
    const manualSource = { ...source, source: "manual", externalId: "synthetic-manual-record" } as const;
    const manual = { ...processor, observedAt: null, sourceReferences: [manualSource], provenance: [] };
    expect(validateHardwareInventoryV2({ ...fixture(), processors: complete([manual]) })).toEqual([]);
    expect(manual.observedAt).toBeNull();
    expect(manual.sourceReferences[0]?.source).toBe("manual");
    expect(errors({ ...fixture(), processors: complete([{ ...processor, sourceReferences: [], provenance: [{ ...provenance[0], observedAt: "invalid" }] }]) }).map((i) => i.code)).toContain("hardware.evidence_required");
  });
  it.each([null, [], {}, { ...fixture(), contractVersion: "0.2" }, { ...fixture(), processors: { state: "complete", items: [null] } }, { ...fixture(), processors: complete([{ sourceReferences: [null], provenance: [null] }]) }])("reports malformed input without throwing", (input) => {
    expect(() => validateHardwareInventoryV2(input)).not.toThrow();
    expect(errors(input).length).toBeGreaterThan(0);
  });
  it("preserves 0.2 snapshots and version with no hardware requirement", () => {
    const snapshot: TechnologySnapshot = { schemaVersion: "0.2", asOf: at, assets: [], relationships: [], observations: [] };
    expect(technologySchemaVersion).toBe("0.2");
    expect(validateTechnologySnapshot(snapshot)).toEqual([]);
  });
});
