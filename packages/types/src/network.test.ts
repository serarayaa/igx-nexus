import { describe, expect, it } from "vitest";
import { hardwareCoverageReasons } from "./hardware.js";
import { validateNetworkInventoryV2 } from "./network-validation.js";
import { networkInventoryVersion, type NetworkInventoryV2 } from "./network.js";
import { syntheticNetworkScenarios } from "./test/network-fixtures.js";
import { validateSoftwareInventoryV2 } from "./software-validation.js";
import { syntheticSoftwareInventoryV2 } from "./test/software-fixtures.js";
import { technologySchemaVersion } from "./model.js";
import { validateTechnologySnapshot } from "./validation.js";

// Mutable JSON models an imported unknown payload; typed fixtures remain independent.
const fixture = () => JSON.parse(JSON.stringify(syntheticNetworkScenarios()[0]!.inventory));
const errors = (value: unknown) => validateNetworkInventoryV2(value).filter(issue => issue.severity === "error");
const codes = (value: unknown) => errors(value).map(issue => issue.code);
const partial = () => JSON.parse(JSON.stringify(syntheticNetworkScenarios()[2]!.inventory));
function freeze(value: unknown): void {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
}

describe("Computer Network Cards contracts V2", () => {
  it("accepts all eight typed scenarios from the approved synthetic research", () => {
    const scenarios = syntheticNetworkScenarios();
    expect(scenarios.map(s => s.case)).toEqual([
      "complete-repeated-MAC-distinct-attachments", "complete-empty-does-not-prove-no-network-interfaces",
      "partial-unresolved-catalog-unknown-MAC", "partial-empty-acquisition-limited",
      "unavailable-unauthorized-no-residual-items", "unavailable-unsupported-source-capability",
      "not-applicable-explicit-other-contract-scope-only", "not-requested-demo-no-reader",
    ]);
    expect(new Set(scenarios.map(s => s.inventory.networkCards.state))).toEqual(new Set(["complete", "partial", "unavailable", "not_applicable", "not_requested"]));
    for (const scenario of scenarios) expect(validateNetworkInventoryV2(scenario.inventory)).toEqual([]);
  });
  it("is pure for deeply frozen inputs and preserves repeated MACs and shared definitions", () => {
    const input = fixture(); const before = JSON.stringify(input); freeze(input);
    expect(validateNetworkInventoryV2(input)).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
    const [a, b] = input.networkCards.items;
    expect(a.macAddress).toBe(b.macAddress); expect(a.attachmentId).not.toBe(b.attachmentId);
    expect(a.definition).toEqual(b.definition); expect(a.macAddress).not.toBe(a.definition.defaultMacAddress);
  });
  it.each(["SYNTH ASSET", "asset:source:42", "SYNTH  ASSET/α?literal%#"])("preserves literal IDs %s at every identity boundary", id => {
    const input = fixture(); input.assetId = id;
    input.networkCards.items[0].attachmentId = id;
    input.networkCards.items[0].definitionId = id; input.networkCards.items[0].definition.definitionId = id;
    expect(validateNetworkInventoryV2(input)).toEqual([]);
    expect(input.assetId).toBe(id); expect(input.networkCards.items[0].attachmentId).toBe(id);
  });
  it.each(["", "  ", " SYNTH", "SYNTH ", "\tSYNTH\n", null, undefined, 42, {}, []])("rejects invalid canonical IDs %#", id => {
    const input = fixture(); input.assetId = id; expect(errors(input).length).toBeGreaterThan(0);
  });
  it.each(["attachmentId", "definitionId"])("validates nullable opaque %s without deduplication of null", field => {
    const input = fixture(); for (const card of input.networkCards.items) { card[field] = null; if (field === "definitionId") card.definition.definitionId = null; }
    expect(validateNetworkInventoryV2(input)).toEqual([]); expect(input.networkCards.items).toHaveLength(2);
    input.networkCards.items[0][field] = " ID "; expect(codes(input)).toContain("network.identifier_invalid");
  });
  it("permits optional catalog not requested with complete coverage, without fabricating failure or default MAC", () => {
    const input = fixture(); input.networkCards.items.forEach((card: { definition: null; macAddress: null }) => { card.definition = null; card.macAddress = null; });
    expect(validateNetworkInventoryV2(input)).toEqual([]);
    expect(input.networkCards.state).toBe("complete"); expect(input.networkCards.items[0].macAddress).toBeNull();
    expect(input.networkCards.items[0].definitionId).not.toBeNull();
  });
  it("represents attempted catalog failure through partial/gaps without discarding observed association", () => {
    const input = partial(); const original = input.networkCards.items[0].attachmentId;
    expect(validateNetworkInventoryV2(input)).toEqual([]);
    expect(input.networkCards.items[0].attachmentId).toBe(original);
    expect(input.networkCards.items[0].designation).toBe("Tarjeta sintética");
    expect(input.networkCards.pagination.nextOffset).toBeNull(); expect(input.networkCards.state).toBe("partial");
  });
  it("allows independent unknown fields and preserves literal MAC/catalog labels without speed inference", () => {
    const input = fixture(); const card = input.networkCards.items[0]; card.macAddress = "02-AB-CD-EF-00-01";
    card.definition.defaultMacAddress = "02:ab:cd:ef:00:ff"; card.definition.bandwidthLabel = "Vendor 1G label";
    const before = JSON.stringify(input); expect(validateNetworkInventoryV2(input)).toEqual([]); expect(JSON.stringify(input)).toBe(before);
    for (const field of ["designation", "macAddress", "busId"]) card[field] = null;
    for (const field of ["designation", "manufacturer", "model", "defaultMacAddress", "bandwidthLabel"]) card.definition[field] = null;
    expect(validateNetworkInventoryV2(input)).toEqual([]);
  });
  it("keeps complete empty and partial empty distinct with acquisition evidence", () => {
    const a = syntheticNetworkScenarios()[1]!.inventory; const b = syntheticNetworkScenarios()[3]!.inventory;
    expect(validateNetworkInventoryV2(a)).toEqual([]); expect(validateNetworkInventoryV2(b)).toEqual([]);
    expect(a.networkCards.state).toBe("complete"); expect(b.networkCards.state).toBe("partial");
  });
  it.each(hardwareCoverageReasons)("reuses coverage reason %s for unavailability and gaps", reason => {
    const input = fixture(); input.networkCards = { state: "unavailable", reason }; expect(errors(input)).toEqual([]);
    const p = partial(); p.networkCards.gaps[0].reason = reason;
    if (reason === "unauthorized") expect(codes(p)).toContain("network.authorization_coverage");
    else expect(errors(p)).toEqual([]);
  });
  it.each(["unavailable", "not_requested", "not_applicable"])("rejects residual data in %s", state => {
    const input = fixture(); input.networkCards = { state, ...(state === "unavailable" ? { reason: "unauthorized" } : {}), items: [] };
    expect(codes(input)).toContain("network.field_unsupported");
  });
  it("requires evidence independently at section, attachment and optional catalog levels", () => {
    const input = fixture(); input.networkCards.items[0].definition.sourceReferences = [];
    expect(errors(input)).toContainEqual(expect.objectContaining({ code: "network.evidence_required", path: "network.networkCards.items[0].definition" }));
    const empty = fixture(); empty.networkCards.items = []; empty.networkCards.pagination = null; empty.networkCards.sourceReferences = [];
    expect(codes(empty)).toContain("network.section_source_required");
  });
  it("reuses manual provenance without inventing an original observation or acquisition reference", () => {
    const input = fixture(); const card = input.networkCards.items[0]; const source = { ...card.sourceReferences[0], source: "manual" };
    card.sourceReferences = []; card.provenance = [{ fieldPath: "macAddress", source, observedAt: source.observedAt, ingestedAt: card.collectedAt, authority: "trusted", derivation: "manual", confidence: 1, evidence: [{ kind: "document", reference: "synthetic:manual-record" }] }];
    expect(validateNetworkInventoryV2(input)).toEqual([]); expect(card.observedAt).toBeNull(); expect(card.sourceReferences).toEqual([]);
  });
  it("validates timestamp timezone and chronology independently of source reception time", () => {
    const input = fixture(); input.networkCards.observedAt = "2026-10-14T08:00:00-03:00";
    expect(errors(input)).toEqual([]);
    input.networkCards.observedAt = "2026-10-14T13:00:00Z"; expect(codes(input)).toContain("network.observation_after_collection");
  });
  it("is order independent and does not resolve unknown identity by MAC or label", () => {
    const input = fixture(); input.networkCards.items.reverse(); input.networkCards.items.forEach((card: { attachmentId: null }) => { card.attachmentId = null; });
    expect(validateNetworkInventoryV2(input)).toEqual([]); expect(input.networkCards.items).toHaveLength(2);
  });
  it.each([
    ["root interfaces", (x: ReturnType<typeof fixture>) => { x.interfaces = []; }],
    ["root relations", (x: ReturnType<typeof fixture>) => { x.relationships = []; }],
    ["IP on association", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].ipAddresses = []; }],
    ["link status", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].linkState = "up"; }],
    ["VLAN on catalog", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].definition.vlanId = 7; }],
    ["gateway on catalog", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].definition.gateway = "synthetic"; }],
    ["negotiated speed", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].definition.negotiatedSpeed = 1000; }],
    ["neighbor on source", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].sourceReferences[0].neighborId = "SYNTH-PEER"; }],
  ] as const)("rejects unsupported %s instead of inventing network domains", (_name, mutate) => {
    const input = fixture(); mutate(input); expect(codes(input)).toContain("network.field_unsupported");
  });
  it.each([
    ["duplicate association", (x: ReturnType<typeof fixture>) => { x.networkCards.items[1].attachmentId = x.networkCards.items[0].attachmentId; }, "network.attachment_duplicate"],
    ["mismatched catalog", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].definition.definitionId = "SYNTH-OTHER"; }, "network.definition_mismatch"],
    ["unknown reference with known catalog", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].definitionId = null; }, "network.definition_mismatch"],
    ["catalog ID whitespace", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].definition.definitionId = " ID "; }, "network.identifier_invalid"],
    ["missing null attribute", (x: ReturnType<typeof fixture>) => { delete x.networkCards.items[0].macAddress; }, "network.string_invalid"],
    ["missing catalog declaration", (x: ReturnType<typeof fixture>) => { delete x.networkCards.items[0].definition; }, "network.record_structure"],
    ["numeric MAC", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].macAddress = 42; }, "network.string_invalid"],
    ["missing acquisition time", (x: ReturnType<typeof fixture>) => { delete x.networkCards.collectedAt; }, "network.timestamp_invalid"],
    ["timezone missing", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].collectedAt = "2026-10-14T12:00:00"; }, "network.timestamp_invalid"],
    ["impossible date", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].definition.collectedAt = "2026-02-30T00:00:00Z"; }, "network.timestamp_invalid"],
    ["missing observation", (x: ReturnType<typeof fixture>) => { delete x.networkCards.observedAt; }, "network.timestamp_invalid"],
    ["source-less attachment", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].sourceReferences = []; }, "network.evidence_required"],
    ["malformed source", (x: ReturnType<typeof fixture>) => { x.networkCards.sourceReferences = [null]; }, "network.source_structure"],
    ["bad source authority", (x: ReturnType<typeof fixture>) => { x.networkCards.sourceReferences[0].authority = "invented"; }, "authority.invalid"],
    ["bad source timestamp", (x: ReturnType<typeof fixture>) => { x.networkCards.sourceReferences[0].observedAt = "yesterday"; }, "timestamp.invalid"],
    ["malformed provenance", (x: ReturnType<typeof fixture>) => { x.networkCards.items[0].provenance = [null]; }, "network.provenance_structure"],
    ["invented provenance relationship", (x: ReturnType<typeof fixture>) => { const c = x.networkCards.items[0]; c.provenance = [{ fieldPath: "connected_to", source: c.sourceReferences[0], observedAt: c.collectedAt, authority: "trusted" }]; }, "network.provenance_field"],
    ["bad confidence", (x: ReturnType<typeof fixture>) => { const c = x.networkCards.items[0]; c.provenance = [{ fieldPath: "macAddress", source: c.sourceReferences[0], observedAt: c.collectedAt, authority: "trusted", confidence: 2 }]; }, "confidence.invalid"],
    ["bad derivation", (x: ReturnType<typeof fixture>) => { const c = x.networkCards.items[0]; c.provenance = [{ fieldPath: "macAddress", source: c.sourceReferences[0], observedAt: c.collectedAt, authority: "trusted", derivation: "guess" }]; }, "derivation.invalid"],
    ["unknown state", (x: ReturnType<typeof fixture>) => { x.networkCards.state = "unknown"; }, "network.coverage_state"],
    ["state coercion", (x: ReturnType<typeof fixture>) => { x.networkCards = { state: ["complete"] }; }, "network.coverage_state"],
    ["bad unavailable reason", (x: ReturnType<typeof fixture>) => { x.networkCards = { state: "unavailable", reason: "offline" }; }, "network.coverage_reason"],
    ["complete with gaps", (x: ReturnType<typeof fixture>) => { x.networkCards.gaps = []; }, "network.field_unsupported"],
    ["missing pagination", (x: ReturnType<typeof fixture>) => { delete x.networkCards.pagination; }, "network.pagination_invalid"],
  ] as const)("rejects %s", (_label, mutate, code) => {
    const input = fixture(); mutate(input); expect(codes(input)).toContain(code);
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
    const input = fixture(); input.networkCards.pagination = pagination; expect(errors(input).length).toBeGreaterThan(0);
  });
  it("permits partial later windows, unknown totals and null pagination without claiming exhaustion", () => {
    const input = partial(); input.networkCards.pagination = { offset: 100, retrieved: 1, total: 145, nextOffset: 101 };
    expect(errors(input)).toEqual([]); input.networkCards.pagination.total = null; expect(errors(input)).toEqual([]);
    input.networkCards.pagination = null; expect(errors(input)).toEqual([]);
  });
  it.each([
    { offset: 0, retrieved: 1, total: 10, nextOffset: 0 },
    { offset: 0, retrieved: 1, total: 10, nextOffset: 3 },
    { offset: 0, retrieved: 1, total: 1, nextOffset: 1 },
    { offset: Number.MAX_SAFE_INTEGER, retrieved: 1, total: null, nextOffset: null },
  ])("rejects invalid partial windows independently of complete coverage %#", pagination => {
    const input = partial(); input.networkCards.pagination = pagination;
    expect(codes(input).some(code => code === "network.pagination_continuation" || code === "network.pagination_range")).toBe(true);
  });
  it("does not allow partial authorization failures to retain even empty acquisitions", () => {
    const input = partial(); input.networkCards.items = []; input.networkCards.pagination = null;
    input.networkCards.gaps = [{ fieldPath: "networkCards.definition", reason: "unauthorized" }];
    expect(codes(input)).toContain("network.authorization_coverage");
  });
  it("requires identified gaps and validates their reason and shape", () => {
    const input = partial(); input.networkCards.gaps = []; expect(codes(input)).toContain("network.gaps_required");
    input.networkCards.gaps = [null]; expect(codes(input)).toContain("network.gap_structure");
    input.networkCards.gaps = [{ fieldPath: "", reason: "bad" }]; expect(codes(input)).toContain("network.coverage_reason"); expect(codes(input)).toContain("network.string_invalid");
  });
  it.each([null, [], 42, "inventory", {}, { contractVersion: "2", assetId: "SYNTH ASSET", networkCards: null }])("rejects malformed unknown input %# without throwing", value => {
    expect(errors(value).length).toBeGreaterThan(0);
  });
  it("rejects unsupported versions and keeps custom issue paths", () => {
    const input = fixture(); input.contractVersion = "3";
    expect(validateNetworkInventoryV2(input, "imported.cards")).toContainEqual(expect.objectContaining({ code: "network.version", path: "imported.cards.contractVersion" }));
  });
  it("keeps old Software and snapshot contracts valid and exports only the card companion", () => {
    const typed: NetworkInventoryV2 = syntheticNetworkScenarios()[0]!.inventory;
    expect(typed.contractVersion).toBe(networkInventoryVersion);
    expect(validateSoftwareInventoryV2(syntheticSoftwareInventoryV2())).toEqual([]);
    expect(technologySchemaVersion).toBe("0.2");
    expect(validateTechnologySnapshot({ schemaVersion: "0.2", asOf: "2026-10-14T12:00:00Z", assets: [], observations: [], relationships: [] })).toEqual([]);
  });
});
