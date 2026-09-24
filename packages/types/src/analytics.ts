import {
  type SourceReference,
  type TaxonomyClassificationState,
  type TechnologyAsset,
  type TechnologySnapshot,
} from "./model.js";

export const metricValueKinds = ["count", "ratio"] as const;
export type MetricValueKind = (typeof metricValueKinds)[number];

export const metricUnits = ["count", "1"] as const;
export type MetricUnit = (typeof metricUnits)[number];

export const metricCategories = ["inventory", "taxonomy", "sources", "lifecycle"] as const;
export type MetricCategory = (typeof metricCategories)[number];

export const metricDimensions = [
  "domain",
  "assetClass",
  "role",
  "lifecycle",
  "taxonomyState",
  "source",
  "operationalContext",
] as const;
export type MetricDimension = (typeof metricDimensions)[number];

export const metricEvidenceRequirements = [
  "asset",
  "taxonomy_assessment",
  "source_reference",
  "lifecycle_state",
] as const;
export type MetricEvidenceRequirement = (typeof metricEvidenceRequirements)[number];

export const metricCoverageStates = ["known", "partial", "unavailable"] as const;
export type MetricCoverageState = (typeof metricCoverageStates)[number];

export const metricCoverageReasons = [
  "complete",
  "partial_evidence",
  "missing_evidence",
  "no_eligible_population",
] as const;
export type MetricCoverageReason = (typeof metricCoverageReasons)[number];

export type MetricId = `nexus.${string}`;

export interface MetricDefinition {
  readonly id: MetricId;
  readonly version: 1;
  readonly label: string;
  readonly description: string;
  readonly category: MetricCategory;
  readonly valueKind: MetricValueKind;
  /**
   * count uses the natural count unit. Ratios use the dimensionless base unit "1"
   * and remain in [0, 1]; presentation layers may format them as percentages.
   */
  readonly unit: MetricUnit;
  readonly populationDescription: string;
  readonly numeratorDescription: string;
  readonly denominatorDescription?: string;
  readonly timeBasis: "snapshot";
  readonly requiredEvidence: readonly MetricEvidenceRequirement[];
  readonly allowedDimensions: readonly MetricDimension[];
}

export interface MetricScopeFilter {
  readonly dimension: MetricDimension;
  readonly values: readonly string[];
}

export interface MetricScope {
  readonly filters: readonly MetricScopeFilter[];
}

export const emptyMetricScope: MetricScope = Object.freeze({ filters: Object.freeze([]) });

export interface MetricCoverage {
  readonly state: MetricCoverageState;
  readonly known: number;
  readonly total: number;
  readonly ratio: number | null;
  readonly reason: MetricCoverageReason;
}

export interface MetricPopulation {
  readonly snapshot: number;
  readonly scoped: number;
  readonly eligible: number;
  readonly excluded: number;
  /** Eligible entities whose required evidence is not available for this metric. */
  readonly unknown: number;
}

export interface MetricResult {
  readonly metricId: MetricId;
  readonly definitionVersion: 1;
  readonly valueKind: MetricValueKind;
  readonly unit: MetricUnit;
  readonly asOf: string;
  readonly scope: MetricScope;
  readonly value: number | null;
  readonly numerator: number;
  readonly denominator: number | null;
  readonly population: MetricPopulation;
  readonly coverage: MetricCoverage;
}

export const metricScopeIssueCodes = [
  "dimension_not_allowed",
  "dimension_duplicate",
  "values_required",
  "value_empty",
] as const;
export type MetricScopeIssueCode = (typeof metricScopeIssueCodes)[number];

export interface MetricScopeIssue {
  readonly code: MetricScopeIssueCode;
  readonly dimension: MetricDimension;
  readonly message: string;
}

export type MetricEvaluation =
  | { readonly status: "ok"; readonly result: MetricResult }
  | { readonly status: "invalid_scope"; readonly issues: readonly MetricScopeIssue[] };

const allDimensions = metricDimensions;
const without = (...dimensions: readonly MetricDimension[]): readonly MetricDimension[] =>
  allDimensions.filter((dimension) => !dimensions.includes(dimension));

