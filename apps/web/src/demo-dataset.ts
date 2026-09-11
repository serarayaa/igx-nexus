import { DAY, type Asset, type AssetType, type Domain, type InventorySnapshot, type Lifecycle } from "./asset-model";
import type { Relationship, RelationshipSnapshot, RelationshipType } from "./relationship-model";

/** Synthetic catalog v1. IDs are permanent demo identities; never reuse a removed ID. */
export const DEMO_DATASET_VERSION = "1.0.0";
export const DEMO_AS_OF = "2026-09-09T12:00:00.000Z";
const date = (days: number) => new Date(Date.parse(DEMO_AS_OF) + days * DAY).toISOString();
const id = (number: number) => `DEMO-${String(number).padStart(4, "0")}`;
export const demoSites = ["Oficina Demo Centro", "Planta Demo Norte", "Planta Demo Sur", "Bodega Demo"] as const;

// Fictional product families, not claims about installed manufacturers or equipment.
const products = {
  notebook: { type: "Computer", label: "Notebook", manufacturer: "Fabricante Demo A", model: "Modelo Demo Portátil 14" },
  desktop: { type: "Computer", label: "Desktop", manufacturer: "Fabricante Demo A", model: "Modelo Demo Escritorio 2" },
  workstation: { type: "Computer", label: "Estación", manufacturer: "Fabricante Demo B", model: "Modelo Demo Estación 15" },
  console: { type: "Computer", label: "Consola", manufacturer: "Fabricante Demo C", model: "Modelo Demo Industrial 20" },
  switch: { type: "NetworkEquipment", label: "Switch", manufacturer: "Fabricante Demo B", model: "Modelo Demo Red 24" },
  industrialSwitch: { type: "NetworkEquipment", label: "Switch industrial", manufacturer: "Fabricante Demo C", model: "Modelo Demo Red industrial 8" },
  monitor: { type: "Monitor", label: "Monitor", manufacturer: "Fabricante Demo B", model: "Modelo Demo Pantalla 24" },
  phone: { type: "Phone", label: "Teléfono", manufacturer: "Fabricante Demo C", model: "Modelo Demo Móvil 6" },
  printer: { type: "Printer", label: "Impresora", manufacturer: "Fabricante Demo A", model: "Modelo Demo Impresión 30" },
} as const satisfies Record<string, { type: AssetType; label: string; manufacturer: string; model: string }>;
type Product = keyof typeof products;
type AssetOverrides = Partial<Omit<Asset, "id" | "type">>;

function makeAsset(number: number, product: Product, domain: Domain, location: string, overrides: AssetOverrides = {}): Asset {
  const family = products[product];
  const suffix = String(number).padStart(4, "0");
  return {
    id: id(number), type: family.type, name: `${family.label} Demo ${suffix}`,
    hostname: family.type === "Monitor" || family.type === "Phone" ? null : `demo-cl-${suffix}`,
    serial: `SYNTH-SN-${String(number).padStart(6, "0")}`, assetTag: `DEMO-TAG-${suffix}`,
    manufacturer: family.manufacturer, model: family.model,
    ipAddress: family.type === "Monitor" || family.type === "Phone" ? null : `192.0.2.${number}`,
    domain, location, lifecycle: "assigned", owner: `Responsable Demo ${number % 8 || 8}`,
    critical: false, lastSeen: date(-2), warrantyEnds: date(365), ...overrides,
  };
}

