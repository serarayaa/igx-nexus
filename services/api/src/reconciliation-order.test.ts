import { describe, expect, it } from "vitest";
import type { SourceReference, SourceSystem, TechnologyAsset } from "@igx-nexus/types";
import { projectCanonicalAsset } from "./reconciliation.js";

const observedAt = "2026-09-15T18:00:00Z";

function syntheticAsset(
  id: string,
  sourceSystem: SourceSystem,
  sourceId: string,
  hostname: string,
): TechnologyAsset {
  const source: SourceReference = Object.freeze({
    source: sourceSystem,
    externalId: `synthetic/${sourceId}`,
    entityType: "SyntheticAsset",
    sourceScope: "v02-009-order-tests",
    observedAt,
    authority: "trusted",
  });

  return Object.freeze({
    id,
    displayName: `Synthetic asset ${id}`,
    domain: "IT",
    assetClass: "endpoint",
    role: "laptop",
    lifecycle: "active",
    criticality: "medium",
    identifiers: Object.freeze([
      Object.freeze({ kind: "serial_number" as const, value: "SYNTH-SERIAL-STABLE", source }),
      Object.freeze({ kind: "hostname" as const, value: hostname, source }),
    ]),
    sourceReferences: Object.freeze([source]),
    attributes: Object.freeze({ syntheticState: "stable" }),
    provenance: Object.freeze([
      Object.freeze({ fieldPath: "displayName", source, observedAt, authority: "trusted" as const }),
      Object.freeze({ fieldPath: "domain", source, observedAt, authority: "inferred" as const }),
      Object.freeze({ fieldPath: "assetClass", source, observedAt, authority: "inferred" as const }),
      Object.freeze({ fieldPath: "role", source, observedAt, authority: "inferred" as const }),
      Object.freeze({ fieldPath: "lifecycle", source, observedAt, authority: "trusted" as const }),
      Object.freeze({ fieldPath: "criticality", source, observedAt, authority: "trusted" as const }),
      Object.freeze({ fieldPath: "attributes.syntheticState", source, observedAt, authority: "trusted" as const }),
    ]),
  });
}

describe("V02-009 canonical projection ordering", () => {
  it("preserves canonical id and identical output when two new sources arrive in reverse order", () => {
    const anchor = syntheticAsset("NXS-SYNTH-ANCHOR", "glpi", "anchor", "SYNTH-HOST-GLPI");
    const intune = syntheticAsset("NXS-SYNTH-INTUNE", "intune", "intune", "SYNTH-HOST-INTUNE");
    const manual = syntheticAsset("NXS-SYNTH-MANUAL", "manual", "manual", "SYNTH-HOST-MANUAL");

    const forward = projectCanonicalAsset(anchor, [intune, manual]);
    const reverse = projectCanonicalAsset(anchor, [manual, intune]);

    expect(forward.asset.id).toBe(anchor.id);
    expect(reverse.asset.id).toBe(anchor.id);
    expect(reverse).toEqual(forward);
    expect(forward.asset.sourceReferences.map((entry) => entry.source)).toEqual(["glpi", "intune", "manual"]);
    expect(forward.asset.identifiers.filter((entry) => entry.kind === "hostname").map((entry) => entry.value).sort()).toEqual([
      "SYNTH-HOST-GLPI",
      "SYNTH-HOST-INTUNE",
      "SYNTH-HOST-MANUAL",
    ]);
  });
});
