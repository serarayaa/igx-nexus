import type { HardwareEvidenceV2, HardwareSectionV2 } from "./hardware.js";

export const softwareInventoryVersion = "2" as const;

/** Reuses acquisition/provenance policy, not hardware component attributes. */
export type SoftwareEvidenceV2 = HardwareEvidenceV2;

/** Source precision is preserved; a calendar date must not become an invented midnight. */
export type SoftwareInstallationDateV2 =
  | { readonly precision: "date"; readonly value: string }
  | { readonly precision: "timestamp"; readonly value: string };

/** Aggregate contiguous source window, not a page-size or a catalog count. */
export interface SoftwarePaginationV2 {
  readonly offset: number;
  readonly retrieved: number;
  readonly total: number | null;
  /** Evidence-backed next offset; null means no continuation supplied, not necessarily exhaustion. */
  readonly nextOffset: number | null;
}

/** Same five coverage variants as Hardware V2; pagination only belongs to collected sections. */
export type SoftwareSectionV2<T> =
  | (Extract<HardwareSectionV2<T>, { state: "complete" | "partial" }> & { readonly pagination: SoftwarePaginationV2 | null })
  | Exclude<HardwareSectionV2<T>, { state: "complete" | "partial" }>;

export interface SoftwareIdentityV2 extends SoftwareEvidenceV2 {
  /** Inventory-local explicit correlation key, never a name-derived identity. */
  readonly softwareId: string | null;
  readonly name: string | null;
  readonly publisher: string | null;
}

export interface SoftwareVersionV2 extends SoftwareEvidenceV2 {
  readonly versionId: string | null;
  /** Verbatim label; not necessarily SemVer, not numerically ordered or normalized. */
  readonly value: string | null;
  readonly architecture: string | null;
}

/** One observed installation on SoftwareInventoryV2.assetId. Catalog records alone are not installations. */
export interface SoftwareInstallationV2 extends SoftwareEvidenceV2 {
  /** null preserves distinct uncorrelated observations; it is not a shared identity. */
  readonly installationId: string | null;
  readonly software: SoftwareIdentityV2 | null;
  readonly version: SoftwareVersionV2 | null;
  readonly installedAt: SoftwareInstallationDateV2 | null;
}

export interface OperatingSystemInstallationV2 extends SoftwareEvidenceV2 {
  readonly installationId: string | null;
  readonly operatingSystemId: string | null;
  readonly name: string | null;
  readonly version: string | null;
  readonly edition: string | null;
  readonly architecture: string | null;
  readonly servicePack: string | null;
  readonly kernelVersion: string | null;
  readonly installedAt: SoftwareInstallationDateV2 | null;
}

/** Additive companion; does not alter TechnologySnapshot 0.2 or HardwareInventoryV2. */
export interface SoftwareInventoryV2 {
  readonly contractVersion: typeof softwareInventoryVersion;
  readonly assetId: string;
  readonly operatingSystems: SoftwareSectionV2<OperatingSystemInstallationV2>;
  readonly installations: SoftwareSectionV2<SoftwareInstallationV2>;
}
