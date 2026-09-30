import { describe, expect, it } from "vitest";
import type { ProvenanceRecord, SourceReference, TechnologyAsset } from "./model.js";
import {
  addLifecycleCalendarMonths,
  buildLifecyclePlanningReport,
  lifecycleAgeForAsset,
  lifecycleEvidenceForAsset,
  lifecycleWindowPosition,
} from "./lifecycle.js";

const asOf = "2026-09-30T12:00:00.000Z";
const source: SourceReference = {
  source: "demo",
  sourceInstanceId: "lifecycle-test",
  externalId: "A-1",
  entityType: "synthetic_asset",
  sourceScope: "test",
  observedAt: asOf,
  authority: "trusted",
};

function provenance(fieldPath: string): ProvenanceRecord {
  return {
    fieldPath,
    source,
    observedAt: asOf,
    authority: "trusted",
  };
}

function asset(
  id: string,
  attributes: TechnologyAsset["attributes"] = {},
  provenanceRecords: readonly ProvenanceRecord[] = [],
): TechnologyAsset {
  return {
    id,
    displayName: id,
    domain: "IT",
    assetClass: "endpoint",
    role: "user_endpoint",
    lifecycle: "active",
    criticality: "medium",
    identifiers: [],
    sourceReferences: [source],
    attributes,
    provenance: provenanceRecords,
  };
}

describe("lifecycle evidence contract", () => {
  it("distinguishes known, unavailable, invalid and unverified milestone evidence", () => {
    const value = asset("A-1", {
      "nexus.lifecycle.purchaseAt": "2024-01-15T12:00:00.000Z",
      "nexus.lifecycle.warrantyEndAt": "2026-12-01T12:00:00.000Z",
      "nexus.lifecycle.eolAt": "not-a-date",
      "nexus.lifecycle.eosAt": "2027-06-01T12:00:00.000Z",
    }, [
      provenance("attributes.nexus.lifecycle.purchaseAt"),
      provenance("attributes.nexus.lifecycle.warrantyEndAt"),
      provenance("attributes.nexus.lifecycle.eolAt"),
    ]);

    const evidence = new Map(lifecycleEvidenceForAsset(value).map(entry => [entry.kind, entry]));
    expect(evidence.get("purchase")?.state).toBe("known");
    expect(evidence.get("commissioned")?.state).toBe("unavailable");
    expect(evidence.get("warranty_end")?.state).toBe("known");
    expect(evidence.get("eol")?.state).toBe("invalid");
    expect(evidence.get("eos")?.state).toBe("unverified");
    expect(evidence.get("replacement_target")?.state).toBe("unavailable");
  });

  it("uses calendar months instead of fixed-day approximations", () => {
    expect(addLifecycleCalendarMonths("2026-01-31T08:15:00.000Z", 3)).toBe("2026-04-30T08:15:00.000Z");
    expect(addLifecycleCalendarMonths("2024-11-30T08:15:00.000Z", 3)).toBe("2025-02-28T08:15:00.000Z");
    expect(addLifecycleCalendarMonths("2026-09-30T12:00:00.000Z", 24)).toBe("2028-09-30T12:00:00.000Z");
  });

  it("classifies expired, in-window and outside-window milestones against an inclusive horizon", () => {
    expect(lifecycleWindowPosition("2026-09-29T12:00:00.000Z", asOf, 3)).toBe("expired");
    expect(lifecycleWindowPosition("2026-12-30T12:00:00.000Z", asOf, 3)).toBe("in_window");
    expect(lifecycleWindowPosition("2026-12-31T12:00:00.000Z", asOf, 3)).toBe("outside_window");
  });

  it("prefers commissioned date for age and requires explicit provenance", () => {
    const withEvidence = asset("A-AGE", {
      "nexus.lifecycle.purchaseAt": "2024-01-01T12:00:00.000Z",
      "nexus.lifecycle.commissionedAt": "2024-02-01T12:00:00.000Z",
    }, [
      provenance("attributes.nexus.lifecycle.purchaseAt"),
      provenance("attributes.nexus.lifecycle.commissionedAt"),
    ]);
    const withoutEvidence = asset("A-NO-EVIDENCE", {
      "nexus.lifecycle.purchaseAt": "2024-01-01T12:00:00.000Z",
    });

    expect(lifecycleAgeForAsset(withEvidence, asOf)).toMatchObject({
      basis: "commissioned",
      since: "2024-02-01T12:00:00.000Z",
    });
    expect(lifecycleAgeForAsset(withEvidence, asOf)?.days).toBeGreaterThan(900);
    expect(lifecycleAgeForAsset(withoutEvidence, asOf)).toBeNull();
  });

  it("reports coverage independently from milestone position", () => {
    const rows = [
      asset("A-EXPIRED", {
        "nexus.lifecycle.warrantyEndAt": "2026-08-01T12:00:00.000Z",
      }, [provenance("attributes.nexus.lifecycle.warrantyEndAt")]),
      asset("A-DUE", {
        "nexus.lifecycle.warrantyEndAt": "2026-11-01T12:00:00.000Z",
      }, [provenance("attributes.nexus.lifecycle.warrantyEndAt")]),
      asset("A-LATER", {
        "nexus.lifecycle.warrantyEndAt": "2027-08-01T12:00:00.000Z",
      }, [provenance("attributes.nexus.lifecycle.warrantyEndAt")]),
      asset("A-UNVERIFIED", {
        "nexus.lifecycle.warrantyEndAt": "2026-10-15T12:00:00.000Z",
      }),
      asset("A-MISSING"),
    ];

    const report = buildLifecyclePlanningReport(rows, asOf, 3);
    const warranty = report.summaries.find(summary => summary.kind === "warranty_end");

    expect(report.windowEnd).toBe("2026-12-30T12:00:00.000Z");
    expect(warranty).toEqual({
      kind: "warranty_end",
      coverage: { state: "partial", known: 3, total: 5, ratio: 0.6 },
      expired: 1,
      inWindow: 1,
      outsideWindow: 1,
      invalid: 0,
      unverified: 1,
    });
  });

  it("keeps unavailable coverage explicit when no asset has trusted milestone evidence", () => {
    const report = buildLifecyclePlanningReport([asset("A-1"), asset("A-2")], asOf, 12);
    expect(report.summaries.every(summary => summary.coverage.state === "unavailable")).toBe(true);
    expect(report.summaries.every(summary => summary.coverage.ratio === 0)).toBe(true);
    expect(report.ageCoverage).toEqual({ state: "unavailable", known: 0, total: 2, ratio: 0 });
  });
});
