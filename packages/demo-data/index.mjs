const DAY = 86_400_000;

export const DEMO_DATASET_VERSION = "2.0.0";
export const DEMO_LEGACY_DATASET_VERSION = "1.0.0";
export const DEMO_AS_OF = "2026-09-09T12:00:00.000Z";

const date = (days) => new Date(Date.parse(DEMO_AS_OF) + days * DAY).toISOString();
const id = (number) => `DEMO-${String(number).padStart(4, "0")}`;

export const demoSites = Object.freeze([
  "Oficina Demo Centro",
  "Planta Demo Norte",
  "Planta Demo Sur",
  "Bodega Demo",
]);

const siteIds = Object.freeze({
  "Oficina Demo Centro": "demo-site-office-center",
  "Planta Demo Norte": "demo-site-plant-north",
  "Planta Demo Sur": "demo-site-plant-south",
  "Bodega Demo": "demo-site-warehouse",
});

const products = Object.freeze({
  notebook: Object.freeze({ type: "Computer", label: "Notebook", manufacturer: "Fabricante Demo A", model: "Modelo Demo Portátil 14" }),
  desktop: Object.freeze({ type: "Computer", label: "Desktop", manufacturer: "Fabricante Demo A", model: "Modelo Demo Escritorio 2" }),
  workstation: Object.freeze({ type: "Computer", label: "Estación", manufacturer: "Fabricante Demo B", model: "Modelo Demo Estación 15" }),
  console: Object.freeze({ type: "Computer", label: "Consola", manufacturer: "Fabricante Demo C", model: "Modelo Demo Industrial 20" }),
  switch: Object.freeze({ type: "NetworkEquipment", label: "Switch", manufacturer: "Fabricante Demo B", model: "Modelo Demo Red 24" }),
  industrialSwitch: Object.freeze({ type: "NetworkEquipment", label: "Switch industrial", manufacturer: "Fabricante Demo C", model: "Modelo Demo Red industrial 8" }),
  monitor: Object.freeze({ type: "Monitor", label: "Monitor", manufacturer: "Fabricante Demo B", model: "Modelo Demo Pantalla 24" }),
  phone: Object.freeze({ type: "Phone", label: "Teléfono", manufacturer: "Fabricante Demo C", model: "Modelo Demo Móvil 6" }),
  printer: Object.freeze({ type: "Printer", label: "Impresora", manufacturer: "Fabricante Demo A", model: "Modelo Demo Impresión 30" }),
});

export const demoHeroes = Object.freeze([
  Object.freeze({ assetId: id(1), scenario: "insufficient", purpose: "Registro parcial: serial, asignación, observación y garantía por verificar." }),
  Object.freeze({ assetId: id(2), scenario: "expired", purpose: "Identidad completa, QR y grafo; garantía vencida sin penalizar calidad CMDB." }),
  Object.freeze({ assetId: id(4), scenario: "warranty_due", purpose: "Garantía que vence en 20 días desde el corte fijo." }),
  Object.freeze({ assetId: id(7), scenario: "healthy", purpose: "Registro completo y reciente, sin relaciones legítimamente." }),
  Object.freeze({ assetId: id(3), scenario: "relationships", purpose: "Nodo central de oficina, dirección y profundidad 1/2." }),
  Object.freeze({ assetId: id(13), scenario: "ot", purpose: "Consola OT sintética con pantalla, dependencia y segundo nivel de red." }),
  Object.freeze({ assetId: id(20), scenario: "degraded", purpose: "Datos de hace 60 días y faltantes de identidad/responsable." }),
  Object.freeze({ assetId: id(21), scenario: "attention", purpose: "Identidad completa con observación de hace 20 días." }),
  Object.freeze({ assetId: id(22), scenario: "retired", purpose: "Baja correctamente documentada: Health puede ser 100." }),
  Object.freeze({ assetId: id(23), scenario: "stock", purpose: "Stock sin responsable: no aplicable para Health." }),
  Object.freeze({ assetId: id(24), scenario: "repair", purpose: "Reparación con registro confiable, sin inferir estado físico." }),
]);

