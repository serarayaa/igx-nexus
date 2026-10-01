import type {
  Observation,
  ObservationName,
  TechnologyAsset,
  TechnologyDomain,
  TechnologySnapshot,
} from "./model.js";

export const endpointExperienceWindowDays = [7, 14, 30] as const;
export type EndpointExperienceWindowDays = (typeof endpointExperienceWindowDays)[number];

export const endpointExperienceAssetClasses = ["endpoint", "operator_interface", "industrial_compute"] as const;
export type EndpointExperienceAssetClass = (typeof endpointExperienceAssetClasses)[number];

export interface EndpointExperienceCoverage {
  readonly state: "known" | "partial" | "unavailable";
  readonly known: number;
  readonly total: number;
  readonly ratio: number | null;
}

export interface EndpointExperiencePopulation {
  readonly scoped: number;
  readonly eligible: number;
  readonly excluded: number;
  readonly assetIds: readonly string[];
}

export interface EndpointEventSummary {
  readonly eventCount: number;
  readonly affectedAssets: number;
  readonly affectedRatio: number | null;
  readonly coverage: EndpointExperienceCoverage;
}

export interface EndpointReliabilitySummary {
  readonly coverage: EndpointExperienceCoverage;
  readonly crashes: EndpointEventSummary;
  readonly hangs: EndpointEventSummary;
}

export interface EndpointRestartSummary {
  readonly coverage: EndpointExperienceCoverage;
  readonly unexpected: EndpointEventSummary;
  readonly stopError: EndpointEventSummary;
}

export interface EndpointStartupSummary {
  readonly coverage: EndpointExperienceCoverage;
  readonly samples: number;
  readonly assetsWithSamples: number;
  readonly averageMs: number | null;
}

export interface EndpointBatterySummary {
  readonly capabilityCoverage: EndpointExperienceCoverage;
  readonly present: number;
  readonly absent: number;
  readonly capacityCoverage: EndpointExperienceCoverage;
  readonly averageCapacityPercent: number | null;
}

export interface EndpointExperienceReport {
  readonly asOf: string;
  readonly windowDays: EndpointExperienceWindowDays;
  readonly domain: TechnologyDomain | "all";
  readonly population: EndpointExperiencePopulation;
  readonly reliability: EndpointReliabilitySummary;
  readonly restarts: EndpointRestartSummary;
  readonly startup: EndpointStartupSummary;
  readonly battery: EndpointBatterySummary;
}

const DAY = 86_400_000;
const operationalLifecycles = new Set<TechnologyAsset["lifecycle"]>(["active", "maintenance", "repair"]);
const experienceClasses = new Set<string>(endpointExperienceAssetClasses);

function coverage(known: number, total: number): EndpointExperienceCoverage {
  if (total === 0) return { state: "unavailable", known: 0, total: 0, ratio: null };
  const ratio = known / total;
  if (known === total) return { state: "known", known, total, ratio };
  if (known === 0) return { state: "unavailable", known, total, ratio };
  return { state: "partial", known, total, ratio };
}

function inWindow(observation: Observation, start: number, end: number): boolean {
  const value = Date.parse(observation.observedAt);
  return Number.isFinite(value) && value >= start && value <= end;
}

function scopeAssets(snapshot: TechnologySnapshot, domain: TechnologyDomain | "all"): readonly TechnologyAsset[] {
  if (domain === "all") return snapshot.assets;
  return snapshot.assets.filter((asset) =>
    asset.taxonomy?.domain.state === "classified" && asset.taxonomy.domain.value === domain,
  );
}

function isEligibleEndpoint(asset: TechnologyAsset): boolean {
  if (!operationalLifecycles.has(asset.lifecycle)) return false;
  return asset.taxonomy?.assetClass.state === "classified"
    && experienceClasses.has(asset.taxonomy.assetClass.value);
}

function observationsFor(
  observations: readonly Observation[],
  assetIds: ReadonlySet<string>,
  name: ObservationName,
): readonly Observation[] {
  return observations.filter((observation) => assetIds.has(observation.assetId) && observation.name === name);
}

function coveredAssetIds(
  snapshot: TechnologySnapshot,
  eligibleIds: ReadonlySet<string>,
  markerName: ObservationName,
  windowDays: EndpointExperienceWindowDays,
): ReadonlySet<string> {
  const result = new Set<string>();
  for (const observation of snapshot.observations) {
    if (!eligibleIds.has(observation.assetId) || observation.name !== markerName) continue;
    if (observation.observedAt !== snapshot.asOf) continue;
    if (observation.value.kind !== "number" || observation.value.unit !== "day") continue;
    if (observation.value.value >= windowDays) result.add(observation.assetId);
  }
  return result;
}

function eventSummary(
  snapshot: TechnologySnapshot,
  covered: ReadonlySet<string>,
  name: ObservationName,
  start: number,
  end: number,
  totalEligible: number,
): EndpointEventSummary {
  const events = observationsFor(snapshot.observations, covered, name)
    .filter((observation) => observation.category === "event" && inWindow(observation, start, end));
  const affected = new Set(events.map((observation) => observation.assetId));
  return {
    eventCount: events.length,
    affectedAssets: affected.size,
    affectedRatio: covered.size === 0 ? null : affected.size / covered.size,
    coverage: coverage(covered.size, totalEligible),
  };
}

