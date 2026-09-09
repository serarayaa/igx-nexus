import { relationshipsWithinDepth, type Relationship, type RelationshipProvider, type RelationshipSnapshot } from "./relationship-model";

// Escenario pequeño y exclusivamente sintético; no representa topología corporativa.
export const demoRelationships: readonly Relationship[] = [
  { id: "DEMO-REL-001", sourceId: "DEMO-0002", targetId: "DEMO-0003", type: "depends_on", direction: "directed", status: "active", source: "demo", observedAt: "2026-09-09T12:00:00.000Z" },
  { id: "DEMO-REL-002", sourceId: "DEMO-0002", targetId: "DEMO-0005", type: "uses", direction: "directed", status: "active", source: "demo", observedAt: "2026-09-09T12:00:00.000Z" },
  { id: "DEMO-REL-003", sourceId: "DEMO-0006", targetId: "DEMO-0003", type: "connected_to", direction: "bidirectional", status: "active", source: "demo", observedAt: "2026-09-09T12:00:00.000Z" },
  { id: "DEMO-REL-004", sourceId: "DEMO-0008", targetId: "DEMO-0003", type: "depends_on", direction: "directed", status: "active", source: "demo", observedAt: "2026-09-09T12:00:00.000Z" },
  { id: "DEMO-REL-005", sourceId: "DEMO-0008", targetId: "DEMO-0011", type: "uses", direction: "directed", status: "active", source: "demo", observedAt: "2026-09-09T12:00:00.000Z" },
  { id: "DEMO-REL-006", sourceId: "DEMO-0012", targetId: "DEMO-0003", type: "connected_to", direction: "bidirectional", status: "degraded", source: "demo", observedAt: "2026-09-08T12:00:00.000Z" },
];

export const demoRelationshipSnapshot: RelationshipSnapshot = {
  asOf: "2026-09-09T12:00:00.000Z",
  relationships: demoRelationships,
};

export const demoRelationshipProvider: RelationshipProvider = async (query, signal) => {
  signal.throwIfAborted();
  return {
    asOf: demoRelationshipSnapshot.asOf,
    relationships: relationshipsWithinDepth(demoRelationships, query.assetId, query.depth),
  };
};
