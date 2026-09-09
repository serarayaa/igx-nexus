import { DAY, type AssetType, type InventoryProvider, type InventorySnapshot, type Lifecycle } from "./asset-model";

// Fixture compartido por Dashboard y Explorer. No representa inventario ni ubicaciones corporativas.
const asOf = "2026-09-09T12:00:00.000Z";
const types: readonly AssetType[] = ["Computer", "Computer", "NetworkEquipment", "Phone", "Monitor", "Printer"];
const states: readonly Lifecycle[] = ["assigned", "assigned", "assigned", "stock", "repair", "retired"];
const locations = ["Oficina Demo Centro", "Planta Demo Norte", "Planta Demo Sur", "Bodega Demo"] as const;
const date = (days: number) => new Date(Date.parse(asOf) + days * DAY).toISOString();
export const demoSnapshot: InventorySnapshot = {
  asOf,
  assets: Array.from({ length: 240 }, (_, i) => ({
    id: `DEMO-${String(i + 1).padStart(4, "0")}`,
    name: `${["Notebook", "Desktop", "Switch", "Teléfono", "Monitor", "Impresora"][i % 6]} Demo ${String(i + 1).padStart(4, "0")}`,
    hostname: i % 6 === 4 ? null : `demo-cl-${String(i + 1).padStart(4, "0")}`,
    serial: i % 23 === 0 ? null : `SYNTH-SN-${String(i + 1).padStart(6, "0")}`,
    assetTag: `DEMO-TAG-${String(i + 1).padStart(4, "0")}`,
    manufacturer: ["Fabricante Demo A", "Fabricante Demo B", "Fabricante Demo C"][Math.floor(i / 3) % 3]!,
    model: `Modelo Demo ${["Portátil", "Escritorio", "Red", "Móvil", "Pantalla", "Impresión"][i % 6]} ${i % 3 + 1}`,
    // TEST-NET-1: documentación, nunca direccionamiento corporativo.
    ipAddress: i % 6 === 4 ? null : `192.0.2.${i + 1}`,
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
export const demoProvider: InventoryProvider = async (signal) => {
  signal.throwIfAborted();
  return demoSnapshot;
};
