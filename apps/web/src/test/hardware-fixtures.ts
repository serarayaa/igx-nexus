import type { HardwareComponentV2, HardwareInventoryV2, HardwareSectionV2 } from "@igx-nexus/types";

/** Synthetic evidence for tests and Storybook only. Never imported by production readers. */
export const acquisition = {
  collectedAt: "2026-10-01T12:00:00Z", observedAt: "2026-09-30T09:00:00Z",
  sourceReferences: [{ source: "demo", sourceInstanceId: "synthetic-hardware-ui", externalId: "SYNTH-RECORD", observedAt: "2026-10-01T12:00:00Z", authority: "trusted" }],
} as const;
const component: HardwareComponentV2 = { ...acquisition, provenance: [], componentId: null, manufacturer: "Fabricante sintético", model: null, identifiers: [] };
export const complete = <T,>(items: readonly T[]): HardwareSectionV2<T> => ({ ...acquisition, state: "complete", items });
const gib = 1024 ** 3;
export function hardwareFixture(assetId = "SYNTH-ASSET-1"): HardwareInventoryV2 {
  return {
    contractVersion: "2", assetId,
    processors: complete([
      { ...component, model: "CPU sintética A", cores: 8, threads: 16, baseFrequency: { value: 2.4, unit: "GHz" }, maxFrequency: { value: 3600, unit: "MHz" } },
      { ...component, model: "CPU sintética B", cores: 4, threads: null, baseFrequency: null, maxFrequency: null },
    ]),
    memoryModules: complete([
      { ...component, capacityBytes: 8 * gib, technology: "DDR3", formFactor: "DIMM", speed: { value: 1600, unit: "MT/s" }, slot: "A1" },
      { ...component, capacityBytes: 8 * gib, technology: "DDR4", formFactor: "SO-DIMM", speed: { value: 3200, unit: "MT/s" }, slot: "B1" },
      { ...component, capacityBytes: 16 * gib, technology: "DDR5", formFactor: "DIMM", speed: { value: 4800, unit: "MT/s" }, slot: null },
    ]),
    physicalStorageDevices: complete([
      { ...component, componentId: "SYNTH-DISK-SATA", model: "SSD SATA sintético", capacityBytes: 512 * gib, medium: "SSD", protocol: "ATA", interface: "SATA", formFactor: "M.2" },
      { ...component, componentId: "SYNTH-DISK-NVME", model: "SSD NVMe sintético", capacityBytes: 1024 * gib, medium: "SSD", protocol: "NVMe", interface: "PCIe", formFactor: "M.2" },
      { ...component, componentId: null, model: "HDD sintético", capacityBytes: 2048 * gib, medium: "HDD", protocol: "ATA", interface: "SATA", formFactor: "3.5-inch" },
    ]),
    logicalVolumes: complete([
      { ...acquisition, provenance: [], volumeId: "SYNTH-VOLUME-A", name: "Sistema sintético", physicalDeviceIds: ["SYNTH-DISK-SATA"], capacityBytes: 400 * gib, availableBytes: 100 * gib, fileSystem: "NTFS" },
      { ...acquisition, provenance: [], volumeId: null, name: "Datos sintéticos", physicalDeviceIds: null, capacityBytes: 800 * gib, availableBytes: null, fileSystem: "ext4" },
    ]),
    peripherals: { state: "not_requested" }, peripheralConnections: { state: "not_requested" },
  };
}
export function partialHardware(): HardwareInventoryV2 {
  const inventory = hardwareFixture();
  return { ...inventory, memoryModules: { ...acquisition, state: "partial", items: inventory.memoryModules.state === "complete" ? inventory.memoryModules.items.map((item, index) => ({ ...item, capacityBytes: index === 0 ? item.capacityBytes : null })) : [], gaps: [{ fieldPath: "memoryModules.capacityBytes", reason: "not_observed" }] }, physicalStorageDevices: { state: "unavailable", reason: "source_error" }, logicalVolumes: { ...acquisition, state: "partial", items: [], gaps: [{ fieldPath: "logicalVolumes", reason: "pagination_incomplete" }] } };
}
export function unknownHardware(): HardwareInventoryV2 {
  return { ...hardwareFixture(), processors: complete([{ ...component, manufacturer: null, cores: null, threads: null, baseFrequency: null, maxFrequency: null }]), memoryModules: complete([{ ...component, manufacturer: null, capacityBytes: null, technology: null, formFactor: null, speed: null, slot: null }]), physicalStorageDevices: complete([]), logicalVolumes: complete([{ ...acquisition, observedAt: null, provenance: [], volumeId: null, name: null, physicalDeviceIds: null, capacityBytes: 0, availableBytes: 0, fileSystem: null }]) };
}
