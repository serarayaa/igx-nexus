import type { ProvenanceRecord, TechnologyAsset } from "./model.js";
import { isIsoTimestamp } from "./validation.js";

export const lifecycleMilestoneKinds = [
  "purchase",
  "commissioned",
  "warranty_end",
  "eol",
  "eos",
  "replacement_target",
] as const;
export type LifecycleMilestoneKind = (typeof lifecycleMilestoneKinds)[number];

export const lifecyclePlanningKinds = [
  "warranty_end",
  "eol",
  "eos",
  "replacement_target",
] as const;
export type LifecyclePlanningKind = (typeof lifecyclePlanningKinds)[number];

export const lifecycleHorizonMonths = [3, 6, 12, 24] as const;
export type LifecycleHorizonMonths = (typeof lifecycleHorizonMonths)[number];

export const lifecycleMilestoneAttributeKeys: Readonly<Record<LifecycleMilestoneKind, string>> = Object.freeze({
  purchase: "nexus.lifecycle.purchaseAt",
  commissioned: "nexus.lifecycle.commissionedAt",
  warranty_end: "nexus.lifecycle.warrantyEndAt",
  eol: "nexus.lifecycle.eolAt",
  eos: "nexus.lifecycle.eosAt",
  replacement_target: "nexus.lifecycle.replacementTargetAt",
});

export type LifecycleEvidenceState = "known" | "unavailable" | "invalid" | "unverified";

export interface LifecycleMilestoneEvidence {
  readonly kind: LifecycleMilestoneKind;
  readonly fieldPath: string;
  readonly state: LifecycleEvidenceState;
  readonly at: string | null;
  readonly provenance: readonly ProvenanceRecord[];
}

export interface LifecycleAge {
  readonly basis: "commissioned" | "purchase";
  readonly since: string;
  readonly days: number;
}

export interface LifecycleEvidenceCoverage {
  readonly state: "known" | "partial" | "unavailable";
  readonly known: number;
  readonly total: number;
  readonly ratio: number | null;
}

export interface LifecyclePlanningSummary {
  readonly kind: LifecyclePlanningKind;
  readonly coverage: LifecycleEvidenceCoverage;
  readonly expired: number;
  readonly inWindow: number;
  readonly outsideWindow: number;
  readonly invalid: number;
  readonly unverified: number;
}

export interface LifecycleAssetPlanning {
  readonly assetId: string;
  readonly age: LifecycleAge | null;
  readonly milestones: readonly LifecycleMilestoneEvidence[];
}

export interface LifecyclePlanningReport {
  readonly asOf: string;
  readonly horizonMonths: LifecycleHorizonMonths;
  readonly windowEnd: string;
  readonly assets: readonly LifecycleAssetPlanning[];
  readonly summaries: readonly LifecyclePlanningSummary[];
  readonly ageCoverage: LifecycleEvidenceCoverage;
}

function fieldPathFor(kind: LifecycleMilestoneKind): string {
  return `attributes.${lifecycleMilestoneAttributeKeys[kind]}`;
}

function milestone(asset: TechnologyAsset, kind: LifecycleMilestoneKind): LifecycleMilestoneEvidence {
  const attributeKey = lifecycleMilestoneAttributeKeys[kind];
  const fieldPath = fieldPathFor(kind);
  const value = asset.attributes[attributeKey];
  const provenance = asset.provenance.filter((record) => record.fieldPath === fieldPath);

  if (value === undefined || value === null) {
    return { kind, fieldPath, state: "unavailable", at: null, provenance };
  }
  if (typeof value !== "string" || !isIsoTimestamp(value)) {
    return { kind, fieldPath, state: "invalid", at: null, provenance };
  }
  if (provenance.length === 0) {
    return { kind, fieldPath, state: "unverified", at: value, provenance };
  }
  return { kind, fieldPath, state: "known", at: value, provenance };
}

export function lifecycleEvidenceForAsset(asset: TechnologyAsset): readonly LifecycleMilestoneEvidence[] {
  return lifecycleMilestoneKinds.map((kind) => milestone(asset, kind));
}

function knownMilestone(
  milestones: readonly LifecycleMilestoneEvidence[],
  kind: LifecycleMilestoneKind,
): LifecycleMilestoneEvidence | undefined {
  return milestones.find((entry) => entry.kind === kind && entry.state === "known");
}

