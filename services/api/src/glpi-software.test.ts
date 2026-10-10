import { afterEach, describe, expect, it, vi } from "vitest";
import { validateSoftwareInventoryV2, validateHardwareInventoryV2, validateTechnologySnapshot, type SoftwareSectionV2, type TechnologyAsset } from "@igx-nexus/types";
import { createGlpiSoftwareAdapter, GlpiSoftwareAnchorError, type GlpiSoftwareAdapterOptions, type GlpiSoftwareSection } from "./glpi-software.js";
import { createGlpiHardwareAdapter } from "./glpi-hardware.js";
import { GlpiAuthenticationError, GlpiConfigurationError, GlpiRequestError, createGlpiTechnologyProvider, mapGlpiComputerToTechnologyAsset, parseGlpiComputerRecord, type GlpiApiTransport, type GlpiQuery } from "./glpi.js";

const at = "2026-10-10T12:00:00.000Z";
const instance = "glpi-synthetic-software";
const now = () => new Date(at);
const asset = () => mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord({ id: 42, name: "SYNTH-COMPUTER" }), at, instance);
const osPath = "Assets/Computer/42/OSInstallation";
const installPath = "Assets/Computer/42/SoftwareInstallation";
const versionPath = "Assets/Software/10/Version";
const os = { id: 1, itemtype: "Computer", items_id: 42, operatingsystem: { id: 2, name: "SYNTH-OS" }, version: { id: 3, name: "23H2" }, edition: { id: 4, name: "Synthetic Enterprise" }, architecture: { id: 5, name: "x64" }, servicepack: { id: 6, name: "SYNTH-SP" }, kernel_version: { id: 7, name: "SYNTH-KERNEL" }, date_install: "2026-09-01T08:30:00+02:00", date_mod: "2026-10-09 11:00:00" };
const install = (id: number) => ({ id, itemtype: "Computer", items_id: 42, softwareversion: { id: 20, name: "SYNTH-VERSION-REF" }, date_install: "2026-09-01" });
const product = { id: 10, name: "SYNTH-SOFTWARE", manufacturer: { id: 99, name: "SYNTH-PUBLISHER" } };
const version = { id: 20, name: "rolling+synthetic", arch: "x64", software: { id: 10, name: "SYNTH-SOFTWARE" } };
type Handler = (path: string, query: GlpiQuery) => Promise<unknown> | unknown;
function fixture(rows: unknown[] = [install(1), install(2)], handler?: Handler) {
  const calls: { path: string; query: GlpiQuery }[] = [];
  const lists: Record<string, unknown[]> = { [osPath]: [os], [installPath]: rows, "Assets/Software": [product], [versionPath]: [version], "Assets/Computer": [{ id: 42, name: "SYNTH-COMPUTER" }] };
  const transport: GlpiApiTransport = { async get(path, query = {}) {
    calls.push({ path, query });
    const overridden = handler ? await handler(path, query) : undefined;
    if (overridden !== undefined) return overridden;
    if (!(path in lists)) throw new Error("Unexpected synthetic route");
    return lists[path]!.slice(Number(query.start), Number(query.start) + Number(query.limit));
  } };
  return { transport, calls };
}
function contents<T>(section: SoftwareSectionV2<T>): readonly T[] {
  if (section.state !== "complete" && section.state !== "partial") throw new Error("Expected collected section");
  return section.items;
}
async function run(transport: GlpiApiTransport, options: Partial<Omit<GlpiSoftwareAdapterOptions, "transport">> = {}, sections?: readonly GlpiSoftwareSection[]) {
  const result = await createGlpiSoftwareAdapter({ transport, sourceInstanceId: instance, now, ...options }).getInventory(asset(), sections);
  expect(validateSoftwareInventoryV2(result)).toEqual([]);
  return result;
}
afterEach(() => vi.useRealTimers());

