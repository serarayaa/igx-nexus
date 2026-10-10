import type { SoftwareInventoryV2, SoftwareSectionV2, SoftwareInstallationV2 } from "../software.js";

/** Explicit synthetic fixtures. No requests, current clock, live IDs or production defaults. */
export function syntheticSoftwareInventoryV2(): SoftwareInventoryV2 {
  const source = { source: "demo", sourceInstanceId: "synthetic-software-fixture", externalId: "SYNTH-INVENTORY", entityType: "SyntheticInventory", observedAt: "2026-10-01T12:00:00Z", authority: "observed" } as const;
  const acquisition = { collectedAt: "2026-10-01T12:00:00Z", observedAt: "2026-09-30T10:00:00Z", sourceReferences: [source] } as const;
  const evidence = { ...acquisition, provenance: [] } as const;
  const section = <T>(items: readonly T[]): SoftwareSectionV2<T> => ({ ...acquisition, state: "complete", items, pagination: null });
  const installation: SoftwareInstallationV2 = {
    ...evidence, installationId: "SYNTH-INSTALL-1",
    software: { ...evidence, softwareId: "SYNTH-PRODUCT-1", name: "Synthetic Editor", publisher: "Synthetic Publisher" },
    version: { ...evidence, versionId: "SYNTH-VERSION-1", value: "2026 R2 (build 42)", architecture: "x64" },
    installedAt: { precision: "date", value: "2026-09-29" },
  };
  return {
    contractVersion: "2", assetId: "SYNTH-ASSET-1",
    operatingSystems: section([{
      ...evidence, installationId: "SYNTH-OS-INSTALL-1", operatingSystemId: "SYNTH-OS-1",
      name: "Synthetic OS", version: "2026.09", edition: "Synthetic Enterprise", architecture: "x86_64",
      servicePack: null, kernelVersion: "synthetic-kernel-42", installedAt: { precision: "timestamp", value: "2026-09-29T10:00:00-03:00" },
    }]),
    installations: section([installation, { ...installation, installationId: "SYNTH-INSTALL-2" }]),
  };
}
