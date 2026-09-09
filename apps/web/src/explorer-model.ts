import { ageInDays, typeLabels, lifecycleLabels, type Asset, type InventorySnapshot } from "./asset-model";

export type Freshness = "fresh" | "stale" | "unknown";
export const freshnessLabels: Record<Freshness, string> = {
  fresh: "Reciente (≤ 7 días)", stale: "Antigua (> 7 días)", unknown: "Sin fecha verificable",
};
export const NO_VALUE = "__missing__";
export const filterKeys = ["domain", "type", "lifecycle", "location", "manufacturer", "critical", "freshness"] as const;
export type FilterKey = typeof filterKeys[number];
export type ExplorerFilters = Record<FilterKey, string>;
export const emptyFilters: ExplorerFilters = { domain: "", type: "", lifecycle: "", location: "", manufacturer: "", critical: "", freshness: "" };
export interface ExplorerQuery {
  search: string;
  filters: ExplorerFilters;
  sort: { columnId: string; direction: "ascending" | "descending" };
  page: number;
  pageSize: number;
}
export function freshnessOf(asset: Pick<Asset, "lastSeen">, asOf: string): Freshness {
  const age = ageInDays(asset.lastSeen, asOf);
  return age === null || age < 0 ? "unknown" : age <= 7 ? "fresh" : "stale";
}
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL").trim().replace(/\s+/g, " ");
}
export function filterValue(asset: Asset, key: FilterKey, asOf: string): string {
  if (key === "freshness") return freshnessOf(asset, asOf);
  if (key === "critical") return asset.critical ? "yes" : "no";
  return asset[key] || NO_VALUE;
}
const collator = new Intl.Collator("es-CL", { numeric: true, sensitivity: "base" });
export function facetValues(snapshot: InventorySnapshot, key: FilterKey): string[] {
  return [...new Set(snapshot.assets.map(a => filterValue(a, key, snapshot.asOf)))].sort(collator.compare);
}
function sortValue(asset: Asset, column: string): string | number | null {
  switch (column) {
    case "name": return asset.name;
    case "type": return typeLabels[asset.type];
    case "domain": return asset.domain;
    case "owner": return asset.owner;
    case "location": return asset.location;
    case "manufacturer": return asset.manufacturer;
    case "lifecycle": return lifecycleLabels[asset.lifecycle];
    case "lastSeen": {
      const time = asset.lastSeen ? Date.parse(asset.lastSeen) : NaN;
      return Number.isFinite(time) ? time : null;
    }
    default: return asset.id;
  }
}

/** Transformación pura: buscar y filtrar → ordenar → paginar, sin mutar el snapshot. */
export function explore(snapshot: InventorySnapshot, query: ExplorerQuery) {
  const words = normalizeSearch(query.search).split(" ").filter(Boolean);
  const matching = snapshot.assets.filter(asset => {
    if (!filterKeys.every(key => !query.filters[key] || filterValue(asset, key, snapshot.asOf) === query.filters[key])) return false;
    const text = normalizeSearch([asset.id, asset.name, asset.hostname, asset.serial, asset.assetTag,
      asset.owner, asset.model, asset.manufacturer, asset.location, asset.ipAddress,
      typeLabels[asset.type], asset.domain].filter(Boolean).join(" "));
    return words.every(word => text.includes(word));
  });
  matching.sort((a, b) => {
    const left = sortValue(a, query.sort.columnId);
    const right = sortValue(b, query.sort.columnId);
    // Datos desconocidos al final en ambas direcciones.
    if (left === null || right === null) return left === right ? collator.compare(a.id, b.id) : left === null ? 1 : -1;
    const order = typeof left === "number" && typeof right === "number" ? left - right : collator.compare(String(left), String(right));
    return order * (query.sort.direction === "ascending" ? 1 : -1) || collator.compare(a.id, b.id);
  });
  const pageSize = Math.max(1, Math.floor(query.pageSize) || 25);
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.max(1, Math.min(Math.floor(query.page) || 1, totalPages));
  const start = (page - 1) * pageSize;
  return { rows: matching.slice(start, start + pageSize), total: matching.length, totalPages, page,
    first: matching.length ? start + 1 : 0, last: Math.min(start + pageSize, matching.length) };
}