export const referenceMetricDefinitions = [
  {
    id: "nexus.inventory.assets.count",
    version: 1,
    label: "Activos en alcance",
    description: "Cantidad de activos canónicos dentro del scope analítico.",
    category: "inventory",
    valueKind: "count",
    unit: "count",
    populationDescription: "Activos del TechnologySnapshot que cumplen el scope solicitado.",
    numeratorDescription: "Activos elegibles dentro del scope.",
    timeBasis: "snapshot",
    requiredEvidence: ["asset"],
    allowedDimensions: allDimensions,
  },
  {
    id: "nexus.taxonomy.resolved.ratio",
    version: 1,
    label: "Clasificación taxonómica resuelta",
    description: "Proporción de assessments presentes cuyo domain, asset class y role están clasificados.",
    category: "taxonomy",
    valueKind: "ratio",
    unit: "1",
    populationDescription: "Activos dentro del scope; la coverage indica cuántos poseen assessment Taxonomy v2.",
    numeratorDescription: "Assessments con domain, asset class y role en estado classified.",
    denominatorDescription: "Activos con assessment Taxonomy v2 disponible.",
    timeBasis: "snapshot",
    requiredEvidence: ["taxonomy_assessment"],
    allowedDimensions: without("taxonomyState"),
  },
  {
    id: "nexus.sources.reference_presence.ratio",
    version: 1,
    label: "Presencia de referencia de fuente",
    description: "Proporción de activos con al menos una SourceReference canónica.",
    category: "sources",
    valueKind: "ratio",
    unit: "1",
    populationDescription: "Activos dentro del scope.",
    numeratorDescription: "Activos con una o más referencias de fuente.",
    denominatorDescription: "Activos elegibles dentro del scope.",
    timeBasis: "snapshot",
    requiredEvidence: ["source_reference"],
    allowedDimensions: without("source"),
  },
  {
    id: "nexus.lifecycle.known.ratio",
    version: 1,
    label: "Lifecycle conocido",
    description: "Proporción de activos cuyo lifecycle canónico no está en estado unknown.",
    category: "lifecycle",
    valueKind: "ratio",
    unit: "1",
    populationDescription: "Activos dentro del scope.",
    numeratorDescription: "Activos cuyo lifecycle canónico es distinto de unknown.",
    denominatorDescription: "Activos elegibles dentro del scope.",
    timeBasis: "snapshot",
    requiredEvidence: ["lifecycle_state"],
    allowedDimensions: without("lifecycle"),
  },
] as const satisfies readonly MetricDefinition[];

export type ReferenceMetricId = (typeof referenceMetricDefinitions)[number]["id"];

const definitionsById = new Map<ReferenceMetricId, MetricDefinition>(
  referenceMetricDefinitions.map((definition) => [definition.id, definition]),
);

export function getReferenceMetricDefinition(id: ReferenceMetricId): MetricDefinition {
  const definition = definitionsById.get(id);
  if (!definition) throw new Error(`Unknown reference metric: ${id}`);
  return definition;
}

function aggregateTaxonomyState(asset: TechnologyAsset): TaxonomyClassificationState | null {
  if (!asset.taxonomy) return null;
  const states = [asset.taxonomy.domain.state, asset.taxonomy.assetClass.state, asset.taxonomy.role.state];
  if (states.includes("conflict")) return "conflict";
  if (states.includes("unclassified")) return "unclassified";
  if (states.includes("unknown")) return "unknown";
  return "classified";
}

