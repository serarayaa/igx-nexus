import { afterEach, describe, expect, it, vi } from "vitest";
import { sourceReferenceKey, validateNetworkInventoryV2, validateHardwareInventoryV2, validateSoftwareInventoryV2, validateTechnologySnapshot, type NetworkInventoryV2 } from "@igx-nexus/types";
import { createGlpiNetworkAdapter, GlpiNetworkAnchorError, type GlpiNetworkAdapterOptions, type GlpiNetworkSection } from "./glpi-network.js";
import { createGlpiHardwareAdapter } from "./glpi-hardware.js";
import { createGlpiSoftwareAdapter } from "./glpi-software.js";
import { GlpiAuthenticationError, GlpiConfigurationError, GlpiRequestError, mapGlpiComputerToTechnologyAsset, parseGlpiComputerRecord, type GlpiApiTransport, type GlpiQuery } from "./glpi.js";

const at = "2026-10-14T12:00:00.000Z";
const instance = "glpi-synthetic-network";
const now = () => new Date(at);
const path = "Assets/Computer/42/Component/NetworkCard";
const detailPath = "Components/NetworkCard/7";
const asset = () => ({ ...mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord({ id: 42, name: "SYNTH-COMPUTER" }), at, instance), id: "SYNTH ASSET" });
const card = (id: number) => ({ id, itemtype: "Computer", items_id: 42, network_card: { id: 7, designation: "SYNTH embedded card" }, mac: "02:00:00:00:00:01", busID: "SYNTH BUS" });
const definition = { id: 7, designation: "SYNTH catalog card", manufacturer: { id: 1, name: "SYNTH manufacturer" }, model: { id: 2, name: "SYNTH model" }, mac_default: "02:00:00:00:00:FF", bandwidth: "1000" };
type Handler = (route: string, query: GlpiQuery, signal?: AbortSignal) => unknown | Promise<unknown>;
function fixture(rows: unknown[] = [card(1), card(2)], handler?: Handler) {
  const calls: { path: string; query: GlpiQuery; signal?: AbortSignal }[] = [];
  const transport: GlpiApiTransport = { async get(route, query = {}, context) {
    calls.push({ path: route, query, ...(context?.signal ? { signal: context.signal } : {}) });
    const override = handler ? await handler(route, query, context?.signal) : undefined;
    if (override !== undefined) return override;
    if (route === path) return rows.slice(Number(query.start), Number(query.start) + Number(query.limit));
    if (route === detailPath) return definition;
    throw new Error("Unexpected synthetic route");
  } };
  return { transport, calls };
}
function collected(result: NetworkInventoryV2) {
  const section = result.networkCards;
  if (section.state !== "complete" && section.state !== "partial") throw new Error("Expected collected network cards");
  return { ...section, gaps: section.state === "partial" ? section.gaps : [] };
}
async function run(transport: GlpiApiTransport, options: Partial<Omit<GlpiNetworkAdapterOptions, "transport">> = {}) {
  const result = await createGlpiNetworkAdapter({ transport, sourceInstanceId: instance, now, ...options }).getInventory(asset());
  expect(validateNetworkInventoryV2(result)).toEqual([]);
  return result;
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("GLPI Network Cards V2 — synthetic transport only", () => {
  it("maps literal canonical asset and distinct associations sharing MAC/catalog without mutation", async () => {
    const original = asset(); const before = JSON.stringify(original);
    const rows = [card(1), card(2)]; const raw = JSON.stringify(rows);
    const { transport, calls } = fixture(rows);
    const result = await createGlpiNetworkAdapter({ transport, sourceInstanceId: instance, now, enrichCatalogue: true }).getInventory(original);
    expect(validateNetworkInventoryV2(result)).toEqual([]);
    expect(result.assetId).toBe(original.id);
    expect(JSON.stringify(original)).toBe(before); expect(JSON.stringify(rows)).toBe(raw);
    const section = collected(result);
    expect(section.state).toBe("complete"); expect(section.items).toHaveLength(2);
    for (const [i, item] of section.items.entries()) {
      expect(item.attachmentId).toBe(sourceReferenceKey(item.sourceReferences[0]!));
      expect(item.sourceReferences[0]).toMatchObject({ source: "glpi", sourceInstanceId: instance, externalId: String(i + 1), entityType: "NetworkCardItem", sourceScope: path });
      expect(item).toMatchObject({ designation: "SYNTH embedded card", macAddress: card(1).mac, busId: "SYNTH BUS", observedAt: null, provenance: [] });
      expect(item.definition).toMatchObject({ designation: definition.designation, manufacturer: "SYNTH manufacturer", model: "SYNTH model", defaultMacAddress: definition.mac_default, bandwidthLabel: "1000", observedAt: null });
      expect(item.definitionId).toBe(item.definition!.definitionId);
      expect(item.definitionId).toBe(sourceReferenceKey(item.definition!.sourceReferences[0]!));
      expect(item.sourceReferences).toHaveLength(1);
    }
    expect(section.items[0]!.attachmentId).not.toBe(section.items[1]!.attachmentId);
    expect(calls.filter(c => c.path === detailPath)).toHaveLength(1);
    expect(calls.map(c => c.path)).toEqual([path, path, detailPath]);
  });
  it.each(["SYNTH ASSET", "SYNTH  ASSET/ñ?literal=1", "SYNTH\tASSET"])("preserves canonical ID %j literally", async canonicalId => {
    const { transport } = fixture([]);
    const result = await createGlpiNetworkAdapter({ transport, sourceInstanceId: instance, now }).getInventory({ ...asset(), id: canonicalId });
    expect(result.assetId).toBe(canonicalId);
  });
  it.each(["", " ", " SYNTH ASSET", "SYNTH ASSET "])("rejects invalid canonical ID %j before I/O", async invalid => {
    const { transport, calls } = fixture();
    await expect(createGlpiNetworkAdapter({ transport, sourceInstanceId: instance }).getInventory({ ...asset(), id: invalid })).rejects.toBeInstanceOf(GlpiConfigurationError);
    expect(calls).toEqual([]);
  });
  it.each(["missing", "duplicate", "wrong-instance", "mixed-instances", "wrong-scope", "wrong-kind", "bad-time", "zero", "leading-zero", "unsafe", "space", "not-number"])("rejects %s anchor before I/O", async variant => {
    const original = asset(); const anchor = original.sourceReferences[0]!;
    const overrides: Record<string, object> = { "wrong-instance": { sourceInstanceId: "other" }, "wrong-scope": { sourceScope: "Assets/Printer" }, "wrong-kind": { entityType: "Printer" }, "bad-time": { observedAt: "bad" }, zero: { externalId: "0" }, "leading-zero": { externalId: "042" }, unsafe: { externalId: "9007199254740992" }, space: { externalId: " 42" }, "not-number": { externalId: "forty-two" } };
    const references = variant === "missing" ? [] : variant === "duplicate" ? [anchor, anchor] : variant === "mixed-instances" ? [anchor, { ...anchor, sourceInstanceId: "other" }] : [{ ...anchor, ...overrides[variant] }];
    const { transport, calls } = fixture();
    await expect(createGlpiNetworkAdapter({ transport, sourceInstanceId: instance }).getInventory({ ...original, sourceReferences: references })).rejects.toBeInstanceOf(GlpiNetworkAnchorError);
    expect(calls).toEqual([]);
  });
  it("defaults to no catalogue I/O or artificial gap and preserves explicit definition identity", async () => {
    const { transport, calls } = fixture();
    const bare = collected(await run(transport));
    expect(bare.state).toBe("complete"); expect(bare.items[0]!.definition).toBeNull();
    const enriched = collected(await run(fixture().transport, { enrichCatalogue: true }));
    expect(bare.items[0]!.definitionId).toBe(enriched.items[0]!.definitionId);
    expect(calls.every(c => c.path === path)).toBe(true);
  });
  it("rejects competing Computer references even if only one has the approved scope", async () => {
    const original = asset(); const anchor = original.sourceReferences[0]!;
    const { transport, calls } = fixture();
    await expect(createGlpiNetworkAdapter({ transport, sourceInstanceId: instance }).getInventory({ ...original, sourceReferences: [anchor, { ...anchor, sourceScope: "unapproved" }] })).rejects.toBeInstanceOf(GlpiNetworkAnchorError);
    expect(calls).toEqual([]);
  });
  it("never falls back to default MAC and retains original MAC spelling", async () => {
    const result = collected(await run(fixture([{ ...card(1), mac: null }, { ...card(2), mac: " 02-00-aa-BB-00-01 " }]).transport, { enrichCatalogue: true }));
    expect(result.items[0]!.macAddress).toBeNull();
    expect(result.items[0]!.definition!.defaultMacAddress).toBe(definition.mac_default);
    expect(result.items[1]!.macAddress).toBe(" 02-00-aa-BB-00-01 ");
  });
  it.each([undefined, null, {}, { id: 0 }, { id: null }, { designation: "SYNTH label only" }])("does not query absent catalogue reference %j", async reference => {
    const { transport, calls } = fixture([{ id: 1, network_card: reference }]);
    const result = collected(await run(transport, { enrichCatalogue: true }));
    expect(result.state).toBe("complete");
    expect(result.items[0]).toMatchObject({ definitionId: null, definition: null, macAddress: null, busId: null });
    expect(calls.every(c => c.path === path)).toBe(true);
  });
  it("maps unknown catalog attributes to null without importing unrelated properties", async () => {
    const { transport } = fixture([{ id: 1, network_card: { id: 7 }, ip: "192.0.2.1", gateway: "SYNTH", speed: 999 }], p => p === detailPath ? { id: 7, ip: "192.0.2.2", vlan: 3, snmp_credential: "SYNTH-EXCLUDED" } : undefined);
    const result = collected(await run(transport, { enrichCatalogue: true }));
    expect(result.state).toBe("complete");
    expect(result.items[0]!.definition).toMatchObject({ designation: null, manufacturer: null, model: null, bandwidthLabel: null, defaultMacAddress: null });
    expect(JSON.stringify(result)).not.toContain("192.0.2"); expect(JSON.stringify(result)).not.toContain('"vlan"');
    expect(JSON.stringify(result)).not.toContain("SYNTH-EXCLUDED");
  });
  it("complete empty is a successful evidenced empty array, without catalogue queries", async () => {
    const { transport, calls } = fixture([]);
    const result = collected(await run(transport, { enrichCatalogue: true, maxPages: 1 }));
    expect(result).toMatchObject({ state: "complete", items: [], observedAt: null, pagination: { offset: 0, retrieved: 0, total: 0, nextOffset: null } });
    expect(result.sourceReferences).toHaveLength(1); expect(calls).toHaveLength(1);
  });
  it("returns not_requested without I/O, still validates canonical input and anchor", async () => {
    const { transport, calls } = fixture();
    const result = await createGlpiNetworkAdapter({ transport, sourceInstanceId: instance, now }).getInventory(asset(), []);
    expect(result.networkCards).toEqual({ state: "not_requested" }); expect(validateNetworkInventoryV2(result)).toEqual([]); expect(calls).toEqual([]);
  });
  it("rejects unsupported section names", async () => {
    await expect(createGlpiNetworkAdapter({ transport: fixture().transport, sourceInstanceId: instance }).getInventory(asset(), ["interfaces" as GlpiNetworkSection])).rejects.toBeInstanceOf(GlpiConfigurationError);
  });
  it("continues capped short pages until explicit empty and keeps sort/window evidence", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => card(i + 1));
    const { transport, calls } = fixture(rows, (p, q) => p === path ? rows.slice(Number(q.start), Number(q.start) + 2) : undefined);
    const result = collected(await run(transport));
    expect(result.state).toBe("complete"); expect(result.items).toHaveLength(5);
    expect(calls.map(c => c.query.start)).toEqual([0, 2, 4, 5]); expect(calls.every(c => c.query.sort === "id:asc")).toBe(true);
    expect(result.sourceReferences.map(s => s.externalId)).toEqual([0, 2, 4, 5].map(start => `Computer/42?start=${start}&limit=100&sort=id:asc`));
  });
  it("maps synthetic 145 associations as 100 + 45 + empty", async () => {
    const { transport, calls } = fixture(Array.from({ length: 145 }, (_, i) => card(i + 1)));
    expect(collected(await run(transport)).pagination).toEqual({ offset: 0, retrieved: 145, total: 145, nextOffset: null });
    expect(calls.map(c => c.query.start)).toEqual([0, 100, 145]);
  });
  it("exact record budget permits only a terminal one-record probe", async () => {
    const { transport, calls } = fixture();
    expect(collected(await run(transport, { maxRecords: 2, maxPages: 2 })).state).toBe("complete");
    expect(calls.map(c => c.query)).toEqual([{ start: 0, limit: 2, sort: "id:asc" }, { start: 2, limit: 1, sort: "id:asc" }]);
  });
  it("record budget overflow is partial without retaining the probe row", async () => {
    const { transport, calls } = fixture([card(1), card(2), card(3)]);
    const result = collected(await run(transport, { maxRecords: 2 }));
    expect(result.state).toBe("partial"); expect(result.items).toHaveLength(2); expect(result.pagination?.total).toBeNull(); expect(calls).toHaveLength(2);
  });
  it.each([1, 2])("page budget %i cannot silently treat a short page as exhaustion", async maxPages => {
    const { transport, calls } = fixture([card(1), card(2)], (p, q) => p === path ? [card(Number(q.start) + 1)] : undefined);
    const result = collected(await run(transport, { maxPages }));
    expect(result.state).toBe("partial"); expect(result.items).toHaveLength(maxPages); expect(calls).toHaveLength(maxPages);
    expect(result.gaps).toContainEqual({ fieldPath: "networkCards", reason: "pagination_incomplete" });
  });
  it.each([[card(1), card(1)], [card(2), card(1)], [{ id: 0 }], [{ id: -1 }], [{ id: "1" }], [{ id: 1.2 }], [{ id: Number.MAX_SAFE_INTEGER + 1 }], [null]].map(rows => [rows]))("rejects invalid/duplicate/unordered page %j without successful empty", async rows => {
    const result = collected(await run(fixture(rows).transport));
    expect(result.state).toBe("partial"); expect(result.items).toEqual([]); expect(result.pagination).toBeNull();
  });
  it("detects overlapping pages without duplicating earlier attachments", async () => {
    const { transport, calls } = fixture([card(1)], p => p === path ? [card(1)] : undefined);
    const result = collected(await run(transport));
    expect(result.state).toBe("partial"); expect(result.items).toHaveLength(1); expect(result.pagination).toBeNull(); expect(calls).toHaveLength(2);
  });
  it.each([{ itemtype: "Printer" }, { itemtype: null }, { items_id: 99 }, { items_id: "42" }, { mac: 123 }, { busID: false }, { network_card: 7 }, { network_card: { id: "7" } }, { network_card: { id: -7 } }, { network_card: { designation: 7 } }, { is_dynamic: "true" }, { is_deleted: "false" }])("excludes incompatible association %j with explicit source gap", async change => {
    const result = collected(await run(fixture([{ ...card(1), ...change }, card(2)]).transport));
    expect(result.state).toBe("partial"); expect(result.items).toHaveLength(1); expect(result.pagination).toBeNull(); expect(result.items[0]!.sourceReferences[0]!.externalId).toBe("2");
  });
  it("does not retain deleted associations or claim complete current coverage", async () => {
    const result = collected(await run(fixture([{ ...card(1), is_deleted: true }]).transport));
    expect(result.state).toBe("partial"); expect(result.items).toEqual([]); expect(result.gaps).toContainEqual({ fieldPath: "networkCards.sourceRecords.1", reason: "not_observed" });
  });
  it.each([null, {}, "bad", { data: [] }, [card(1), card(2)]])("incompatible initial payload %j is unavailable, not complete empty", async payload => {
    const result = await run(fixture([], () => payload).transport, { pageSize: 1 });
    expect(result.networkCards).toEqual({ state: "unavailable", reason: "source_error" });
  });
  it.each([401, 403])("collection %i discards previously acquired data and skips catalogue", async status => {
    const { transport, calls } = fixture([card(1)], (p, q) => { if (p === path && q.start === 1) throw new GlpiRequestError("safe", status); });
    expect((await run(transport, { enrichCatalogue: true })).networkCards).toEqual({ state: "unavailable", reason: "unauthorized" });
    expect(calls.every(c => c.path === path)).toBe(true);
  });
  it.each([401, 403])("catalogue %i discards association and already resolved definition data", async status => {
    const { transport } = fixture([card(1), { ...card(2), network_card: { id: 8 } }], p => { if (p === "Components/NetworkCard/8") throw new GlpiRequestError("safe", status); });
    expect((await run(transport, { enrichCatalogue: true })).networkCards).toEqual({ state: "unavailable", reason: "unauthorized" });
  });
  it("authentication provider failures are unavailable unauthorized", async () => {
    expect((await run(fixture([], () => { throw new GlpiAuthenticationError(); }).transport)).networkCards).toEqual({ state: "unavailable", reason: "unauthorized" });
  });
  it.each([401, 403])("initial collection status %i is unavailable unauthorized with no evidence residual", async status => {
    expect((await run(fixture([], () => { throw new GlpiRequestError("safe", status); }).transport)).networkCards).toEqual({ state: "unavailable", reason: "unauthorized" });
  });
  it("incompatible late collection response retains valid earlier data as partial", async () => {
    const result = collected(await run(fixture([card(1)], (p, q) => p === path && q.start === 1 ? { data: [] } : undefined).transport));
    expect(result.state).toBe("partial"); expect(result.items).toHaveLength(1); expect(result.gaps).toContainEqual({ fieldPath: "networkCards", reason: "source_error" });
  });
  it.each([404, 500, 405, 501, undefined])("initial operational status %j never becomes an empty success", async status => {
    expect((await run(fixture([], () => { throw new GlpiRequestError("safe", status); }).transport)).networkCards).toEqual({ state: "unavailable", reason: status === 405 || status === 501 ? "unsupported" : "source_error" });
  });
  it.each([404, 500, undefined])("late collection status %j retains only acquired data with partial coverage", async status => {
    const result = collected(await run(fixture([card(1)], (p, q) => { if (p === path && q.start === 1) throw new GlpiRequestError("safe", status); }).transport));
    expect(result.state).toBe("partial"); expect(result.items).toHaveLength(1); expect(result.pagination?.total).toBeNull();
  });
  it.each([404, 500, 405, 501, undefined])("catalogue failure %j is partial, cached, preserving observed association", async status => {
    const { transport, calls } = fixture(undefined, p => { if (p === detailPath) throw new GlpiRequestError("safe", status); });
    const result = collected(await run(transport, { enrichCatalogue: true }));
    expect(result.state).toBe("partial"); expect(result.items).toHaveLength(2); expect(result.items[0]!.macAddress).toBe(card(1).mac); expect(result.items[0]!.definition).toBeNull();
    expect(result.gaps).toHaveLength(2); expect(calls.filter(c => c.path === detailPath)).toHaveLength(1);
  });
  it.each([[], {}, { id: 8 }, { id: "7" }, { id: 7, bandwidth: 1000 }, { id: 7, manufacturer: 1 }, { id: 7, model: { name: 1 } }, { id: 7, mac_default: true }])("incompatible catalogue %j is a gap, not fabricated enrichment", async payload => {
    const result = collected(await run(fixture(undefined, p => p === detailPath ? payload : undefined).transport, { enrichCatalogue: true }));
    expect(result.state).toBe("partial"); expect(result.items[0]!.definition).toBeNull(); expect(result.items[0]!.designation).toBe(card(1).network_card.designation);
  });
  it("exact catalogue budget succeeds when shared explicit references are cached", async () => {
    expect(collected(await run(fixture().transport, { enrichCatalogue: true, maxCatalogueRequests: 1 })).state).toBe("complete");
  });
  it("ordinary catalogue errors permit other explicit references within the shared request budget", async () => {
    const { transport, calls } = fixture([card(1), { ...card(2), network_card: { id: 8 } }], p => {
      if (p === detailPath) throw new GlpiRequestError("safe", 404);
      if (p === "Components/NetworkCard/8") return { ...definition, id: 8 };
    });
    const result = collected(await run(transport, { enrichCatalogue: true, maxCatalogueRequests: 2 }));
    expect(result.state).toBe("partial"); expect(result.items[0]!.definition).toBeNull(); expect(result.items[1]!.definition).not.toBeNull();
    expect(calls.filter(c => c.path.startsWith("Components/"))).toHaveLength(2);
  });
  it("exhausted catalogue budget retains unresolved association, without extra I/O", async () => {
    const { transport, calls } = fixture([card(1), { ...card(2), network_card: { id: 8 } }]);
    const result = collected(await run(transport, { enrichCatalogue: true, maxCatalogueRequests: 1 }));
    expect(result.state).toBe("partial"); expect(result.items[0]!.definition).not.toBeNull(); expect(result.items[1]!.definition).toBeNull();
    expect(calls.map(c => c.path)).toEqual([path, path, detailPath]);
    expect(result.gaps).toContainEqual({ fieldPath: "networkCards.items[1].definition", reason: "pagination_incomplete" });
  });
  it("zero enrichment budget produces gaps only if enrichment was requested and references exist", async () => {
    const { transport, calls } = fixture();
    expect(collected(await run(transport, { enrichCatalogue: true, maxCatalogueRequests: 0 })).state).toBe("partial");
    expect(calls.every(c => c.path === path)).toBe(true);
    expect(collected(await run(fixture().transport, { maxCatalogueRequests: 0 })).state).toBe("complete");
  });
  it("caches are per inventory, not persistent across calls", async () => {
    const { transport, calls } = fixture(); const adapter = createGlpiNetworkAdapter({ transport, sourceInstanceId: instance, now, enrichCatalogue: true });
    await adapter.getInventory(asset()); await adapter.getInventory(asset()); expect(calls.filter(c => c.path === detailPath)).toHaveLength(2);
  });
  it.each(["pageSize", "maxPages", "maxRecords", "requestTimeoutMs"] as const)("rejects invalid %s bounds", key => {
    for (const value of [0, -1, 1.5, NaN, Infinity, 100001]) expect(() => createGlpiNetworkAdapter({ transport: fixture().transport, sourceInstanceId: instance, [key]: value })).toThrow(GlpiConfigurationError);
  });
  it("rejects invalid catalogue and source-instance configuration", () => {
    for (const value of [-1, 0.5, NaN, 2001]) expect(() => createGlpiNetworkAdapter({ transport: fixture().transport, sourceInstanceId: instance, maxCatalogueRequests: value })).toThrow(GlpiConfigurationError);
    for (const value of ["", " spaced", "host/path"]) expect(() => createGlpiNetworkAdapter({ transport: fixture().transport, sourceInstanceId: value })).toThrow(GlpiConfigurationError);
  });
  it("invalid clocks propagate configuration errors instead of successful unavailable/empty", async () => {
    await expect(run(fixture().transport, { now: () => new Date(NaN) })).rejects.toBeInstanceOf(GlpiConfigurationError);
  });
  it("timeouts abort collection requests without late mutation or further I/O", async () => {
    vi.useFakeTimers(); let resolve!: (v: unknown) => void;
    const { transport, calls } = fixture([], () => new Promise(r => { resolve = r; }));
    const pending = run(transport, { requestTimeoutMs: 10, enrichCatalogue: true });
    await vi.advanceTimersByTimeAsync(10);
    const result = await pending;
    expect(result.networkCards).toEqual({ state: "unavailable", reason: "source_error" }); expect(calls[0]!.signal!.aborted).toBe(true);
    resolve([card(1)]); await Promise.resolve(); expect(calls).toHaveLength(1); expect(result.networkCards.state).toBe("unavailable");
  });
  it("catalog timeout preserves associations as partial and prevents subsequent detail requests", async () => {
    vi.useFakeTimers();
    const { transport, calls } = fixture([card(1), { ...card(2), network_card: { id: 8 } }], p => p === detailPath ? new Promise(() => {}) : undefined);
    const pending = run(transport, { requestTimeoutMs: 10, enrichCatalogue: true });
    await vi.advanceTimersByTimeAsync(10);
    const result = collected(await pending);
    expect(result.state).toBe("partial"); expect(result.items).toHaveLength(2);
    expect(calls.filter(c => c.path.startsWith("Components/"))).toHaveLength(1);
    expect(calls.find(c => c.path === detailPath)!.signal!.aborted).toBe(true);
  });
  it("late collection timeout prevents all enrichment work", async () => {
    vi.useFakeTimers(); const { transport, calls } = fixture([card(1)], (p, q) => p === path && q.start === 1 ? new Promise(() => {}) : undefined);
    const pending = run(transport, { requestTimeoutMs: 10, enrichCatalogue: true }); await vi.advanceTimersByTimeAsync(10);
    const result = collected(await pending); expect(result.state).toBe("partial"); expect(result.items[0]!.definition).toBeNull(); expect(calls).toHaveLength(2);
  });
  it("does not change existing Hardware/Software or snapshot contracts", async () => {
    const original = asset(); const before = JSON.stringify(original);
    const transport: GlpiApiTransport = { async get() { return []; } };
    const hardware = await createGlpiHardwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(original);
    const software = await createGlpiSoftwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(original);
    await createGlpiNetworkAdapter({ transport, sourceInstanceId: instance, now }).getInventory(original);
    expect(validateHardwareInventoryV2(hardware)).toEqual([]); expect(validateSoftwareInventoryV2(software)).toEqual([]);
    expect(validateTechnologySnapshot({ schemaVersion: "0.2", asOf: at, assets: [original], relationships: [], observations: [] })).toEqual([]);
    expect(JSON.stringify(original)).toBe(before);
  });
});