export function lifecycleAgeForAsset(asset: TechnologyAsset, asOf: string): LifecycleAge | null {
  if (!isIsoTimestamp(asOf)) throw new RangeError("invalid lifecycle asOf");
  const milestones = lifecycleEvidenceForAsset(asset);
  const commissioned = knownMilestone(milestones, "commissioned");
  const purchase = knownMilestone(milestones, "purchase");
  const basis = commissioned ?? purchase;
  if (!basis?.at) return null;

  const days = (Date.parse(asOf) - Date.parse(basis.at)) / 86_400_000;
  if (!Number.isFinite(days) || days < 0) return null;
  return {
    basis: basis.kind === "commissioned" ? "commissioned" : "purchase",
    since: basis.at,
    days,
  };
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Calendar-month arithmetic: Jan 31 + 1 month => Feb 28/29, preserving UTC clock time. */
export function addLifecycleCalendarMonths(asOf: string, months: LifecycleHorizonMonths): string {
  if (!isIsoTimestamp(asOf)) throw new RangeError("invalid lifecycle asOf");
  if (!lifecycleHorizonMonths.includes(months)) throw new RangeError("unsupported lifecycle horizon");

  const source = new Date(asOf);
  const day = source.getUTCDate();
  const target = new Date(source.getTime());
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  target.setUTCDate(Math.min(day, daysInUtcMonth(target.getUTCFullYear(), target.getUTCMonth())));
  return target.toISOString();
}

export type LifecycleWindowPosition = "expired" | "in_window" | "outside_window";

export function lifecycleWindowPosition(
  at: string,
  asOf: string,
  horizonMonths: LifecycleHorizonMonths,
): LifecycleWindowPosition {
  if (!isIsoTimestamp(at) || !isIsoTimestamp(asOf)) throw new RangeError("invalid lifecycle timestamp");
  const value = Date.parse(at);
  const start = Date.parse(asOf);
  const end = Date.parse(addLifecycleCalendarMonths(asOf, horizonMonths));
  if (value < start) return "expired";
  return value <= end ? "in_window" : "outside_window";
}

function coverage(known: number, total: number): LifecycleEvidenceCoverage {
  if (total === 0 || known === 0) {
    return {
      state: "unavailable",
      known,
      total,
      ratio: total === 0 ? null : 0,
    };
  }
  const ratio = known / total;
  return {
    state: known === total ? "known" : "partial",
    known,
    total,
    ratio,
  };
}

export function buildLifecyclePlanningReport(
  assets: readonly TechnologyAsset[],
  asOf: string,
  horizonMonths: LifecycleHorizonMonths,
): LifecyclePlanningReport {
  if (!isIsoTimestamp(asOf)) throw new RangeError("invalid lifecycle asOf");
  const rows = assets.map((asset) => ({
    assetId: asset.id,
    age: lifecycleAgeForAsset(asset, asOf),
    milestones: lifecycleEvidenceForAsset(asset),
  }));

  const summaries = lifecyclePlanningKinds.map((kind): LifecyclePlanningSummary => {
    let known = 0;
    let expired = 0;
    let inWindow = 0;
    let outsideWindow = 0;
    let invalid = 0;
    let unverified = 0;

    for (const row of rows) {
      const evidence = row.milestones.find((entry) => entry.kind === kind)!;
      if (evidence.state === "invalid") {
        invalid++;
        continue;
      }
      if (evidence.state === "unverified") {
        unverified++;
        continue;
      }
      if (evidence.state !== "known" || !evidence.at) continue;
      known++;
      const position = lifecycleWindowPosition(evidence.at, asOf, horizonMonths);
      if (position === "expired") expired++;
      else if (position === "in_window") inWindow++;
      else outsideWindow++;
    }

    return {
      kind,
      coverage: coverage(known, rows.length),
      expired,
      inWindow,
      outsideWindow,
      invalid,
      unverified,
    };
  });

  return {
    asOf,
    horizonMonths,
    windowEnd: addLifecycleCalendarMonths(asOf, horizonMonths),
    assets: rows,
    summaries,
    ageCoverage: coverage(rows.filter((row) => row.age !== null).length, rows.length),
  };
}
