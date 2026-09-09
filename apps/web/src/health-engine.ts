import { ageInDays, lifecycleLabels, type Asset, type AssetType, type InventorySnapshot } from "./asset-model";
import { freshnessOf } from "./explorer-model";
import { validateRelationship, type Relationship, type RelationshipSnapshot } from "./relationship-model";
import { healthDimensions, healthPolicy, healthState, healthWeights,
  type AssetHealth, type CheckStatus, type CmdbHealthReport, type DimensionHealth, type HealthCheck,
  type HealthDimension, type HealthFinding, type HealthFindingCode, type HealthSeverity, type HealthSummary, type HealthTotals,
} from "./health-model";

const hostnameRequired: Readonly<Record<AssetType, boolean>> = {
  Computer: true, NetworkEquipment: true, Phone: false, Monitor: false, Printer: false,
};
const present = (value: string | null) => Boolean(value?.trim());
const canonical = (value: string) => value.trim().toUpperCase();
const ratio = (value: number, total: number) => total ? value / total : 0;

/** ISO calendar dates or timestamps with explicit timezone; reject normalized impossible dates. */
export function validHealthDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  if (value.includes("T")) {
    const [hour, minute, second] = value.slice(11, 19).split(":").map(Number);
    if (hour! > 23 || minute! > 59 || second! > 59) return false;
  }
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  return calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day;
}
function check(key: string, dimension: HealthDimension, status: CheckStatus, code?: HealthFindingCode,
  details: { field?: keyof Asset; relationshipId?: string } = {}, severity: HealthSeverity = "warning", value?: number): HealthCheck {
  return { key, dimension, status, value: status === "unknown" || status === "not_applicable" ? null : value ?? (status === "pass" ? 100 : 0),
    ...(code ? { finding: { code, dimension, severity, ...details } } : {}) };
}
function presence(asset: Asset, field: keyof Asset, dimension: HealthDimension, applicable = true): HealthCheck {
  if (!applicable) return check(field, dimension, "not_applicable");
  return present(String(asset[field] ?? "")) ? check(field, dimension, "pass")
    : check(field, dimension, "missing", "field_missing", { field });
}
function counts(values: readonly (string | null)[], normalize: (value: string) => string = value => value): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  for (const value of values) if (present(value)) { const key = normalize(value!); result.set(key, (result.get(key) ?? 0) + 1); }
  return result;
}
function freshnessChecks(asset: Asset, asOf: string): HealthCheck[] {
  if (!present(asset.lastSeen)) return [check("lastSeen", "freshness", "unknown", "observation_unknown", {}, "info")];
  const age = ageInDays(asset.lastSeen, asOf);
  if (!validHealthDate(asset.lastSeen!) || age === null || age < 0) return [check("lastSeen", "freshness", "invalid", "observation_invalid")];
  if (freshnessOf(asset, asOf) === "fresh") return [check("lastSeen", "freshness", "pass")];
  return [check("lastSeen", "freshness", "warning", age > healthPolicy.veryStaleDays ? "observation_very_stale" : "observation_stale", {}, "warning", age > healthPolicy.veryStaleDays ? 0 : healthPolicy.staleScore)];
}
function relationChecks(relation: Relationship, assets: ReadonlyMap<string, number>, ids: ReadonlyMap<string, number>, asOf: string): HealthCheck[] {
  const details = { relationshipId: relation.id };
  const make = (key: string, status: CheckStatus, code?: HealthFindingCode, severity: HealthSeverity = "warning", value?: number) =>
    check(`${relation.id}:${key}`, "relationships", status, code, details, severity, value);
  const invalid = validateRelationship(relation).length > 0;
  const duplicate = (ids.get(relation.id) ?? 0) > 1;
  const references = assets.get(relation.sourceId) === 1 && assets.get(relation.targetId) === 1;
  const result = [
    invalid ? make("structure", "invalid", "relationship_invalid", "critical")
      : duplicate ? make("structure", "invalid", "relationship_duplicate", "critical") : make("structure", "pass"),
    references ? make("references", "pass") : make("references", "invalid", "relationship_reference_missing", "critical"),
  ];
  const age = ageInDays(relation.observedAt, asOf);
  if (!present(relation.observedAt)) result.push(make("observation", "unknown", "relationship_observation_unknown", "info"));
  else if (!validHealthDate(relation.observedAt!) || age === null || age < 0) result.push(make("observation", "invalid", "relationship_observation_invalid"));
  else if (freshnessOf({ lastSeen: relation.observedAt }, asOf) === "stale") result.push(make("observation", "warning", "relationship_observation_stale", "warning", age > healthPolicy.veryStaleDays ? 0 : healthPolicy.staleScore));
  else result.push(make("observation", "pass"));
  // CMDB-010 does not define status as data quality. Keep it informational, outside scoring/coverage.
  if (relation.status !== "active") result.push(make("status", "not_applicable", "relationship_status_review", "info"));
  return result;
}
function evaluate(asset: Asset, checks: readonly HealthCheck[]): AssetHealth {
  const totals = { earned: 0, evaluatedWeight: 0, evidenceWeight: 0, applicableWeight: 0 };
  const dimensions: DimensionHealth[] = healthDimensions.map(dimension => {
    const entries = checks.filter(c => c.dimension === dimension);
    const applicable = entries.filter(c => c.status !== "not_applicable");
    const evaluated = applicable.filter(c => c.value !== null);
    const evidence = applicable.filter(c => c.status !== "missing" && c.status !== "unknown");
    const points = evaluated.reduce((sum, c) => sum + c.value!, 0);
    const weight = healthWeights[dimension];
    if (applicable.length) {
      totals.applicableWeight += weight;
      totals.earned += weight * ratio(points, applicable.length * 100);
      totals.evaluatedWeight += weight * ratio(evaluated.length, applicable.length);
      totals.evidenceWeight += weight * ratio(evidence.length, applicable.length);
    }
    return { dimension, score: evaluated.length ? points / evaluated.length : null,
      coverage: applicable.length ? 100 * evidence.length / applicable.length : null,
      applicable: applicable.length, evaluated: evaluated.length, checks: entries };
  });
  const score = totals.evaluatedWeight ? 100 * totals.earned / totals.evaluatedWeight : null;
  const coverage = 100 * ratio(totals.evidenceWeight, totals.applicableWeight);
  return { asset, score, coverage, state: healthState(score, coverage), dimensions,
    findings: checks.flatMap(c => c.finding ? [c.finding] : []), totals };
}
export function summarizeHealth(rows: readonly AssetHealth[]): HealthSummary {
  const totals: HealthTotals = rows.reduce((acc, row) => ({ earned: acc.earned + row.totals.earned,
    evaluatedWeight: acc.evaluatedWeight + row.totals.evaluatedWeight, evidenceWeight: acc.evidenceWeight + row.totals.evidenceWeight,
    applicableWeight: acc.applicableWeight + row.totals.applicableWeight }), { earned: 0, evaluatedWeight: 0, evidenceWeight: 0, applicableWeight: 0 });
  const score = totals.evaluatedWeight ? 100 * totals.earned / totals.evaluatedWeight : null;
  const coverage = 100 * ratio(totals.evidenceWeight, totals.applicableWeight);
  const distribution = { healthy: 0, attention: 0, degraded: 0, insufficient: 0, unknown: 0 };
  const causes = new Map<HealthFindingCode, number>();
  for (const row of rows) {
    distribution[row.state]++;
    for (const code of new Set(row.findings.map(f => f.code))) causes.set(code, (causes.get(code) ?? 0) + 1);
  }
  return { score, coverage, evaluated: rows.filter(r => r.score !== null).length, total: rows.length, state: healthState(score, coverage), distribution,
    dimensions: healthDimensions.map(dimension => {
      let earned = 0, evaluated = 0, evidence = 0, applicable = 0;
      for (const row of rows) {
        const d = row.dimensions.find(value => value.dimension === dimension)!;
        if (!d.applicable) continue;
        applicable++;
        evaluated += d.evaluated / d.applicable;
        earned += (d.score ?? 0) * d.evaluated / d.applicable;
        evidence += (d.coverage ?? 0) / 100;
      }
      return { dimension, score: evaluated ? earned / evaluated : null, coverage: applicable ? 100 * evidence / applicable : null };
    }),
    topFindings: [...causes].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)) };
}