function sourceDimensionValue(reference: SourceReference): string {
  return reference.sourceInstanceId
    ? `${reference.source}@${reference.sourceInstanceId}`
    : reference.source;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

/**
 * Canonical dimension values for analytics. Taxonomy dimensions only expose resolved
 * decisions; compatibility scalar projections never become analytical classification.
 */
export function metricDimensionValues(asset: TechnologyAsset, dimension: MetricDimension): readonly string[] {
  switch (dimension) {
    case "domain":
      return asset.taxonomy?.domain.state === "classified" ? [asset.taxonomy.domain.value] : [];
    case "assetClass":
      return asset.taxonomy?.assetClass.state === "classified" ? [asset.taxonomy.assetClass.value] : [];
    case "role":
      return asset.taxonomy?.role.state === "classified" ? [asset.taxonomy.role.value] : [];
    case "lifecycle":
      return [asset.lifecycle];
    case "taxonomyState": {
      const state = aggregateTaxonomyState(asset);
      return state ? [state] : [];
    }
    case "source":
      return unique(asset.sourceReferences.map(sourceDimensionValue));
    case "operationalContext":
      return unique((asset.operationalContexts ?? []).map((context) => `${context.kind}:${context.id}`));
  }
}

export function validateMetricScope(definition: MetricDefinition, scope: MetricScope): readonly MetricScopeIssue[] {
  const issues: MetricScopeIssue[] = [];
  const seen = new Set<MetricDimension>();

  for (const filter of scope.filters) {
    if (!definition.allowedDimensions.includes(filter.dimension)) {
      issues.push({
        code: "dimension_not_allowed",
        dimension: filter.dimension,
        message: `${filter.dimension} is not allowed for metric ${definition.id}`,
      });
    }
    if (seen.has(filter.dimension)) {
      issues.push({
        code: "dimension_duplicate",
        dimension: filter.dimension,
        message: `${filter.dimension} appears more than once in the metric scope`,
      });
    }
    seen.add(filter.dimension);

    if (filter.values.length === 0) {
      issues.push({
        code: "values_required",
        dimension: filter.dimension,
        message: `${filter.dimension} requires at least one value`,
      });
    }
    if (filter.values.some((value) => !value.trim())) {
      issues.push({
        code: "value_empty",
        dimension: filter.dimension,
        message: `${filter.dimension} cannot contain empty values`,
      });
    }
  }
  return issues;
}

function normalizeMetricScope(scope: MetricScope): MetricScope {
  const order = new Map(metricDimensions.map((dimension, index) => [dimension, index] as const));
  const filters = scope.filters
    .map((filter) => ({
      dimension: filter.dimension,
      values: unique(filter.values.map((value) => value.trim())),
    }))
    .sort((left, right) => (order.get(left.dimension) ?? 0) - (order.get(right.dimension) ?? 0));
  return { filters };
}

function matchesScope(asset: TechnologyAsset, scope: MetricScope): boolean {
  return scope.filters.every((filter) => {
    const actual = metricDimensionValues(asset, filter.dimension);
    return filter.values.some((expected) => actual.includes(expected));
  });
}

function metricCoverage(known: number, total: number): MetricCoverage {
  if (total === 0) {
    return { state: "unavailable", known: 0, total: 0, ratio: null, reason: "no_eligible_population" };
  }
  const ratio = known / total;
  if (known === total) return { state: "known", known, total, ratio, reason: "complete" };
  if (known === 0) return { state: "unavailable", known, total, ratio, reason: "missing_evidence" };
  return { state: "partial", known, total, ratio, reason: "partial_evidence" };
}

interface MetricComputation {
  readonly numerator: number;
  readonly denominator: number | null;
  readonly known: number;
}

function taxonomyResolved(asset: TechnologyAsset): boolean {
  return asset.taxonomy?.domain.state === "classified"
    && asset.taxonomy.assetClass.state === "classified"
    && asset.taxonomy.role.state === "classified";
}

function computeMetric(id: ReferenceMetricId, assets: readonly TechnologyAsset[]): MetricComputation {
  switch (id) {
    case "nexus.inventory.assets.count":
      return { numerator: assets.length, denominator: null, known: assets.length };
    case "nexus.taxonomy.resolved.ratio": {
      const known = assets.filter((asset) => asset.taxonomy !== undefined);
      return {
        numerator: known.filter(taxonomyResolved).length,
        denominator: known.length,
        known: known.length,
      };
    }
    case "nexus.sources.reference_presence.ratio":
      return {
        numerator: assets.filter((asset) => asset.sourceReferences.length > 0).length,
        denominator: assets.length,
        known: assets.length,
      };
    case "nexus.lifecycle.known.ratio":
      return {
        numerator: assets.filter((asset) => asset.lifecycle !== "unknown").length,
        denominator: assets.length,
        known: assets.length,
      };
  }
}

export function evaluateReferenceMetric(
  id: ReferenceMetricId,
  snapshot: TechnologySnapshot,
  scope: MetricScope = emptyMetricScope,
): MetricEvaluation {
  const definition = getReferenceMetricDefinition(id);
  const issues = validateMetricScope(definition, scope);
  if (issues.length > 0) return { status: "invalid_scope", issues };

  const normalizedScope = normalizeMetricScope(scope);
  const scopedAssets = snapshot.assets.filter((asset) => matchesScope(asset, normalizedScope));
  const computation = computeMetric(id, scopedAssets);
  const eligible = scopedAssets.length;
  const coverage = metricCoverage(computation.known, eligible);
  const value = definition.valueKind === "count"
    ? computation.numerator
    : computation.denominator && computation.denominator > 0
      ? computation.numerator / computation.denominator
      : null;

  return {
    status: "ok",
    result: {
      metricId: definition.id,
      definitionVersion: definition.version,
      valueKind: definition.valueKind,
      unit: definition.unit,
      asOf: snapshot.asOf,
      scope: normalizedScope,
      value,
      numerator: computation.numerator,
      denominator: computation.denominator,
      population: {
        snapshot: snapshot.assets.length,
        scoped: scopedAssets.length,
        eligible,
        excluded: 0,
        unknown: Math.max(0, eligible - computation.known),
      },
      coverage,
    },
  };
}
