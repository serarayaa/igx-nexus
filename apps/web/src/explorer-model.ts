import {
  ageInDays,
  assetClassLabel,
  criticalityLabels,
  lifecycleLabels,
  taxonomyStateLabels,
  technologyRoleLabel,
  typeLabels,
  type Asset,
  type InventorySnapshot,
} from "./asset-model";

export type Freshness = "fresh" | "stale" | "unknown";
export const freshnessLabels: Record<Freshness, string> = {
  fresh: "Reciente (≤ 7 días)",
  stale: "Antigua (> 7 días)",
  unknown: "Sin fecha verificable",
};

export const NO_VALUE = "__missing__";

export const filterKeys = [
  "domain",
  "assetClass",
  "role",
  "lifecycle",
  "source",
  "taxonomyState",
  "reviewRequired",
  "compatibilityFallback",
  "context",
  "type",
  "location",
  "manufacturer",
  "criticality",
  "freshness",
] as const;

export type FilterKey = typeof filterKeys[number];
export type ExplorerFilters = Record<FilterKey, string>;
export const emptyFilters: ExplorerFilters = {
  domain: "",
  assetClass: "",
  role: "",
  lifecycle: "",
  source: "",
  taxonomyState: "",
  reviewRequired: "",
  compatibilityFallback: "",
  context: "",
  type: "",
  location: "",
  manufacturer: "",
  criticality: "",
  freshness: "",
};

export interface ExplorerQuery {
  search: string;
  filters: ExplorerFilters;
  sort: { columnId: string; direction: "ascending" | "descending" };
  page: number;
  pageSize: number;
}

export interface FacetOption {
  readonly value: string;
  readonly count: number;
}

export function freshnessOf(asset: Pick<Asset, "lastSeen">, asOf: string): Freshness {
  const age = ageInDays(asset.lastSeen, asOf);
  return age === null || age < 0 ? "unknown" : age <= 7 ? "fresh" : "stale";
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL").trim().replace(/\s+/g, " ");
}

function scalarOrMissing(value: string | null | undefined): readonly string[] {
  return [value && value.trim() ? value : NO_VALUE];
}

export function filterValues(asset: Asset, key: FilterKey, asOf: string): readonly string[] {
  switch (key) {
    case "freshness":
      return [freshnessOf(asset, asOf)];
    case "criticality":
      return [asset.criticality ?? (asset.critical ? "critical" : "medium")];
    case "source":
      return asset.sourceSystems?.length ? asset.sourceSystems : [NO_VALUE];
    case "taxonomyState":
      return [asset.taxonomyState ?? "unknown"];
    case "reviewRequired":
      return asset.taxonomyReviewRequired === undefined ? [NO_VALUE] : [asset.taxonomyReviewRequired ? "yes" : "no"];
    case "compatibilityFallback":
      return asset.taxonomyCompatibilityFallback === undefined ? [NO_VALUE] : [asset.taxonomyCompatibilityFallback ? "yes" : "no"];
    case "context": {
      const contexts = asset.operationalContexts ?? [];
      return contexts.length
        ? contexts.map(context => context.displayName || context.id)
        : [NO_VALUE];
    }
    case "assetClass":
      return scalarOrMissing(asset.assetClass);
    case "role":
      return scalarOrMissing(asset.role);
    case "domain":
    case "type":
    case "lifecycle":
    case "location":
    case "manufacturer":
      return scalarOrMissing(asset[key]);
  }
}

export function filterValue(asset: Asset, key: FilterKey, asOf: string): string {
  return filterValues(asset, key, asOf)[0] ?? NO_VALUE;
}

const collator = new Intl.Collator("es-CL", { numeric: true, sensitivity: "base" });

function searchableText(asset: Asset): string {
  return normalizeSearch([
    asset.id,
    asset.name,
    asset.hostname,
    asset.serial,
    asset.assetTag,
    asset.owner,
    asset.model,
    asset.manufacturer,
    asset.location,
    asset.ipAddress,
    typeLabels[asset.type],
    asset.domain,
    asset.assetClass,
    assetClassLabel(asset.assetClass),
    asset.role,
    technologyRoleLabel(asset.role),
    asset.criticality ? criticalityLabels[asset.criticality] : null,
    asset.taxonomyState,
    asset.taxonomyState ? taxonomyStateLabels[asset.taxonomyState] : null,
    ...(asset.sourceSystems ?? []),
    ...(asset.operationalContexts ?? []).flatMap(context => [context.id, context.kind, context.displayName]),
  ].filter(Boolean).join(" "));
}