/** O(n + r) evaluation; sorting the presentation separately costs O(n log n). No provider or React dependency. */
export function buildCmdbHealth(inventory: InventorySnapshot, relationships: RelationshipSnapshot | null): CmdbHealthReport {
  if (!validHealthDate(inventory.asOf)) throw new RangeError("invalid inventory cut");
  if (relationships && (!validHealthDate(relationships.asOf) || Date.parse(relationships.asOf) !== Date.parse(inventory.asOf))) throw new RangeError("incompatible snapshot cuts");
  const ids = counts(inventory.assets.map(a => a.id));
  const tags = counts(inventory.assets.map(a => a.assetTag), canonical);
  const relationIds = counts(relationships?.relationships.map(r => r.id) ?? []);
  const byEndpoint = new Map<string, HealthCheck[]>();
  const relationshipFindings: HealthFinding[] = [];
  let orphanRelationships = 0;
  for (const relation of relationships?.relationships ?? []) {
    const checks = relationChecks(relation, ids, relationIds, inventory.asOf);
    relationshipFindings.push(...checks.flatMap(c => c.finding ? [c.finding] : []));
    if (!ids.has(relation.sourceId) && !ids.has(relation.targetId)) orphanRelationships++;
    for (const endpoint of new Set([relation.sourceId, relation.targetId])) {
      const entries = byEndpoint.get(endpoint) ?? [];
      entries.push(...checks); byEndpoint.set(endpoint, entries);
    }
  }
  const assets = inventory.assets.map(asset => {
    const checks: HealthCheck[] = [
      ...(["manufacturer", "model", "location"] as const).map(field => presence(asset, field, "completeness")),
      presence(asset, "owner", "completeness", asset.lifecycle === "assigned"),
      ...(["id", "name", "serial", "assetTag"] as const).map(field => presence(asset, field, "identity")),
      presence(asset, "hostname", "identity", hostnameRequired[asset.type]),
      ...freshnessChecks(asset, inventory.asOf),
      Object.hasOwn(lifecycleLabels, asset.lifecycle) ? check("lifecycle", "consistency", "pass") : check("lifecycle", "consistency", "invalid", "lifecycle_invalid"),
      !present(asset.warrantyEnds) ? check("warrantyEnds", "consistency", "unknown", "warranty_unknown", {}, "info")
        : validHealthDate(asset.warrantyEnds!) ? check("warrantyEnds", "consistency", "pass") : check("warrantyEnds", "consistency", "invalid", "warranty_invalid"),
    ];
    for (const [field, index] of [["id", ids], ["assetTag", tags]] as const) {
      const value = asset[field];
      if (value && (index.get(field === "assetTag" ? canonical(value) : value) ?? 0) > 1) {
        const position = checks.findIndex(c => c.dimension === "identity" && c.key === field);
        checks[position] = check(field, "identity", "invalid", "identity_duplicate", { field }, "critical");
      }
    }
    checks.push(...(relationships === null ? [check("snapshot", "relationships", "unknown", "relationships_unknown", {}, "info")]
      : byEndpoint.get(asset.id) ?? [check("no-relations", "relationships", "not_applicable")]));
    return evaluate(asset, checks);
  });
  return { asOf: inventory.asOf, assets, relationshipFindings, orphanRelationships, summary: summarizeHealth(assets) };
}
const severityOrder = { critical: 2, warning: 1, info: 0 } as const;
export function prioritizeHealth(rows: readonly AssetHealth[]): AssetHealth[] {
  const severity = (r: AssetHealth) => r.findings.reduce((max, finding) => Math.max(max, severityOrder[finding.severity]), 0);
  return [...rows].sort((a, b) => (a.score ?? -1) - (b.score ?? -1) || severity(b) - severity(a) || a.asset.id.localeCompare(b.asset.id));
}

export interface HealthFilters { readonly state: string; readonly dimension: string; readonly type: string; readonly cause: string }
export const emptyHealthFilters: HealthFilters = { state: "", dimension: "", type: "", cause: "" };
export function filterHealth(rows: readonly AssetHealth[], filters: HealthFilters): AssetHealth[] {
  return prioritizeHealth(rows.filter(row => (!filters.state || row.state === filters.state)
    && (!filters.type || row.asset.type === filters.type)
    && (!filters.dimension || row.findings.some(f => f.dimension === filters.dimension))
    && (!filters.cause || row.findings.some(f => f.code === filters.cause))));
}
