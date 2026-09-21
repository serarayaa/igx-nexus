import type {
  OperationalContextKind,
  TaxonomyClassificationState,
  TechnologyAssetClass,
  TechnologyRole,
  TechnologyTaxonomyAssessment,
} from "@igx-nexus/types";

export type Domain = "IT" | "OT";
export type AssetType = "Computer" | "NetworkEquipment" | "Phone" | "Monitor" | "Printer";
export type Lifecycle =
  | "assigned"
  | "stock"
  | "repair"
  | "retired"
  | "planned"
  | "in_stock"
  | "active"
  | "maintenance"
  | "disposed"
  | "unknown";
export type AssetCriticality = "low" | "medium" | "high" | "critical" | "unknown";
export type AssetDataMode = "demo" | "live";
export type AssetTaxonomyState = TaxonomyClassificationState;

export interface AssetOperationalContext {
  readonly id: string;
  readonly kind: OperationalContextKind;
  readonly displayName: string | null;
}

export interface AssetSourceReference {
  readonly source: string;
  readonly observedAt: string | null;
}

/** Proyección mínima de inventario consumida por las métricas. */
export interface AssetSummary {
  readonly id: string;
  readonly type: AssetType;
  readonly location: string | null;
  readonly domain: Domain;
  readonly lifecycle: Lifecycle;
  readonly critical: boolean;
  readonly owner: string | null;
  readonly lastSeen: string | null;
  readonly warrantyEnds: string | null;
}

/** Identidad NEXUS independiente de las claves de los sistemas de origen. */
export interface Asset extends AssetSummary {
  readonly name: string;
  readonly hostname: string | null;
  readonly serial: string | null;
  readonly assetTag: string | null;
  readonly manufacturer: string | null;
  readonly model: string | null;
  readonly ipAddress: string | null;
  /** Campos v0.2 aditivos; el projection model histórico sigue siendo compatible. */
  readonly dataMode?: AssetDataMode;
  readonly criticality?: AssetCriticality;
  readonly assetClass?: TechnologyAssetClass;
  readonly role?: TechnologyRole;
  readonly taxonomyState?: AssetTaxonomyState;
  readonly taxonomyReviewRequired?: boolean;
  readonly taxonomyCompatibilityFallback?: boolean;
  readonly operationalContexts?: readonly AssetOperationalContext[];
  readonly sourceSystems?: readonly string[];
  readonly sourceObservedAt?: string | null;
  readonly sourceReferences?: readonly AssetSourceReference[];
}
export interface InventorySnapshot<T extends AssetSummary = Asset> {
  readonly asOf: string;
  readonly assets: readonly T[];
}
export type InventoryProvider = (signal: AbortSignal) => Promise<InventorySnapshot>;
export const DAY = 86_400_000;
export const typeLabels: Record<AssetType, string> = {
  Computer: "Computadores", NetworkEquipment: "Equipos de red", Phone: "Teléfonos",
  Monitor: "Monitores", Printer: "Impresoras",
};
export const lifecycleLabels: Record<Lifecycle, string> = {
  assigned: "Asignados",
  stock: "En stock",
  repair: "En reparación",
  retired: "Dados de baja",
  planned: "Planificado",
  in_stock: "En stock",
  active: "Activo",
  maintenance: "En mantenimiento",
  disposed: "Dispuesto",
  unknown: "Desconocido",
};
export const criticalityLabels: Record<AssetCriticality, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
  unknown: "Desconocida",
};
export const taxonomyStateLabels: Record<AssetTaxonomyState, string> = {
  classified: "Clasificada",
  unknown: "Desconocida",
  unclassified: "Sin clasificar",
  conflict: "En conflicto",
};

const assetClassLabels: Partial<Record<TechnologyAssetClass, string>> = {
  endpoint: "Endpoint",
  server: "Servidor",
  network_device: "Dispositivo de red",
  storage: "Almacenamiento",
  printer: "Impresora",
  mobile_device: "Dispositivo móvil",
  virtual_compute: "Cómputo virtual",
  infrastructure_appliance: "Appliance de infraestructura",
  peripheral: "Periférico",
  application: "Aplicación",
  controller: "Controlador",
  operator_interface: "Interfaz de operador",
  industrial_compute: "Cómputo industrial",
  industrial_network_device: "Dispositivo de red industrial",
  field_device: "Dispositivo de campo",
  protection_device: "Dispositivo de protección",
  metering_device: "Dispositivo de medición",
  industrial_gateway: "Gateway industrial",
};

const roleLabels: Partial<Record<TechnologyRole, string>> = {
  user_endpoint: "Endpoint de usuario",
  application_server: "Servidor de aplicaciones",
  database_server: "Servidor de base de datos",
  directory_service: "Servicio de directorio",
  virtualization_host: "Host de virtualización",
  network_core: "Core de red",
  network_distribution: "Distribución de red",
  network_access: "Acceso de red",
  network_security: "Seguridad de red",
  storage_service: "Servicio de almacenamiento",
  print_service: "Servicio de impresión",
  infrastructure_service: "Servicio de infraestructura",
  engineering_workstation: "Estación de ingeniería",
  control: "Control",
  supervision: "Supervisión",
  telemetry: "Telemetría",
  historian: "Historiador",
  protection: "Protección",
  metering: "Medición",
  field_sensing: "Sensado de campo",
  field_actuation: "Actuación de campo",
  industrial_network: "Red industrial",
  industrial_security: "Seguridad industrial",
  protocol_gateway: "Gateway de protocolo",
};

function fallbackLabel(value: string): string {
  const raw = value.startsWith("custom:") ? value.slice("custom:".length) : value;
  return raw.replaceAll("_", " ").replace(/\b\p{L}/gu, letter => letter.toLocaleUpperCase("es-CL"));
}

export function assetClassLabel(value: TechnologyAssetClass | undefined): string {
  return value ? assetClassLabels[value] ?? fallbackLabel(value) : "Sin clase disponible";
}

export function technologyRoleLabel(value: TechnologyRole | undefined): string {
  return value ? roleLabels[value] ?? fallbackLabel(value) : "Sin rol disponible";
}

export function summarizeTaxonomy(assessment: TechnologyTaxonomyAssessment | undefined): {
  readonly state: AssetTaxonomyState;
  readonly reviewRequired: boolean;
} {
  if (!assessment) return { state: "unknown", reviewRequired: true };
  const decisions = [assessment.domain, assessment.assetClass, assessment.role];
  const states = new Set(decisions.map(decision => decision.state));
  const state: AssetTaxonomyState = states.has("conflict")
    ? "conflict"
    : states.has("unclassified")
      ? "unclassified"
      : states.has("unknown")
        ? "unknown"
        : "classified";
  return {
    state,
    reviewRequired: decisions.some(decision => decision.reviewRequired),
  };
}

export function ageInDays(date: string | null, asOf: string): number | null {
  if (!date) return null;
  const value = (Date.parse(asOf) - Date.parse(date)) / DAY;
  return Number.isFinite(value) ? value : null;
}
export function isFresh(asset: AssetSummary, asOf: string): boolean {
  const age = ageInDays(asset.lastSeen, asOf);
  return age !== null && age >= 0 && age <= 7;
}
