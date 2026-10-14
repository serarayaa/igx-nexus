// Synthetic evidence only: tests, Storybook and visual review. Never imported by production flows.
import type { SoftwareInventoryV2, SoftwareInstallationV2, SoftwareSectionV2 } from "@igx-nexus/types";
export const softwareAcquisition = { collectedAt: "2026-10-13T12:00:00.000Z", observedAt: null,
  sourceReferences: [{ source: "glpi" as const, sourceInstanceId: "synthetic-software-ui", sourceScope: "Assets/Computer/42/SoftwareInstallation", externalId: "SYNTH-RECORD", entityType: "SoftwareInstallation", observedAt: "2026-10-13T11:00:00.000Z", authority: "trusted" as const }] };
const evidence = { ...softwareAcquisition, provenance: [{ fieldPath: "name", source: softwareAcquisition.sourceReferences[0]!, observedAt: "2026-10-13T11:00:00.000Z", ingestedAt: "2026-10-13T11:30:00.000Z", authority: "trusted" as const, derivation: "observed" as const, confidence: 1, evidence: [{ kind: "api_response" as const, reference: "SYNTH-RESPONSE", label: "Respuesta sintética", observedAt: "2026-10-13T11:00:00.000Z" }] }] };
export function softwareComplete<T>(items: T[]): Extract<SoftwareSectionV2<T>, { state: "complete" }> { return { state: "complete", ...softwareAcquisition, items, pagination: { offset: 0, retrieved: items.length, total: items.length, nextOffset: null } }; }
export function softwareFixture(assetId = "SYNTH ASSET", count = 145): SoftwareInventoryV2 {
  return { contractVersion: "2", assetId,
    operatingSystems: softwareComplete([
      { ...evidence, installationId: "SYNTH-OS-1", operatingSystemId: "SYNTH-SYSTEM-1", name: "Sistema sintético A", version: "23H2", edition: "Enterprise sintética", architecture: "x64", servicePack: null, kernelVersion: "SYNTH-KERNEL", installedAt: { precision: "timestamp", value: "2026-09-01T10:00:00+02:00" } },
      { ...evidence, installationId: "SYNTH-OS-2", operatingSystemId: null, name: "Sistema sintético B", version: null, edition: null, architecture: null, servicePack: null, kernelVersion: null, installedAt: null },
    ]),
    installations: softwareComplete(Array.from({ length: count }, (_, index): SoftwareInstallationV2 => ({
      ...evidence, installationId: `SYNTH-INSTALL-${index + 1}`,
      software: { ...evidence, softwareId: "SYNTH-PRODUCT", name: index < 2 ? "Programa repetido sintético" : `Programa sintético ${String(index + 1).padStart(3, "0")}`, publisher: index % 3 === 0 ? null : index % 2 ? "Editor Norte" : "Editor Sur" },
      version: { ...evidence, versionId: "SYNTH-VERSION", value: "rolling+literal", architecture: index % 2 ? "x64" : null },
      installedAt: index % 2 ? null : { precision: "date", value: "2026-09-01" },
    }))),
  };
}
export function partialSoftware(assetId = "SYNTH ASSET"): SoftwareInventoryV2 {
  const fixture = softwareFixture(assetId);
  if (fixture.installations.state !== "complete") throw new Error("Synthetic fixture");
  return { ...fixture, operatingSystems: { ...softwareComplete([]), state: "partial", gaps: [{ fieldPath: "operatingSystems", reason: "source_error" }] },
    installations: { ...fixture.installations, state: "partial", pagination: { offset: 0, retrieved: 145, total: null, nextOffset: null }, gaps: [{ fieldPath: "installations.software", reason: "pagination_incomplete" }],
      items: fixture.installations.items.map((item, index) => index === 0 ? { ...item, software: null } : item) } };
}
export function unknownSoftware(assetId = "SYNTH ASSET"): SoftwareInventoryV2 {
  return { contractVersion: "2", assetId, operatingSystems: { state: "unavailable", reason: "source_error" }, installations: softwareComplete([{ ...evidence, installationId: null, software: null, version: null, installedAt: null }]) };
}