export interface DemoHero {
  readonly assetId: string;
  readonly scenario: "insufficient" | "expired" | "warranty_due" | "healthy" | "relationships" | "ot" | "degraded" | "attention" | "retired" | "stock" | "repair";
  readonly purpose: string;
}
/** Functional annotations only; never feed expected states into Health scoring. */
export const demoHeroes: readonly DemoHero[] = Object.freeze(([
  { assetId: id(1), scenario: "insufficient", purpose: "Registro parcial: serial, asignación, observación y garantía por verificar." },
  { assetId: id(2), scenario: "expired", purpose: "Identidad completa, QR y grafo; garantía vencida sin penalizar calidad CMDB." },
  { assetId: id(4), scenario: "warranty_due", purpose: "Garantía que vence en 20 días desde el corte fijo." },
  { assetId: id(7), scenario: "healthy", purpose: "Registro completo y reciente, sin relaciones legítimamente." },
  { assetId: id(3), scenario: "relationships", purpose: "Nodo central de oficina, dirección y profundidad 1/2." },
  { assetId: id(13), scenario: "ot", purpose: "Consola OT sintética con pantalla, dependencia y segundo nivel de red." },
  { assetId: id(20), scenario: "degraded", purpose: "Datos de hace 60 días y faltantes de identidad/responsable." },
  { assetId: id(21), scenario: "attention", purpose: "Identidad completa con observación de hace 20 días." },
  { assetId: id(22), scenario: "retired", purpose: "Baja correctamente documentada: Health puede ser 100." },
  { assetId: id(23), scenario: "stock", purpose: "Stock sin responsable: no aplicable para Health." },
  { assetId: id(24), scenario: "repair", purpose: "Reparación con registro confiable, sin inferir estado físico." },
] satisfies DemoHero[]).map(hero => Object.freeze(hero)));

function heroAssets(): Asset[] {
  const office = demoSites[0], north = demoSites[1], warehouse = demoSites[3];
  return [
    makeAsset(1, "notebook", "IT", office, { serial: null, owner: null, location: null, lastSeen: null, warrantyEnds: null }),
    makeAsset(2, "desktop", "IT", office, { warrantyEnds: date(-30) }),
    makeAsset(3, "switch", "IT", office, { critical: true }),
    makeAsset(4, "phone", "IT", office, { name: "Teléfono Demo Recepción", warrantyEnds: date(20) }),
    makeAsset(5, "monitor", "IT", office),
    makeAsset(6, "printer", "IT", office, { name: "Impresora Demo Documentación" }),
    makeAsset(7, "notebook", "IT", office, { name: "Notebook Demo Ingeniería" }),
    makeAsset(8, "desktop", "IT", office, { name: "Desktop Demo Análisis" }),
    makeAsset(9, "switch", "IT", office, { lifecycle: "stock", location: warehouse, owner: null }),
    makeAsset(10, "phone", "IT", office),
    makeAsset(11, "monitor", "IT", office),
    makeAsset(12, "printer", "IT", office),
    makeAsset(13, "console", "OT", north, { name: "Consola Demo Supervisión Norte", critical: true }),
    makeAsset(14, "industrialSwitch", "OT", north, { name: "Switch Demo Celda Norte", critical: true }),
    makeAsset(15, "monitor", "OT", north, { name: "Monitor Demo Supervisión Norte" }),
    makeAsset(16, "industrialSwitch", "OT", north, { name: "Switch Demo Laboratorio Norte" }),
    makeAsset(17, "console", "OT", north, { name: "Consola Demo Laboratorio Norte", lastSeen: date(-14) }),
    makeAsset(18, "monitor", "OT", north, { name: "Monitor Demo Laboratorio Norte" }),
    makeAsset(19, "industrialSwitch", "OT", north, { name: "Switch Demo Distribución Norte", critical: true }),
    makeAsset(20, "workstation", "IT", office, { name: "Estación Demo Por revisar", serial: null, assetTag: null, owner: null, lastSeen: date(-60) }),
    makeAsset(21, "notebook", "IT", office, { name: "Notebook Demo Observación antigua", lastSeen: date(-20) }),
    makeAsset(22, "monitor", "IT", warehouse, { name: "Monitor Demo Baja documentada", lifecycle: "retired", owner: null, warrantyEnds: date(-180) }),
    makeAsset(23, "phone", "IT", warehouse, { name: "Teléfono Demo Reserva", lifecycle: "stock", owner: null }),
    makeAsset(24, "printer", "IT", warehouse, { name: "Impresora Demo Taller", lifecycle: "repair", owner: null }),
  ];
}

