import { describe, expect, it } from "vitest";
import type {
  AssetIdentifierKind,
  AuthorityLevel,
  ProvenanceRecord,
  SourceReference,
  SourceSystem,
  TechnologyAsset,
  TechnologyAttributeValue,
} from "@igx-nexus/types";
import {
  ReconciliationInputError,
  projectCanonicalAsset,
  reconcileAssetIdentity,
  reconcileTechnologyAsset,
} from "./reconciliation.js";

const NOW = "2026-09-15T18:30:00Z";
const EARLIER = "2026-09-15T18:00:00Z";
const LATER = "2026-09-15T19:00:00Z";

type IdentifierSpec = Readonly<{ kind: AssetIdentifierKind; value: string }>;

interface AssetOptions {
  readonly id: string;
  readonly sourceSystem: SourceSystem;
  readonly sourceId: string;
  readonly identifiers?: readonly IdentifierSpec[];
  readonly attributes?: Readonly<Record<string, TechnologyAttributeValue>>;
  readonly observedAt?: string;
  readonly sourceAuthority?: AuthorityLevel;
  readonly fieldAuthorities?: Readonly<Record<string, AuthorityLevel>>;
  readonly displayName?: string;
}

function syntheticSource(options: AssetOptions): SourceReference {
  return Object.freeze({
    source: options.sourceSystem,
    externalId: `synthetic/${options.sourceId}`,
    entityType: "SyntheticAsset",
    sourceScope: "v02-009-tests",
    observedAt: options.observedAt ?? EARLIER,
    authority: options.sourceAuthority ?? "trusted",
  });
}

function provenanceFor(
  fieldPath: string,
  source: SourceReference,
  authority: AuthorityLevel,
): ProvenanceRecord {
  return Object.freeze({
    fieldPath,
    source,
    observedAt: source.observedAt,
    authority,
    evidence: Object.freeze([{
      kind: "source_record" as const,
      reference: `synthetic-record:${source.source}:${source.externalId}`,
      observedAt: source.observedAt,
    }]),
  });
}

function makeAsset(options: AssetOptions): TechnologyAsset {
  const source = syntheticSource(options);
  const attributes = options.attributes ?? {};
  const fieldAuthorities = options.fieldAuthorities ?? {};
  const provenance: ProvenanceRecord[] = [
    provenanceFor("displayName", source, fieldAuthorities.displayName ?? source.authority),
    provenanceFor("domain", source, fieldAuthorities.domain ?? "inferred"),
    provenanceFor("assetClass", source, fieldAuthorities.assetClass ?? "inferred"),
    provenanceFor("role", source, fieldAuthorities.role ?? "inferred"),
    provenanceFor("lifecycle", source, fieldAuthorities.lifecycle ?? source.authority),
    provenanceFor("criticality", source, fieldAuthorities.criticality ?? source.authority),
  ];
  Object.keys(attributes).sort().forEach((key) => {
    provenance.push(provenanceFor(
      `attributes.${key}`,
      source,
      fieldAuthorities[`attributes.${key}`] ?? source.authority,
    ));
  });

  return Object.freeze({
    id: options.id,
    displayName: options.displayName ?? `Synthetic asset ${options.id}`,
    domain: "IT",
    assetClass: "endpoint",
    role: "laptop",
    lifecycle: "active",
    criticality: "medium",
    identifiers: Object.freeze((options.identifiers ?? []).map((identifier) => Object.freeze({
      ...identifier,
      source,
    }))),
    sourceReferences: Object.freeze([source]),
    attributes: Object.freeze({ ...attributes }),
    provenance: Object.freeze(provenance),
  });
}

function serial(value = "SYNTH-SERIAL-001"): IdentifierSpec {
  return { kind: "serial_number", value };
}

function uuid(value = "00000000-0000-4000-8000-000000000001"): IdentifierSpec {
  return { kind: "hardware_uuid", value };
}

function hostname(value = "SYNTH-ENDPOINT-001"): IdentifierSpec {
  return { kind: "hostname", value };
}

