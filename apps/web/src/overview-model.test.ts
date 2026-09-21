import { describe, expect, it } from "vitest";
import { buildOverview } from "./overview-model";
import { demoSnapshot } from "./demo-provider";
import type { DashboardSnapshot } from "./dashboard-model";

describe("buildOverview", () => {
  it("prioriza señales demo existentes sin crear un score nuevo", () => {
    const overview = buildOverview(demoSnapshot, "all", "demo");
    expect(overview.summary.assets).toHaveLength(240);
    expect(overview.attention.length).toBeGreaterThan(0);
    expect(overview.attention.every(item => item.count > 0)).toBe(true);
    expect(overview.attention.some(item => item.id === "warranty-due")).toBe(overview.summary.due.length > 0);
  });

  it("en Live sólo usa freshness observable y no convierte campos ausentes en hallazgos de calidad", () => {
    const snapshot: DashboardSnapshot = {
      asOf: "2026-09-21T12:00:00.000Z",
      assets: [
        {
          id: "NEXUS-1",
          type: "Computer",
          domain: "IT",
          lifecycle: "active",
          critical: false,
          owner: null,
          location: null,
          lastSeen: null,
          warrantyEnds: null,
        },
      ],
    };

    const overview = buildOverview(snapshot, "all", "live");
    expect(overview.freshnessUnknown).toBe(1);
    expect(overview.attention.map(item => item.id)).toEqual(["live-freshness-unknown"]);
    expect(overview.attention.some(item => item.id === "incomplete-core")).toBe(false);
    expect(overview.attention.some(item => item.id === "warranty-due")).toBe(false);
  });

  it("respeta el alcance IT/OT antes de derivar atención", () => {
    const it = buildOverview(demoSnapshot, "IT", "demo");
    const ot = buildOverview(demoSnapshot, "OT", "demo");
    expect(it.summary.assets.every(asset => asset.domain === "IT")).toBe(true);
    expect(ot.summary.assets.every(asset => asset.domain === "OT")).toBe(true);
    expect(it.summary.assets.length + ot.summary.assets.length).toBe(demoSnapshot.assets.length);
  });
});
