import { describe, expect, it } from "vitest";
import { demoSnapshot } from "./demo-provider";
import { buildContextualAssetLink, buildInvestigationLink, changeRepresentation, defaultInvestigationState, normalizeInvestigationState, parseInvestigationHash, selectionAvailability, serializeInvestigationHash, validatedReturnHash } from "./navigation-state";
import { routeFromHash } from "./navigation-model";

describe("investigation URL contract", () => {
  it("omits defaults and accepts legacy inventory links", () => {
    expect(serializeInvestigationHash(defaultInvestigationState())).toBe("#assets");
    expect(parseInvestigationHash("#assets").state).toEqual(defaultInvestigationState());
    expect(routeFromHash("#assets?q=test")).toEqual({ view: "assets" });
  });
  it("round trips Unicode, literal percent, plus, space, ampersand and IDs exactly once", () => {
    const state = defaultInvestigationState();
    state.search = "á 100% + A&B";
    state.selectedId = "NEXUS a+b%";
    state.filters.context = "sitio / A&B";
    state.page = 3; state.pageSize = 50;
    state.sort = { columnId: "lastSeen", direction: "descending" };
    const hash = serializeInvestigationHash(state);
    expect(parseInvestigationHash(hash).state).toEqual(state);
    expect(parseInvestigationHash(hash).issues).toEqual([]);
    expect(serializeInvestigationHash(parseInvestigationHash(hash).state)).toBe(hash);
  });
  it("preserves shared state, table page and graph constraints through representation switches", () => {
    const state = parseInvestigationHash("#assets?q=router&f.domain=OT&page=4&selected=N1&type=uses&depth=1").state;
    const graph = changeRepresentation(state, "graph");
    expect(graph.graph.rootId).toBe("N1");
    expect(graph.selectedId).toBe("N1");
    expect(changeRepresentation(graph, "table")).toEqual({ ...state, graph: { ...state.graph, rootId: "N1" } });
    expect(changeRepresentation(defaultInvestigationState(), "graph").graph.rootId).toBeNull();
  });
  it("normalizes invalid enums, unsupported scope, fractional and stale syntax without casts", () => {
    const parsed = parseInvestigationHash("#assets?view=bad&scope=tenant&page=-2&size=10&direction=up&sort=nope&depth=99&type=bad&perspective=bad");
    expect(parsed.state).toEqual(defaultInvestigationState());
    expect(parsed.issues.length).toBe(9);
    expect(parsed.canonicalHash).toBe("#assets");
  });
  it("rejects duplicate parameters instead of order-dependent precedence", () => {
    expect(parseInvestigationHash("#assets?view=graph&view=table&selected=A&selected=B").state).toEqual(defaultInvestigationState());
  });
  it("does not make mode, theme, density, focus or unknown filters navigation owners", () => {
    const result = parseInvestigationHash("#assets?mode=demo&theme=dark&density=compact&focus=A&f.fake=x");
    expect(result.state).toEqual(defaultInvestigationState());
    expect(result.issues).toHaveLength(5);
  });
  it("bounds malformed and oversized input and normalizes idempotently", () => {
    for (const hash of ["#assets?q=%E0%A4%A", "#assets?q=" + "x".repeat(4100), "#assets?q=%00", "#assets?page=1.2"]) {
      expect(parseInvestigationHash(hash).issues.length).toBeGreaterThan(0);
    }
    const state = parseInvestigationHash("#assets?q=test&page=1&view=table").state;
    expect(normalizeInvestigationState(normalizeInvestigationState(state))).toEqual(state);
  });
  it("keeps stale facet values to avoid silently broadening a deep-link scope", () => {
    const state = parseInvestigationHash("#assets?f.domain=REMOVED").state;
    expect(state.filters.domain).toBe("REMOVED");
    expect(serializeInvestigationHash(state)).toBe("#assets?f.domain=REMOVED");
  });
  it("builds one typed investigation link for any caller", () => {
    expect(buildInvestigationLink({ filters: { domain: "OT", reviewRequired: "yes" }, query: "router" })).toBe("#assets?q=router&f.domain=OT&f.reviewRequired=yes");
  });
  it("encodes bounded internal origin and preserves Asset 360 sections", () => {
    const origin = parseInvestigationHash("#assets?q=OT&selected=N1").state;
    const link = buildContextualAssetLink("N1", origin, "evidence");
    expect(routeFromHash(link)).toEqual({ view: "asset", assetId: "N1", section: "evidence" });
    expect(validatedReturnHash(new URLSearchParams(link.split("?")[1]).get("return"))).toBe("#assets?q=OT&selected=N1");
  });
  it("rejects external, recursive, oversized and ambiguous return URLs", () => {
    for (const hash of ["https://example.com", "//example.com", "#assets/N1", "#assets?return=x", "#assets?view=bad", "#assets?q=" + "x".repeat(4100)]) expect(validatedReturnHash(hash)).toBeNull();
    expect(validatedReturnHash("#assets")).toBe("#assets");
  });
});

describe("selection is durable evidence, not focus or graph membership", () => {
  it("retains missing and source-unavailable selections without manufacturing assets", () => {
    const state = parseInvestigationHash("#assets?selected=REMOVED").state;
    expect(selectionAvailability(state, demoSnapshot)).toBe("missing");
    expect(selectionAvailability(state, null)).toBe("source-unavailable");
    expect(state.selectedId).toBe("REMOVED");
  });
  it("distinguishes filtered-out inventory and partial graph membership", () => {
    const asset = demoSnapshot.assets[0]!;
    const state = parseInvestigationHash(buildInvestigationLink({ selectedId: asset.id })).state;
    expect(selectionAvailability(state, demoSnapshot)).toBe("visible");
    const graph = changeRepresentation(state, "graph");
    expect(selectionAvailability(graph, demoSnapshot)).toBe("graph-unavailable");
    expect(selectionAvailability(graph, demoSnapshot, [])).toBe("outside-graph");
    graph.filters.domain = "REMOVED";
    expect(selectionAvailability(graph, demoSnapshot, [asset.id])).toBe("outside-filter");
    expect(graph.selectedId).toBe(asset.id);
  });
});
