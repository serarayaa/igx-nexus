import {
  parseTechnologySnapshot,
  TechnologyContractError,
  isIsoTimestamp,
  taxonomyClassificationStates,
  type TaxonomyClassificationState,
  type TechnologyAsset,
} from "@igx-nexus/types";
import { summarizeTaxonomy, type Asset, type InventoryProvider, type InventorySnapshot } from "./asset-model";

type CanonicalAsset = TechnologyAsset;

function identifier(asset: CanonicalAsset, kind: string): string | null {
  return asset.identifiers.find((candidate) => candidate.kind === kind)?.value ?? null;
}

function attributeString(asset: CanonicalAsset, key: string): string | null {
  const value = asset.attributes[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function attributeBoolean(asset: CanonicalAsset, key: string): boolean | null {
  const value = asset.attributes[key];
  return typeof value === "boolean" ? value : null;
}

function attributeTimestamp(asset: CanonicalAsset, key: string): string | null {
  const value = asset.attributes[key];
  return typeof value === "string" && isIsoTimestamp(value) ? value : null;
}

function taxonomyState(asset: CanonicalAsset): TaxonomyClassificationState {
  const states = [
    attributeString(asset, "nexus.taxonomy.domain.state"),
    attributeString(asset, "nexus.taxonomy.assetClass.state"),
    attributeString(asset, "nexus.taxonomy.role.state"),
  ].filter((value): value is TaxonomyClassificationState =>
    value !== null && taxonomyClassificationStates.includes(value as TaxonomyClassificationState));

  if (states.includes("conflict")) return "conflict";
  if (states.includes("unclassified")) return "unclassified";
  if (states.includes("unknown")) return "unknown";
  return states.length === 3 && states.every(state => state === "classified") ? "classified" : "unknown";
}

function taxonomyReviewRequired(asset: CanonicalAsset): boolean {
  const values = [
    attributeBoolean(asset, "nexus.taxonomy.domain.reviewRequired"),
    attributeBoolean(asset, "nexus.taxonomy.assetClass.reviewRequired"),
    attributeBoolean(asset, "nexus.taxonomy.role.reviewRequired"),
  ];
  // Sólo declaramos "sin revisión" cuando las tres dimensiones lo dicen explícitamente.
  return !values.every(value => value === false);
}

function mapCanonicalAsset(asset: CanonicalAsset): Asset {
  const itemType = attributeString(asset, "glpi.itemType");
  if (itemType !== "Computer") throw new Error("Live Asset 360 currently supports only GLPI Computer assets");
  const sourceSystems = Object.freeze([...new Set(asset.sourceReferences.map((source) => source.source))]);
  const sourceObservedAt = asset.sourceReferences[0]?.observedAt ?? null;

  const assessment = asset.taxonomy ? summarizeTaxonomy(asset.taxonomy) : null;
  const lastInventory = attributeTimestamp(asset, "glpi.lastInventoryUpdate");
  return Object.freeze({
    id: asset.id,
    name: asset.displayName,
    type: "Computer",
    domain: asset.domain,
    lifecycle: asset.lifecycle,
    critical: asset.criticality === "high" || asset.criticality === "critical",
    criticality: asset.criticality,
    assetClass: asset.assetClass,
    role: asset.role,
    taxonomyState: assessment?.state ?? taxonomyState(asset),
    taxonomyReviewRequired: assessment?.reviewRequired ?? taxonomyReviewRequired(asset),
    // Historical attribute summaries apply only when the canonical assessment is absent.
    // An unresolved canonical assessment remains visibly unresolved.
    taxonomyCompatibilityFallback: assessment ? assessment.state !== "classified" : attributeBoolean(asset, "nexus.taxonomy.compatibilityProjection") === true,
    ...(asset.taxonomy ? { taxonomy: asset.taxonomy } : {}),
    ...(asset.operationalContexts ? { operationalContexts: Object.freeze(asset.operationalContexts.map(context =>
      Object.freeze({ ...context, displayName: context.displayName ?? null }))) } : {}),
    owner: null,
    location: attributeString(asset, "glpi.location.name"),
    lastSeen: lastInventory,
    warrantyEnds: null,
    hostname: identifier(asset, "hostname"),
    serial: identifier(asset, "serial_number"),
    assetTag: identifier(asset, "asset_tag"),
    manufacturer: attributeString(asset, "glpi.manufacturer.name"),
    model: attributeString(asset, "glpi.model.name"),
    ipAddress: identifier(asset, "ip_address"),
    dataMode: "live",
    sourceSystems,
    sourceObservedAt,
    sourceReferences: Object.freeze(asset.sourceReferences.map(source => Object.freeze({
      ...source,
    }))),
  });
}

export function projectCanonicalSnapshot(value: unknown): InventorySnapshot {
  const snapshot = parseTechnologySnapshot(value);
  return Object.freeze({
    asOf: snapshot.asOf,
    canonical: snapshot,
    assets: Object.freeze(snapshot.assets.map(mapCanonicalAsset)),
  });
}

export const liveProvider: InventoryProvider = async (signal) => {
  const response = await fetch("/api/v1/technology/snapshot", {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new Error(`NEXUS API snapshot request failed with HTTP ${response.status}`);
  try {
    return projectCanonicalSnapshot(await response.json());
  } catch (error) {
    if (error instanceof TechnologyContractError) {
      console.warn("NEXUS technology contract rejected", { code: error.code, path: error.path });
    }
    throw error; // Existing ErrorState/retry handles the rejected provider promise.
  }
};
