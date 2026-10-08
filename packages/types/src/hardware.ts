import type { AssetIdentifier, ProvenanceRecord, SourceReference } from "./model.js";

export const hardwareInventoryVersion = "2" as const;
export const hardwareCoverageReasons = [
  "not_observed", "unsupported", "unauthorized", "not_implemented", "source_error", "pagination_incomplete",
] as const;
export type HardwareCoverageReason = (typeof hardwareCoverageReasons)[number];
export interface HardwareCoverageGap {
  /** Field or capability missing; never an array position used as identity. */
  readonly fieldPath: string;
  readonly reason: HardwareCoverageReason;
}
export type HardwareSectionV2<T> =
  | (HardwareAcquisitionV2 & { readonly state: "complete"; readonly items: readonly T[] })
  | (HardwareAcquisitionV2 & { readonly state: "partial"; readonly items: readonly T[]; readonly gaps: readonly HardwareCoverageGap[] })
  | { readonly state: "unavailable"; readonly reason: HardwareCoverageReason }
  | { readonly state: "not_applicable" }
  | { readonly state: "not_requested" };

export interface HardwareAcquisitionV2 {
  /** Retrieval time, never a substitute for the original observation time. */
  readonly collectedAt: string;
  readonly observedAt: string | null;
  readonly sourceReferences: readonly SourceReference[];
}
export interface HardwareEvidenceV2 extends HardwareAcquisitionV2 {
  /** Existing provenance semantics. fieldPath is relative to this record. */
  readonly provenance: readonly ProvenanceRecord[];
}
export interface HardwareComponentV2 extends HardwareEvidenceV2 {
  /** Stable physical identity only when supported; null does not merge identical components. */
  readonly componentId: string | null;
  readonly manufacturer: string | null;
  readonly model: string | null;
  readonly identifiers: readonly AssetIdentifier[];
}
export interface HardwareFrequencyV2 {
  readonly value: number;
  readonly unit: "Hz" | "MHz" | "GHz";
}
export interface ProcessorV2 extends HardwareComponentV2 {
  readonly cores: number | null;
  readonly threads: number | null;
  readonly baseFrequency: HardwareFrequencyV2 | null;
  readonly maxFrequency: HardwareFrequencyV2 | null;
}
export const memoryTechnologies = ["DDR3", "DDR4", "DDR5", "LPDDR", "LPDDR3", "LPDDR4", "LPDDR4X", "LPDDR5", "LPDDR5X", "other"] as const;
export const memoryFormFactors = ["DIMM", "SO-DIMM", "soldered", "other"] as const;
export interface MemoryModuleV2 extends HardwareComponentV2 {
  readonly capacityBytes: number | null;
  readonly technology: (typeof memoryTechnologies)[number] | null;
  readonly formFactor: (typeof memoryFormFactors)[number] | null;
  readonly speed: { readonly value: number; readonly unit: "MT/s" | "MHz" } | null;
  readonly slot: string | null;
}
export const storageMedia = ["HDD", "SSD", "hybrid"] as const;
export const storageProtocols = ["ATA", "NVMe", "SCSI", "other"] as const;
export const storageInterfaces = ["SATA", "PCIe", "SAS", "USB", "other"] as const;
export const storageFormFactors = ["M.2", "2.5-inch", "3.5-inch", "U.2", "add-in-card", "soldered", "other"] as const;
export interface PhysicalStorageDeviceV2 extends HardwareComponentV2 {
  readonly capacityBytes: number | null;
  readonly medium: (typeof storageMedia)[number] | null;
  readonly protocol: (typeof storageProtocols)[number] | null;
  readonly interface: (typeof storageInterfaces)[number] | null;
  readonly formFactor: (typeof storageFormFactors)[number] | null;
}
export interface LogicalVolumeV2 extends HardwareEvidenceV2 {
  readonly volumeId: string | null;
  readonly name: string | null;
  /** null: mapping unknown; []: source explicitly reports no physical backing. Supports spanning. */
  readonly physicalDeviceIds: readonly string[] | null;
  readonly capacityBytes: number | null;
  readonly availableBytes: number | null;
  readonly fileSystem: string | null;
}
export const peripheralCategories = ["monitor", "keyboard", "mouse", "printer", "audio", "camera", "dock", "other"] as const;
export const peripheralConnectionTypes = ["USB", "Bluetooth", "HDMI", "DisplayPort", "Thunderbolt", "network", "other"] as const;
export interface DetectedPeripheralV2 extends HardwareComponentV2 {
  /** Evidence-backed inventory-local correlation key; null means unavailable, not shared identity. */
  readonly detectionId: string | null;
  readonly category: (typeof peripheralCategories)[number] | null;
  readonly managedAssetId: string | null;
}
export interface ObservedPeripheralConnectionV2 extends HardwareEvidenceV2 {
  /** null preserves a connection with no defensible device correlation. */
  readonly detectionId: string | null;
  readonly connectionType: (typeof peripheralConnectionTypes)[number] | null;
  readonly port: string | null;
}
/** Companion contract; does not change or embed itself in the production 0.2 snapshot. */
export interface HardwareInventoryV2 {
  readonly contractVersion: typeof hardwareInventoryVersion;
  readonly assetId: string;
  readonly processors: HardwareSectionV2<ProcessorV2>;
  readonly memoryModules: HardwareSectionV2<MemoryModuleV2>;
  readonly physicalStorageDevices: HardwareSectionV2<PhysicalStorageDeviceV2>;
  readonly logicalVolumes: HardwareSectionV2<LogicalVolumeV2>;
  readonly peripherals: HardwareSectionV2<DetectedPeripheralV2>;
  readonly peripheralConnections: HardwareSectionV2<ObservedPeripheralConnectionV2>;
}
