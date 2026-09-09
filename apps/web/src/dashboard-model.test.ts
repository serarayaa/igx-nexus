import { describe, expect, it } from "vitest";
import { DAY, isFresh, percentage, summarize, type DashboardAsset } from "./dashboard-model";
import { demoSnapshot } from "./demo-provider";

const asOf = "2026-09-09T12:00:00.000Z";
const date = (days: number) => new Date(Date.parse(asOf) + days * DAY).toISOString();
const asset: DashboardAsset = { id: "test", type: "Computer", domain: "IT", lifecycle: "assigned", critical: true, owner: "Demo", location: "Demo", lastSeen: asOf, warrantyEnds: asOf };
describe("métricas del panel", () => {
  it("reconcilia distribuciones y filtros sin perder activos", () => {
    const all = summarize(demoSnapshot, "all");
    expect(all.assets).toHaveLength(240);
    expect(summarize(demoSnapshot, "IT").assets.length + summarize(demoSnapshot, "OT").assets.length).toBe(240);
    for (const key of ["type", "location", "lifecycle", "domain"] as const) expect(all.countBy(key).reduce((n, row) => n + row.value, 0)).toBe(240);
    expect(all.countBy("location").some(row => row.label === "Sin ubicación")).toBe(true);
  });
  it("incluye exactamente los límites de 7 días y rechaza fechas futuras o desconocidas", () => {
    for (const [lastSeen, fresh] of [[date(-7), true], [date(-7.001), false], [date(1), false], [null, false], ["invalid", false]] as const) expect(isFresh({ ...asset, lastSeen }, asOf)).toBe(fresh);
  });
  it("excluye bajas de KPI operativos y no confunde garantía desconocida con cobertura", () => {
    const snapshot = { asOf, assets: [
      { ...asset, id: "today" }, { ...asset, id: "90", warrantyEnds: date(90) },
      { ...asset, id: "91", warrantyEnds: date(91) }, { ...asset, id: "expired", warrantyEnds: date(-1) },
      { ...asset, id: "unknown", warrantyEnds: null, owner: " " },
      { ...asset, id: "retired", lifecycle: "retired" as const },
    ] };
    const result = summarize(snapshot, "all");
    expect(result.active).toHaveLength(5);
    expect(result.due.map(a => a.id)).toEqual(["today", "90"]);
    expect(result.expired).toBe(1);
    expect(result.unknownWarranty).toBe(1);
    expect(result.complete).toBe(4);
  });
  it("no muestra 100% de salud para un denominador vacío", () => {
    expect(percentage(0, 0)).toBe("Sin datos");
    expect(summarize({ asOf, assets: [] }, "all").due).toEqual([]);
  });
});
