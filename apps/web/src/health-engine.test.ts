import { describe, expect, it } from "vitest";
import { DAY, type Asset, type InventorySnapshot } from "./asset-model";
import { demoSnapshot } from "./demo-provider";
import { demoRelationshipSnapshot, demoRelationshipInventoryProvider } from "./demo-relationship-provider";
import { buildCmdbHealth, emptyHealthFilters, filterHealth, prioritizeHealth, summarizeHealth, validHealthDate } from "./health-engine";
import { healthDimensions, healthPolicy, healthState, healthWeights } from "./health-model";
import { scoreLabel, coverageLabel } from "./health-presentation";
import type { Relationship, RelationshipSnapshot } from "./relationship-model";

const asOf = demoSnapshot.asOf;
const asset: Asset = { ...demoSnapshot.assets[1]!, lastSeen: asOf, warrantyEnds: "2020-01-01" };
const peer: Asset = { ...asset, id: "PEER", assetTag: "PEER-TAG", name: "Peer Demo" };
const relationship: Relationship = { ...demoRelationshipSnapshot.relationships[0]!, sourceId: asset.id, targetId: peer.id, observedAt: asOf };
const snapshot = (assets: readonly Asset[]): InventorySnapshot => ({ asOf, assets });
const relations = (entries: readonly Relationship[] = []): RelationshipSnapshot => ({ asOf, relationships: entries });
const report = (patch: Partial<Asset> = {}, entries: readonly Relationship[] = []) => buildCmdbHealth(snapshot([{ ...asset, ...patch }, peer]), relations(entries));
const result = (patch: Partial<Asset> = {}, entries: readonly Relationship[] = []) => report(patch, entries).assets[0]!;
const date = (age: number) => new Date(Date.parse(asOf) - age * DAY).toISOString();
const dimension = (patch: Partial<Asset>, name: typeof healthDimensions[number]) => result(patch).dimensions.find(d => d.dimension === name)!;

describe("CMDB Health: reglas explicables", () => {
  it("evalúa un CI completo con score y cobertura 100, sin penalizar garantía vencida", () => {
    const row = result({}, [relationship]);
    expect(row.score).toBe(100); expect(row.coverage).toBe(100); expect(row.state).toBe("healthy"); expect(row.findings).toEqual([]);
    expect(row.dimensions.every(d => d.score === 100)).toBe(true);
  });
  it.each(["assigned", "stock", "repair", "retired"] as const)("no penaliza lifecycle legítimo %s", lifecycle => {
    expect(result({ lifecycle }).score).toBe(100);
  });
  it.each(["Monitor", "Phone", "Printer"] as const)("hostname no requerido en %s", type => {
    const row = result({ type, hostname: null });
    expect(row.score).toBe(100);
    expect(row.dimensions.find(d => d.dimension === "identity")!.checks.find(c => c.key === "hostname")!.status).toBe("not_applicable");
  });
  it.each(["Computer", "NetworkEquipment"] as const)("hostname requerido en %s", type => {
    expect(result({ type, hostname: null }).findings).toContainEqual(expect.objectContaining({ code: "field_missing", field: "hostname" }));
  });
  it("faltantes bajan sólo su dimensión: contexto e identidad separados", () => {
    expect(dimension({ manufacturer: null }, "completeness").score).toBe(75);
    expect(dimension({ manufacturer: null }, "identity").score).toBe(100);
    expect(dimension({ serial: "  " }, "identity").score).toBe(80);
    expect(dimension({ serial: null }, "completeness").score).toBe(100);
    expect(dimension({ lastSeen: date(8) }, "identity").score).toBe(100);
  });
  it("responsable sólo aplica a asignados", () => {
    expect(result({ lifecycle: "stock", owner: null }).score).toBe(100);
    expect(result({ lifecycle: "assigned", owner: null }).score).toBeLessThan(100);
  });
  it.each([[0,100],[7,100],[7.001,50],[30,50],[30.001,0]] as const)("frescura a %s días vale %s", (age, expected) => {
    expect(dimension({ lastSeen: date(age) }, "freshness").score).toBe(expected);
  });
  it("unknown reduce cobertura y no equivale a error", () => {
    const row = result({ lastSeen: null, warrantyEnds: null });
    expect(row.score).toBe(100); expect(row.coverage).toBeCloseTo(100 * 55 / 85);
    expect(row.findings.every(f => f.severity === "info")).toBe(true);
    expect(row.dimensions.find(d => d.dimension === "freshness")!.score).toBeNull();
  });
  it.each(["invalid", "2026-02-30", "2026-09-10T12:00:00Z"])("observación %s se identifica como inválida, no ausente", lastSeen => {
    expect(dimension({ lastSeen }, "freshness").score).toBe(0);
    expect(result({ lastSeen }).findings).toContainEqual(expect.objectContaining({ code: "observation_invalid", severity: "warning" }));
  });
  it("garantía inválida afecta consistencia; no usa edad ni criticidad", () => {
    expect(dimension({ warrantyEnds: "2025-02-29" }, "consistency").score).toBe(50);
    expect(result({ critical: true }).score).toBe(result({ critical: false }).score);
  });
  it("no inventa reglas que vuelvan incompatible baja con responsable", () => {
    expect(result({ lifecycle: "retired", owner: "Responsable Demo" }).findings).toEqual([]);
  });
  it("datos mínimos no aparecen como confiables aunque los conocidos sean correctos", () => {
    const row = result({ name: "", serial: null, assetTag: null, hostname: null, manufacturer: null, model: null, location: null, owner: null, lastSeen: null, warrantyEnds: null });
    expect(row.state).toBe("insufficient"); expect(row.coverage).toBeLessThan(healthPolicy.minimumCoverage);
  });
  it("detecta IDs y tags duplicados sin fusionar registros", () => {
    const rows = buildCmdbHealth(snapshot([asset, { ...asset, name: "Otra Demo" }]), relations()).assets;
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.findings.filter(f => f.code === "identity_duplicate")).toHaveLength(2);
    expect(result({ assetTag: "  peer-tag  " }).findings).toContainEqual(expect.objectContaining({ field: "assetTag", code: "identity_duplicate" }));
  });
});

