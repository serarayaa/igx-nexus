import { describe, expect, it } from "vitest";
import { hardwareCoverageReasons } from "./hardware.js";
import { validateSoftwareInventoryV2 } from "./software-validation.js";
import { syntheticSoftwareInventoryV2 } from "./test/software-fixtures.js";
import { technologySchemaVersion } from "./model.js";
import { validateTechnologySnapshot } from "./validation.js";

// Mutable imported JSON deliberately exercises the unknown-input boundary.
const fixture = () => JSON.parse(JSON.stringify(syntheticSoftwareInventoryV2()));
const errors = (value: unknown) => validateSoftwareInventoryV2(value).filter(i => i.severity === "error");
describe("Software & Operating System contracts V2", () => {
  it.each([" SYNTH-ASSET-1", "SYNTH-ASSET-1 ", "\tSYNTH-ASSET-1\n", "", "   ", null, undefined, 42, true, {}, []])("rejects invalid canonical asset identity %#", assetId => {
    const input = fixture();
    input.assetId = assetId;
    expect(errors(input)).toContainEqual(expect.objectContaining({
      path: "software.assetId",
      code: typeof assetId === "string" && assetId.trim().length > 0 ? "software.identifier_invalid" : "software.string_invalid",
    }));
  });
  it.each(["SYNTH-ASSET-1", "asset:glpi:computer:42"])("preserves valid canonical asset identity %s", assetId => {
    const input = fixture();
    input.assetId = assetId;
    expect(validateSoftwareInventoryV2(input)).toEqual([]);
    expect(input.assetId).toBe(assetId);
  });
  it("accepts typed synthetic fixtures without mutation or conflating identity, version and installation", () => {
    const input = syntheticSoftwareInventoryV2();
    const before = JSON.stringify(input);
    expect(validateSoftwareInventoryV2(input)).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
    const x = fixture().installations.items;
    expect(x.map((v: { installationId: string }) => v.installationId)).toEqual(["SYNTH-INSTALL-1", "SYNTH-INSTALL-2"]);
    expect(x[0].software).toEqual(x[1].software);
    expect(x[0].version.value).toBe("2026 R2 (build 42)");
  });
  it("represents unknown OS attributes and entirely unidentified software installations", () => {
    const x = fixture();
    const os = x.operatingSystems.items[0];
    for (const field of ["installationId", "operatingSystemId", "name", "version", "edition", "architecture", "servicePack", "kernelVersion", "installedAt", "observedAt"]) os[field] = null;
    for (const installation of x.installations.items) {
      installation.installationId = null; installation.software = null; installation.version = null; installation.installedAt = null; installation.observedAt = null;
    }
    expect(errors(x)).toEqual([]);
    expect(x.installations.items).toHaveLength(2);
  });
  it("retains an unresolved product while a version record is observed", () => {
    const x = fixture(); x.installations.items[0].software = null;
    x.installations.items[0].version.value = null;
    expect(errors(x)).toEqual([]);
    expect(x.installations.items[0].version.versionId).toBe("SYNTH-VERSION-1");
  });
  it("does not confuse an evidenced empty result with unavailable or unknown", () => {
    const x = fixture(); x.installations.items = [];
    expect(errors(x)).toEqual([]);
    expect(x.installations.state).toBe("complete");
    x.installations.observedAt = null;
    x.installations.pagination = { offset: 0, retrieved: 0, total: 0, nextOffset: null };
    expect(errors(x)).toEqual([]);
  });
  it.each(hardwareCoverageReasons)("preserves unavailable and partial coverage: %s", reason => {
    const x = fixture();
    x.installations = { state: "unavailable", reason };
    expect(errors(x)).toEqual([]);
    x.installations = { ...fixture().installations, state: "partial", items: [], gaps: [{ fieldPath: "items", reason }] };
    expect(errors(x)).toEqual([]);
  });
  it.each(["not_requested", "not_applicable"])("represents %s without acquisition claims", state => {
    const x = fixture(); x.operatingSystems = { state }; expect(errors(x)).toEqual([]);
  });
  it("preserves the historical pagination shape as synthetic 100 + 45, without claiming Live state", () => {
    const x = fixture();
    x.installations.items = Array.from({ length: 145 }, (_, i) => ({ ...x.installations.items[0], installationId: `SYNTH-INSTALL-${i}` }));
    x.installations.pagination = { offset: 0, retrieved: 145, total: 145, nextOffset: null };
    expect(errors(x)).toEqual([]);
    x.installations.items = x.installations.items.slice(0, 100);
    x.installations.state = "partial";
    x.installations.gaps = [{ fieldPath: "items", reason: "pagination_incomplete" }];
    x.installations.pagination = { offset: 0, retrieved: 100, total: 145, nextOffset: 100 };
    expect(errors(x)).toEqual([]);
    x.installations.pagination.total = null;
    expect(errors(x)).toEqual([]);
  });
  it("accepts a later contiguous window only as partial coverage", () => {
    const x = fixture(); x.installations.state = "partial";
    x.installations.gaps = [{ fieldPath: "items", reason: "pagination_incomplete" }];
    x.installations.pagination = { offset: 100, retrieved: 2, total: 145, nextOffset: 102 };
    expect(errors(x)).toEqual([]);
  });
  it("requires evidence for each nested product and version independently", () => {
    const x = fixture(); x.installations.items[0].software.sourceReferences = [];
    expect(errors(x)).toContainEqual(expect.objectContaining({ code: "software.evidence_required", path: "software.installations.items[0].software" }));
  });
  it("reuses field provenance and keeps manual source explicit without an original observation", () => {
    const x = fixture(); const item = x.installations.items[0];
    const source = { ...item.sourceReferences[0], source: "manual", externalId: "SYNTH-MANUAL-ENTRY", authority: "trusted" };
    item.sourceReferences = []; item.observedAt = null;
    item.provenance = [{ fieldPath: "installedAt", source, observedAt: source.observedAt, authority: "trusted", derivation: "manual", evidence: [{ kind: "document", reference: "synthetic:manual-record" }] }];
    expect(errors(x)).toEqual([]);
    expect(item.observedAt).toBeNull();
    expect(item.provenance[0].source.source).toBe("manual");
  });
  it.each(["1.0.0", "23H2", "2026 R2 (build 42)", "rolling", "1.0+vendor-7"])("preserves non-normalized version label %s", value => {
    const x = fixture(); x.installations.items[0].version.value = value; expect(errors(x)).toEqual([]);
  });
  it.each(["2024-02-29", "2026-09-29"])("retains valid calendar date precision %s", value => {
    const x = fixture(); x.installations.items[0].installedAt = { precision: "date", value }; expect(errors(x)).toEqual([]);
    expect(x.installations.items[0].installedAt.value).toBe(value);
  });
  it("is order independent with concrete expectations and leaves duplicate unknown IDs unmerged", () => {
    const x = fixture(); const reversed = fixture(); reversed.installations.items.reverse();
    expect(validateSoftwareInventoryV2(x)).toEqual([]);
    expect(validateSoftwareInventoryV2(reversed)).toEqual([]);
    x.installations.items.forEach((v: { installationId: null }) => { v.installationId = null; });
    expect(validateSoftwareInventoryV2(x)).toEqual([]);
    expect(x.installations.items).toHaveLength(2);
  });
  it.each([
    ["duplicate software installation", (x: ReturnType<typeof fixture>) => { x.installations.items[1].installationId = x.installations.items[0].installationId; }, "software.installation_duplicate"],
    ["duplicate OS installation", (x: ReturnType<typeof fixture>) => { x.operatingSystems.items.push(x.operatingSystems.items[0]); }, "software.installation_duplicate"],
    ["empty installation ID", (x: ReturnType<typeof fixture>) => { x.installations.items[0].installationId = ""; }, "software.string_invalid"],
    ["whitespace identity", (x: ReturnType<typeof fixture>) => { x.installations.items[0].software.softwareId = " 12 "; }, "software.identifier_invalid"],
    ["numeric version identity", (x: ReturnType<typeof fixture>) => { x.installations.items[0].version.versionId = 12; }, "software.string_invalid"],
    ["numeric version value", (x: ReturnType<typeof fixture>) => { x.installations.items[0].version.value = 12; }, "software.string_invalid"],
    ["missing unknown attribute", (x: ReturnType<typeof fixture>) => { delete x.operatingSystems.items[0].edition; }, "software.string_invalid"],
    ["source-less observed installation", (x: ReturnType<typeof fixture>) => { x.installations.items[0].sourceReferences = []; }, "software.evidence_required"],
    ["source-less observed version", (x: ReturnType<typeof fixture>) => { x.installations.items[0].version.sourceReferences = []; }, "software.evidence_required"],
    ["empty section lacks source", (x: ReturnType<typeof fixture>) => { x.installations.items = []; x.installations.sourceReferences = []; }, "software.section_source_required"],
    ["missing collection time", (x: ReturnType<typeof fixture>) => { delete x.installations.collectedAt; }, "software.timestamp_invalid"],
    ["future original observation", (x: ReturnType<typeof fixture>) => { x.installations.observedAt = "2027-01-01T00:00:00Z"; }, "software.observation_after_collection"],
    ["malformed source", (x: ReturnType<typeof fixture>) => { x.installations.sourceReferences = [null]; }, "software.source_structure"],
    ["invalid source authority", (x: ReturnType<typeof fixture>) => { x.installations.sourceReferences[0].authority = "licensed"; }, "authority.invalid"],
    ["invalid source timestamp", (x: ReturnType<typeof fixture>) => { x.installations.sourceReferences[0].observedAt = "2026-02-30T00:00:00Z"; }, "timestamp.invalid"],
    ["invalid provenance", (x: ReturnType<typeof fixture>) => { x.installations.items[0].provenance = [null]; }, "software.provenance_structure"],
    ["invalid provenance confidence", (x: ReturnType<typeof fixture>) => { const v=x.installations.items[0]; v.provenance = [{ fieldPath: "version", source: v.sourceReferences[0], observedAt: v.collectedAt, authority: "trusted", confidence: 2 }]; }, "confidence.invalid"],
    ["invalid provenance derivation", (x: ReturnType<typeof fixture>) => { const v=x.installations.items[0]; v.provenance = [{ fieldPath: "version", source: v.sourceReferences[0], observedAt: v.collectedAt, authority: "trusted", derivation: "guess" }]; }, "derivation.invalid"],
    ["impossible installation date", (x: ReturnType<typeof fixture>) => { x.installations.items[0].installedAt = { precision: "date", value: "2026-02-29" }; }, "software.installation_date_invalid"],
    ["date treated as timestamp", (x: ReturnType<typeof fixture>) => { x.installations.items[0].installedAt.precision = "timestamp"; }, "software.timestamp_invalid"],
    ["catalog mistaken for installations", (x: ReturnType<typeof fixture>) => { x.catalog = []; }, "software.field_unsupported"],
    ["invented license claim", (x: ReturnType<typeof fixture>) => { x.installations.items[0].licenseCompliant = true; }, "software.field_unsupported"],
    ["unavailable leaks records", (x: ReturnType<typeof fixture>) => { x.installations = { state: "unavailable", reason: "unauthorized", items: [] }; }, "software.field_unsupported"],
    ["partial without gaps", (x: ReturnType<typeof fixture>) => { x.installations.state = "partial"; x.installations.gaps = []; }, "software.gaps_required"],
    ["complete with gaps", (x: ReturnType<typeof fixture>) => { x.installations.gaps = []; }, "software.field_unsupported"],
    ["bad state", (x: ReturnType<typeof fixture>) => { x.installations.state = "unknown"; }, "software.coverage_state"],
    ["state cannot be coerced", (x: ReturnType<typeof fixture>) => { x.installations = { state: ["complete"] }; }, "software.coverage_state"],
    ["missing pagination declaration", (x: ReturnType<typeof fixture>) => { delete x.installations.pagination; }, "software.pagination_invalid"],
  ] as const)("rejects %s", (_label, mutate, code) => {
    const x = fixture(); mutate(x); expect(errors(x).map(i => i.code)).toContain(code);
  });
  it.each([
    { offset: 0, retrieved: 1, total: 2, nextOffset: null },
    { offset: 0, retrieved: 2, total: 1, nextOffset: null },
    { offset: 1, retrieved: 2, total: 3, nextOffset: null },
    { offset: 0, retrieved: 2, total: 3, nextOffset: 2 },
    { offset: 0, retrieved: 2, total: 3, nextOffset: 1 },
    { offset: -1, retrieved: 2, total: null, nextOffset: null },
    { offset: 0, retrieved: 2.5, total: null, nextOffset: null },
    { offset: 0, retrieved: 2, total: Number.POSITIVE_INFINITY, nextOffset: null },
    { offset: Number.MAX_SAFE_INTEGER, retrieved: 2, total: null, nextOffset: null },
  ])("rejects inconsistent pagination %#", pagination => {
    const x = fixture(); x.installations.pagination = pagination; expect(errors(x).length).toBeGreaterThan(0);
  });
  it.each([null, [], 12, "inventory", {}])("rejects malformed inventory %# without throwing", x => { expect(errors(x).length).toBeGreaterThan(0); });
  it("preserves snapshot 0.2 validation with no embedded software inventory", () => {
    expect(technologySchemaVersion).toBe("0.2");
    expect(validateTechnologySnapshot({ schemaVersion: "0.2", asOf: "2026-10-01T12:00:00Z", assets: [], observations: [], relationships: [] })).toEqual([]);
  });
});
