import { emptyFilters, explore, filterKeys, type ExplorerQuery } from "./explorer-model";
import type { InventorySnapshot } from "./asset-model";
import { assetSectionHash, defaultTechnologyMapState, technologyMapPerspectives, technologyMapRelationshipTypes, type AssetSection, type TechnologyMapState } from "./navigation-model";

export const workspaceSortColumns = ["name", "type", "domain", "assetClass", "role", "owner", "location", "manufacturer", "lifecycle", "criticality", "source", "taxonomyState", "lastSeen"] as const;
export interface InvestigationState extends ExplorerQuery {
  sort: { columnId: (typeof workspaceSortColumns)[number]; direction: "ascending" | "descending" };
  view: "table" | "graph";
  scope: "inventory";
  selectedId: string | null;
  graph: Omit<TechnologyMapState, "selectedId"> & { rootId: string | null };
}

export function applyExplorerQuery(state: InvestigationState, query: ExplorerQuery): InvestigationState {
  const columnId = workspaceSortColumns.find(column => column === query.sort.columnId) ?? "name";
  return { ...state, ...query, sort: { columnId, direction: query.sort.direction } };
}

export function defaultInvestigationState(): InvestigationState {
  return { view: "table", scope: "inventory", search: "", filters: { ...emptyFilters }, sort: { columnId: "name", direction: "ascending" }, page: 1, pageSize: 25, selectedId: null, graph: { depth: defaultTechnologyMapState.depth, type: "all", perspective: "all", rootId: null } };
}

function text(value: string | null, limit: number): string | null {
  return value && value.length <= limit && !/[\u0000-\u001f\u007f]/u.test(value) ? value : null;
}

/** URL input is untrusted. Single-valued parameters reject ambiguous duplicates. */
export function parseInvestigationHash(hash: string) {
  const state = defaultInvestigationState();
  const issues: string[] = [];
  if (!(hash === "#assets" || hash.startsWith("#assets?")) || hash.length > 4096) {
    return { state, issues: ["unsupported-or-oversized-url"], canonicalHash: "#assets" };
  }
  const query = hash === "#assets" ? "" : hash.slice(8);
  try { decodeURIComponent(query); } catch { return { state, issues: ["malformed-encoding"], canonicalHash: "#assets" }; }
  const params = new URLSearchParams(query);
  const allowed = new Set(["view", "scope", "q", "sort", "direction", "page", "size", "selected", "root", "depth", "type", "perspective", ...filterKeys.map(key => `f.${key}`)]);
  for (const key of params.keys()) if (!allowed.has(key)) issues.push(`unknown:${key}`);
  function value(key: string): string | null {
    const values = params.getAll(key);
    if (values.length > 1) { issues.push(`duplicate:${key}`); return null; }
    return values[0] ?? null;
  }
  function enumValue<T extends string>(key: string, values: readonly T[], fallback: T): T {
    const raw = value(key);
    const found = values.find(candidate => candidate === raw);
    if (raw !== null && !found) issues.push(`invalid:${key}`);
    return found ?? fallback;
  }
  function stringValue(key: string, limit: number): string | null {
    const raw = value(key);
    const parsed = text(raw, limit);
    if (raw && !parsed) issues.push(`invalid:${key}`);
    return parsed;
  }
  state.view = enumValue("view", ["table", "graph"], "table");
  state.scope = enumValue("scope", ["inventory"], "inventory");
  state.search = stringValue("q", 256) ?? "";
  state.selectedId = stringValue("selected", 160);
  state.sort = { columnId: enumValue("sort", workspaceSortColumns, "name"), direction: enumValue("direction", ["ascending", "descending"], "ascending") };
  const page = value("page");
  if (page !== null) {
    if (/^[1-9]\d{0,5}$/.test(page)) state.page = Number(page);
    else issues.push("invalid:page");
  }
  const size = value("size");
  if (size !== null) {
    if (size === "25" || size === "50" || size === "100") state.pageSize = Number(size);
    else issues.push("invalid:size");
  }
  for (const key of filterKeys) state.filters[key] = stringValue(`f.${key}`, 160) ?? "";
  // Facet values remain opaque domain values. Missing/stale values must produce no matches, not broaden scope.
  state.graph = { rootId: stringValue("root", 160), depth: enumValue("depth", ["1", "2"], "2") === "1" ? 1 : 2, type: enumValue("type", technologyMapRelationshipTypes, "all"), perspective: enumValue("perspective", technologyMapPerspectives, "all") };
  return { state, issues: [...new Set(issues)], canonicalHash: serializeInvestigationHash(state) };
}