// Stable ID ranges and deliberately asymmetric cohorts. Changing order changes identities: append instead.
const cohorts: readonly { start: number; count: number; product: Product; domain: Domain }[] = [
  { start: 25, count: 60, product: "notebook", domain: "IT" },
  { start: 85, count: 20, product: "desktop", domain: "IT" },
  { start: 105, count: 12, product: "console", domain: "OT" },
  { start: 117, count: 34, product: "monitor", domain: "IT" },
  { start: 151, count: 10, product: "monitor", domain: "OT" },
  { start: 161, count: 20, product: "switch", domain: "IT" },
  { start: 181, count: 12, product: "industrialSwitch", domain: "OT" },
  { start: 193, count: 28, product: "phone", domain: "IT" },
  { start: 221, count: 20, product: "printer", domain: "IT" },
];
function fleetAsset(number: number, offset: number, product: Product, domain: Domain): Asset {
  const lifecycle: Lifecycle = offset % 20 < 15 ? "assigned" : offset % 20 < 18 ? "stock" : offset % 20 === 18 ? "repair" : "retired";
  const location = lifecycle === "assigned"
    ? domain === "OT" ? demoSites[offset % 3 ? 1 : 2] : demoSites[offset % 10 < 7 ? 0 : offset % 2 ? 1 : 2]
    : demoSites[3];
  // Coprime permutation separates data quality from lifecycle and product cohorts.
  const quality = (number * 7) % 20;
  const base = makeAsset(number, product, domain, location, {
    name: `${products[product].label} Demo ${domain === "OT" ? "Proceso" : "Puesto"} ${String(number).padStart(4, "0")}`,
    lifecycle, owner: lifecycle === "assigned" ? `Responsable Demo ${offset % 8 + 1}` : null,
    critical: domain === "OT" && product !== "monitor" && offset % 3 === 0,
    // Explicit 20-record quality cycle: 14 recent, 4 aged, 1 very old, 1 unobserved.
    lastSeen: quality < 14 ? date(-(offset % 7)) : quality < 18 ? date(-20) : quality === 18 ? date(-60) : null,
    // Independent warranty cycle; expiration is never a Health penalty.
    warrantyEnds: offset % 10 < 6 ? date(365 + offset) : offset % 10 < 8 ? date(30 + offset % 60) : offset % 10 === 8 ? date(-120) : null,
  });
  // Deliberate maintenance cases; do not invalidate identity or topology to decorate the UI.
  if (quality === 18) return { ...base, serial: null, assetTag: null, model: null };
  return base;
}

function relationship(number: number, source: number, target: number, type: RelationshipType, observedAt: string | null = DEMO_AS_OF): Relationship {
  return { id: `DEMO-REL-${String(number).padStart(3, "0")}`, sourceId: id(source), targetId: id(target), type,
    direction: type === "connected_to" ? "bidirectional" : "directed", status: "active", source: "demo", observedAt };
}
function relationships(): Relationship[] {
  return [
    relationship(1, 2, 3, "depends_on"), relationship(2, 2, 5, "uses"),
    relationship(3, 6, 3, "connected_to"), relationship(4, 8, 3, "depends_on"),
    relationship(5, 8, 11, "uses"), relationship(6, 12, 3, "connected_to"),
    relationship(7, 13, 14, "depends_on"), relationship(8, 13, 15, "uses"),
    relationship(9, 14, 19, "connected_to"), relationship(10, 16, 19, "connected_to"),
    relationship(11, 17, 16, "depends_on"), relationship(12, 17, 18, "uses"),
    // A cross-cell observation remains unknown; no fabricated missing endpoint.
    relationship(13, 14, 16, "connected_to", null),
    relationship(14, 25, 161, "depends_on"), relationship(15, 25, 117, "uses"),
    relationship(16, 26, 161, "depends_on", date(-20)), relationship(17, 26, 118, "uses"),
    relationship(18, 221, 161, "connected_to"),
  ];
}

export function createDemoDataset(): { readonly inventory: InventorySnapshot; readonly relationships: RelationshipSnapshot } {
  const assets = [...heroAssets(), ...cohorts.flatMap(cohort => Array.from({ length: cohort.count }, (_, offset) => fleetAsset(cohort.start + offset, offset, cohort.product, cohort.domain)))];
  return Object.freeze({
    inventory: Object.freeze({ asOf: DEMO_AS_OF, assets: Object.freeze(assets.map(asset => Object.freeze(asset))) }),
    relationships: Object.freeze({ asOf: DEMO_AS_OF, relationships: Object.freeze(relationships().map(relation => Object.freeze(relation))) }),
  });
}
export const demoDataset = createDemoDataset();
