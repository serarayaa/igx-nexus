import {
  knownTechnologyRoles,
  taxonomyClassificationStates,
  technologyAssetClasses,
  type TaxonomyClassificationState,
  type TechnologyAssetClass,
  type TechnologyRole,
} from "@igx-nexus/types";
import type {
  Asset,
  AssetCriticality,
  Domain,
  InventoryProvider,
  InventorySnapshot,
  Lifecycle,
} from "./asset-model";

interface CanonicalIdentifier {
  readonly kind: string;
  readonly value: string;
}

interface CanonicalSourceReference {
  readonly source: string;
  readonly observedAt: string;
}

interface CanonicalAsset {
  readonly id: string;
  readonly displayName: string;
  readonly domain: Domain;
  readonly assetClass: TechnologyAssetClass;
  readonly role: TechnologyRole;
  readonly lifecycle: Lifecycle;
  readonly criticality: AssetCriticality;
  readonly identifiers: readonly CanonicalIdentifier[];
  readonly sourceReferences: readonly CanonicalSourceReference[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

interface CanonicalSnapshot {
  readonly asOf: string;
  readonly assets: readonly CanonicalAsset[];
}

const canonicalLifecycles = new Set<Lifecycle>([
  "planned",
  "in_stock",
  "active",
  "maintenance",
  "repair",
  "retired",
  "disposed",
  "unknown",
]);
const canonicalCriticalities = new Set<AssetCriticality>(["low", "medium", "high", "critical", "unknown"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid canonical field: ${field}`);
  return value;
}

function parseIdentifiers(value: unknown): readonly CanonicalIdentifier[] {
  if (!Array.isArray(value)) throw new Error("Invalid canonical identifiers");
  return value.map((item) => {
    if (!isRecord(item)) throw new Error("Invalid canonical identifier");
    return Object.freeze({
      kind: requiredString(item.kind, "identifier.kind"),
      value: requiredString(item.value, "identifier.value"),
    });
  });
}

function parseSources(value: unknown): readonly CanonicalSourceReference[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Canonical asset requires sourceReferences");
  return value.map((item) => {
    if (!isRecord(item)) throw new Error("Invalid canonical source reference");
    return Object.freeze({
      source: requiredString(item.source, "source.source"),
      observedAt: requiredString(item.observedAt, "source.observedAt"),
    });
  });
}

function parseCanonicalAsset(value: unknown): CanonicalAsset {
  if (!isRecord(value)) throw new Error("Invalid canonical asset");
  const domain = requiredString(value.domain, "asset.domain");
  if (domain !== "IT" && domain !== "OT") throw new Error("Unsupported canonical domain");
  const assetClass = requiredString(value.assetClass, "asset.assetClass") as TechnologyAssetClass;
  if (!technologyAssetClasses.includes(assetClass)) throw new Error("Unsupported canonical asset class");
  const role = requiredString(value.role, "asset.role") as TechnologyRole;
  if (!knownTechnologyRoles.includes(role as (typeof knownTechnologyRoles)[number]) && !role.startsWith("custom:")) {
    throw new Error("Unsupported canonical role");
  }
  const lifecycle = requiredString(value.lifecycle, "asset.lifecycle") as Lifecycle;
  if (!canonicalLifecycles.has(lifecycle)) throw new Error("Unsupported canonical lifecycle");
  const criticality = requiredString(value.criticality, "asset.criticality") as AssetCriticality;
  if (!canonicalCriticalities.has(criticality)) throw new Error("Unsupported canonical criticality");
  if (!isRecord(value.attributes)) throw new Error("Invalid canonical attributes");

  return Object.freeze({
    id: requiredString(value.id, "asset.id"),
    displayName: requiredString(value.displayName, "asset.displayName"),
    domain,
    assetClass,
    role,
    lifecycle,
    criticality,
    identifiers: parseIdentifiers(value.identifiers),
    sourceReferences: parseSources(value.sourceReferences),
    attributes: value.attributes,
  });
}

function parseCanonicalSnapshot(value: unknown): CanonicalSnapshot {
  if (!isRecord(value)) throw new Error("Invalid canonical snapshot");
  const asOf = requiredString(value.asOf, "snapshot.asOf");
  if (!Array.isArray(value.assets)) throw new Error("Invalid canonical assets collection");
  return Object.freeze({
    asOf,
    assets: Object.freeze(value.assets.map(parseCanonicalAsset)),
  });
}

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
    taxonomyState: taxonomyState(asset),
    taxonomyReviewRequired: taxonomyReviewRequired(asset),
    taxonomyCompatibilityFallback: attributeBoolean(asset, "nexus.taxonomy.compatibilityProjection") === true,
    owner: null,
    location: attributeString(asset, "glpi.location.name"),
    lastSeen: attributeString(asset, "glpi.lastInventoryUpdate"),
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
  });
}

export function projectCanonicalSnapshot(value: unknown): InventorySnapshot {
  const snapshot = parseCanonicalSnapshot(value);
  return Object.freeze({
    asOf: snapshot.asOf,
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
  return projectCanonicalSnapshot(await response.json());
};
