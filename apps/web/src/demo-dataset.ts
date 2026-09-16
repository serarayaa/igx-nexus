import {
  DEMO_AS_OF,
  DEMO_DATASET_VERSION,
  createCanonicalDemoSnapshot,
  demoHeroes as sharedDemoHeroes,
  demoRelationshipFixtures,
  demoSites as sharedDemoSites,
  type DemoHero as SharedDemoHero,
} from "../../../packages/demo-data/index.mjs";
import type { TechnologyAsset, TechnologyAttributeValue } from "@igx-nexus/types";
import type { Asset, AssetType, InventorySnapshot, Lifecycle } from "./asset-model";
import type { Relationship, RelationshipSnapshot } from "./relationship-model";

export { DEMO_AS_OF, DEMO_DATASET_VERSION };
export const demoSites = sharedDemoSites;
export type DemoHero = SharedDemoHero;
export const demoHeroes: readonly DemoHero[] = sharedDemoHeroes;

const assetTypes = new Set<AssetType>(["Computer", "NetworkEquipment", "Phone", "Monitor", "Printer"]);
const canonicalLifecycleToLegacy = new Map<string, Lifecycle>([
  ["active", "assigned"],
  ["in_stock", "stock"],
  ["repair", "repair"],
  ["retired", "retired"],
  ["planned", "planned"],
  ["maintenance", "maintenance"],
  ["disposed", "disposed"],
  ["unknown", "unknown"],
]);

function scalarAttribute(asset: TechnologyAsset, key: string): TechnologyAttributeValue | undefined {
  return asset.attributes[key];
}

function stringAttribute(asset: TechnologyAsset, key: string): string | null {
  const value = scalarAttribute(asset, key);
  return typeof value === "string" ? value : null;
}

function booleanAttribute(asset: TechnologyAsset, key: string): boolean {
  return scalarAttribute(asset, key) === true;
}

function identifier(asset: TechnologyAsset, kind: string): string | null {
  return asset.identifiers.find((candidate) => candidate.kind === kind)?.value ?? null;
}

function legacyType(asset: TechnologyAsset): AssetType {
  const value = stringAttribute(asset, "demo.legacyItemType");
  if (!value || !assetTypes.has(value as AssetType)) {
    throw new Error(`Unsupported demo legacy item type for ${asset.id}`);
  }
  return value as AssetType;
}

function legacyLifecycle(asset: TechnologyAsset): Lifecycle {
  const value = canonicalLifecycleToLegacy.get(asset.lifecycle);
  if (!value) throw new Error(`Unsupported demo lifecycle for ${asset.id}: ${asset.lifecycle}`);
  return value;
}

function projectAsset(asset: TechnologyAsset): Asset {
  return Object.freeze({
    id: asset.id,
    type: legacyType(asset),
    name: asset.displayName,
    hostname: identifier(asset, "hostname"),
    serial: identifier(asset, "serial_number"),
    assetTag: identifier(asset, "asset_tag"),
    manufacturer: stringAttribute(asset, "demo.manufacturer"),
    model: stringAttribute(asset, "demo.model"),
    ipAddress: identifier(asset, "ip_address"),
    domain: asset.domain,
    location: stringAttribute(asset, "demo.location"),
    lifecycle: legacyLifecycle(asset),
    owner: stringAttribute(asset, "demo.owner"),
    critical: booleanAttribute(asset, "demo.critical"),
    lastSeen: stringAttribute(asset, "demo.lastSeen"),
    warrantyEnds: stringAttribute(asset, "demo.warrantyEnds"),
  });
}

function projectRelationship(relationship: (typeof demoRelationshipFixtures)[number]): Relationship {
  return Object.freeze({
    id: relationship.id,
    sourceId: relationship.sourceId,
    targetId: relationship.targetId,
    type: relationship.type,
    direction: relationship.direction,
    status: relationship.status,
    source: relationship.source,
    observedAt: relationship.observedAt,
  });
}

export function createDemoDataset(): { readonly inventory: InventorySnapshot; readonly relationships: RelationshipSnapshot } {
  const canonical = createCanonicalDemoSnapshot();
  const assets = canonical.assets.map(projectAsset);
  const relationships = demoRelationshipFixtures.map(projectRelationship);
  return Object.freeze({
    inventory: Object.freeze({ asOf: DEMO_AS_OF, assets: Object.freeze(assets) }),
    relationships: Object.freeze({ asOf: DEMO_AS_OF, relationships: Object.freeze(relationships) }),
  });
}

export const demoDataset = createDemoDataset();
