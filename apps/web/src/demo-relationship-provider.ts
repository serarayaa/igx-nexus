import { relationshipsWithinDepth, type RelationshipProvider, type RelationshipInventoryProvider } from "./relationship-model";

import { demoDataset } from "./demo-dataset";

export const demoRelationships = demoDataset.relationships.relationships;
export const demoRelationshipSnapshot = demoDataset.relationships;

export const demoRelationshipProvider: RelationshipProvider = async (query, signal) => {
  signal.throwIfAborted();
  return {
    asOf: demoRelationshipSnapshot.asOf,
    relationships: relationshipsWithinDepth(demoRelationships, query.assetId, query.depth),
  };
};

/** Full snapshot; shares fixtures with the graph and does not issue n per-CI requests. */
export const demoRelationshipInventoryProvider: RelationshipInventoryProvider = async (signal) => {
  signal.throwIfAborted();
  return demoRelationshipSnapshot;
};