function authoredAsset(number, product, domain, location, overrides = {}) {
  const family = products[product];
  const suffix = String(number).padStart(4, "0");
  return {
    id: id(number),
    product,
    type: family.type,
    name: `${family.label} Demo ${suffix}`,
    hostname: family.type === "Monitor" || family.type === "Phone" ? null : `demo-cl-${suffix}`,
    serial: `SYNTH-SN-${String(number).padStart(6, "0")}`,
    assetTag: `DEMO-TAG-${suffix}`,
    manufacturer: family.manufacturer,
    model: family.model,
    ipAddress: family.type === "Monitor" || family.type === "Phone" ? null : `192.0.2.${number}`,
    domain,
    location,
    lifecycle: "assigned",
    owner: `Responsable Demo ${number % 8 || 8}`,
    critical: false,
    lastSeen: date(-2),
    warrantyEnds: date(365),
    ...overrides,
  };
}

function heroAssets() {
  const office = demoSites[0];
  const north = demoSites[1];
  const warehouse = demoSites[3];
  return [
    authoredAsset(1, "notebook", "IT", office, { serial: null, owner: null, location: null, lastSeen: null, warrantyEnds: null }),
    authoredAsset(2, "desktop", "IT", office, { warrantyEnds: date(-30) }),
    authoredAsset(3, "switch", "IT", office, { critical: true }),
    authoredAsset(4, "phone", "IT", office, { name: "Teléfono Demo Recepción", warrantyEnds: date(20) }),
    authoredAsset(5, "monitor", "IT", office),
    authoredAsset(6, "printer", "IT", office, { name: "Impresora Demo Documentación" }),
    authoredAsset(7, "notebook", "IT", office, { name: "Notebook Demo Ingeniería" }),
    authoredAsset(8, "desktop", "IT", office, { name: "Desktop Demo Análisis" }),
    authoredAsset(9, "switch", "IT", office, { lifecycle: "stock", location: warehouse, owner: null }),
    authoredAsset(10, "phone", "IT", office),
    authoredAsset(11, "monitor", "IT", office),
    authoredAsset(12, "printer", "IT", office),
    authoredAsset(13, "console", "OT", north, { name: "Consola Demo Supervisión Norte", critical: true }),
    authoredAsset(14, "industrialSwitch", "OT", north, { name: "Switch Demo Celda Norte", critical: true }),
    authoredAsset(15, "monitor", "OT", north, { name: "Monitor Demo Supervisión Norte" }),
    authoredAsset(16, "industrialSwitch", "OT", north, { name: "Switch Demo Laboratorio Norte" }),
    authoredAsset(17, "console", "OT", north, { name: "Consola Demo Laboratorio Norte", lastSeen: date(-14) }),
    authoredAsset(18, "monitor", "OT", north, { name: "Monitor Demo Laboratorio Norte" }),
    authoredAsset(19, "industrialSwitch", "OT", north, { name: "Switch Demo Distribución Norte", critical: true }),
    authoredAsset(20, "workstation", "IT", office, { name: "Estación Demo Por revisar", serial: null, assetTag: null, owner: null, lastSeen: date(-60) }),
    authoredAsset(21, "notebook", "IT", office, { name: "Notebook Demo Observación antigua", lastSeen: date(-20) }),
    authoredAsset(22, "monitor", "IT", warehouse, { name: "Monitor Demo Baja documentada", lifecycle: "retired", owner: null, warrantyEnds: date(-180) }),
    authoredAsset(23, "phone", "IT", warehouse, { name: "Teléfono Demo Reserva", lifecycle: "stock", owner: null }),
    authoredAsset(24, "printer", "IT", warehouse, { name: "Impresora Demo Taller", lifecycle: "repair", owner: null }),
  ];
}

