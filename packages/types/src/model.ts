export const technologySchemaVersion = "0.2" as const;
export type TechnologySchemaVersion = typeof technologySchemaVersion;

export const technologyTaxonomyVersion = "2" as const;
export type TechnologyTaxonomyVersion = typeof technologyTaxonomyVersion;

/**
 * Domain expresa el dominio tecnológico, no el estado de clasificación.
 * `unknown`, `unclassified` y equivalentes pertenecen a TaxonomyDecision.
 */
export const technologyDomains = ["IT", "OT"] as const;
export type TechnologyDomain = (typeof technologyDomains)[number];

export const itTechnologyAssetClasses = [
  "endpoint",
  "server",
  "network_device",
  "storage",
  "printer",
  "mobile_device",
  "virtual_compute",
  "infrastructure_appliance",
  "peripheral",
  "application",
] as const;

export const otTechnologyAssetClasses = [
  "controller",
  "operator_interface",
  "industrial_compute",
  "industrial_network_device",
  "field_device",
  "protection_device",
  "metering_device",
  "industrial_gateway",
] as const;

export const technologyAssetClasses = [
  ...itTechnologyAssetClasses,
  ...otTechnologyAssetClasses,
] as const;
export type TechnologyAssetClass = (typeof technologyAssetClasses)[number];

/**
 * Role responde a la función que cumple un activo. No representa modelo comercial,
 * item type de una fuente ni subtipo físico (por ejemplo PLC/RTU).
 */
export const itTechnologyRoles = [
  "user_endpoint",
  "application_server",
  "database_server",
  "directory_service",
  "virtualization_host",
  "network_core",
  "network_distribution",
  "network_access",
  "network_security",
  "storage_service",
  "print_service",
  "infrastructure_service",
] as const;

export const otTechnologyRoles = [
  "engineering_workstation",
  "control",
  "supervision",
  "telemetry",
  "historian",
  "protection",
  "metering",
  "field_sensing",
  "field_actuation",
  "industrial_network",
  "industrial_security",
  "protocol_gateway",
] as const;

export const knownTechnologyRoles = [
  ...itTechnologyRoles,
  ...otTechnologyRoles,
] as const;
export type KnownTechnologyRole = (typeof knownTechnologyRoles)[number];
export type TechnologyRole = KnownTechnologyRole | `custom:${string}`;

export const taxonomyClassificationStates = [
  "classified",
  "unknown",
  "unclassified",
  "conflict",
] as const;
export type TaxonomyClassificationState = (typeof taxonomyClassificationStates)[number];

export const taxonomyClassificationMethods = [
  "observed",
  "normalized",
  "inferred",
  "manual",
] as const;
export type TaxonomyClassificationMethod = (typeof taxonomyClassificationMethods)[number];

export interface ClassifiedTaxonomyDecision<T extends string> {
  readonly state: "classified";
  readonly value: T;
  readonly method: TaxonomyClassificationMethod;
  readonly reviewRequired: boolean;
  readonly ruleId: string;
  readonly reasonCode?: string;
}

export interface UnresolvedTaxonomyDecision {
  readonly state: "unknown" | "unclassified";
  readonly reviewRequired: true;
  readonly ruleId: string;
  readonly reasonCode: string;
}

export interface ConflictingTaxonomyDecision<T extends string> {
  readonly state: "conflict";
  readonly value?: T;
  readonly method?: TaxonomyClassificationMethod;
  readonly reviewRequired: true;
  readonly ruleId: string;
  readonly reasonCode: string;
}

/**
 * Un resultado de clasificación es explícito: puede producir un valor canónico,
 * permanecer sin clasificar o conservar un conflicto sin convertirlo en un hecho.
 */
export type TaxonomyDecision<T extends string> =
  | ClassifiedTaxonomyDecision<T>
  | UnresolvedTaxonomyDecision
  | ConflictingTaxonomyDecision<T>;

