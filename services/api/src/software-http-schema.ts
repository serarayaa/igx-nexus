import type { FastifyInstance } from "fastify";
import type { SoftwareInventoryV2, SoftwareIdentityV2, SoftwareVersionV2, SoftwareInstallationV2, OperatingSystemInstallationV2, SoftwarePaginationV2, SoftwareInstallationDateV2, SoftwareSectionV2 } from "@igx-nexus/types";
type Schema = Record<string, unknown>;
const ref = (name: string): Schema => ({ $ref: `${name}#` });
const text: Schema = { type: "string", minLength: 1 };
const timestamp: Schema = { type: "string", format: "date-time" };
const nullable = (schema: Schema): Schema => schema.type ? { ...schema, nullable: true } : { anyOf: [schema, { type: "object", nullable: true, enum: [null] }] };
const array = (items: Schema, minItems?: number): Schema => ({ type: "array", items, ...(minItems === undefined ? {} : { minItems }) });
const object = <T>(properties: Record<keyof T, Schema>): Schema => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });
const acquisition = { collectedAt: timestamp, observedAt: nullable(timestamp), sourceReferences: array(ref("HardwareSourceReference")) };
const evidence = { ...acquisition, provenance: array(ref("HardwareProvenanceRecord")) };
const installation = { ...evidence, installationId: nullable(text), installedAt: nullable(ref("SoftwareInstallationDateV2")) };
const state = (value: string): Schema => ({ type: "string", enum: [value] });
function section(item: string): Schema {
  const fields = { ...acquisition, sourceReferences: array(ref("HardwareSourceReference"), 1), items: array(ref(item)), pagination: nullable(ref("SoftwarePaginationV2")) };
  return { oneOf: [
    object<Extract<SoftwareSectionV2<unknown>, { state: "complete" }>>({ ...fields, state: state("complete") }),
    object<Extract<SoftwareSectionV2<unknown>, { state: "partial" }>>({ ...fields, state: state("partial"), gaps: array(ref("HardwareCoverageGap"), 1) }),
    ref("HardwareUnavailableSection"), ref("HardwareNotApplicableSection"), ref("HardwareNotRequestedSection"),
  ] };
}
/** Structural serializers; canonical validator remains the semantic boundary. Shared schemas register with Hardware. */
export function registerSoftwareHttpSchemas(app: FastifyInstance): void {
  const count: Schema = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
  const schemas: Record<string, Schema> = {
    SoftwareInstallationDateV2: { oneOf: [
      object<SoftwareInstallationDateV2>({ precision: state("date"), value: { type: "string", format: "date" } }),
      object<SoftwareInstallationDateV2>({ precision: state("timestamp"), value: timestamp }),
    ] },
    SoftwarePaginationV2: object<SoftwarePaginationV2>({ offset: count, retrieved: count, total: nullable(count), nextOffset: nullable(count) }),
    SoftwareIdentityV2: object<SoftwareIdentityV2>({ ...evidence, softwareId: nullable(text), name: nullable(text), publisher: nullable(text) }),
    SoftwareVersionV2: object<SoftwareVersionV2>({ ...evidence, versionId: nullable(text), value: nullable(text), architecture: nullable(text) }),
    SoftwareInstallationV2: object<SoftwareInstallationV2>({ ...installation, software: nullable(ref("SoftwareIdentityV2")), version: nullable(ref("SoftwareVersionV2")) }),
    OperatingSystemInstallationV2: object<OperatingSystemInstallationV2>({ ...installation, operatingSystemId: nullable(text), name: nullable(text), version: nullable(text), edition: nullable(text), architecture: nullable(text), servicePack: nullable(text), kernelVersion: nullable(text) }),
    SoftwareOperatingSystemsSection: section("OperatingSystemInstallationV2"),
    SoftwareInstallationsSection: section("SoftwareInstallationV2"),
    SoftwareInventoryV2: object<SoftwareInventoryV2>({ contractVersion: state("2"), assetId: text, operatingSystems: ref("SoftwareOperatingSystemsSection"), installations: ref("SoftwareInstallationsSection") }),
  };
  for (const [$id, schema] of Object.entries(schemas)) app.addSchema({ $id, title: $id, ...schema });
}