function matchedPair(
  anchorOptions: Partial<AssetOptions> = {},
  incomingOptions: Partial<AssetOptions> = {},
): { anchor: TechnologyAsset; incoming: TechnologyAsset } {
  const anchor = makeAsset({
    id: "NXS-SYNTH-ANCHOR",
    sourceSystem: "glpi",
    sourceId: "glpi-anchor",
    identifiers: [serial()],
    ...anchorOptions,
  });
  const incoming = makeAsset({
    id: "NXS-SYNTH-INCOMING",
    sourceSystem: "intune",
    sourceId: "intune-incoming",
    identifiers: [serial()],
    ...incomingOptions,
  });
  return { anchor, incoming };
}

describe("V02-009 identity matching", () => {
  it("matches the same asset when a strong identifier agrees", () => {
    const { anchor, incoming } = matchedPair();
    const decision = reconcileAssetIdentity(incoming, [anchor], NOW);
    expect(decision.kind).toBe("matched");
    expect(decision.matchedAssetId).toBe(anchor.id);
  });

  it("does not match equal hostname when strong identity is different", () => {
    const anchor = makeAsset({
      id: "NXS-SYNTH-A",
      sourceSystem: "glpi",
      sourceId: "a",
      identifiers: [hostname("SYNTH-SAME-HOST"), serial("SYNTH-SERIAL-A")],
    });
    const incoming = makeAsset({
      id: "NXS-SYNTH-B",
      sourceSystem: "intune",
      sourceId: "b",
      identifiers: [hostname("SYNTH-SAME-HOST"), serial("SYNTH-SERIAL-B")],
    });
    const decision = reconcileAssetIdentity(incoming, [anchor], NOW);
    expect(decision.kind).toBe("not_matched");
    expect(decision.evaluations[0]?.decision).toBe("not_matched");
    expect(decision.evaluations[0]?.evidence.some((entry) => entry.ruleId === "identifier.strong.contradiction")).toBe(true);
  });

  it("requires manual review for hostname-only evidence", () => {
    const anchor = makeAsset({
      id: "NXS-SYNTH-A",
      sourceSystem: "glpi",
      sourceId: "a",
      identifiers: [hostname("SYNTH-SAME-HOST")],
    });
    const incoming = makeAsset({
      id: "NXS-SYNTH-B",
      sourceSystem: "intune",
      sourceId: "b",
      identifiers: [hostname("SYNTH-SAME-HOST")],
    });
    const decision = reconcileAssetIdentity(incoming, [anchor], NOW);
    expect(decision.kind).toBe("manual_review_required");
    expect(decision.evaluations[0]?.evidence[0]?.strength).toBe("insufficient");
  });

  it("matches an exact serial across different sources", () => {
    const { anchor, incoming } = matchedPair();
    const decision = reconcileAssetIdentity(incoming, [anchor], NOW);
    expect(decision.kind).toBe("matched");
    expect(decision.evaluations[0]?.evidence.some((entry) => entry.identifierKind === "serial_number")).toBe(true);
  });

  it("matches an exact hardware UUID across different sources", () => {
    const anchor = makeAsset({ id: "NXS-SYNTH-A", sourceSystem: "glpi", sourceId: "a", identifiers: [uuid()] });
    const incoming = makeAsset({ id: "NXS-SYNTH-B", sourceSystem: "intune", sourceId: "b", identifiers: [uuid()] });
    expect(reconcileAssetIdentity(incoming, [anchor], NOW).kind).toBe("matched");
  });

  it("keeps compatible auxiliary identifiers in manual review", () => {
    const identifiers: readonly IdentifierSpec[] = [
      { kind: "asset_tag", value: "SYNTH-TAG-001" },
      { kind: "mac_address", value: "02:00:00:00:00:01" },
    ];
    const anchor = makeAsset({ id: "NXS-SYNTH-A", sourceSystem: "glpi", sourceId: "a", identifiers });
    const incoming = makeAsset({ id: "NXS-SYNTH-B", sourceSystem: "intune", sourceId: "b", identifiers });
    const decision = reconcileAssetIdentity(incoming, [anchor], NOW);
    expect(decision.kind).toBe("manual_review_required");
    expect(decision.evaluations[0]?.evidence.filter((entry) => entry.strength === "auxiliary")).toHaveLength(2);
  });

  it("surfaces conflict when strong evidence both agrees and contradicts", () => {
    const anchor = makeAsset({
      id: "NXS-SYNTH-A",
      sourceSystem: "glpi",
      sourceId: "a",
      identifiers: [serial(), uuid("00000000-0000-4000-8000-000000000001")],
    });
    const incoming = makeAsset({
      id: "NXS-SYNTH-B",
      sourceSystem: "intune",
      sourceId: "b",
      identifiers: [serial(), uuid("00000000-0000-4000-8000-000000000002")],
    });
    const decision = reconcileAssetIdentity(incoming, [anchor], NOW);
    expect(decision.kind).toBe("conflict");
    expect(decision.evaluations[0]?.decision).toBe("conflict");
  });

  it("returns ambiguous when two canonical candidates satisfy strong rules", () => {
    const incoming = makeAsset({ id: "NXS-SYNTH-IN", sourceSystem: "intune", sourceId: "in", identifiers: [serial()] });
    const candidateA = makeAsset({ id: "NXS-SYNTH-A", sourceSystem: "glpi", sourceId: "a", identifiers: [serial()] });
    const candidateB = makeAsset({ id: "NXS-SYNTH-B", sourceSystem: "manual", sourceId: "b", identifiers: [serial()] });
    const decision = reconcileAssetIdentity(incoming, [candidateB, candidateA], NOW);
    expect(decision.kind).toBe("ambiguous");
    expect(decision.candidateAssetIds).toEqual(["NXS-SYNTH-A", "NXS-SYNTH-B"]);
  });

  it("returns ambiguous when two weak candidates are plausible", () => {
    const incoming = makeAsset({ id: "NXS-SYNTH-IN", sourceSystem: "intune", sourceId: "in", identifiers: [hostname()] });
    const candidateA = makeAsset({ id: "NXS-SYNTH-A", sourceSystem: "glpi", sourceId: "a", identifiers: [hostname()] });
    const candidateB = makeAsset({ id: "NXS-SYNTH-B", sourceSystem: "manual", sourceId: "b", identifiers: [hostname()] });
    expect(reconcileAssetIdentity(incoming, [candidateA, candidateB], NOW).kind).toBe("ambiguous");
  });

  it("does not invent a candidate when records lack comparable identifiers", () => {
    const incoming = makeAsset({ id: "NXS-SYNTH-IN", sourceSystem: "intune", sourceId: "in", identifiers: [] });
    const candidate = makeAsset({ id: "NXS-SYNTH-A", sourceSystem: "glpi", sourceId: "a", identifiers: [] });
    const decision = reconcileAssetIdentity(incoming, [candidate], NOW);
    expect(decision.kind).toBe("not_matched");
    expect(decision.candidateAssetIds).toEqual([]);
  });

  it("rejects duplicate source references before matching", () => {
    const { anchor, incoming } = matchedPair();
    const firstSource = anchor.sourceReferences[0];
    expect(firstSource).toBeDefined();
    const invalidAnchor: TechnologyAsset = {
      ...anchor,
      sourceReferences: [firstSource!, firstSource!],
    };

    expect(() => reconcileAssetIdentity(incoming, [invalidAnchor], NOW)).toThrow(ReconciliationInputError);
    try {
      reconcileAssetIdentity(incoming, [invalidAnchor], NOW);
    } catch (error) {
      expect(error).toBeInstanceOf(ReconciliationInputError);
      expect((error as ReconciliationInputError).issueCodes).toContain("asset.source_duplicate");
    }
  });

  it("treats an exact source reference as strong evidence", () => {
    const anchor = makeAsset({ id: "NXS-SYNTH-A", sourceSystem: "glpi", sourceId: "same-source-record", identifiers: [] });
    const incoming = makeAsset({ id: "NXS-SYNTH-B", sourceSystem: "glpi", sourceId: "same-source-record", identifiers: [] });
    const decision = reconcileAssetIdentity(incoming, [anchor], NOW);
    expect(decision.kind).toBe("matched");
    expect(decision.evaluations[0]?.evidence[0]?.ruleId).toBe("source_reference.exact");
  });

  it("treats IP-only evidence as insufficient for automatic matching", () => {
    const identifier: IdentifierSpec = { kind: "ip_address", value: "192.0.2.10" };
    const anchor = makeAsset({ id: "NXS-SYNTH-A", sourceSystem: "glpi", sourceId: "a", identifiers: [identifier] });
    const incoming = makeAsset({ id: "NXS-SYNTH-B", sourceSystem: "intune", sourceId: "b", identifiers: [identifier] });
    expect(reconcileAssetIdentity(incoming, [anchor], NOW).kind).toBe("manual_review_required");
  });

  it("is independent from candidate ordering", () => {
    const incoming = makeAsset({
      id: "NXS-SYNTH-IN",
      sourceSystem: "intune",
      sourceId: "in",
      identifiers: [serial(), hostname("SYNTH-SHARED-HOST")],
    });
    const strong = makeAsset({ id: "NXS-SYNTH-Z", sourceSystem: "glpi", sourceId: "z", identifiers: [serial()] });
    const weak = makeAsset({ id: "NXS-SYNTH-A", sourceSystem: "manual", sourceId: "a", identifiers: [hostname("SYNTH-SHARED-HOST")] });
    const forward = reconcileAssetIdentity(incoming, [strong, weak], NOW);
    const reverse = reconcileAssetIdentity(incoming, [weak, strong], NOW);
    expect(reverse).toEqual(forward);
    expect(forward.kind).toBe("matched");
  });

  it("does not expose raw sensitive identifier values in decisions or input errors", () => {
    const sensitive = "SYNTH-SERIAL-SENSITIVE-DO-NOT-LEAK";
    const anchor = makeAsset({
      id: "NXS-SYNTH-A",
      sourceSystem: "glpi",
      sourceId: "a",
      identifiers: [hostname("SYNTH-SHARED-HOST"), serial("SYNTH-OTHER-SERIAL")],
    });
    const incoming = makeAsset({
      id: "NXS-SYNTH-B",
      sourceSystem: "intune",
      sourceId: "b",
      identifiers: [hostname("SYNTH-SHARED-HOST"), serial(sensitive)],
    });
    const decision = reconcileAssetIdentity(incoming, [anchor], NOW);
    expect(JSON.stringify(decision)).not.toContain(sensitive);

    const invalid: TechnologyAsset = {
      ...incoming,
      identifiers: [
        { kind: "serial_number", value: sensitive, source: incoming.sourceReferences[0]! },
        { kind: "serial_number", value: sensitive, source: incoming.sourceReferences[0]! },
      ],
    };
    try {
      reconcileAssetIdentity(invalid, [anchor], NOW);
      throw new Error("expected reconciliation input to be rejected");
    } catch (error) {
      expect(error).toBeInstanceOf(ReconciliationInputError);
      expect(String((error as Error).message)).not.toContain(sensitive);
      expect(JSON.stringify((error as ReconciliationInputError).issueCodes)).not.toContain(sensitive);
    }
  });
});