export interface TechnologyTaxonomyAssessment {
  readonly taxonomyVersion: TechnologyTaxonomyVersion;
  readonly domain: TaxonomyDecision<TechnologyDomain>;
  readonly assetClass: TaxonomyDecision<TechnologyAssetClass>;
  readonly role: TaxonomyDecision<TechnologyRole>;
}

export const operationalContextKinds = [
  "system",
  "service",
  "environment",
  "site",
  "network_segment",
  "security_zone",
] as const;
export type KnownOperationalContextKind = (typeof operationalContextKinds)[number];
export type OperationalContextKind = KnownOperationalContextKind | `custom:${string}`;

export const lifecycleStates = [
  "planned",
  "in_stock",
  "active",
  "maintenance",
  "repair",
  "retired",
  "disposed",
  "unknown",
] as const;
export type LifecycleState = (typeof lifecycleStates)[number];

export const criticalityLevels = ["low", "medium", "high", "critical", "unknown"] as const;
export type Criticality = (typeof criticalityLevels)[number];

export const knownSourceSystems = [
  "demo",
  "glpi",
  "intune",
  "entra",
  "windows",
  "dell",
  "defender",
  "manual",
  "import",
] as const;
export type KnownSourceSystem = (typeof knownSourceSystems)[number];
export type SourceSystem = KnownSourceSystem | `custom:${string}`;

export const authorityLevels = ["authoritative", "trusted", "observed", "inferred", "unknown"] as const;
export type AuthorityLevel = (typeof authorityLevels)[number];

/**
 * Identifica un registro en una fuente aguas arriba sin convertir esa clave en la
 * identidad canónica de NEXUS. `externalId` es opaco para el dominio.
 */
export interface SourceReference {
  readonly source: SourceSystem;
  readonly externalId: string;
  readonly entityType?: string;
  readonly sourceScope?: string;
  readonly observedAt: string;
  readonly authority: AuthorityLevel;
}

export const evidenceKinds = ["source_record", "event_log", "api_response", "document", "query", "url", "other"] as const;
export type EvidenceKind = (typeof evidenceKinds)[number];

export interface EvidenceReference {
  readonly kind: EvidenceKind;
  readonly reference: string;
  readonly label?: string;
  readonly observedAt?: string;
}

/** Procedencia de un claim o atributo normalizado. */
export interface ProvenanceRecord {
  readonly fieldPath: string;
  readonly source: SourceReference;
  readonly observedAt: string;
  readonly ingestedAt?: string;
  readonly authority: AuthorityLevel;
  /** Describe cómo NEXUS obtuvo el valor sin confundir derivación con autoridad. */
  readonly derivation?: TaxonomyClassificationMethod;
  readonly confidence?: number;
  readonly evidence?: readonly EvidenceReference[];
}

/**
 * Referencia a un contexto operacional. No convierte sitio, sistema o zona en un
 * TechnologyAsset y deja su entidad/relaciones completas para tickets posteriores.
 */
export interface OperationalContextReference {
  readonly id: string;
  readonly kind: OperationalContextKind;
  readonly displayName?: string;
  readonly source?: SourceReference;
}

export const assetIdentifierKinds = [
  "hostname",
  "serial_number",
  "asset_tag",
  "hardware_uuid",
  "bios_uuid",
  "mac_address",
  "imei",
  "ip_address",
] as const;
export type KnownAssetIdentifierKind = (typeof assetIdentifierKinds)[number];
export type AssetIdentifierKind = KnownAssetIdentifierKind | `custom:${string}`;

/**
 * Identificador observado. Puede aportar evidencia para reconciliación futura,
 * pero ninguno de estos valores reemplaza por sí solo a `TechnologyAsset.id`.
 */
export interface AssetIdentifier {
  readonly kind: AssetIdentifierKind;
  readonly value: string;
  readonly source?: SourceReference;
}

export type TechnologyScalar = string | number | boolean | null;
export type TechnologyAttributeValue = TechnologyScalar | readonly TechnologyScalar[];