const cohorts = Object.freeze([
  Object.freeze({ start: 25, count: 60, product: "notebook", domain: "IT" }),
  Object.freeze({ start: 85, count: 20, product: "desktop", domain: "IT" }),
  Object.freeze({ start: 105, count: 12, product: "console", domain: "OT" }),
  Object.freeze({ start: 117, count: 34, product: "monitor", domain: "IT" }),
  Object.freeze({ start: 151, count: 10, product: "monitor", domain: "OT" }),
  Object.freeze({ start: 161, count: 20, product: "switch", domain: "IT" }),
  Object.freeze({ start: 181, count: 12, product: "industrialSwitch", domain: "OT" }),
  Object.freeze({ start: 193, count: 28, product: "phone", domain: "IT" }),
  Object.freeze({ start: 221, count: 20, product: "printer", domain: "IT" }),
]);

function fleetAsset(number, offset, product, domain) {
  const lifecycle = offset % 20 < 15 ? "assigned" : offset % 20 < 18 ? "stock" : offset % 20 === 18 ? "repair" : "retired";
  const location = lifecycle === "assigned"
    ? domain === "OT" ? demoSites[offset % 3 ? 1 : 2] : demoSites[offset % 10 < 7 ? 0 : offset % 2 ? 1 : 2]
    : demoSites[3];
  const quality = (number * 7) % 20;
  const base = authoredAsset(number, product, domain, location, {
    name: `${products[product].label} Demo ${domain === "OT" ? "Proceso" : "Puesto"} ${String(number).padStart(4, "0")}`,
    lifecycle,
    owner: lifecycle === "assigned" ? `Responsable Demo ${offset % 8 + 1}` : null,
    critical: domain === "OT" && product !== "monitor" && offset % 3 === 0,
    lastSeen: quality < 14 ? date(-(offset % 7)) : quality < 18 ? date(-20) : quality === 18 ? date(-60) : null,
    warrantyEnds: offset % 10 < 6 ? date(365 + offset) : offset % 10 < 8 ? date(30 + offset % 60) : offset % 10 === 8 ? date(-120) : null,
  });
  if (quality === 18) return { ...base, serial: null, assetTag: null, model: null };
  return base;
}

function taxonomyFor(product, domain) {
  if (domain === "IT") {
    if (product === "notebook" || product === "desktop" || product === "workstation") return ["endpoint", "user_endpoint"];
    if (product === "switch") return ["network_device", "network_access"];
    if (product === "monitor") return ["peripheral", "custom:display"];
    if (product === "phone") return ["mobile_device", "user_endpoint"];
    if (product === "printer") return ["printer", "print_service"];
  }
  if (domain === "OT") {
    if (product === "console" || product === "monitor") return ["operator_interface", "supervision"];
    if (product === "industrialSwitch") return ["industrial_network_device", "industrial_network"];
  }
  throw new Error(`Unsupported demo taxonomy mapping: ${domain}/${product}`);
}

function canonicalLifecycle(value) {
  if (value === "assigned") return "active";
  if (value === "stock") return "in_stock";
  return value;
}

function sourceFor(assetId) {
  return Object.freeze({
    source: "demo",
    externalId: assetId,
    entityType: "synthetic_asset",
    sourceScope: "demo-v0.2",
    observedAt: DEMO_AS_OF,
    authority: "trusted",
  });
}

function identifier(kind, value, source) {
  return value ? Object.freeze({ kind, value, source }) : null;
}

function provenance(fieldPath, source, derivation) {
  const record = {
    fieldPath,
    source,
    observedAt: DEMO_AS_OF,
    authority: "trusted",
    evidence: Object.freeze([
      Object.freeze({
        kind: "source_record",
        reference: `demo-dataset:${source.externalId}`,
        label: "Synthetic demo fixture",
        observedAt: DEMO_AS_OF,
      }),
    ]),
  };
  if (derivation) record.derivation = derivation;
  return Object.freeze(record);
}

function classified(value, method, ruleId) {
  return Object.freeze({ state: "classified", value, method, reviewRequired: false, ruleId });
}