/** Deterministic serialization of typed state; normalize validates runtime values. */
export function serializeInvestigationHash(state: InvestigationState): string {
  const params = new URLSearchParams();
  if (state.view !== "table") params.set("view", state.view);
  if (state.scope !== "inventory") params.set("scope", state.scope);
  if (state.search) params.set("q", state.search);
  for (const key of filterKeys) if (state.filters[key]) params.set(`f.${key}`, state.filters[key]);
  if (state.sort.columnId !== "name") params.set("sort", state.sort.columnId);
  if (state.sort.direction !== "ascending") params.set("direction", state.sort.direction);
  if (state.page !== 1) params.set("page", String(state.page));
  if (state.pageSize !== 25) params.set("size", String(state.pageSize));
  if (state.selectedId) params.set("selected", state.selectedId);
  if (state.graph.rootId) params.set("root", state.graph.rootId);
  if (state.graph.depth !== 2) params.set("depth", String(state.graph.depth));
  if (state.graph.type !== "all") params.set("type", state.graph.type);
  if (state.graph.perspective !== "all") params.set("perspective", state.graph.perspective);
  return params.size ? `#assets?${params}` : "#assets";
}

export function normalizeInvestigationState(state: InvestigationState): InvestigationState {
  return parseInvestigationHash(serializeInvestigationHash(state)).state;
}

export function changeRepresentation(state: InvestigationState, view: InvestigationState["view"]): InvestigationState {
  // Graph root is distinct from selected entity; never choose the first dataset row implicitly.
  return { ...state, view, graph: { ...state.graph, rootId: state.graph.rootId ?? (view === "graph" ? state.selectedId : null) } };
}

export interface InvestigationIntent {
  query?: string;
  filters?: Partial<InvestigationState["filters"]>;
  selectedId?: string;
  view?: InvestigationState["view"];
}
export function buildInvestigationLink(intent: InvestigationIntent): string {
  const state = defaultInvestigationState();
  const initial = normalizeInvestigationState({ ...state, search: intent.query ?? "", filters: { ...state.filters, ...intent.filters }, selectedId: intent.selectedId ?? null });
  return serializeInvestigationHash(changeRepresentation(initial, intent.view ?? "table"));
}

export function validatedReturnHash(hash: string | null): string | null {
  if (!hash || !(hash === "#assets" || hash.startsWith("#assets?"))) return null;
  const parsed = parseInvestigationHash(hash);
  return parsed.issues.length ? null : parsed.canonicalHash;
}
export function assetReturnHash(hash: string): string | null {
  const params = new URLSearchParams(hash.split("?", 2)[1] ?? "");
  return params.getAll("return").length === 1 ? validatedReturnHash(params.get("return")) : null;
}
export function buildContextualAssetLink(assetId: string, origin: InvestigationState, section: AssetSection = "summary"): string {
  const base = assetSectionHash(assetId, section);
  const returnHash = serializeInvestigationHash(normalizeInvestigationState(origin));
  return `${base}${base.includes("?") ? "&" : "?"}return=${encodeURIComponent(returnHash)}`;
}

export type SelectionAvailability = "none" | "source-unavailable" | "graph-unavailable" | "missing" | "outside-filter" | "outside-graph" | "visible";
export const selectionAvailabilityLabels: Record<SelectionAvailability, string> = {
  none: "Sin selección", "source-unavailable": "Inventario todavía no disponible", missing: "CI no disponible en el inventario actual",
  "graph-unavailable": "Cobertura relacional no disponible", "outside-filter": "Fuera de los filtros actuales", "outside-graph": "No representado en el vecindario actual", visible: "Disponible en el contexto actual",
};
export function selectionAvailability(state: InvestigationState, snapshot: InventorySnapshot | null, graphNodeIds?: readonly string[]): SelectionAvailability {
  if (!state.selectedId) return "none";
  if (!snapshot) return "source-unavailable";
  if (!snapshot.assets.some(asset => asset.id === state.selectedId)) return "missing";
  const matching = explore(snapshot, { ...state, page: 1, pageSize: Math.max(1, snapshot.assets.length) });
  if (!matching.rows.some(asset => asset.id === state.selectedId)) return "outside-filter";
  if (state.view === "graph" && !graphNodeIds) return "graph-unavailable";
  if (state.view === "graph" && graphNodeIds && !graphNodeIds.includes(state.selectedId)) return "outside-graph";
  return "visible";
}