/** Contrato canónico de un activo/CI dentro de IGX NEXUS. */
export interface TechnologyAsset {
  /** Identidad estable emitida por NEXUS, independiente de cualquier sistema fuente. */
  readonly id: string;
  readonly displayName: string;
  /** Proyección canónica resuelta. La incertidumbre previa vive en TechnologyTaxonomyAssessment. */
  readonly domain: TechnologyDomain;
  readonly assetClass: TechnologyAssetClass;
  readonly role: TechnologyRole;
  readonly lifecycle: LifecycleState;
  readonly criticality: Criticality;
  readonly operationalContexts: readonly OperationalContextReference[];
  readonly identifiers: readonly AssetIdentifier[];
  readonly sourceReferences: readonly SourceReference[];
  readonly attributes: Readonly<Record<string, TechnologyAttributeValue>>;
  readonly provenance: readonly ProvenanceRecord[];
}

export const observationCategories = ["metric", "event", "state"] as const;
export type ObservationCategory = (typeof observationCategories)[number];

export const knownObservationNames = [
  "battery.capacity.percent",
  "application.crash",
  "application.hang",
  "system.unexpected_restart",
  "system.stop_error_restart",
  "startup.duration.ms",
  "hardware.error",
  "storage.error",
  "whea.error",
  "lifecycle.observed",
] as const;
export type KnownObservationName = (typeof knownObservationNames)[number];
export type ObservationName = KnownObservationName | `custom:${string}`;

export type ObservationValue =
  | { readonly kind: "none" }
  | { readonly kind: "number"; readonly value: number; readonly unit?: string }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "boolean"; readonly value: boolean };

/** Señal temporal. No representa CMDB Health ni un Device Health score. */
export interface Observation {
  readonly id: string;
  readonly assetId: string;
  readonly category: ObservationCategory;
  readonly name: ObservationName;
  readonly value: ObservationValue;
  readonly observedAt: string;
  readonly ingestedAt?: string;
  readonly source: SourceReference;
  readonly authority: AuthorityLevel;
  readonly confidence?: number;
  readonly evidence?: readonly EvidenceReference[];
}

/**
 * Relaciones entre TechnologyAsset canónicos. Ubicaciones, sitios y otros contextos
 * no tecnológicos se modelarán con contratos propios antes de participar del grafo.
 */
export const knownRelationshipTypes = [
  "depends_on",
  "uses",
  "connected_to",
  "communicates_with",
  "hosts",
  "controls",
  "monitors",
] as const;
export type KnownRelationshipType = (typeof knownRelationshipTypes)[number];
export type RelationshipType = KnownRelationshipType | `custom:${string}`;
export type RelationshipDirection = "directed" | "bidirectional";
export type RelationshipStatus = "active" | "degraded" | "inactive" | "unknown";

export interface RelationshipEvidence {
  readonly source: SourceReference;
  readonly observedAt: string;
  readonly authority: AuthorityLevel;
  readonly confidence?: number;
  readonly evidence?: readonly EvidenceReference[];
}

export interface TechnologyRelationship {
  readonly id: string;
  readonly sourceAssetId: string;
  readonly targetAssetId: string;
  readonly type: RelationshipType;
  readonly direction: RelationshipDirection;
  readonly status: RelationshipStatus;
  readonly observedAt: string;
  readonly evidence: readonly RelationshipEvidence[];
}

/** Snapshot coherente de dominio; los providers demo/live futuros compartirán este contrato. */
export interface TechnologySnapshot {
  readonly schemaVersion: TechnologySchemaVersion;
  readonly asOf: string;
  readonly assets: readonly TechnologyAsset[];
  readonly relationships: readonly TechnologyRelationship[];
  readonly observations: readonly Observation[];
}

/** Clave determinista para detectar la misma referencia de origen dentro de un activo. */
export function sourceReferenceKey(reference: SourceReference): string {
  return JSON.stringify([
    reference.source,
    reference.sourceScope ?? "",
    reference.entityType ?? "",
    reference.externalId,
  ]);
}