describe("GLPI Software/OS V2 — synthetic transport only", () => {
  it("maps known OS and software with independent identities, exact assetId and precision", async () => {
    const { transport, calls } = fixture();
    const original = asset(); const before = JSON.stringify(original);
    const result = await createGlpiSoftwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(original);
    expect(validateSoftwareInventoryV2(result)).toEqual([]);
    expect(result.assetId).toBe(original.id); expect(JSON.stringify(original)).toBe(before);
    expect(result.operatingSystems.state).toBe("complete");
    expect(contents(result.operatingSystems)[0]).toMatchObject({ name: "SYNTH-OS", version: "23H2", edition: "Synthetic Enterprise", architecture: "x64", servicePack: "SYNTH-SP", kernelVersion: "SYNTH-KERNEL", installedAt: { precision: "timestamp", value: os.date_install }, observedAt: null });
    const items = contents(result.installations);
    expect(items).toHaveLength(2); expect(items[0]!.installationId).not.toBe(items[1]!.installationId);
    expect(items[0]!.software).toEqual(items[1]!.software); expect(items[0]!.version).toEqual(items[1]!.version);
    expect(new Set([items[0]!.installationId, items[0]!.software!.softwareId, items[0]!.version!.versionId]).size).toBe(3);
    expect(items[0]).toMatchObject({ installedAt: { precision: "date", value: "2026-09-01" }, observedAt: null, software: { name: "SYNTH-SOFTWARE", publisher: "SYNTH-PUBLISHER" }, version: { value: "rolling+synthetic", architecture: "x64" } });
    expect(items[0]!.sourceReferences[0]).toMatchObject({ source: "glpi", sourceInstanceId: instance, observedAt: at, authority: "authoritative", sourceScope: installPath });
    expect(items[0]!.version!.sourceReferences[0]!.sourceScope).toBe(versionPath);
    expect(items[0]!.software!.sourceReferences[0]!.sourceScope).toBe("Assets/Software");
    expect(items[0]!.provenance).toEqual([]); // Direct source evidence; no fabricated original observation.
    expect(calls.filter(c => c.path === "Assets/Software")).toHaveLength(2); // Shared per-inventory catalogue, not per installation.
    expect(calls.every(c => c.query.sort === "id:asc")).toBe(true);
  });
  it("retains unknown OS/software attributes without inferring names or original observations", async () => {
    const { transport, calls } = fixture([{ id: 1 }], (path, q) => path === osPath ? (q.start === 0 ? [{ id: 1 }] : []) : undefined);
    const result = await run(transport);
    expect(contents(result.operatingSystems)[0]).toMatchObject({ name: null, version: null, edition: null, architecture: null, servicePack: null, kernelVersion: null, operatingSystemId: null, installedAt: null, observedAt: null });
    expect(contents(result.installations)[0]).toMatchObject({ software: null, version: null, installedAt: null });
    expect(calls.some(c => c.path === "Assets/Software")).toBe(false);
  });
  it("uses only explicit version IDs and keeps unresolved product with a coverage gap", async () => {
    const { transport } = fixture([{ ...install(1), softwareversion: { id: 999, name: version.name } }]);
    const result = await run(transport);
    expect(result.installations.state).toBe("partial");
    expect(contents(result.installations)[0]).toMatchObject({ software: null, version: { value: version.name, architecture: null } });
  });
  it("keeps version identity stable when catalogue enrichment is unavailable", async () => {
    const a = await run(fixture().transport);
    const b = await run(fixture([install(1)], p => { if (p === "Assets/Software") throw new GlpiRequestError("safe", 404); }).transport);
    expect(contents(a.installations)[0]!.version!.versionId).toBe(contents(b.installations)[0]!.version!.versionId);
    expect(b.installations.state).toBe("partial");
  });
  it("retrieves synthetic 145 as 100 + 45 + verified empty, never merging installations", async () => {
    const { transport, calls } = fixture(Array.from({ length: 145 }, (_, i) => install(i + 1)));
    const result = await run(transport);
    expect(result.installations).toMatchObject({ state: "complete", pagination: { offset: 0, retrieved: 145, total: 145, nextOffset: null } });
    expect(contents(result.installations)).toHaveLength(145);
    expect(calls.filter(c => c.path === installPath).map(c => c.query)).toEqual([0, 100, 145].map(start => ({ start, limit: 100, sort: "id:asc" })));
  });
  it("continues after a server-capped short page", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => install(i + 1));
    const { transport, calls } = fixture(rows, (p, q) => p === installPath ? rows.slice(Number(q.start), Number(q.start) + 2) : undefined);
    expect((await run(transport)).installations.state).toBe("complete");
    expect(calls.filter(c => c.path === installPath).map(c => c.query.start)).toEqual([0, 2, 4, 5]);
  });
  it("complete-empty requires a successfully acquired empty array", async () => {
    const result = await run(fixture([]).transport);
    expect(result.installations).toMatchObject({ state: "complete", items: [], pagination: { offset: 0, retrieved: 0, total: 0, nextOffset: null }, collectedAt: at, observedAt: null });
    if (result.installations.state !== "complete") throw new Error("Expected complete");
    expect(result.installations.sourceReferences).toHaveLength(1);
  });
  it.each([401, 403, 404, 405, 501, 503])("classifies initial HTTP %s without empty success", async status => {
    const result = await run(fixture([], p => { if (p === installPath) throw new GlpiRequestError("INTERNAL-SECRET", status); }).transport);
    expect(result.installations).toEqual({ state: "unavailable", reason: [401, 403].includes(status) ? "unauthorized" : [405, 501].includes(status) ? "unsupported" : "source_error" });
    expect(JSON.stringify(result)).not.toContain("INTERNAL-SECRET"); expect(result.operatingSystems.state).toBe("complete");
  });
  it.each([401, 403])("fail-closes HTTP %s after a valid page", async status => {
    const result = await run(fixture([install(1)], (p, q) => { if (p === installPath && q.start !== 0) throw new GlpiRequestError("safe", status); }).transport);
    expect(result.installations).toEqual({ state: "unavailable", reason: "unauthorized" });
    expect(result.operatingSystems.state).toBe("complete");
  });
  it.each([401, 403])("fail-closes catalogue HTTP %s", async status => {
    const result = await run(fixture([install(1)], p => { if (p === versionPath) throw new GlpiRequestError("safe", status); }).transport);
    expect(result.installations).toEqual({ state: "unavailable", reason: "unauthorized" });
  });
  it.each([401, 403])("fail-closes late catalogue HTTP %s after a valid catalogue page", async status => {
    const result = await run(fixture([install(1)], (p, q) => { if (p === versionPath && q.start !== 0) throw new GlpiRequestError("safe", status); }).transport);
    expect(result.installations).toEqual({ state: "unavailable", reason: "unauthorized" });
    expect(result.operatingSystems.state).toBe("complete");
  });
  it("authorization of OS does not prevent independent software retrieval", async () => {
    const result = await run(fixture([install(1)], (p, q) => { if (p === osPath && q.start !== 0) throw new GlpiRequestError("safe", 403); }).transport);
    expect(result.operatingSystems).toEqual({ state: "unavailable", reason: "unauthorized" });
    expect(result.installations.state).toBe("complete"); expect(contents(result.installations)).toHaveLength(1);
  });
  it.each([404, 405, 501, 503])("catalogue HTTP %s preserves an evidenced unresolved version", async status => {
    const result = await run(fixture([install(1)], p => { if (p === versionPath) throw new GlpiRequestError("safe", status); }).transport);
    expect(result.installations.state).toBe("partial");
    expect(contents(result.installations)[0]).toMatchObject({ software: null, version: { value: "SYNTH-VERSION-REF" } });
  });
  it.each([new GlpiRequestError(), new Error("network"), new GlpiRequestError("safe", 503)])("preserves partial after an intermediate operational failure %#", async failure => {
    const result = await run(fixture([install(1)], (p, q) => { if (p === installPath && q.start !== 0) throw failure; }).transport);
    expect(result.installations).toMatchObject({ state: "partial", pagination: { offset: 0, retrieved: 1, total: null, nextOffset: null } });
    expect(contents(result.installations)).toHaveLength(1);
  });
  it("rejects unavailable credentials without exposing previous pages", async () => {
    const result = await run(fixture([], p => { if (p === osPath) throw new GlpiAuthenticationError(); }).transport);
    expect(result.operatingSystems).toEqual({ state: "unavailable", reason: "unauthorized" }); expect(result.installations.state).toBe("complete");
  });
  it.each([null, {}, "array", [{ id: "1" }], [{ id: 1 }, { id: 1 }]])("rejects invalid collection payload %#", async payload => {
    const result = await run(fixture([], p => p === installPath ? payload : undefined).transport);
    expect(result.installations.state).not.toBe("complete");
    expect(result.installations.state === "unavailable" || contents(result.installations).length === 0).toBe(true);
  });
  it.each([
    { id: 2, itemtype: "Printer" }, { id: 2, items_id: 99 }, { id: 2, is_dynamic: "yes" },
    { id: 2, softwareversion: "20" }, { id: 2, date_install: "2026-02-30" }, { id: 2, date_install: "2026-09-01T00:00:00Z" },
  ])("discarded records cannot claim a contiguous canonical window %#", async bad => {
    const result = await run(fixture([install(1), bad]).transport);
    expect(result.installations).toMatchObject({ state: "partial", pagination: null });
    expect(contents(result.installations)).toHaveLength(1);
  });
  it("does not assign timezone to a naive OS timestamp", async () => {
    const result = await run(fixture([], (p, q) => p === osPath ? (q.start === 0 ? [{ ...os, date_install: "2026-09-01 10:00:00" }] : []) : undefined).transport);
    expect(result.operatingSystems).toMatchObject({ state: "partial", items: [], pagination: null });
  });
  it("marks filtered deleted OS partial and removes pagination", async () => {
    const result = await run(fixture([], (p, q) => p === osPath ? (q.start === 0 ? [os, { ...os, id: 2, is_deleted: true }] : []) : undefined).transport);
    expect(result.operatingSystems).toMatchObject({ state: "partial", pagination: null }); expect(contents(result.operatingSystems)).toHaveLength(1);
  });
  it.each(["repeated", "overlap", "descending"])("detects %s pages and retains only the valid prefix", async mode => {
    const result = await run(fixture([], (p, q) => p === installPath ? (q.start === 0 ? [install(1), install(2)] : mode === "repeated" ? [install(1), install(2)] : mode === "overlap" ? [install(2), install(3)] : [install(4), install(3)]) : undefined).transport);
    expect(result.installations).toMatchObject({ state: "partial", pagination: null }); expect(contents(result.installations)).toHaveLength(2);
  });
  it("rejects oversized pages instead of accepting a fabricated window", async () => {
    const result = await run(fixture([install(1), install(2)]).transport, { pageSize: 1 });
    // The regular fixture honors limits; exercise a source that ignores the requested limit separately.
    expect(result.installations.state).toBe("complete");
    const invalid = await run(fixture([], p => p === installPath ? [install(1), install(2)] : undefined).transport, { pageSize: 1 });
    expect(invalid.installations).toEqual({ state: "unavailable", reason: "source_error" });
  });
  it.each([{ maxPages: 1 }, { maxRecords: 1 }])("limits do not imply exhaustion %#", async limits => {
    const result = await run(fixture().transport, limits);
    expect(result.installations.state).toBe("partial"); expect(result.operatingSystems.state).toBe("partial");
  });
  it("bounded catalogue scans preserve installations and unknown product", async () => {
    const { transport, calls } = fixture(); const result = await run(transport, { maxCatalogueRequests: 1 });
    expect(result.installations.state).toBe("partial"); expect(contents(result.installations)).toHaveLength(2);
    expect(contents(result.installations)[0]!.software).toBeNull();
    expect(calls.filter(c => c.path === "Assets/Software" || c.path === versionPath)).toHaveLength(1);
  });
  it("catalogue budget 4 completes exactly the required four requests", async () => {
    const { transport, calls } = fixture();
    const result = await run(transport, { maxCatalogueRequests: 4 });
    expect(result.installations.state).toBe("complete");
    expect(result.installations).not.toHaveProperty("gaps");
    expect(contents(result.installations)).toHaveLength(2);
    expect(contents(result.installations)[0]).toMatchObject({ software: { name: product.name }, version: { value: version.name } });
    expect(calls.filter(c => c.path === "Assets/Software" || c.path === versionPath).map(c => [c.path, c.query.start])).toEqual([
      ["Assets/Software", 0], ["Assets/Software", 1], [versionPath, 0], [versionPath, 1],
    ]);
  });
  it("catalogue budget 3 leaves version exhaustion pending and coverage partial", async () => {
    const { transport, calls } = fixture();
    const result = await run(transport, { maxCatalogueRequests: 3 });
    expect(result.installations).toMatchObject({ state: "partial", gaps: [{ fieldPath: versionPath, reason: "pagination_incomplete" }] });
    expect(contents(result.installations)).toHaveLength(2);
    expect(contents(result.installations)[0]).toMatchObject({ software: { name: product.name }, version: { value: version.name } });
    expect(calls.filter(c => c.path === "Assets/Software" || c.path === versionPath)).toHaveLength(3);
  });
  it("catalogue budget exhaustion with another product pending remains partial", async () => {
    const secondVersionPath = "Assets/Software/11/Version";
    const { transport, calls } = fixture([install(1), { ...install(2), softwareversion: { id: 21, name: "SYNTH-SECOND-VERSION" } }], (p, q) => {
      if (p === "Assets/Software") return q.start === 0 ? [product, { ...product, id: 11 }] : [];
      if (p === secondVersionPath) throw new Error("Exhausted budget must prevent this request");
      return undefined;
    });
    const result = await run(transport, { maxCatalogueRequests: 4 });
    expect(result.installations.state).toBe("partial");
    if (result.installations.state !== "partial") throw new Error("Expected partial");
    expect(result.installations.gaps).toContainEqual({ fieldPath: secondVersionPath, reason: "pagination_incomplete" });
    expect(contents(result.installations)).toHaveLength(2);
    expect(contents(result.installations)[0]!.software!.name).toBe(product.name);
    expect(contents(result.installations)[1]).toMatchObject({ software: null, version: { value: "SYNTH-SECOND-VERSION" } });
    expect(calls.filter(c => c.path === "Assets/Software" || c.path === versionPath)).toHaveLength(4);
    expect(calls.some(c => c.path === secondVersionPath)).toBe(false);
  });
  it("catalogue transient failure after a valid page keeps proven links with partial coverage", async () => {
    const result = await run(fixture([install(1)], (p, q) => { if (p === versionPath && q.start !== 0) throw new GlpiRequestError("safe", 503); }).transport);
    expect(result.installations.state).toBe("partial");
    expect(contents(result.installations)[0]).toMatchObject({ software: { name: product.name }, version: { value: version.name } });
  });
  it("catalogue repeated pages are partial, not proof of exhaustion", async () => {
    const result = await run(fixture([install(1)], p => p === versionPath ? [version] : undefined).transport);
    expect(result.installations.state).toBe("partial");
    expect(contents(result.installations)).toHaveLength(1);
  });
  it("malformed product attributes preserve the observed installation", async () => {
    const result = await run(fixture([install(1)], (p, q) => p === "Assets/Software" ? (q.start === 0 ? [{ ...product, manufacturer: "invalid" }] : []) : undefined).transport);
    expect(result.installations.state).toBe("partial"); expect(contents(result.installations)[0]!.software).toBeNull();
  });
  it.each([{ ...version, software: { id: 999 } }, { ...version, name: 42 }, { ...version, arch: [] }])("rejects inconsistent catalogue record %#", async bad => {
    const result = await run(fixture([install(1)], (p, q) => p === versionPath ? (q.start === 0 ? [bad] : []) : undefined).transport);
    expect(result.installations.state).toBe("partial"); expect(contents(result.installations)[0]!.software).toBeNull();
  });
  it("ambiguous version identity across products is never resolved by name", async () => {
    const result = await run(fixture([install(1)], (p, q) => {
      if (p === "Assets/Software") return q.start === 0 ? [product, { ...product, id: 11 }] : [];
      if (p === "Assets/Software/11/Version") return q.start === 0 ? [{ ...version, software: { id: 11 } }] : [];
      return undefined;
    }).transport);
    expect(result.installations.state).toBe("partial"); expect(contents(result.installations)[0]!.software).toBeNull();
  });
  it("ignores responses arriving after the configured deadline", async () => {
    vi.useFakeTimers();
    let release!: (v: unknown) => void;
    const { transport } = fixture([], p => p === installPath ? new Promise(resolve => { release = resolve; }) : undefined);
    const pending = run(transport, { requestTimeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(101);
    const result = await pending;
    expect(result.installations).toEqual({ state: "unavailable", reason: "source_error" });
    release([install(1)]); await Promise.resolve();
    expect(result.installations).toEqual({ state: "unavailable", reason: "source_error" });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("a late second page preserves only the completed prefix", async () => {
    vi.useFakeTimers();
    let release!: (v: unknown) => void;
    const { transport } = fixture([install(1)], (p, q) => p === installPath && q.start !== 0 ? new Promise(resolve => { release = resolve; }) : undefined);
    const pending = run(transport, { requestTimeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(101);
    const result = await pending;
    expect(result.installations.state).toBe("partial"); expect(contents(result.installations)).toHaveLength(1);
    release([install(2)]); await Promise.resolve();
    expect(contents(result.installations)).toHaveLength(1); expect(vi.getTimerCount()).toBe(0);
  });
  it("not_requested performs no section or catalogue calls", async () => {
    const { transport, calls } = fixture(); const result = await run(transport, {}, []);
    expect(result.operatingSystems).toEqual({ state: "not_requested" }); expect(result.installations).toEqual({ state: "not_requested" }); expect(calls).toEqual([]);
  });
  it.each(["absent", "ambiguous", "foreign", "scope", "numeric"])("rejects %s anchor without querying GLPI", async mode => {
    const original = asset(); const anchor = original.sourceReferences[0]!;
    const modified = { ...original, sourceReferences: mode === "absent" ? [] : mode === "ambiguous" ? [anchor, anchor] : [{ ...anchor, ...(mode === "foreign" ? { sourceInstanceId: "other" } : mode === "scope" ? { sourceScope: "Assets/Printer" } : { externalId: "042" }) }] };
    const { transport, calls } = fixture();
    await expect(createGlpiSoftwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(modified)).rejects.toBeInstanceOf(GlpiSoftwareAnchorError); expect(calls).toEqual([]);
  });
  it.each([{ pageSize: 0 }, { maxPages: -1 }, { maxRecords: 1.5 }, { maxCatalogueRequests: 2001 }, { requestTimeoutMs: 60001 }, { sourceInstanceId: "../secret" }])("rejects invalid configuration %#", invalid => {
    expect(() => createGlpiSoftwareAdapter({ transport: fixture().transport, sourceInstanceId: instance, ...invalid })).toThrow(GlpiConfigurationError);
  });
  it("invalid clock and canonical identity are operational configuration failures", async () => {
    const adapter = createGlpiSoftwareAdapter({ transport: fixture().transport, sourceInstanceId: instance, now: () => new Date(NaN) });
    await expect(adapter.getInventory(asset())).rejects.toBeInstanceOf(GlpiConfigurationError);
    await expect(createGlpiSoftwareAdapter({ transport: fixture().transport, sourceInstanceId: instance, now }).getInventory({ ...asset(), id: " invalid " } as TechnologyAsset)).rejects.toBeInstanceOf(GlpiConfigurationError);
  });
  it("coexists with Hardware V2 and the unchanged 0.2 provider", async () => {
    const { transport } = fixture();
    const snapshot = await createGlpiTechnologyProvider({ transport, sourceInstanceId: instance, now }).getSnapshot();
    expect(snapshot.schemaVersion).toBe("0.2"); expect(validateTechnologySnapshot(snapshot)).toEqual([]);
    const original = snapshot.assets[0]!;
    const hardware = await createGlpiHardwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(original, []);
    expect(validateHardwareInventoryV2(hardware)).toEqual([]);
    const software = await createGlpiSoftwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(original);
    expect(validateSoftwareInventoryV2(software)).toEqual([]); expect(software.assetId).toBe(hardware.assetId);
    expect(snapshot.assets[0]).not.toHaveProperty("installations");
  });
});