function toCanonicalAsset(asset) {
  const source = sourceFor(asset.id);
  const [assetClass, role] = taxonomyFor(asset.product, asset.domain);
  const ruleId = `demo.v2.family.${asset.product}`;
  const identifiers = [
    identifier("hostname", asset.hostname, source),
    identifier("serial_number", asset.serial, source),
    identifier("asset_tag", asset.assetTag, source),
    identifier("ip_address", asset.ipAddress, source),
  ].filter(Boolean);
  const contexts = asset.location
    ? [Object.freeze({ id: siteIds[asset.location], kind: "site", displayName: asset.location, source })]
    : [];

  return Object.freeze({
    id: asset.id,
    displayName: asset.name,
    domain: asset.domain,
    assetClass,
    role,
    taxonomy: Object.freeze({
      taxonomyVersion: "2",
      domain: classified(asset.domain, "manual", "demo.v2.authored-domain"),
      assetClass: classified(assetClass, "normalized", ruleId),
      role: classified(role, "normalized", ruleId),
    }),
    lifecycle: canonicalLifecycle(asset.lifecycle),
    criticality: asset.critical ? "critical" : "medium",
    operationalContexts: Object.freeze(contexts),
    identifiers: Object.freeze(identifiers),
    sourceReferences: Object.freeze([source]),
    attributes: Object.freeze({
      "demo.datasetVersion": DEMO_DATASET_VERSION,
      "demo.legacyDatasetVersion": DEMO_LEGACY_DATASET_VERSION,
      "demo.synthetic": true,
      "demo.family": asset.product,
      "demo.legacyItemType": asset.type,
      "demo.location": asset.location,
      "demo.owner": asset.owner,
      "demo.manufacturer": asset.manufacturer,
      "demo.model": asset.model,
      "demo.lastSeen": asset.lastSeen,
      "demo.warrantyEnds": asset.warrantyEnds,
      "demo.critical": asset.critical,
    }),
    provenance: Object.freeze([
      provenance("displayName", source),
      provenance("domain", source, "manual"),
      provenance("assetClass", source, "normalized"),
      provenance("role", source, "normalized"),
      provenance("lifecycle", source),
      provenance("criticality", source),
      provenance("attributes.demo.location", source),
      provenance("attributes.demo.owner", source),
      provenance("attributes.demo.lastSeen", source),
      provenance("attributes.demo.warrantyEnds", source),
    ]),
  });
}

function relationship(number, source, target, type, observedAt = DEMO_AS_OF) {
  return Object.freeze({
    id: `DEMO-REL-${String(number).padStart(3, "0")}`,
    sourceId: id(source),
    targetId: id(target),
    type,
    direction: type === "connected_to" ? "bidirectional" : "directed",
    status: "active",
    source: "demo",
    observedAt,
  });
}

export const demoRelationshipFixtures = Object.freeze([
  relationship(1, 2, 3, "depends_on"),
  relationship(2, 2, 5, "uses"),
  relationship(3, 6, 3, "connected_to"),
  relationship(4, 8, 3, "depends_on"),
  relationship(5, 8, 11, "uses"),
  relationship(6, 12, 3, "connected_to"),
  relationship(7, 13, 14, "depends_on"),
  relationship(8, 13, 15, "uses"),
  relationship(9, 14, 19, "connected_to"),
  relationship(10, 16, 19, "connected_to"),
  relationship(11, 17, 16, "depends_on"),
  relationship(12, 17, 18, "uses"),
  relationship(13, 14, 16, "connected_to", null),
  relationship(14, 25, 161, "depends_on"),
  relationship(15, 25, 117, "uses"),
  relationship(16, 26, 161, "depends_on", date(-20)),
  relationship(17, 26, 118, "uses"),
  relationship(18, 221, 161, "connected_to"),
]);

function authoredAssets() {
  return [
    ...heroAssets(),
    ...cohorts.flatMap((cohort) => Array.from(
      { length: cohort.count },
      (_, offset) => fleetAsset(cohort.start + offset, offset, cohort.product, cohort.domain),
    )),
  ];
}

export function createCanonicalDemoSnapshot() {
  const assets = authoredAssets().map(toCanonicalAsset);
  return Object.freeze({
    schemaVersion: "0.2",
    asOf: DEMO_AS_OF,
    assets: Object.freeze(assets),
    relationships: Object.freeze([]),
    observations: Object.freeze([]),
  });
}

export const demoCanonicalSnapshot = createCanonicalDemoSnapshot();
