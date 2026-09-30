export const assetSections = ["summary", "inventory", "evidence", "relationships"] as const;
export type AssetSection = (typeof assetSections)[number];

export const technologyMapRelationshipTypes = ["all", "depends_on", "uses", "connected_to"] as const;
export type TechnologyMapRelationshipType = (typeof technologyMapRelationshipTypes)[number];
export const technologyMapPerspectives = ["all", "upstream", "downstream", "peer"] as const;
export type TechnologyMapPerspective = (typeof technologyMapPerspectives)[number];

export interface TechnologyMapState {
  readonly depth: 1 | 2;
  readonly type: TechnologyMapRelationshipType;
  readonly perspective: TechnologyMapPerspective;
  readonly selectedId: string | null;
}

export const defaultTechnologyMapState: TechnologyMapState = {
  depth: 2,
  type: "all",
  perspective: "all",
  selectedId: null,
};

export type AppRoute =
  | { readonly view: "dashboard" }
  | { readonly view: "assets" }
  | { readonly view: "health" }
  | { readonly view: "lifecycle" }
  | { readonly view: "asset"; readonly assetId: string; readonly section: AssetSection }
  | { readonly view: "relations"; readonly assetId: string; readonly mapState: TechnologyMapState }
  | { readonly view: "label"; readonly assetId: string }
  | { readonly view: "qr"; readonly locator: string };

const dashboardHashes = new Set([
  "",
  "#overview",
  "#quality",
  "#next-views",
]);

function decodeSegment(value: string): string | null {
  if (!value || value.includes("/")) return null;
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

function assetSection(value: string | null): AssetSection {
  return assetSections.includes(value as AssetSection) ? value as AssetSection : "summary";
}

function technologyMapState(query: string): TechnologyMapState {
  const params = new URLSearchParams(query);
  const depth = params.get("depth") === "1" ? 1 : 2;
  const typeValue = params.get("type");
  const perspectiveValue = params.get("perspective");
  const selectedValue = params.get("selected");
  const type = technologyMapRelationshipTypes.includes(typeValue as TechnologyMapRelationshipType)
    ? typeValue as TechnologyMapRelationshipType
    : "all";
  const perspective = technologyMapPerspectives.includes(perspectiveValue as TechnologyMapPerspective)
    ? perspectiveValue as TechnologyMapPerspective
    : "all";
  const selectedId = selectedValue ? decodeSegment(selectedValue) : null;
  return { depth, type, perspective, selectedId };
}

export function routeFromHash(hash: string): AppRoute | null {
  if (dashboardHashes.has(hash)) return { view: "dashboard" };
  if (hash === "#health") return { view: "health" };
  if (hash === "#lifecycle") return { view: "lifecycle" };
  if (hash === "#assets") return { view: "assets" };

  const qrPrefix = "#q/";
  if (hash.startsWith(qrPrefix)) {
    const locator = decodeSegment(hash.slice(qrPrefix.length));
    return locator ? { view: "qr", locator } : null;
  }

  const assetPrefix = "#assets/";
  if (!hash.startsWith(assetPrefix)) return null;
  const remainder = hash.slice(assetPrefix.length);
  const [pathPart = "", query = ""] = remainder.split("?", 2);

  const labelSuffix = "/label";
  if (pathPart.endsWith(labelSuffix)) {
    const assetId = decodeSegment(pathPart.slice(0, -labelSuffix.length));
    return assetId ? { view: "label", assetId } : null;
  }

  const relationsSuffix = "/relations";
  if (pathPart.endsWith(relationsSuffix)) {
    const assetId = decodeSegment(pathPart.slice(0, -relationsSuffix.length));
    return assetId ? { view: "relations", assetId, mapState: technologyMapState(query) } : null;
  }

  const assetId = decodeSegment(pathPart);
  if (!assetId) return null;
  const params = new URLSearchParams(query);
  return { view: "asset", assetId, section: assetSection(params.get("section")) };
}

export function assetHash(assetId: string): string {
  return `#assets/${encodeURIComponent(assetId)}`;
}

export function assetSectionHash(assetId: string, section: AssetSection): string {
  return section === "summary" ? assetHash(assetId) : `${assetHash(assetId)}?section=${section}`;
}

export function labelHash(assetId: string): string {
  return `${assetHash(assetId)}/label`;
}

export function relationsHash(assetId: string, state: TechnologyMapState = defaultTechnologyMapState): string {
  const base = `${assetHash(assetId)}/relations`;
  const params = new URLSearchParams();
  if (state.depth !== defaultTechnologyMapState.depth) params.set("depth", String(state.depth));
  if (state.type !== defaultTechnologyMapState.type) params.set("type", state.type);
  if (state.perspective !== defaultTechnologyMapState.perspective) params.set("perspective", state.perspective);
  if (state.selectedId && state.selectedId !== assetId) params.set("selected", state.selectedId);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** Ruta interna que simula el resolver para la demo; NO es el payload del QR físico. */
export function demoQrHash(locator: string): string {
  return `#q/${encodeURIComponent(locator)}`;
}
