import {
  hardwareCoverageReasons, hardwareInventoryVersion, memoryTechnologies, memoryFormFactors,
  storageMedia, storageProtocols, storageInterfaces, storageFormFactors, peripheralCategories,
  peripheralConnectionTypes, technologySnapshotHttpSchema,
  type HardwareAcquisitionV2, type HardwareEvidenceV2, type HardwareComponentV2,
  type HardwareFrequencyV2, type HardwareCoverageGap, type HardwareInventoryV2, type HardwareSectionV2,
  type ProcessorV2, type MemoryModuleV2, type PhysicalStorageDeviceV2, type LogicalVolumeV2,
  type DetectedPeripheralV2, type ObservedPeripheralConnectionV2,
} from "@igx-nexus/types";
import type { FastifyInstance } from "fastify";

type Schema = Record<string, unknown>;
const ref = (name: string): Schema => ({ $ref: `${name}#` });
const text: Schema = { type: "string", minLength: 1 };
const timestamp: Schema = { type: "string", format: "date-time" };
const values = (entries: readonly string[]): Schema => ({ type: "string", enum: entries });
const array = (items: Schema, minItems?: number): Schema => ({ type: "array", items, ...(minItems === undefined ? {} : { minItems }) });
// OAS 3.0 has no type:null; $ref siblings are discarded by the Swagger converter.
const nullable = (schema: Schema): Schema => schema.type
  ? { ...schema, nullable: true, ...(Array.isArray(schema.enum) ? { enum: [...schema.enum, null] } : {}) }
  : { anyOf: [schema, { type: "object", nullable: true, enum: [null] }] };
const count = nullable({ type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER });
const bytes = nullable({ type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
/** Compile-time field coverage; complex semantic rules remain in the canonical validator. */
const object = <T>(properties: Record<keyof T, Schema>): Schema => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });

// Reuse the established source, provenance and identifier serializers rather than copying their rules.
const asset = technologySnapshotHttpSchema.properties!.assets!.items!.properties!;
const acquisition = {
  collectedAt: timestamp, observedAt: nullable(timestamp), sourceReferences: array(ref("HardwareSourceReference")),
} satisfies Record<keyof HardwareAcquisitionV2, Schema>;
const evidence = { ...acquisition, provenance: array(ref("HardwareProvenanceRecord")) } satisfies Record<keyof HardwareEvidenceV2, Schema>;
const component = { ...evidence, componentId: nullable(text), manufacturer: nullable(text), model: nullable(text), identifiers: array(ref("HardwareAssetIdentifier")) } satisfies Record<keyof HardwareComponentV2, Schema>;

function section(item: string): Schema {
  type Complete = Extract<HardwareSectionV2<unknown>, { state: "complete" }>;
  type Partial = Extract<HardwareSectionV2<unknown>, { state: "partial" }>;
  return {
    oneOf: [
      object<Complete>({ ...acquisition, sourceReferences: array(ref("HardwareSourceReference"), 1), state: values(["complete"]), items: array(ref(item)) }),
      object<Partial>({ ...acquisition, sourceReferences: array(ref("HardwareSourceReference"), 1), state: values(["partial"]), items: array(ref(item)), gaps: array(ref("HardwareCoverageGap"), 1) }),
      ref("HardwareUnavailableSection"), ref("HardwareNotApplicableSection"), ref("HardwareNotRequestedSection"),
    ],
  };
}

/** Structural HTTP schemas only: no duplicate identity, chronology or evidence-inference engine. */
export function registerHardwareHttpSchemas(app: FastifyInstance): void {
  const schemas: Record<string, Schema> = {
    HardwareSourceReference: asset.sourceReferences!.items! as Schema,
    HardwareProvenanceRecord: asset.provenance!.items! as Schema,
    HardwareAssetIdentifier: asset.identifiers!.items! as Schema,
    HardwareAcquisitionV2: object<HardwareAcquisitionV2>(acquisition),
    HardwareEvidenceV2: object<HardwareEvidenceV2>(evidence),
    HardwareComponentV2: object<HardwareComponentV2>(component),
    HardwareFrequencyV2: object<HardwareFrequencyV2>({ value: { type: "number", minimum: 0 }, unit: values(["Hz", "MHz", "GHz"]) }),
    HardwareMemorySpeed: { type: "object", additionalProperties: false, required: ["value", "unit"], properties: { value: { type: "number", minimum: 0 }, unit: values(["MT/s", "MHz"]) } },
    HardwareCoverageGap: object<HardwareCoverageGap>({ fieldPath: text, reason: values(hardwareCoverageReasons) }),
    HardwareUnavailableSection: object<Extract<HardwareSectionV2<unknown>, { state: "unavailable" }>>({ state: values(["unavailable"]), reason: values(hardwareCoverageReasons) }),
    HardwareNotApplicableSection: object<Extract<HardwareSectionV2<unknown>, { state: "not_applicable" }>>({ state: values(["not_applicable"]) }),
    HardwareNotRequestedSection: object<Extract<HardwareSectionV2<unknown>, { state: "not_requested" }>>({ state: values(["not_requested"]) }),
    ProcessorV2: object<ProcessorV2>({ ...component, cores: count, threads: count, baseFrequency: nullable(ref("HardwareFrequencyV2")), maxFrequency: nullable(ref("HardwareFrequencyV2")) }),
    MemoryModuleV2: object<MemoryModuleV2>({ ...component, capacityBytes: bytes, technology: nullable(values(memoryTechnologies)), formFactor: nullable(values(memoryFormFactors)), speed: nullable(ref("HardwareMemorySpeed")), slot: nullable(text) }),
    PhysicalStorageDeviceV2: object<PhysicalStorageDeviceV2>({ ...component, capacityBytes: bytes, medium: nullable(values(storageMedia)), protocol: nullable(values(storageProtocols)), interface: nullable(values(storageInterfaces)), formFactor: nullable(values(storageFormFactors)) }),
    LogicalVolumeV2: object<LogicalVolumeV2>({ ...evidence, volumeId: nullable(text), name: nullable(text), physicalDeviceIds: nullable(array(text)), capacityBytes: bytes, availableBytes: bytes, fileSystem: nullable(text) }),
    DetectedPeripheralV2: object<DetectedPeripheralV2>({ ...component, detectionId: nullable(text), category: nullable(values(peripheralCategories)), managedAssetId: nullable(text) }),
    ObservedPeripheralConnectionV2: object<ObservedPeripheralConnectionV2>({ ...evidence, detectionId: nullable(text), connectionType: nullable(values(peripheralConnectionTypes)), port: nullable(text) }),
    HardwareProcessorsSection: section("ProcessorV2"), HardwareMemorySection: section("MemoryModuleV2"),
    HardwareStorageSection: section("PhysicalStorageDeviceV2"), HardwareVolumesSection: section("LogicalVolumeV2"),
    HardwarePeripheralsSection: section("DetectedPeripheralV2"), HardwareConnectionsSection: section("ObservedPeripheralConnectionV2"),
    HardwareInventoryV2: object<HardwareInventoryV2>({ contractVersion: values([hardwareInventoryVersion]), assetId: text,
      processors: ref("HardwareProcessorsSection"), memoryModules: ref("HardwareMemorySection"), physicalStorageDevices: ref("HardwareStorageSection"), logicalVolumes: ref("HardwareVolumesSection"), peripherals: ref("HardwarePeripheralsSection"), peripheralConnections: ref("HardwareConnectionsSection") }),
  };
  for (const [$id, schema] of Object.entries(schemas)) app.addSchema({ $id, title: $id, ...schema });
}
