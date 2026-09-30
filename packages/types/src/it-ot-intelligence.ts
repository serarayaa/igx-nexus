import {
  evaluateReferenceMetric,
  metricOperationalContextDimensionKey,
  type MetricResult,
  type MetricScope,
  type ReferenceMetricId,
} from "./analytics.js";
import type {
  OperationalContextReference,
  TechnologyAsset,
  TechnologyDomain,
  TechnologySnapshot,
} from "./model.js";

export const itOtIntelligenceDomains = ["IT", "OT"] as const satisfies readonly TechnologyDomain[];

export type ItOtDomainUnresolvedReason =
  | "assessment_missing"
  | "unknown"
  | "unclassified"
  | "conflict";

export interface ItOtEvidenceCoverage {
  readonly state: "known" | "partial" | "unavailable";
  readonly known: number;
  readonly total: number;
  readonly ratio: number | null;
}

export interface ItOtDistributionEntry {
  readonly value: string;
  readonly count: number;
}

export interface ItOtDimensionSummary {
  readonly coverage: ItOtEvidenceCoverage;
  readonly distribution: readonly ItOtDistributionEntry[];
}

export interface ItOtOperationalContextEntry {
  readonly key: string;
  readonly kind: string;
  readonly id: string;
  readonly count: number;
}

export interface ItOtOperationalContextSummary {
  /**
   * Coverage expresa si el asset transporta la colección operationalContexts.
   * Un array vacío conocido es distinto de una propiedad ausente en evidencia histórica.
   */
  readonly coverage: ItOtEvidenceCoverage;
  /** Conteos por membresía de asset; un mismo context se cuenta como máximo una vez por asset. */
  readonly distribution: readonly ItOtOperationalContextEntry[];
}

export interface ItOtDomainMetrics {
  readonly inventoryCount: MetricResult;
  readonly taxonomyResolved: MetricResult;
  readonly sourceInstanceIdentity: MetricResult;
  readonly lifecycleKnown: MetricResult;
}

export interface ItOtDomainCohort {
  readonly domain: TechnologyDomain;
  readonly population: number;
  readonly assetClass: ItOtDimensionSummary;
  readonly role: ItOtDimensionSummary;
  readonly operationalContext: ItOtOperationalContextSummary;
  readonly metrics: ItOtDomainMetrics;
}

export interface ItOtDomainResolutionBreakdown {
  readonly assessmentMissing: number;
  readonly unknown: number;
  readonly unclassified: number;
  readonly conflict: number;
}

export interface ItOtIntelligencePopulation {
  readonly total: number;
  readonly classified: number;
  readonly unresolved: number;
  readonly domainCoverage: ItOtEvidenceCoverage;
  readonly unresolvedByReason: ItOtDomainResolutionBreakdown;
}

export interface ItOtIntelligenceReport {
  readonly asOf: string;
  readonly population: ItOtIntelligencePopulation;
  readonly cohorts: Readonly<Record<TechnologyDomain, ItOtDomainCohort>>;
}

function coverage(known: number, total: number): ItOtEvidenceCoverage {
  if (total === 0) return { state: "unavailable", known: 0, total: 0, ratio: null };
  const ratio = known / total;
  if (known === total) return { state: "known", known, total, ratio };
  if (known === 0) return { state: "unavailable", known, total, ratio };
  return { state: "partial", known, total, ratio };
}

function classifiedDomain(asset: TechnologyAsset): TechnologyDomain | null {
  const decision = asset.taxonomy?.domain;
  return decision?.state === "classified" ? decision.value : null;
}

function unresolvedReason(asset: TechnologyAsset): ItOtDomainUnresolvedReason | null {
  if (!asset.taxonomy) return "assessment_missing";
  const state = asset.taxonomy.domain.state;
  return state === "classified" ? null : state;
}

function summarizeDimension(
  assets: readonly TechnologyAsset[],
  valueFor: (asset: TechnologyAsset) => string | null,
): ItOtDimensionSummary {
  const counts = new Map<string, number>();
  let known = 0;

  for (const asset of assets) {
    const value = valueFor(asset);
    if (value === null) continue;
    known++;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return {
    coverage: coverage(known, assets.length),
    distribution: [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, count]) => ({ value, count })),
  };
}

