import { describe, expect, it } from "vitest";
import { parseTechnologySnapshot, technologySchemaVersion, TechnologyContractError } from "@igx-nexus/types";
import { projectCanonicalSnapshot } from "./live-provider";
import { canonicalSnapshotFixture } from "./test/canonical-snapshot";

function changed(path: string, value: unknown): unknown {
  const snapshot = structuredClone(canonicalSnapshotFixture());
  const parts = path.split(".");
  let target = snapshot as unknown as Record<string, unknown>;
  for (const key of parts.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[parts.at(-1)!] = value;
  return snapshot;
}

describe("supported canonical HTTP boundary", () => {
  it("accepts the exported version and retains the complete canonical payload", () => {
    const input = canonicalSnapshotFixture();
    expect(input.schemaVersion).toBe(technologySchemaVersion);
    expect(parseTechnologySnapshot(input)).toEqual(input);
    expect(projectCanonicalSnapshot(input).canonical).toEqual(input);
  });
  it("preserves sourceInstanceId across canonical HTTP parsing and Web projection", () => {
    const input = canonicalSnapshotFixture();
    const withInstance = structuredClone(input) as unknown as Record<string, unknown>;
    const assets = withInstance.assets as Array<Record<string, unknown>>;
    const sourceReferences = assets[0]!.sourceReferences as Array<Record<string, unknown>>;
    sourceReferences[0]!.sourceInstanceId = "glpi-primary";

    const parsed = parseTechnologySnapshot(withInstance);
    expect((parsed.assets[0]!.sourceReferences[0] as unknown as Record<string, unknown>).sourceInstanceId).toBe("glpi-primary");
    expect((projectCanonicalSnapshot(withInstance).assets[0]!.sourceReferences[0] as unknown as Record<string, unknown>).sourceInstanceId).toBe("glpi-primary");
  });

  it.each([99, "99", undefined, null, ""])("rejects unsupported version %s", value => {
    expect(() => projectCanonicalSnapshot(changed("schemaVersion", value))).toThrow(TechnologyContractError);
  });
  it.each([undefined, null, 123, {}, "", "not-a-date", "2026-02-30T12:00:00Z", "2026-09-23", "2026-09-23T12:00:00", "2026-09-23T25:00:00Z"])("rejects invalid asOf %j before rendering", value => {
    expect(() => projectCanonicalSnapshot(changed("asOf", value))).toThrow(/snapshot.asOf/);
  });
  it("rejects an absent asOf", () => {
    const { asOf: _asOf, ...input } = canonicalSnapshotFixture();
    expect(() => projectCanonicalSnapshot(input)).toThrow(/snapshot.asOf/);
  });
  it("accepts a valid calendar date and explicit offset", () => {
    expect(projectCanonicalSnapshot(changed("asOf", "2024-02-29T09:00:00-03:00")).asOf).toBe("2024-02-29T09:00:00-03:00");
  });
  it.each([
    "assets.0.sourceReferences.0.observedAt", "assets.0.identifiers.0.source.observedAt",
    "assets.0.operationalContexts.0.source.observedAt", "assets.0.provenance.0.observedAt",
    "assets.0.provenance.0.ingestedAt", "assets.0.provenance.0.evidence.0.observedAt",
    "relationships.0.observedAt", "relationships.0.evidence.0.observedAt",
    "relationships.0.evidence.0.source.observedAt", "relationships.0.evidence.0.evidence.0.observedAt",
    "observations.0.observedAt", "observations.0.ingestedAt", "observations.0.source.observedAt",
    "observations.0.evidence.0.observedAt",
  ])("rejects invalid canonical timestamp at %s", path => {
    expect(() => projectCanonicalSnapshot(changed(path, "not-a-date"))).toThrow(TechnologyContractError);
  });
  it("rejects an invalid inventory timestamp used by the presentation", () => {
    const input = canonicalSnapshotFixture();
    expect(() => projectCanonicalSnapshot({ ...input, assets: [{ ...input.assets[0], attributes: { "glpi.itemType": "Computer", "glpi.lastInventoryUpdate": "not-a-date" } }] })).toThrow(TechnologyContractError);
  });
  it.each(["sourceReferences", "identifiers", "provenance", "attributes"])("rejects malformed asset %s", key => {
    expect(() => projectCanonicalSnapshot(changed(`assets.0.${key}`, null))).toThrow(TechnologyContractError);
  });
  it("does not overwrite canonical taxonomy with historical attribute summaries", () => {
    const input = canonicalSnapshotFixture();
    const first = input.assets[0]!;
    const asset = projectCanonicalSnapshot({ ...input, assets: [{ ...first, attributes: { ...first.attributes,
      "nexus.taxonomy.domain.state": "conflict", "nexus.taxonomy.compatibilityProjection": true,
    } }] }).assets[0]!;
    expect(asset.taxonomy).toEqual(first.taxonomy);
    expect(asset.taxonomyState).toBe("classified");
    expect(asset.taxonomyReviewRequired).toBe(false);
    expect(asset.taxonomyCompatibilityFallback).toBe(false);
  });
  it.each([
    { state: "unknown", reviewRequired: true, ruleId: "fixture", reasonCode: "no-evidence" },
    { state: "unclassified", reviewRequired: true, ruleId: "fixture", reasonCode: "no-rule" },
    { state: "conflict", value: "user_endpoint", method: "inferred", reviewRequired: true, ruleId: "fixture", reasonCode: "disagreement" },
  ])("preserves unresolved assessment $state without inventing classification", decision => {
    const asset = projectCanonicalSnapshot(changed("assets.0.taxonomy.role", decision)).assets[0]!;
    expect(asset.taxonomyState).toBe(decision.state);
    expect(asset.taxonomyReviewRequired).toBe(true);
    expect(asset.taxonomyCompatibilityFallback).toBe(true);
  });
  it.each([
    ["assets.0.taxonomy.domain.value", undefined],
    ["assets.0.taxonomy.domain.reviewRequired", "false"],
    ["assets.0.operationalContexts.0.kind", "unsupported"],
    ["observations.0.value", { kind: "number", value: "80" }],
    ["observations.0.value", { kind: "none", value: 80 }],
    ["assets.0.unrecognized", "not allowed"],
  ])("rejects malformed nested contract at %s", (path, value) => {
    expect(() => parseTechnologySnapshot(changed(path as string, value))).toThrow(TechnologyContractError);
  });
});
