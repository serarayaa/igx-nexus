import type { Asset, AssetType, InventorySnapshot } from "./asset-model";

export const relationshipTypes = ["depends_on", "uses", "connected_to"] as const;
export type RelationshipType = (typeof relationshipTypes)[number];
export type RelationshipDirection = "directed" | "bidirectional";
export type RelationshipStatus = "active" | "degraded" | "unknown";
export type RelationshipPerspective = "all" | "upstream" | "downstream" | "peer";

export interface Relationship {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly type: RelationshipType;
  readonly direction: RelationshipDirection;
  readonly status: RelationshipStatus;
  readonly source: "demo";
  readonly observedAt: string | null;
}

export interface RelationshipSnapshot {
  readonly asOf: string;
  readonly relationships: readonly Relationship[];
}

export interface RelationshipQuery {
  readonly assetId: string;
  readonly depth: 1 | 2;
}

export type RelationshipProvider = (
  query: RelationshipQuery,
  signal: AbortSignal,
) => Promise<RelationshipSnapshot>;

export const relationshipTypeLabels: Record<RelationshipType, string> = {
  depends_on: "depende de",
  uses: "usa",
  connected_to: "conectado con",
};

export const relationshipTypeNouns: Record<RelationshipType, string> = {
  depends_on: "Dependencia",
  uses: "Uso",
  connected_to: "Conectividad",
};

export const assetTypeShortLabels: Record<AssetType, string> = {
  Computer: "PC",
  NetworkEquipment: "RED",
  Phone: "TEL",
  Monitor: "MON",
  Printer: "IMP",
};

export function validateRelationship(relationship: Relationship): readonly string[] {
  const errors: string[] = [];
  if (!relationship.id.trim()) errors.push("relationship.id is required");
  if (!relationship.sourceId.trim()) errors.push("relationship.sourceId is required");
  if (!relationship.targetId.trim()) errors.push("relationship.targetId is required");
  if (relationship.sourceId === relationship.targetId) errors.push("self relationships are not supported");
  if (relationship.type === "connected_to" && relationship.direction !== "bidirectional") {
    errors.push("connected_to must be bidirectional");
  }
  if (relationship.type !== "connected_to" && relationship.direction !== "directed") {
    errors.push(`${relationship.type} must be directed`);
  }
  return errors;
}

export function perspectiveFrom(
  relationship: Relationship,
  assetId: string,
): Exclude<RelationshipPerspective, "all"> | null {
  if (relationship.sourceId !== assetId && relationship.targetId !== assetId) return null;
  if (relationship.direction === "bidirectional") return "peer";
  return relationship.sourceId === assetId ? "upstream" : "downstream";
}

export function otherEndpoint(relationship: Relationship, assetId: string): string | null {
  if (relationship.sourceId === assetId) return relationship.targetId;
  if (relationship.targetId === assetId) return relationship.sourceId;
  return null;
}

export interface RelationshipFilters {
  readonly type: RelationshipType | "all";
  readonly perspective: RelationshipPerspective;
  readonly depth: 1 | 2;
}

export interface RelationshipGraphModel {
  readonly assets: ReadonlyMap<string, Asset>;
  readonly nodeIds: readonly string[];
  readonly relationships: readonly Relationship[];
  readonly unresolvedIds: readonly string[];
}

/** Selects the complete topological neighborhood requested by a provider. */
export function relationshipsWithinDepth(
  relationships: readonly Relationship[],
  assetId: string,
  depth: 1 | 2,
): readonly Relationship[] {
  const reached = new Set([assetId]);
  let frontier = new Set([assetId]);

  for (let level = 0; level < depth; level += 1) {
    const next = new Set<string>();
    for (const relationship of relationships) {
      for (const fromId of frontier) {
        const endpoint = otherEndpoint(relationship, fromId);
        if (endpoint && !reached.has(endpoint)) next.add(endpoint);
      }
    }
    next.forEach((id) => reached.add(id));
    frontier = next;
  }

  return relationships.filter((relationship) =>
    reached.has(relationship.sourceId) && reached.has(relationship.targetId)
  );
}

