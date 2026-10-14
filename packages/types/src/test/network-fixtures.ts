import { sourceReferenceKey, type SourceReference } from "../model.js";
import type { HardwareAcquisitionV2 } from "../hardware.js";
import type { NetworkCardAttachmentV2, NetworkCardDefinitionV2, NetworkInventoryV2, NetworkSectionV2 } from "../network.js";

/** Test-only counterparts of the eight approved review examples. No clock, I/O or Live defaults. */
export function syntheticNetworkScenarios(): readonly { readonly case: string; readonly inventory: NetworkInventoryV2 }[] {
  const time = "2026-10-14T12:00:00Z";
  const source = (scope: string, externalId: string, entityType: string): SourceReference => ({
    source: "demo", sourceInstanceId: "SYNTH-NETWORK-AUDIT", sourceScope: scope, entityType,
    externalId, observedAt: time, authority: "trusted",
  });
  const acquisition = (reference: SourceReference): HardwareAcquisitionV2 => ({ collectedAt: time, observedAt: null, sourceReferences: [reference] });
  const evidence = (reference: SourceReference) => ({ ...acquisition(reference), provenance: [] });
  const sectionSource = source("synthetic/network-card-attachments", "SYNTH-COLLECTION", "NetworkCardCollection");
  const definitionSource = source("synthetic/network-card-definitions", "SYNTH-DEFINITION-7", "NetworkCard");
  const definition: NetworkCardDefinitionV2 = {
    ...evidence(definitionSource), definitionId: sourceReferenceKey(definitionSource), designation: "Tarjeta sintética",
    manufacturer: "Fabricante sintético", model: "Modelo sintético", defaultMacAddress: "02:00:00:00:00:FF", bandwidthLabel: "1000",
  };
  const card = (n: number): NetworkCardAttachmentV2 => {
    const reference = source("synthetic/network-card-attachments", `SYNTH-ATTACHMENT-${n}`, "NetworkCardItem");
    return {
      ...evidence(reference), attachmentId: sourceReferenceKey(reference), definitionId: definition.definitionId,
      designation: "Tarjeta sintética", definition, macAddress: "02:00:00:00:00:01", busId: n === 1 ? "SYNTH-BUS-1" : null,
    };
  };
  const complete = (items: readonly NetworkCardAttachmentV2[]): Extract<NetworkSectionV2<NetworkCardAttachmentV2>, { state: "complete" }> => ({
    ...acquisition(sectionSource), state: "complete", items, pagination: { offset: 0, retrieved: items.length, total: items.length, nextOffset: null },
  });
  const inventory = (networkCards: NetworkSectionV2<NetworkCardAttachmentV2>, assetId = "SYNTH ASSET"): NetworkInventoryV2 => ({ contractVersion: "2", assetId, networkCards });
  return [
    { case: "complete-repeated-MAC-distinct-attachments", inventory: inventory(complete([card(1), card(2)])) },
    { case: "complete-empty-does-not-prove-no-network-interfaces", inventory: inventory(complete([])) },
    { case: "partial-unresolved-catalog-unknown-MAC", inventory: inventory({
      ...complete([{ ...card(1), definition: null, macAddress: null }]), state: "partial",
      gaps: [{ fieldPath: "networkCards.definition", reason: "source_error" }], pagination: { offset: 0, retrieved: 1, total: null, nextOffset: null },
    }) },
    { case: "partial-empty-acquisition-limited", inventory: inventory({
      ...complete([]), state: "partial", gaps: [{ fieldPath: "networkCards", reason: "pagination_incomplete" }], pagination: null,
    }) },
    { case: "unavailable-unauthorized-no-residual-items", inventory: inventory({ state: "unavailable", reason: "unauthorized" }) },
    { case: "unavailable-unsupported-source-capability", inventory: inventory({ state: "unavailable", reason: "unsupported" }) },
    { case: "not-applicable-explicit-other-contract-scope-only", inventory: inventory({ state: "not_applicable" }, "SYNTH NON-COMPUTER") },
    { case: "not-requested-demo-no-reader", inventory: inventory({ state: "not_requested" }) },
  ];
}
