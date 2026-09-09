import { DAY, type AssetType, type DashboardProvider, type DashboardSnapshot, type Lifecycle } from "./dashboard-model";

// Fixture exclusivo del panel. No representa inventario ni ubicaciones corporativas.
const asOf = "2026-09-09T12:00:00.000Z";
const types: readonly AssetType[] = ["Computer", "Computer", "NetworkEquipment", "Phone", "Monitor", "Printer"];
const states: readonly Lifecycle[] = ["assigned", "assigned", "assigned", "stock", "repair", "retired"];
const locations = ["Oficina Demo Centro", "Planta Demo Norte", "Planta Demo Sur", "Bodega Demo"] as const;
const date = (days: number) => new Date(Date.parse(asOf) + days * DAY).toISOString();
export const demoSnapshot: DashboardSnapshot = {
  asOf,
  assets: Array.from({ length: 240 }, (_, i) => ({
    id: `DEMO-${String(i + 1).padStart(4, "0")}`,
    type: types[i % types.length]!,
    lifecycle: states[Math.floor(i / 5) % states.length]!,
    domain: i % 4 === 0 ? "OT" : "IT",
    location: i % 19 === 0 ? null : locations[Math.floor(i / 7) % locations.length]!,
    owner: i % 11 === 0 ? null : `Responsable Demo ${i % 8 + 1}`,
    critical: i % 9 === 0,
    lastSeen: i % 17 === 0 ? null : date(-(i % 13)),
    warrantyEnds: i % 7 === 0 ? null : date((i % 12) * 30 - 60),
  })),
};
export const demoProvider: DashboardProvider = async (signal) => {
  signal.throwIfAborted();
  return demoSnapshot;
};