function assetClassValue(asset: TechnologyAsset): string | null {
  const decision = asset.taxonomy?.assetClass;
  return decision?.state === "classified" ? decision.value : null;
}

function roleValue(asset: TechnologyAsset): string | null {
  const decision = asset.taxonomy?.role;
  return decision?.state === "classified" ? decision.value : null;
}

function contextIdentity(context: OperationalContextReference): string {
  return metricOperationalContextDimensionKey(context);
}

function summarizeOperationalContexts(assets: readonly TechnologyAsset[]): ItOtOperationalContextSummary {
  const counts = new Map<string, { kind: string; id: string; count: number }>();
  let known = 0;

  for (const asset of assets) {
    if (asset.operationalContexts === undefined) continue;
    known++;

    const seen = new Set<string>();
    for (const context of asset.operationalContexts) {
      const key = contextIdentity(context);
      if (seen.has(key)) continue;
      seen.add(key);
      const current = counts.get(key);
      counts.set(key, {
        kind: context.kind,
        id: context.id,
        count: (current?.count ?? 0) + 1,
      });
    }
  }

  return {
    coverage: coverage(known, assets.length),
    distribution: [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({ key, ...value })),
  };
}

function metric(
  id: ReferenceMetricId,
  snapshot: TechnologySnapshot,
  domain: TechnologyDomain,
): MetricResult {
  const scope: MetricScope = {
    filters: [{ dimension: "domain", values: [domain] }],
  };
  const evaluation = evaluateReferenceMetric(id, snapshot, scope);
  if (evaluation.status !== "ok") {
    throw new Error(`Unexpected invalid scope for IT/OT Intelligence metric ${id}`);
  }
  return evaluation.result;
}

function buildCohort(
  snapshot: TechnologySnapshot,
  domain: TechnologyDomain,
  assets: readonly TechnologyAsset[],
): ItOtDomainCohort {
  return {
    domain,
    population: assets.length,
    assetClass: summarizeDimension(assets, assetClassValue),
    role: summarizeDimension(assets, roleValue),
    operationalContext: summarizeOperationalContexts(assets),
    metrics: {
      inventoryCount: metric("nexus.inventory.assets.count", snapshot, domain),
      taxonomyResolved: metric("nexus.taxonomy.resolved.ratio", snapshot, domain),
      sourceInstanceIdentity: metric("nexus.sources.instance_identity.ratio", snapshot, domain),
      lifecycleKnown: metric("nexus.lifecycle.known.ratio", snapshot, domain),
    },
  };
}

/**
 * Construye cohortes IT/OT únicamente desde Taxonomy v2 resuelta.
 * Los scalars de compatibilidad de TechnologyAsset nunca asignan una cohorte analítica.
 */
export function buildItOtIntelligenceReport(snapshot: TechnologySnapshot): ItOtIntelligenceReport {
  const cohorts: Record<TechnologyDomain, TechnologyAsset[]> = { IT: [], OT: [] };
  const unresolvedByReason: ItOtDomainResolutionBreakdown = {
    assessmentMissing: 0,
    unknown: 0,
    unclassified: 0,
    conflict: 0,
  };

  for (const asset of snapshot.assets) {
    const domain = classifiedDomain(asset);
    if (domain) {
      cohorts[domain].push(asset);
      continue;
    }

    const reason = unresolvedReason(asset);
    if (reason === "assessment_missing") unresolvedByReason.assessmentMissing++;
    else if (reason === "unknown") unresolvedByReason.unknown++;
    else if (reason === "unclassified") unresolvedByReason.unclassified++;
    else if (reason === "conflict") unresolvedByReason.conflict++;
  }

  const classified = cohorts.IT.length + cohorts.OT.length;
  const total = snapshot.assets.length;

  return {
    asOf: snapshot.asOf,
    population: {
      total,
      classified,
      unresolved: total - classified,
      domainCoverage: coverage(classified, total),
      unresolvedByReason,
    },
    cohorts: {
      IT: buildCohort(snapshot, "IT", cohorts.IT),
      OT: buildCohort(snapshot, "OT", cohorts.OT),
    },
  };
}
