import { describe, expect, it } from "vitest";
import { validateHardwareInventoryV2, type HardwareSectionV2 } from "@igx-nexus/types";
import { createGlpiHardwareAdapter, glpiMiBToBytes } from "./glpi-hardware.js";
import { createGlpiTechnologyProvider, mapGlpiComputerToTechnologyAsset, parseGlpiComputerRecord, GlpiAuthenticationError, GlpiConfigurationError, GlpiPayloadError, GlpiRequestError, type GlpiApiTransport, type GlpiQuery } from "./glpi.js";
const at = "2026-10-08T12:00:00.000Z";
const instance = "glpi-synthetic-hardware";
const asset = () => mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord({ id: 42, name: "SYNTHETIC-COMPUTER" }), at, instance);
const now = () => new Date(at);
const cpu = { id: 1, itemtype: "Computer", items_id: 42, processor: { id: 11, designation: "Synthetic CPU" }, nbcores: 4, nbthreads: 8, frequency: "3500" };
const ram = (id: number, catalogueId: number) => ({ id, itemtype: "Computer", items_id: 42, memory: { id: catalogueId, designation: "Synthetic RAM" }, size: 8192, busID: `SYNTH-SLOT-${id}` });
const disk = (id: number, catalogueId: number) => ({ id, itemtype: "Computer", items_id: 42, hard_drive: { id: catalogueId, designation: "Synthetic SSD model" }, capacity: 524288, serial: `SYNTH-SERIAL-${id}` });
const volume = { id: 7, itemtype: "Computer", items_id: 42, name: "SYNTH-VOLUME", total_size: 524288, free_size: 65536, filesystem: { id: 2, name: "NTFS" }, date_mod: "2026-10-08 10:00:00" };
function contents<T>(s: HardwareSectionV2<T>): readonly T[] {
  if (s.state !== "complete" && s.state !== "partial") throw new Error("Expected collected section");
  return s.items;
}
function syntheticTransport() {
  const calls: { path: string; query: GlpiQuery }[] = [];
  const lists: Record<string, unknown[]> = {
    "Processor": [cpu], "Memory": [ram(2, 12), ram(3, 13)], "HardDrive": [disk(4, 14), disk(5, 15)], "Volume": [volume],
  };
  const catalogues: Record<string, unknown> = {
    "Components/Processor/11": { id: 11, designation: "Synthetic CPU", manufacturer: { id: 1, name: "Synthetic vendor" } },
    "Components/Memory/12": { id: 12, type: { id: 1, name: "DDR3" }, frequency: "1600 MHz" },
    "Components/Memory/13": { id: 13, type: { id: 2, name: "DDR4" }, frequency: "3200 MT/s" },
    "Components/HardDrive/14": { id: 14, interface: { id: 1, name: "SATA" } },
    "Components/HardDrive/15": { id: 15, interface: { id: 2, name: "NVMe" } },
  };
  const transport: GlpiApiTransport = { async get(path, query = {}) {
    calls.push({ path, query });
    if (path === "Assets/Computer") return query.start === 0 ? [{ id: 42, name: "SYNTHETIC-COMPUTER" }] : [];
    if (path in catalogues) return catalogues[path];
    const kind = path.split("/").at(-1)!;
    if (!(kind in lists)) throw new Error("Unexpected synthetic route");
    return lists[kind]!.slice(Number(query.start), Number(query.start) + Number(query.limit));
  } };
  return { transport, calls };
}

