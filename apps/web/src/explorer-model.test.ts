import { describe, expect, it } from "vitest";
import { DAY, type Asset } from "./asset-model";
import { demoProvider, demoSnapshot } from "./demo-provider";
import { emptyFilters, explore, facetValues, freshnessOf, NO_VALUE, type ExplorerQuery } from "./explorer-model";

const query: ExplorerQuery = { search: "", filters: emptyFilters, page: 1, pageSize: 25, sort: { columnId: "name", direction: "ascending" } };
const specimen: Asset = { ...demoSnapshot.assets[1]!, name: "Estación Demo Única", hostname: "demo-host-unique", serial: "SYNTH-unique", assetTag: "TAG-unique", owner: "Persona Demo Única", model: "Modelo Único", manufacturer: "Fabricante Único", location: "Sitio Único", ipAddress: "192.0.2.250" };
const fixture = { ...demoSnapshot, assets: [specimen, demoSnapshot.assets[2]!] };

describe("consulta del inventario", () => {
  it.each(["  ESTACION    única  ", "DEMO-HOST-UNIQUE", "synth-unique", "tag-unique", "persona unica", "modelo unico", "fabricante unico", "sitio unico", "192.0.2.250"])("busca por campos de inventario: %s", search => {
    expect(explore(fixture, { ...query, search }).rows.map(a => a.id)).toEqual([specimen.id]);
  });
  it("combina todos los filtros por intersección y conserva la búsqueda", () => {
    const filters = { domain: specimen.domain, type: specimen.type, lifecycle: specimen.lifecycle, location: specimen.location!, manufacturer: specimen.manufacturer!, critical: "no", freshness: "fresh" };
    expect(explore(fixture, { ...query, filters, search: "única" }).total).toBe(1);
    expect(explore(fixture, { ...query, filters: { ...filters, domain: "OT" } }).total).toBe(0);
  });
  it("incluye valores ausentes en facetas y permite encontrarlos", () => {
    expect(facetValues(demoSnapshot, "location")).toContain(NO_VALUE);
    const result = explore(demoSnapshot, { ...query, filters: { ...emptyFilters, location: NO_VALUE } });
    expect(result.total).toBeGreaterThan(0);
    expect(result.rows.every(a => a.location === null)).toBe(true);
  });
  it("ordena naturalmente, desempata por ID y no muta el inventario", () => {
    const assets = [ { ...specimen, id: "b", name: "Equipo 10" }, { ...specimen, id: "c", name: "Equipo 2" }, { ...specimen, id: "a", name: "Equipo 2" } ];
    Object.freeze(assets);
    expect(explore({ ...fixture, assets }, query).rows.map(a => a.id)).toEqual(["a", "c", "b"]);
    expect(explore({ ...fixture, assets }, { ...query, sort: { columnId: "name", direction: "descending" } }).rows.map(a => a.id)).toEqual(["b", "a", "c"]);
    expect(assets.map(a => a.id)).toEqual(["b", "c", "a"]);
  });
  it("ordena fechas cronológicamente y deja las desconocidas al final", () => {
    const assets = [{ ...specimen, id: "unknown", lastSeen: null }, { ...specimen, id: "old", lastSeen: "2025-01-01T00:00:00Z" }, { ...specimen, id: "new", lastSeen: demoSnapshot.asOf }];
    for (const direction of ["ascending", "descending"] as const) {
      expect(explore({ ...fixture, assets }, { ...query, sort: { columnId: "lastSeen", direction } }).rows.map(a => a.id)).toEqual(direction === "ascending" ? ["old", "new", "unknown"] : ["new", "old", "unknown"]);
    }
  });
  it("pagina después de filtrar y ordenar, ajusta páginas fuera de rango", () => {
    const first = explore(demoSnapshot, query);
    const second = explore(demoSnapshot, { ...query, page: 2 });
    expect(first.rows).toHaveLength(25);
    expect(second.first).toBe(26);
    expect(second.rows.some(a => first.rows.some(b => a.id === b.id))).toBe(false);
    const last = explore(demoSnapshot, { ...query, page: 999 });
    expect(last.page).toBe(10); expect(last.rows).toHaveLength(15); expect(last.last).toBe(240);
    expect(explore(demoSnapshot, { ...query, page: 10, search: "SYNTH-SN-000002" }).page).toBe(1);
  });
  it("maneja cero coincidencias y dataset vacío sin rangos ficticios", () => {
    for (const snapshot of [demoSnapshot, { ...demoSnapshot, assets: [] }]) {
      const result = explore(snapshot, { ...query, search: "no-existe" });
      expect(result.total).toBe(0); expect(result.first).toBe(0); expect(result.last).toBe(0); expect(result.page).toBe(1);
    }
  });
  it("clasifica frescura con corte fijo, límites y fechas no verificables", () => {
    for (const [days, expected] of [[0, "fresh"], [-7, "fresh"], [-7.001, "stale"], [1, "unknown"]] as const) {
      expect(freshnessOf({ ...specimen, lastSeen: new Date(Date.parse(demoSnapshot.asOf) + days * DAY).toISOString() }, demoSnapshot.asOf)).toBe(expected);
    }
    for (const lastSeen of [null, "invalid"]) expect(freshnessOf({ ...specimen, lastSeen }, demoSnapshot.asOf)).toBe("unknown");
  });
  it("mantiene IDs únicos, campos sintéticos y un provider reproducible cancelable", async () => {
    expect(new Set(demoSnapshot.assets.map(a => a.id)).size).toBe(240);
    expect(demoSnapshot.assets.every(a => a.name.includes("Demo") && (!a.ipAddress || a.ipAddress.startsWith("192.0.2.")))).toBe(true);
    expect(await demoProvider(new AbortController().signal)).toBe(demoSnapshot);
    const controller = new AbortController(); controller.abort();
    await expect(demoProvider(controller.signal)).rejects.toThrow();
  });
});
