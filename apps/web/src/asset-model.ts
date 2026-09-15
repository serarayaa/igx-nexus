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
  /** Campos v0.2 opcionales para no romper el fixture cerrado de v0.1. */
  readonly dataMode?: AssetDataMode;
  readonly criticality?: AssetCriticality;
  readonly sourceSystems?: readonly string[];
  readonly sourceObservedAt?: string | null;
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
export function ageInDays(date: string | null, asOf: string): number | null {
  if (!date) return null;
  const value = (Date.parse(asOf) - Date.parse(date)) / DAY;
  return Number.isFinite(value) ? value : null;
}
export function isFresh(asset: AssetSummary, asOf: string): boolean {
  const age = ageInDays(asset.lastSeen, asOf);
  return age !== null && age >= 0 && age <= 7;
}