describe("GLPI hardware adapter V2 — verified 2.3 schemas, synthetic data only", () => {
  it("normalizes CPU/RAM/storage/volumes with existing identity and honest evidence", async () => {
    const { transport, calls } = syntheticTransport();
    const original = asset();
    const before = JSON.stringify(original);
    const result = await createGlpiHardwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(original);
    expect(result.assetId).toBe(original.id);
    expect(JSON.stringify(original)).toBe(before);
    expect(validateHardwareInventoryV2(result)).toEqual([]);
    const processor = contents(result.processors)[0]!;
    expect(processor).toMatchObject({ cores: 4, threads: 8, manufacturer: "Synthetic vendor", componentId: null, baseFrequency: null, maxFrequency: null, observedAt: null, collectedAt: at });
    expect(contents(result.memoryModules).map((r) => [r.technology, r.capacityBytes, r.componentId, r.slot])).toEqual([
      ["DDR3", 8589934592, null, "SYNTH-SLOT-2"], ["DDR4", 8589934592, null, "SYNTH-SLOT-3"],
    ]);
    expect(contents(result.memoryModules).map((r) => r.speed)).toEqual([{ value: 1600, unit: "MHz" }, { value: 3200, unit: "MT/s" }]);
    // A synthetic SSD label is not evidence of medium. Interface and protocol are explicit catalogue facts.
    expect(contents(result.physicalStorageDevices).map((r) => [r.medium, r.interface, r.protocol, r.formFactor])).toEqual([[null, "SATA", null, null], [null, null, "NVMe", null]]);
    expect(contents(result.logicalVolumes)[0]).toMatchObject({ capacityBytes: 549755813888, availableBytes: 68719476736, fileSystem: "NTFS", physicalDeviceIds: null, observedAt: null });
    expect(result.peripherals).toEqual({ state: "not_requested" });
    expect(result.peripheralConnections).toEqual({ state: "not_requested" });
    expect(processor.sourceReferences.map((s) => s.sourceScope)).toEqual(["Assets/Computer/42/Component/Processor", "Components/Processor/11"]);
    expect(calls.filter((c) => c.path.startsWith("Assets/Computer/42")).every((c) => c.query.sort === "id:asc")).toBe(true);
  });
  it.each([0, 1, 8193, 524289])("converts integer MiB exactly without rounding: %s", (v) => expect(glpiMiBToBytes(v)).toBe(v * 1048576));
  it.each([-1, 0.5, "8192", Infinity, Number.MAX_SAFE_INTEGER])("rejects invalid or overflowing capacity: %s", (v) => expect(() => glpiMiBToBytes(v)).toThrow(GlpiPayloadError));
  it.each(["3200", "Unknown", "PC4-25600"])("keeps missing capacity, ambiguous RAM speed %s and device identities unknown", async (frequency) => {
    const transport: GlpiApiTransport = { async get(path, query) {
      if (path.startsWith("Components")) return { id: 12, frequency, type: { name: "UNKNOWN" } };
      return query?.start === 0 ? [{ id: 2, memory: { id: 12 } }] : [];
    } };
    const result = await createGlpiHardwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(asset(), ["memoryModules"]);
    expect(contents(result.memoryModules)[0]).toMatchObject({ capacityBytes: null, speed: null, technology: null, slot: null, componentId: null, identifiers: [] });
    expect(result.processors).toEqual({ state: "not_requested" });
  });
  it("retains complete-empty acquisition evidence only after successful exhausted query", async () => {
    const calls: unknown[] = [];
    const result = await createGlpiHardwareAdapter({ transport: { async get(path, query) { calls.push({ path, query }); return []; } }, sourceInstanceId: instance, now }).getInventory(asset(), ["processors"]);
    expect(result.processors).toEqual({ state: "complete", items: [], collectedAt: at, observedAt: null, sourceReferences: [{ source: "glpi", sourceInstanceId: instance, sourceScope: "Assets/Computer/42/Component/Processor", externalId: "Computer/42?start=0&limit=100&sort=id:asc", entityType: "ProcessorCollection", observedAt: at, authority: "authoritative" }] });
    expect(calls).toHaveLength(1);
    expect(validateHardwareInventoryV2(result)).toEqual([]);
  });
  it.each([[401, "unauthorized"], [403, "unauthorized"], [404, "source_error"], [400, "source_error"], [500, "source_error"], [503, "source_error"], [405, "unsupported"], [501, "unsupported"]])("classifies HTTP %s without inventing empty success", async (status, reason) => {
    const transport: GlpiApiTransport = { async get() { throw new GlpiRequestError("safe", Number(status)); } };
    const result = await createGlpiHardwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(asset(), ["processors"]);
    expect(result.processors).toEqual({ state: "unavailable", reason });
  });
  it("maps missing token to authorization coverage", async () => {
    const result = await createGlpiHardwareAdapter({ transport: { async get() { throw new GlpiAuthenticationError(); } }, sourceInstanceId: instance, now }).getInventory(asset(), ["processors"]);
    expect(result.processors).toEqual({ state: "unavailable", reason: "unauthorized" });
  });
  it.each([{}, null, [{ id: "1" }], [{ id: 1, nbcores: -1 }], [{ id: 1, items_id: 99 }], [{ id: 1, itemtype: "Printer" }], [{ id: 1, processor: "invalid" }]])("rejects malformed collection/page %j", async (payload) => {
    const result = await createGlpiHardwareAdapter({ transport: { async get() { return payload; } }, sourceInstanceId: instance, now }).getInventory(asset(), ["processors"]);
    expect(result.processors).toEqual({ state: "unavailable", reason: "source_error" });
  });
  it("preserves previous valid pages when a later request fails", async () => {
    const result = await createGlpiHardwareAdapter({ transport: { async get(_path, query) { if (query?.start === 0) return [{ id: 1 }]; throw new GlpiRequestError("safe", 503); } }, sourceInstanceId: instance, now }).getInventory(asset(), ["processors"]);
    expect(result.processors.state).toBe("partial");
    expect(contents(result.processors)).toHaveLength(1);
    if (result.processors.state === "partial") expect(result.processors.gaps).toEqual([{ fieldPath: "processors", reason: "source_error" }]);
    expect(validateHardwareInventoryV2(result)).toEqual([]);
  });
  it.each([401, 403])("discards a valid first page when the second page returns HTTP %s", async (status) => {
    const calls: unknown[] = [];
    const result = await createGlpiHardwareAdapter({ transport: { async get(_path, query) {
      calls.push(query);
      if (query?.start === 0) return [{ id: 1 }];
      throw new GlpiRequestError("safe", status);
    } }, sourceInstanceId: instance, now }).getInventory(asset(), ["processors"]);
    expect(calls).toEqual([{ start: 0, limit: 100, sort: "id:asc" }, { start: 1, limit: 100, sort: "id:asc" }]);
    expect(result.processors).toEqual({ state: "unavailable", reason: "unauthorized" });
    expect(validateHardwareInventoryV2(result)).toEqual([]);
  });
  it("paginates short pages to an explicit terminal empty page", async () => {
    const queries: unknown[] = [];
    const result = await createGlpiHardwareAdapter({ transport: { async get(_p, query) { queries.push(query); return Number(query?.start) < 2 ? [{ id: Number(query?.start) + 1 }] : []; } }, sourceInstanceId: instance, pageSize: 100, maxRecords: 10, now }).getInventory(asset(), ["processors"]);
    expect(result.processors.state).toBe("complete");
    expect(contents(result.processors)).toHaveLength(2);
    expect(queries).toEqual([{ start: 0, limit: 10, sort: "id:asc" }, { start: 1, limit: 9, sort: "id:asc" }, { start: 2, limit: 8, sort: "id:asc" }]);
  });
  it.each([{ maxPages: 1 }, { maxRecords: 1 }])("never marks safety-bounded collection complete: %j", async (bound) => {
    const result = await createGlpiHardwareAdapter({ transport: { async get() { return [{ id: 1 }]; } }, sourceInstanceId: instance, now, ...bound }).getInventory(asset(), ["processors"]);
    expect(result.processors.state).toBe("partial");
    if (result.processors.state === "partial") expect(result.processors.gaps).toEqual([{ fieldPath: "processors", reason: "pagination_incomplete" }]);
  });
  it.each([[{ id: 1 }, { id: 1 }], [{ id: 2 }, { id: 1 }]])("rejects duplicate or out-of-order page IDs %j", async (...rows) => {
    const result = await createGlpiHardwareAdapter({ transport: { async get() { return rows; } }, sourceInstanceId: instance, now }).getInventory(asset(), ["processors"]);
    expect(result.processors).toEqual({ state: "unavailable", reason: "pagination_incomplete" });
  });
  it("detects repeated pages and oversized pages, without merging physical records", async () => {
    const result = await createGlpiHardwareAdapter({ transport: { async get() { return [{ id: 1 }]; } }, sourceInstanceId: instance, now }).getInventory(asset(), ["processors"]);
    expect(result.processors.state).toBe("partial");
    expect(contents(result.processors)).toHaveLength(1);
    const oversized = await createGlpiHardwareAdapter({ transport: { async get() { return [{ id: 1 }, { id: 2 }]; } }, pageSize: 1, sourceInstanceId: instance, now }).getInventory(asset(), ["processors"]);
    expect(oversized.processors).toEqual({ state: "unavailable", reason: "pagination_incomplete" });
  });
  it.each([404, 500, 503])("retains item evidence when catalogue enrichment returns %s", async (status) => {
    const { transport } = syntheticTransport();
    const result = await createGlpiHardwareAdapter({ transport: { async get(path, query) { if (path.startsWith("Components")) throw new GlpiRequestError("safe", status); return transport.get(path, query); } }, sourceInstanceId: instance, now }).getInventory(asset(), ["memoryModules"]);
    expect(result.memoryModules.state).toBe("partial");
    expect(contents(result.memoryModules)).toHaveLength(2);
    expect(contents(result.memoryModules).every((r) => r.technology === null && r.sourceReferences.length === 1)).toBe(true);
    expect(validateHardwareInventoryV2(result)).toEqual([]);
  });
  it.each([401, 403, "authentication"])("discards the section after catalogue authorization failure %s, including previously enriched items", async (failure) => {
    const { transport } = syntheticTransport();
    const calls: string[] = [];
    const result = await createGlpiHardwareAdapter({ transport: { async get(path, query) {
      calls.push(path);
      if (path === "Components/Memory/13") {
        if (typeof failure === "string") throw new GlpiAuthenticationError();
        throw new GlpiRequestError("safe", failure);
      }
      return transport.get(path, query);
    } }, sourceInstanceId: instance, now }).getInventory(asset(), ["memoryModules"]);
    expect(calls).toEqual(["Assets/Computer/42/Component/Memory", "Components/Memory/12", "Components/Memory/13"]);
    expect(result.memoryModules).toEqual({ state: "unavailable", reason: "unauthorized" });
    expect(validateHardwareInventoryV2(result)).toEqual([]);
  });
  it("caches shared catalogue without collapsing identical modules", async () => {
    let details = 0;
    const result = await createGlpiHardwareAdapter({ transport: { async get(path, query) {
      if (path.startsWith("Components")) { details++; return { id: 12, type: { name: "DDR4" } }; }
      return query?.start === 0 ? [ram(2, 12), ram(3, 12)] : [];
    } }, sourceInstanceId: instance, now }).getInventory(asset(), ["memoryModules"]);
    expect(details).toBe(1);
    expect(contents(result.memoryModules).map((r) => r.componentId)).toEqual([null, null]);
    expect(contents(result.memoryModules).map((r) => r.sourceReferences[0]?.externalId)).toEqual(["2", "3"]);
  });
  it.each([null, [], { id: 99 }, { id: 12, manufacturer: "invalid" }])("keeps association evidence after malformed catalogue %j", async (payload) => {
    const result = await createGlpiHardwareAdapter({ transport: { async get(path, query) {
      if (path.startsWith("Components")) return payload;
      return query?.start === 0 ? [ram(2, 12)] : [];
    } }, sourceInstanceId: instance, now }).getInventory(asset(), ["memoryModules"]);
    expect(result.memoryModules.state).toBe("partial");
    expect(contents(result.memoryModules)[0]).toMatchObject({ capacityBytes: 8589934592, technology: null });
    expect(contents(result.memoryModules)[0]?.sourceReferences.map((s) => s.externalId)).toEqual(["2"]);
    expect(validateHardwareInventoryV2(result)).toEqual([]);
  });
  it("collects enriched components after their catalogue acquisition without creating original observation", async () => {
    let tick = 0;
    const { transport } = syntheticTransport();
    const result = await createGlpiHardwareAdapter({ transport, sourceInstanceId: instance,
      now: () => new Date(Date.parse(at) + tick++ * 1000),
    }).getInventory(asset(), ["processors"]);
    const processor = contents(result.processors)[0]!;
    expect(processor.collectedAt).toBe("2026-10-08T12:00:03.000Z");
    expect(processor.sourceReferences.map((s) => s.observedAt)).toEqual(["2026-10-08T12:00:01.000Z", "2026-10-08T12:00:02.000Z"]);
    expect(processor.observedAt).toBeNull();
    expect(result.processors).toMatchObject({ state: "complete", collectedAt: "2026-10-08T12:00:05.000Z", observedAt: null });
    expect(validateHardwareInventoryV2(result)).toEqual([]);
  });
  it("does not promote modified/inventory dates to original hardware observation", async () => {
    const { transport } = syntheticTransport();
    const result = await createGlpiHardwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(asset());
    expect(contents(result.logicalVolumes)[0]?.observedAt).toBeNull();
    expect(contents(result.processors)[0]?.provenance).toEqual([]);
  });
  it("handles invalid conversion or inconsistent volume as partial source error, not empty success", async () => {
    const result = await createGlpiHardwareAdapter({ transport: { async get(_path, query) { return query?.start === 0 ? [{ ...volume, free_size: volume.total_size + 1 }] : []; } }, sourceInstanceId: instance, now }).getInventory(asset(), ["logicalVolumes"]);
    expect(result.logicalVolumes.state).toBe("partial");
    expect(contents(result.logicalVolumes)).toEqual([]);
  });
  it("requires an existing unambiguous Computer source, without generating canonical identity", async () => {
    const { transport } = syntheticTransport();
    const adapter = createGlpiHardwareAdapter({ transport, sourceInstanceId: instance, now });
    await expect(adapter.getInventory({ ...asset(), sourceReferences: [] })).rejects.toBeInstanceOf(GlpiConfigurationError);
    await expect(adapter.getInventory({ ...asset(), sourceReferences: [...asset().sourceReferences, ...asset().sourceReferences] })).rejects.toBeInstanceOf(GlpiConfigurationError);
    expect((await adapter.getInventory({ ...asset(), id: "SYNTH-EXISTING-CANONICAL-ID" }, [])).assetId).toBe("SYNTH-EXISTING-CANONICAL-ID");
  });
  it("leaves the legacy provider and its 0.2 snapshot untouched", async () => {
    const { transport } = syntheticTransport();
    const provider = createGlpiTechnologyProvider({ transport, sourceInstanceId: instance, now });
    const before = await provider.getSnapshot();
    await createGlpiHardwareAdapter({ transport, sourceInstanceId: instance, now }).getInventory(before.assets[0]!);
    expect(await provider.getSnapshot()).toEqual(before);
    expect(before.schemaVersion).toBe("0.2");
    expect(before.assets[0]?.id).toBe(asset().id);
  });
});
