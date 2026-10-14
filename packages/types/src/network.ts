import type { HardwareEvidenceV2 } from "./hardware.js";
import type { SoftwareSectionV2 } from "./software.js";

export const networkInventoryVersion = "2" as const;
/** Reuses canonical evidence policy, not physical hardware identity or attributes. */
export type NetworkEvidenceV2 = HardwareEvidenceV2;
/** Same five coverage variants and contiguous acquisition window as Software V2. */
export type NetworkSectionV2<T> = SoftwareSectionV2<T>;

export interface NetworkCardDefinitionV2 extends NetworkEvidenceV2 {
  readonly definitionId: string | null;
  readonly designation: string | null;
  readonly manufacturer: string | null;
  readonly model: string | null;
  /** Catalog default, never a fallback for an observed attachment MAC. */
  readonly defaultMacAddress: string | null;
  /** Verbatim catalog label; no implied unit or negotiated link speed. */
  readonly bandwidthLabel: string | null;
}

export interface NetworkCardAttachmentV2 extends NetworkEvidenceV2 {
  /** Source-backed association identity, not lifetime physical identity. */
  readonly attachmentId: string | null;
  /** May be known from an embedded reference while the catalog remains unresolved. */
  readonly definitionId: string | null;
  /** Embedded network_card.designation, not an interface name. */
  readonly designation: string | null;
  readonly macAddress: string | null;
  readonly busId: string | null;
  /** Optional enrichment with independent evidence; null is not automatically an error. */
  readonly definition: NetworkCardDefinitionV2 | null;
}

/** Card-only companion. No interfaces, IP, topology or changes to snapshot 0.2.
 * New network domains require an explicit version/companion contract, not silent fields.
 */
export interface NetworkInventoryV2 {
  readonly contractVersion: typeof networkInventoryVersion;
  readonly assetId: string;
  readonly networkCards: NetworkSectionV2<NetworkCardAttachmentV2>;
}
