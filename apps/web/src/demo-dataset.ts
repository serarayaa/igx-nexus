import {
  DEMO_AS_OF,
  DEMO_DATASET_VERSION,
  createCanonicalDemoSnapshot,
  demoHeroes as sharedDemoHeroes,
  demoRelationshipFixtures,
  demoSites as sharedDemoSites,
  type DemoHero as SharedDemoHero,
} from "../../../packages/demo-data/index.mjs";
import type { TechnologyAsset, TechnologyAttributeValue, TechnologyRelationship } from "@igx-nexus/types";
import { summarizeTaxonomy, type Asset, type AssetType, type InventorySnapshot, type Lifecycle } from "./asset-model";
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
  const taxonomy = summarizeTaxonomy(asset.taxonomy);
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
    dataMode: "demo",
    criticality: asset.criticality,
    assetClass: asset.assetClass,
    role: asset.role,
    taxonomyState: taxonomy.state,
    taxonomyReviewRequired: taxonomy.reviewRequired,
    taxonomyCompatibilityFallback: false,
    operationalContexts: Object.freeze((asset.operationalContexts ?? []).map(context => Object.freeze({
      id: context.id,
      kind: context.kind,
      displayName: context.displayName ?? null,
    }))),
    sourceSystems: Object.freeze([...new Set(asset.sourceReferences.map(source => source.source))]),
    sourceObservedAt: asset.sourceReferences[0]?.observedAt ?? null,
    sourceReferences: Object.freeze(asset.sourceReferences.map(source => Object.freeze({
      source: source.source,
      observedAt: source.observedAt ?? null,
    }))),
  });
}

function legacyRelationshipType(value: TechnologyRelationship["type"]): Relationship["type"] {
  switch (value) {
    case "depends_on":
    case "uses":
    case "connected_to":
      return value;
    default:
      throw new Error(`Unsupported Web v0.1 relationship type: ${value}`);
  }
}

function legacyRelationshipStatus(value: TechnologyRelationship["status"]): Relationship["status"] {
  switch (value) {
    case "active":
    case "degraded":
    case "unknown":
      return value;
    default:
      throw new Error(`Unsupported Web v0.1 relationship status: ${value}`);
  }
}

function projectRelationship(relationship: TechnologyRelationship): Relationship {
  const hasDemoEvidence = relationship.evidence.some((record) => record.source.source === "demo");
  if (!hasDemoEvidence) throw new Error(`Demo relationship ${relationship.id} is missing demo evidence`);

  return Object.freeze({
    id: relationship.id,
    sourceId: relationship.sourceAssetId,
    targetId: relationship.targetAssetId,
    type: legacyRelationshipType(relationship.type),
    direction: relationship.direction,
    status: legacyRelationshipStatus(relationship.status),
    source: "demo",
    observedAt: relationship.observedAt,
  });
}

export function createDemoDataset(): { readonly inventory: InventorySnapshot; readonly relationships: RelationshipSnapshot } {
  const canonical = createCanonicalDemoSnapshot();
  const assets = canonical.assets.map(projectAsset);
  const relationships = canonical.relationships.map(projectRelationship);
  return Object.freeze({
    inventory: Object.freeze({ asOf: DEMO_AS_OF, assets: Object.freeze(assets) }),
    relationships: Object.freeze({ asOf: DEMO_AS_OF, relationships: Object.freeze(relationships) }),
  });
}

export const demoDataset = createDemoDataset();

/**
 * Projection exacta de los campos históricos v0.1. Permite evolucionar el modelo Web
 * con metadata canónica sin perder la regresión del catálogo legacy revisado.
 */
export function legacyDemoDatasetProjection(dataset = demoDataset) {
  return {
    inventory: {
      asOf: dataset.inventory.asOf,
      assets: dataset.inventory.assets.map(asset => ({
        id: asset.id,
        type: asset.type,
        name: asset.name,
        hostname: asset.hostname,
        serial: asset.serial,
        assetTag: asset.assetTag,
        manufacturer: asset.manufacturer,
        model: asset.model,
        ipAddress: asset.ipAddress,
        domain: asset.domain,
        location: asset.location,
        lifecycle: asset.lifecycle,
        owner: asset.owner,
        critical: asset.critical,
        lastSeen: asset.lastSeen,
        warrantyEnds: asset.warrantyEnds,
      })),
    },
    relationships: dataset.relationships,
  };
}