describe("V02-009 attribute provenance and canonical projection", () => {
  it("preserves equal claims from multiple sources without creating a conflict", () => {
    const { anchor, incoming } = matchedPair(
      { attributes: { manufacturer: "SyntheticVendor" }, sourceAuthority: "authoritative" },
      { attributes: { manufacturer: "SyntheticVendor" }, sourceAuthority: "trusted" },
    );
    const run = reconcileTechnologyAsset(incoming, [anchor], NOW);
    expect(run.decision.kind).toBe("matched");
    const resolution = run.projection?.resolutions.find((entry) => entry.fieldPath === "attributes.manufacturer");
    expect(resolution?.claims).toHaveLength(2);
    expect(resolution?.conflict).toBeUndefined();
  });

  it("uses the centralized technical-source policy and preserves the losing claim", () => {
    const { anchor, incoming } = matchedPair(
      { attributes: { manufacturer: "SyntheticVendor-GLPI" }, sourceAuthority: "authoritative" },
      { attributes: { manufacturer: "SyntheticVendor-Intune" }, sourceAuthority: "trusted" },
    );
    const run = reconcileTechnologyAsset(incoming, [anchor], NOW);
    const projection = run.projection;
    expect(projection).toBeDefined();
    expect(projection?.asset.attributes.manufacturer).toBe("SyntheticVendor-Intune");
    const conflict = projection?.conflicts.find((entry) => entry.fieldPath === "attributes.manufacturer");
    expect(conflict?.status).toBe("resolved");
    expect(conflict?.claims).toHaveLength(2);
    expect(conflict?.resolutionRule).toContain("technical-source-authority-recency");
  });

  it("uses authority for default attributes when source-specific policy does not apply", () => {
    const { anchor, incoming } = matchedPair(
      {
        attributes: { referenceCode: "SYNTH-AUTHORITATIVE" },
        sourceAuthority: "authoritative",
      },
      {
        attributes: { referenceCode: "SYNTH-TRUSTED" },
        sourceAuthority: "trusted",
      },
    );
    const projection = reconcileTechnologyAsset(incoming, [anchor], NOW).projection;
    expect(projection?.asset.attributes.referenceCode).toBe("SYNTH-AUTHORITATIVE");
  });

  it("uses recency only after the applicable authority dimensions tie", () => {
    const { anchor, incoming } = matchedPair(
      {
        attributes: { firmwareTrack: "SYNTH-OLDER" },
        sourceAuthority: "trusted",
        observedAt: EARLIER,
      },
      {
        attributes: { firmwareTrack: "SYNTH-NEWER" },
        sourceAuthority: "trusted",
        observedAt: LATER,
      },
    );
    const projection = reconcileTechnologyAsset(incoming, [anchor], NOW).projection;
    expect(projection?.asset.attributes.firmwareTrack).toBe("SYNTH-NEWER");
  });

  it("prefers observed evidence over inferred evidence for default attributes", () => {
    const { anchor, incoming } = matchedPair(
      {
        attributes: { discoveryState: "SYNTH-INFERRED" },
        sourceAuthority: "inferred",
      },
      {
        attributes: { discoveryState: "SYNTH-OBSERVED" },
        sourceAuthority: "observed",
      },
    );
    const projection = reconcileTechnologyAsset(incoming, [anchor], NOW).projection;
    expect(projection?.asset.attributes.discoveryState).toBe("SYNTH-OBSERVED");
  });

  it("preserves an unresolved conflict and keeps the existing canonical value on a policy tie", () => {
    const { anchor, incoming } = matchedPair(
      {
        attributes: { notes: "SYNTH-ANCHOR-VALUE" },
        sourceAuthority: "trusted",
        observedAt: EARLIER,
      },
      {
        attributes: { notes: "SYNTH-INCOMING-VALUE" },
        sourceAuthority: "trusted",
        observedAt: EARLIER,
      },
    );
    const projection = reconcileTechnologyAsset(incoming, [anchor], NOW).projection;
    expect(projection?.asset.attributes.notes).toBe("SYNTH-ANCHOR-VALUE");
    const conflict = projection?.conflicts.find((entry) => entry.fieldPath === "attributes.notes");
    expect(conflict?.status).toBe("unresolved");
    expect(conflict?.resolutionRule).toBe("preserve-existing-on-policy-tie");
  });

  it("preserves provenance from both sources after canonical projection", () => {
    const { anchor, incoming } = matchedPair(
      { attributes: { manufacturer: "SyntheticVendor" } },
      { attributes: { manufacturer: "SyntheticVendor" } },
    );
    const projection = reconcileTechnologyAsset(incoming, [anchor], NOW).projection;
    const records = projection?.asset.provenance.filter((entry) => entry.fieldPath === "attributes.manufacturer") ?? [];
    expect(new Set(records.map((entry) => entry.source.source))).toEqual(new Set(["glpi", "intune"]));
    expect(projection?.asset.sourceReferences.map((entry) => entry.source).sort()).toEqual(["glpi", "intune"]);
  });

  it("keeps the canonical id stable when hostname or source ordering changes", () => {
    const { anchor, incoming } = matchedPair(
      { identifiers: [serial(), hostname("SYNTH-OLD-HOST")] },
      { identifiers: [serial(), hostname("SYNTH-NEW-HOST")] },
    );
    const projection = projectCanonicalAsset(anchor, [incoming]);
    expect(projection.asset.id).toBe("NXS-SYNTH-ANCHOR");
    expect(projection.asset.identifiers.filter((entry) => entry.kind === "hostname").map((entry) => entry.value).sort()).toEqual([
      "SYNTH-NEW-HOST",
      "SYNTH-OLD-HOST",
    ]);

    const projectionAgain = projectCanonicalAsset(anchor, [incoming]);
    expect(projectionAgain.asset.id).toBe(projection.asset.id);
  });
});
