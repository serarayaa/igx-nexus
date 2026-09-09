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
  let frontier = new Set([focusId]);

  for (let level = 0; level < filters.depth; level += 1) {
    const next = new Set<string>();
    for (const relationship of candidates) {
      for (const fromId of frontier) {
        if (!canTraverse(relationship, fromId, filters.perspective)) continue;
        const endpoint = otherEndpoint(relationship, fromId);
        if (endpoint && !reached.has(endpoint)) next.add(endpoint);
      }
    }
    next.forEach((id) => reached.add(id));
    frontier = next;
  }

  const relationships = candidates.filter((relationship) =>
    reached.has(relationship.sourceId) && reached.has(relationship.targetId)
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

export function relationshipSentence(
  relationship: Relationship,
  assets: ReadonlyMap<string, Asset>,
): string {
  const source = assets.get(relationship.sourceId)?.name ?? `CI no disponible ${relationship.sourceId}`;
  const target = assets.get(relationship.targetId)?.name ?? `CI no disponible ${relationship.targetId}`;
  return `${source} ${relationshipTypeLabels[relationship.type]} ${target}`;
}