function canTraverse(
  relationship: Relationship,
  fromId: string,
  perspective: RelationshipPerspective,
): boolean {
  if (perspective === "all") return true;
  if (perspective === "peer") return relationship.direction === "bidirectional";
  if (relationship.direction === "bidirectional") return false;
  if (perspective === "upstream") return relationship.sourceId === fromId;
  return relationship.targetId === fromId;
}

/** Builds a bounded neighborhood without coupling the domain to visual coordinates. */
export function buildRelationshipGraph(
  inventory: InventorySnapshot,
  snapshot: RelationshipSnapshot,
  focusId: string,
  filters: RelationshipFilters,
): RelationshipGraphModel {
  const candidates = snapshot.relationships.filter((relationship) =>
    filters.type === "all" || relationship.type === filters.type
  );
  const reached = new Set([focusId]);
  const traversed = new Set<string>();
  let frontier = new Set([focusId]);

  for (let level = 0; level < filters.depth; level += 1) {
    const next = new Set<string>();
    for (const relationship of candidates) {
      for (const fromId of frontier) {
        if (!canTraverse(relationship, fromId, filters.perspective)) continue;
        const endpoint = otherEndpoint(relationship, fromId);
        if (endpoint) {
          traversed.add(relationship.id);
          if (!reached.has(endpoint)) next.add(endpoint);
        }
      }
    }
    next.forEach((id) => reached.add(id));
    frontier = next;
  }

  const relationships = candidates.filter((relationship) =>
    reached.has(relationship.sourceId) &&
    reached.has(relationship.targetId) &&
    (filters.perspective === "all" || traversed.has(relationship.id))
  );
  const assets = new Map(inventory.assets.map((asset) => [asset.id, asset]));
  const nodeIds = [...reached].sort((left, right) => {
    if (left === focusId) return -1;
    if (right === focusId) return 1;
    return left.localeCompare(right);
  });
  const unresolvedIds = nodeIds.filter((id) => !assets.has(id));
  return { assets, nodeIds, relationships, unresolvedIds };
}

export interface GraphPosition { readonly id: string; readonly x: number; readonly y: number }
export interface EdgeEndpoints {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Deterministic radial layout for the intentionally small v0.1 neighborhood. */
export function layoutRelationshipGraph(nodeIds: readonly string[], focusId: string): readonly GraphPosition[] {
  const others = nodeIds.filter((id) => id !== focusId).sort();
  const positions: GraphPosition[] = [{ id: focusId, x: 50, y: 50 }];
  others.forEach((id, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(others.length, 1);
    positions.push({
      id,
      x: Number((50 + 38 * Math.cos(angle)).toFixed(3)),
      y: Number((50 + 36 * Math.sin(angle)).toFixed(3)),
    });
  });
  return positions;
}

/**
 * Clips a center-to-center edge against conceptual node bounds in SVG space.
 * The approximation is stable across themes and avoids runtime DOM measurement.
 */
export function relationshipEdgeEndpoints(
  source: GraphPosition,
  target: GraphPosition,
  halfWidth = 9,
  halfHeight = 8,
): EdgeEndpoints {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  if (dx === 0 && dy === 0) throw new RangeError("relationship edge requires distinct positions");
  if (!(halfWidth > 0) || !(halfHeight > 0)) throw new RangeError("node bounds must be positive");

  const intersectionScale = Math.min(
    dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx),
    dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy),
  );
  const scale = Math.min(intersectionScale, 0.49);
  const clamp = (value: number) => Math.max(0, Math.min(100, Number(value.toFixed(3))));

  return {
    x1: clamp(source.x + dx * scale),
    y1: clamp(source.y + dy * scale),
    x2: clamp(target.x - dx * scale),
    y2: clamp(target.y - dy * scale),
  };
}

export function relationshipSentence(
  relationship: Relationship,
  assets: ReadonlyMap<string, Asset>,
): string {
  const source = assets.get(relationship.sourceId)?.name ?? `CI no disponible ${relationship.sourceId}`;
  const target = assets.get(relationship.targetId)?.name ?? `CI no disponible ${relationship.targetId}`;
  return `${source} ${relationshipTypeLabels[relationship.type]} ${target}`;
}