function matchesSearch(asset: Asset, words: readonly string[]): boolean {
  if (words.length === 0) return true;
  const text = searchableText(asset);
  return words.every(word => text.includes(word));
}

function matchesFilters(asset: Asset, filters: ExplorerFilters, asOf: string, ignoredKey?: FilterKey): boolean {
  return filterKeys.every(key => {
    if (key === ignoredKey || !filters[key]) return true;
    return filterValues(asset, key, asOf).includes(filters[key]);
  });
}

export function facetValues(snapshot: InventorySnapshot, key: FilterKey): string[] {
  const values = snapshot.assets.flatMap(asset => [...filterValues(asset, key, snapshot.asOf)]);
  return [...new Set(values)].sort(collator.compare);
}

/**
 * Counts de faceta calculados sobre búsqueda + todas las otras facetas activas.
 * Así el número de cada opción describe el scope alcanzable sin auto-filtrarse.
 */
export function facetOptions(snapshot: InventorySnapshot, query: ExplorerQuery, key: FilterKey): readonly FacetOption[] {
  const words = normalizeSearch(query.search).split(" ").filter(Boolean);
  const counts = new Map<string, number>();

  for (const asset of snapshot.assets) {
    if (!matchesSearch(asset, words) || !matchesFilters(asset, query.filters, snapshot.asOf, key)) continue;
    for (const value of new Set(filterValues(asset, key, snapshot.asOf))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  if (query.filters[key] && !counts.has(query.filters[key])) counts.set(query.filters[key], 0);

  return [...counts.entries()]
    .sort(([left], [right]) => collator.compare(left, right))
    .map(([value, count]) => Object.freeze({ value, count }));
}

export function hasFacetCoverage(snapshot: InventorySnapshot, key: FilterKey): boolean {
  return snapshot.assets.some(asset => filterValues(asset, key, snapshot.asOf).some(value => value !== NO_VALUE));
}

function sortValue(asset: Asset, column: string): string | number | null {
  switch (column) {
    case "name": return asset.name;
    case "type": return typeLabels[asset.type];
    case "domain": return asset.domain;
    case "assetClass": return asset.assetClass ? assetClassLabel(asset.assetClass) : null;
    case "role": return asset.role ? technologyRoleLabel(asset.role) : null;
    case "owner": return asset.owner;
    case "location": return asset.location;
    case "manufacturer": return asset.manufacturer;
    case "lifecycle": return lifecycleLabels[asset.lifecycle];
    case "criticality": return asset.criticality ? criticalityLabels[asset.criticality] : null;
    case "source": return asset.sourceSystems?.join(", ") ?? null;
    case "taxonomyState": return asset.taxonomyState ? taxonomyStateLabels[asset.taxonomyState] : null;
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
  const matching = snapshot.assets.filter(asset =>
    matchesSearch(asset, words) && matchesFilters(asset, query.filters, snapshot.asOf));

  matching.sort((a, b) => {
    const left = sortValue(a, query.sort.columnId);
    const right = sortValue(b, query.sort.columnId);
    // Datos desconocidos al final en ambas direcciones.
    if (left === null || right === null) return left === right ? collator.compare(a.id, b.id) : left === null ? 1 : -1;
    const order = typeof left === "number" && typeof right === "number"
      ? left - right
      : collator.compare(String(left), String(right));
    return order * (query.sort.direction === "ascending" ? 1 : -1) || collator.compare(a.id, b.id);
  });

  const pageSize = Math.max(1, Math.floor(query.pageSize) || 25);
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.max(1, Math.min(Math.floor(query.page) || 1, totalPages));
  const start = (page - 1) * pageSize;

  return {
    rows: matching.slice(start, start + pageSize),
    total: matching.length,
    totalPages,
    page,
    first: matching.length ? start + 1 : 0,
    last: Math.min(start + pageSize, matching.length),
  };
}