describe("Integridad de relaciones", () => {
  it("cero relaciones es no aplicable, snapshot ausente es desconocido", () => {
    const none = result().dimensions.find(d => d.dimension === "relationships")!;
    expect(none.applicable).toBe(0); expect(none.score).toBeNull(); expect(none.coverage).toBeNull();
    const unknown = buildCmdbHealth(snapshot([asset]), null).assets[0]!;
    expect(unknown.score).toBe(100); expect(unknown.coverage).toBe(85);
    expect(unknown.findings).toContainEqual(expect.objectContaining({ code: "relationships_unknown" }));
  });
  it("relación válida no genera falso positivo", () => { expect(result({}, [relationship]).findings).toEqual([]); });
  it("referencia ausente produce finding crítico en el CI conocido", () => {
    expect(result({}, [{ ...relationship, targetId: "MISSING" }]).findings).toContainEqual(expect.objectContaining({ code: "relationship_reference_missing", severity: "critical" }));
  });
  it("IDs de endpoints son exactos como el grafo, sin reconciliación implícita", () => {
    expect(result({}, [{ ...relationship, targetId: "peer" }]).findings).toContainEqual(expect.objectContaining({ code: "relationship_reference_missing" }));
  });
  it("preserva relaciones huérfanas incluso en inventario vacío", () => {
    const r = buildCmdbHealth(snapshot([]), relations([relationship]));
    expect(r.orphanRelationships).toBe(1); expect(r.relationshipFindings).toContainEqual(expect.objectContaining({ code: "relationship_reference_missing" }));
    expect(r.summary.score).toBeNull();
  });
  it("relación inválida y duplicada reutiliza reglas estructurales", () => {
    expect(result({}, [{ ...relationship, direction: "bidirectional" }]).findings).toContainEqual(expect.objectContaining({ code: "relationship_invalid" }));
    expect(result({}, [relationship, relationship]).findings).toContainEqual(expect.objectContaining({ code: "relationship_duplicate" }));
  });
  it("autorrelación se cuenta una vez por CI y conserva finding", () => {
    const row = result({}, [{ ...relationship, targetId: asset.id }]);
    expect(row.findings.filter(f => f.code === "relationship_invalid")).toHaveLength(1);
  });
  it.each(["degraded", "unknown"] as const)("estado %s no se confunde con data health ni disponibilidad", status => {
    const row = result({}, [{ ...relationship, status }]);
    expect(row.score).toBe(100); expect(row.coverage).toBe(100);
    expect(row.findings).toContainEqual(expect.objectContaining({ code: "relationship_status_review", severity: "info" }));
  });
  it("observación desconocida excluye un tercio del peso de relaciones", () => {
    const row = result({}, [{ ...relationship, observedAt: null }]);
    expect(row.score).toBe(100); expect(row.coverage).toBe(95);
    expect(row.dimensions.find(d => d.dimension === "relationships")!.coverage).toBeCloseTo(200/3);
  });
  it.each([["2026-02-30", 0], [date(9),50], [date(40),0]] as const)("observación de relación %s tiene valor %s", (observedAt,value) => {
    expect(result({}, [{ ...relationship, observedAt }]).dimensions.find(d => d.dimension === "relationships")!.checks.find(c => c.key.endsWith(":observation"))!.value).toBe(value);
  });
  it("snapshot completo reutiliza los seis fixtures y respeta AbortSignal", async () => {
    const c = new AbortController(); expect(await demoRelationshipInventoryProvider(c.signal)).toBe(demoRelationshipSnapshot);
    c.abort(); await expect(demoRelationshipInventoryProvider(c.signal)).rejects.toThrow();
  });
});