function latestBooleanInWindow(
  observations: readonly Observation[],
  assetId: string,
  name: ObservationName,
  start: number,
  end: number,
): boolean | null {
  const candidates = observations
    .filter((observation) => observation.assetId === assetId && observation.name === name && inWindow(observation, start, end))
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt));
  const value = candidates[0]?.value;
  return value?.kind === "boolean" ? value.value : null;
}

function latestNumberInWindow(
  observations: readonly Observation[],
  assetId: string,
  name: ObservationName,
  start: number,
  end: number,
  unit?: string,
): number | null {
  const candidates = observations
    .filter((observation) => observation.assetId === assetId && observation.name === name && inWindow(observation, start, end))
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt));
  const value = candidates[0]?.value;
  return value?.kind === "number"
    && Number.isFinite(value.value)
    && (unit === undefined || value.unit === unit)
    ? value.value
    : null;
}

export function buildEndpointExperienceReport(
  snapshot: TechnologySnapshot,
  options: { readonly windowDays?: EndpointExperienceWindowDays; readonly domain?: TechnologyDomain | "all" } = {},
): EndpointExperienceReport {
  const windowDays = options.windowDays ?? 14;
  const domain = options.domain ?? "all";
  const scoped = scopeAssets(snapshot, domain);
  const eligibleAssets = scoped.filter(isEligibleEndpoint);
  const eligibleIds = new Set(eligibleAssets.map((asset) => asset.id));
  const end = Date.parse(snapshot.asOf);
  const start = end - windowDays * DAY;

  const eventLogCovered = coveredAssetIds(snapshot, eligibleIds, "endpoint.event_log.window.days", windowDays);
  const reliabilityCovered = coveredAssetIds(snapshot, eligibleIds, "endpoint.reliability.window.days", windowDays);
  const startupCovered = coveredAssetIds(snapshot, eligibleIds, "endpoint.startup.window.days", windowDays);

  const crashes = eventSummary(snapshot, reliabilityCovered, "application.crash", start, end, eligibleAssets.length);
  const hangs = eventSummary(snapshot, reliabilityCovered, "application.hang", start, end, eligibleAssets.length);
  const unexpected = eventSummary(snapshot, eventLogCovered, "system.unexpected_restart", start, end, eligibleAssets.length);
  const stopError = eventSummary(snapshot, eventLogCovered, "system.stop_error_restart", start, end, eligibleAssets.length);

  const startupObservations = observationsFor(snapshot.observations, startupCovered, "startup.duration.ms")
    .filter((observation) =>
      inWindow(observation, start, end)
      && observation.value.kind === "number"
      && observation.value.unit === "ms"
      && observation.value.value >= 0,
    );
  const startupValues = startupObservations.map((observation) =>
    observation.value.kind === "number" ? observation.value.value : 0,
  );
  const startupAssets = new Set(startupObservations.map((observation) => observation.assetId));

  const batteryKnown = new Map<string, boolean>();
  for (const asset of eligibleAssets) {
    const value = latestBooleanInWindow(snapshot.observations, asset.id, "battery.present", start, end);
    if (value !== null) batteryKnown.set(asset.id, value);
  }
  const presentIds = [...batteryKnown.entries()].filter(([, present]) => present).map(([assetId]) => assetId);
  const capacities = presentIds
    .map((assetId) => latestNumberInWindow(snapshot.observations, assetId, "battery.capacity.percent", start, end, "percent"))
    .filter((value): value is number => value !== null && value >= 0 && value <= 100);

  return {
    asOf: snapshot.asOf,
    windowDays,
    domain,
    population: {
      scoped: scoped.length,
      eligible: eligibleAssets.length,
      excluded: scoped.length - eligibleAssets.length,
      assetIds: eligibleAssets.map((asset) => asset.id),
    },
    reliability: {
      coverage: coverage(reliabilityCovered.size, eligibleAssets.length),
      crashes,
      hangs,
    },
    restarts: {
      coverage: coverage(eventLogCovered.size, eligibleAssets.length),
      unexpected,
      stopError,
    },
    startup: {
      coverage: coverage(startupCovered.size, eligibleAssets.length),
      samples: startupValues.length,
      assetsWithSamples: startupAssets.size,
      averageMs: startupValues.length === 0
        ? null
        : startupValues.reduce((sum, value) => sum + value, 0) / startupValues.length,
    },
    battery: {
      capabilityCoverage: coverage(batteryKnown.size, eligibleAssets.length),
      present: presentIds.length,
      absent: [...batteryKnown.values()].filter((present) => !present).length,
      capacityCoverage: coverage(capacities.length, presentIds.length),
      averageCapacityPercent: capacities.length === 0
        ? null
        : capacities.reduce((sum, value) => sum + value, 0) / capacities.length,
    },
  };
}