describe("Matemática, agregación y determinismo", () => {
  it("pesos centralizados suman 100", () => { expect(Object.values(healthWeights).reduce((a,b)=>a+b,0)).toBe(100); });
  it.each([[0,100,"degraded"],[69.999,100,"degraded"],[70,100,"attention"],[89.999,100,"attention"],[90,100,"healthy"],[100,100,"healthy"],[100,59.999,"insufficient"],[100,60,"healthy"],[null,0,"unknown"]] as const)("bandas %s / cobertura %s → %s", (score,coverage,state) => { expect(healthState(score,coverage)).toBe(state); });
  it("presentación no redondea hacia una banda superior", () => { expect(scoreLabel(89.999)).toBe("89 / 100"); expect(coverageLabel(59.999)).toBe("59 %"); });
  it("calcula global con puntos y pesos, sin promedio de promedios", () => {
    const r = buildCmdbHealth(snapshot([asset, { ...peer, lastSeen: null, warrantyEnds: null, serial: null }]), relations());
    // CI A: 85/85. CI B: completeness 25 + identity 20 + consistency 5 = 50/55.
    expect(r.summary.score).toBeCloseTo(100 * 135/140);
    expect(r.summary.coverage).toBeCloseTo(100 * 135/170);
    expect(r.summary.score).not.toBeCloseTo((r.assets[0]!.score!+r.assets[1]!.score!)/2,4);
  });
  it("vacío no divide por cero ni simula score 0", () => {
    const s = summarizeHealth([]); expect(s.score).toBeNull(); expect(s.coverage).toBe(0); expect(s.total).toBe(0); expect(s.evaluated).toBe(0); expect(s.state).toBe("unknown");
  });
  it("top findings cuenta activos una vez por causa, sin duplicar campos o extremos", () => {
    const r = report({ manufacturer:null, model:null, serial:null }, [{ ...relationship, targetId:"MISSING" }, { ...relationship, id:"OTHER", targetId:"MISSING" }]);
    expect(r.summary.topFindings.find(f=>f.code==="field_missing")!.count).toBe(1);
    expect(r.summary.topFindings.find(f=>f.code==="relationship_reference_missing")!.count).toBe(1);
  });
  it("dataset determinista mantiene 240 activos, distribución y valores acotados", () => {
    const a = buildCmdbHealth(demoSnapshot,demoRelationshipSnapshot);
    expect(a).toEqual(buildCmdbHealth(demoSnapshot,demoRelationshipSnapshot));
    expect(a.summary.total).toBe(240); expect(Object.values(a.summary.distribution).reduce((x,y)=>x+y,0)).toBe(240);
    expect(a.assets.every(r=>r.score!==null && r.score>=0 && r.score<=100 && r.coverage>=0 && r.coverage<=100)).toBe(true);
    expect(demoSnapshot.assets[0]!.serial).toBeNull();
  });
  it("orden y filtros deterministas sin mutar los datos", () => {
    const r=report({ lastSeen:date(40) }); const reversed=[...r.assets].reverse();
    expect(prioritizeHealth(reversed)).toEqual(prioritizeHealth(r.assets));
    expect(filterHealth(r.assets,{...emptyHealthFilters,cause:"observation_very_stale",type:"Computer"})).toHaveLength(1);
    expect(filterHealth(r.assets,{...emptyHealthFilters,dimension:"identity"})).toHaveLength(0);
    expect(filterHealth(r.assets,{...emptyHealthFilters,state:"healthy"})).toHaveLength(1);
  });
  it("rechaza cortes incompatibles o inválidos sin recurrir al reloj", () => {
    expect(()=>buildCmdbHealth({...snapshot([asset]),asOf:"invalid"},relations())).toThrow();
    expect(()=>buildCmdbHealth(snapshot([asset]),{...relations(),asOf:date(1)})).toThrow();
  });
  it.each([["2024-02-29",true],["2025-02-29",false],["2026-13-01",false],["2026-01-32",false],["2026-01-01T00:00:00Z",true],["garbage",false],["2026-01-01T00:00:00",false]] as const)("valida calendario %s", (date,valid) => { expect(validHealthDate(date)).toBe(valid); });
});

it("score cero es alcanzable con evidencia inválida y todos los campos requeridos ausentes", () => {
  const zero = result({ id: "", name: "", hostname: null, serial: null, assetTag: null, manufacturer: null, model: null, location: null, owner: null,
    lastSeen: "invalid", warrantyEnds: "invalid", lifecycle: "not-normalized" as Asset["lifecycle"] });
  expect(zero.score).toBe(0);
  expect(zero.findings).toContainEqual(expect.objectContaining({ code: "lifecycle_invalid" }));
});

it("calendario rechaza 24 horas y timestamps sin zona", () => {
  expect(validHealthDate("2026-09-09T24:00:00Z")).toBe(false);
  expect(validHealthDate("2026-09-09T12:00:00")).toBe(false);
});

it("la evaluación no muta inventario ni relaciones", () => {
  const inventory = Object.freeze({ asOf, assets: Object.freeze([Object.freeze({ ...asset }), Object.freeze({ ...peer })]) });
  const rel = Object.freeze({ asOf, relationships: Object.freeze([Object.freeze({ ...relationship })]) });
  const before = JSON.stringify([inventory,rel]);
  buildCmdbHealth(inventory,rel);
  expect(JSON.stringify([inventory,rel])).toBe(before);
});
