import type {
  Observation,
  ObservationName,
  TechnologyAsset,
  TechnologyDomain,
  TechnologySnapshot,
} from "./model.js";
import {
  endpointExperienceAssetClasses,
  type EndpointExperienceCoverage,
  type EndpointExperienceWindowDays,
} from "./endpoint-experience.js";

export const proactiveFindingRuleIds = [
  "nexus.endpoint.application-instability",
  "nexus.endpoint.repeated-unclean-restart",
  "nexus.endpoint.battery-capacity-evidence-gap",
] as const;

export type ProactiveFindingRuleId = (typeof proactiveFindingRuleIds)[number];
export type ProactiveFindingEvaluationState = "triggered" | "not_triggered" | "unavailable";
export type ProactiveFindingConfidence = "supported" | "limited";

export interface ProactiveFindingEvidence {
  readonly observationId: string;
  readonly name: ObservationName;
  readonly observedAt: string;
  readonly source: Observation["source"]["source"];
  readonly sourceInstanceId: string | null;
}

export interface ProactiveFindingPattern {
  readonly kind: "recurrence" | "evidence_gap";
  readonly observedCount: number;
  readonly threshold: number | null;
  readonly description: string;
}

export interface ProactiveFindingHypothesis {
  readonly text: string;
  readonly causal: false;
}

export interface ProactiveFinding {
  readonly id: string;
  readonly ruleId: ProactiveFindingRuleId;
  readonly ruleVersion: "1";
  readonly assetId: string;
  readonly title: string;
  readonly summary: string;
  readonly asOf: string;
  readonly windowDays: EndpointExperienceWindowDays;
  readonly pattern: ProactiveFindingPattern;
  readonly hypothesis: ProactiveFindingHypothesis;
  readonly confidence: {
    readonly state: ProactiveFindingConfidence;
    readonly rationale: string;
  };
  readonly evidence: readonly ProactiveFindingEvidence[];
  readonly investigationGuidance: readonly string[];
}

export interface ProactiveFindingRuleEvaluation {
  readonly ruleId: ProactiveFindingRuleId;
  readonly ruleVersion: "1";
  readonly state: ProactiveFindingEvaluationState;
  readonly coverage: EndpointExperienceCoverage;
  readonly evaluatedAssets: number;
  readonly triggeredAssets: number;
}

export interface ProactiveFindingsReport {
  readonly asOf: string;
  readonly windowDays: EndpointExperienceWindowDays;
  readonly domain: TechnologyDomain | "all";
  readonly population: {
    readonly scoped: number;
    readonly eligible: number;
    readonly excluded: number;
    readonly assetIds: readonly string[];
  };
  readonly findings: readonly ProactiveFinding[];
  readonly evaluations: readonly ProactiveFindingRuleEvaluation[];
}

export interface ProactiveFindingRuleDefinition {
  readonly id: ProactiveFindingRuleId;
  readonly version: "1";
  readonly label: string;
  readonly evidenceFamily: "reliability" | "event_log" | "battery";
  readonly pattern: string;
  readonly nonCausal: true;
}

export const proactiveFindingRules: readonly ProactiveFindingRuleDefinition[] = Object.freeze([
  Object.freeze({
    id: "nexus.endpoint.application-instability",
    version: "1",
    label: "Repeated application instability",
    evidenceFamily: "reliability",
    pattern: "At least two crash/hang observations on the same covered endpoint inside the requested window.",
    nonCausal: true,
  }),
  Object.freeze({
    id: "nexus.endpoint.repeated-unclean-restart",
    version: "1",
    label: "Repeated unclean restart",
    evidenceFamily: "event_log",
    pattern: "At least two unexpected restart observations on the same covered endpoint inside the requested window.",
    nonCausal: true,
  }),
  Object.freeze({
    id: "nexus.endpoint.battery-capacity-evidence-gap",
    version: "1",
    label: "Battery capacity evidence gap",
    evidenceFamily: "battery",
    pattern: "Battery presence is observed but no valid capacity percentage is observable inside the requested window.",
    nonCausal: true,
  }),
]);

const DAY = 86_400_000;
const operationalLifecycles = new Set<TechnologyAsset["lifecycle"]>(["active", "maintenance", "repair"]);
const experienceClasses = new Set<string>(endpointExperienceAssetClasses);
const RECURRENCE_THRESHOLD = 2;

function coverage(known: number, total: number): EndpointExperienceCoverage {
  if (total === 0) return { state: "unavailable", known: 0, total: 0, ratio: null };
  const ratio = known / total;
  if (known === total) return { state: "known", known, total, ratio };
  if (known === 0) return { state: "unavailable", known, total, ratio };
  return { state: "partial", known, total, ratio };
}

function scopedAssets(snapshot: TechnologySnapshot, domain: TechnologyDomain | "all"): readonly TechnologyAsset[] {
  if (domain === "all") return snapshot.assets;
  return snapshot.assets.filter((asset) =>
    asset.taxonomy?.domain.state === "classified" && asset.taxonomy.domain.value === domain,
  );
}

function eligibleAsset(asset: TechnologyAsset): boolean {
  if (!operationalLifecycles.has(asset.lifecycle)) return false;
  return asset.taxonomy?.assetClass.state === "classified"
    && experienceClasses.has(asset.taxonomy.assetClass.value);
}

function inWindow(observation: Observation, start: number, end: number): boolean {
  const timestamp = Date.parse(observation.observedAt);
  return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
}

function markerCovers(
  snapshot: TechnologySnapshot,
  assetId: string,
  markerName: ObservationName,
  windowDays: EndpointExperienceWindowDays,
): boolean {
  return snapshot.observations.some((observation) =>
    observation.assetId === assetId
    && observation.name === markerName
    && observation.observedAt === snapshot.asOf
    && observation.value.kind === "number"
    && observation.value.unit === "day"
    && Number.isFinite(observation.value.value)
    && observation.value.value >= windowDays,
  );
}

function eventObservations(
  snapshot: TechnologySnapshot,
  assetId: string,
  names: readonly ObservationName[],
  start: number,
  end: number,
): readonly Observation[] {
  const accepted = new Set<ObservationName>(names);
  return snapshot.observations
    .filter((observation) =>
      observation.assetId === assetId
      && observation.category === "event"
      && accepted.has(observation.name)
      && inWindow(observation, start, end),
    )
    .sort((left, right) =>
      left.observedAt.localeCompare(right.observedAt) || left.id.localeCompare(right.id),
    );
}

function latestObservation(
  snapshot: TechnologySnapshot,
  assetId: string,
  name: ObservationName,
  start: number,
  end: number,
): Observation | null {
  return snapshot.observations
    .filter((observation) =>
      observation.assetId === assetId
      && observation.name === name
      && inWindow(observation, start, end),
    )
    .sort((left, right) =>
      right.observedAt.localeCompare(left.observedAt) || right.id.localeCompare(left.id),
    )[0] ?? null;
}

function evidence(observations: readonly Observation[]): readonly ProactiveFindingEvidence[] {
  return observations.map((observation) => Object.freeze({
    observationId: observation.id,
    name: observation.name,
    observedAt: observation.observedAt,
    source: observation.source.source,
    sourceInstanceId: observation.source.sourceInstanceId ?? null,
  }));
}

function findingId(ruleId: ProactiveFindingRuleId, assetId: string): string {
  return `${ruleId}:${assetId}`;
}

function evaluation(
  ruleId: ProactiveFindingRuleId,
  known: number,
  total: number,
  triggeredAssets: number,
): ProactiveFindingRuleEvaluation {
  return Object.freeze({
    ruleId,
    ruleVersion: "1",
    state: known === 0 ? "unavailable" : triggeredAssets > 0 ? "triggered" : "not_triggered",
    coverage: coverage(known, total),
    evaluatedAssets: known,
    triggeredAssets,
  });
}

export function buildProactiveFindingsReport(
  snapshot: TechnologySnapshot,
  options: {
    readonly windowDays?: EndpointExperienceWindowDays;
    readonly domain?: TechnologyDomain | "all";
  } = {},
): ProactiveFindingsReport {
  const windowDays = options.windowDays ?? 14;
  const domain = options.domain ?? "all";
  const scoped = scopedAssets(snapshot, domain);
  const eligible = scoped.filter(eligibleAsset);
  const end = Date.parse(snapshot.asOf);
  const start = end - windowDays * DAY;

  const findings: ProactiveFinding[] = [];

  let reliabilityKnown = 0;
  let reliabilityTriggered = 0;
  let restartKnown = 0;
  let restartTriggered = 0;
  let batteryKnown = 0;
  let batteryTriggered = 0;

  for (const asset of eligible) {
    if (markerCovers(snapshot, asset.id, "endpoint.reliability.window.days", windowDays)) {
      reliabilityKnown += 1;
      const applicationEvents = eventObservations(
        snapshot,
        asset.id,
        ["application.crash", "application.hang"],
        start,
        end,
      );
      if (applicationEvents.length >= RECURRENCE_THRESHOLD) {
        reliabilityTriggered += 1;
        findings.push(Object.freeze({
          id: findingId("nexus.endpoint.application-instability", asset.id),
          ruleId: "nexus.endpoint.application-instability",
          ruleVersion: "1",
          assetId: asset.id,
          title: "Inestabilidad repetida de aplicación",
          summary: `${applicationEvents.length} crashes/hangs observados en ${windowDays} días.`,
          asOf: snapshot.asOf,
          windowDays,
          pattern: Object.freeze({
            kind: "recurrence",
            observedCount: applicationEvents.length,
            threshold: RECURRENCE_THRESHOLD,
            description: "Se observó recurrencia de crashes/hangs dentro de una ventana con cobertura declarada.",
          }),
          hypothesis: Object.freeze({
            text: "Existe una señal repetida de inestabilidad de aplicación que conviene investigar; la evidencia no identifica por sí sola una causa de software, hardware o configuración.",
            causal: false,
          }),
          confidence: Object.freeze({
            state: "supported",
            rationale: "El patrón se apoya en observations de crash/hang y en un marker de cobertura suficiente para la ventana. La confianza describe soporte de evidencia, no probabilidad causal.",
          }),
          evidence: evidence(applicationEvents),
          investigationGuidance: Object.freeze([
            "Revisar qué aplicación o servicio corresponde a los eventos mediante una fuente autorizada.",
            "Comparar temporalidad con cambios, actualizaciones y otros eventos del endpoint sin asumir causalidad.",
          ]),
        }));
      }
    }

    if (markerCovers(snapshot, asset.id, "endpoint.event_log.window.days", windowDays)) {
      restartKnown += 1;
      const unexpectedRestarts = eventObservations(
        snapshot,
        asset.id,
        ["system.unexpected_restart"],
        start,
        end,
      );
      if (unexpectedRestarts.length >= RECURRENCE_THRESHOLD) {
        restartTriggered += 1;
        const stopErrors = eventObservations(
          snapshot,
          asset.id,
          ["system.stop_error_restart"],
          start,
          end,
        );
        findings.push(Object.freeze({
          id: findingId("nexus.endpoint.repeated-unclean-restart", asset.id),
          ruleId: "nexus.endpoint.repeated-unclean-restart",
          ruleVersion: "1",
          assetId: asset.id,
          title: "Reinicios no limpios repetidos",
          summary: `${unexpectedRestarts.length} reinicios no limpios observados en ${windowDays} días${stopErrors.length ? `; ${stopErrors.length} stop-error observado(s) por separado` : ""}.`,
          asOf: snapshot.asOf,
          windowDays,
          pattern: Object.freeze({
            kind: "recurrence",
            observedCount: unexpectedRestarts.length,
            threshold: RECURRENCE_THRESHOLD,
            description: "Se observaron múltiples reinicios no limpios dentro de una ventana con cobertura declarada.",
          }),
          hypothesis: Object.freeze({
            text: "Existe un patrón de reinicios no limpios que requiere investigación. Event 41/6008 u observaciones equivalentes no demuestran por sí solas pérdida de energía, falla de hardware ni otra causa específica.",
            causal: false,
          }),
          confidence: Object.freeze({
            state: "supported",
            rationale: "El patrón se apoya en observations de reinicio no limpio y cobertura Event Log suficiente. La confianza no expresa certeza sobre la causa.",
          }),
          evidence: evidence([...unexpectedRestarts, ...stopErrors]),
          investigationGuidance: Object.freeze([
            "Revisar eventos cercanos en el tiempo y evidencia de stop-error disponible.",
            "Correlacionar con cambios y contexto operacional sólo como hipótesis de investigación.",
          ]),
        }));
      }
    }

    const batteryPresent = latestObservation(snapshot, asset.id, "battery.present", start, end);
    if (batteryPresent?.value.kind === "boolean") {
      batteryKnown += 1;
      if (batteryPresent.value.value) {
        const capacity = latestObservation(snapshot, asset.id, "battery.capacity.percent", start, end);
        const hasValidCapacity = capacity?.value.kind === "number"
          && capacity.value.unit === "percent"
          && Number.isFinite(capacity.value.value)
          && capacity.value.value >= 0
          && capacity.value.value <= 100;
        if (!hasValidCapacity) {
          batteryTriggered += 1;
          findings.push(Object.freeze({
            id: findingId("nexus.endpoint.battery-capacity-evidence-gap", asset.id),
            ruleId: "nexus.endpoint.battery-capacity-evidence-gap",
            ruleVersion: "1",
            assetId: asset.id,
            title: "Capacidad de batería sin evidencia",
            summary: `Batería presente, pero sin capacidad porcentual válida observable en ${windowDays} días.`,
            asOf: snapshot.asOf,
            windowDays,
            pattern: Object.freeze({
              kind: "evidence_gap",
              observedCount: 1,
              threshold: null,
              description: "La presencia de batería está observada, pero la capacidad requerida no está disponible con unidad y rango válidos.",
            }),
            hypothesis: Object.freeze({
              text: "Existe un gap de evidencia de capacidad de batería. Esto no demuestra degradación de batería.",
              causal: false,
            }),
            confidence: Object.freeze({
              state: "supported",
              rationale: "La presencia de batería es observable y la capacidad válida está ausente dentro de la ventana; el finding describe únicamente ese gap.",
            }),
            evidence: evidence([batteryPresent]),
            investigationGuidance: Object.freeze([
              "Verificar si la fuente del endpoint expone capacidad de diseño/carga completa o una métrica equivalente defendible.",
              "No calcular battery health a partir de campos ausentes o no soportados.",
            ]),
          }));
        }
      }
    }
  }

  findings.sort((left, right) =>
    left.ruleId.localeCompare(right.ruleId) || left.assetId.localeCompare(right.assetId),
  );

  return Object.freeze({
    asOf: snapshot.asOf,
    windowDays,
    domain,
    population: Object.freeze({
      scoped: scoped.length,
      eligible: eligible.length,
      excluded: scoped.length - eligible.length,
      assetIds: Object.freeze(eligible.map((asset) => asset.id)),
    }),
    findings: Object.freeze(findings),
    evaluations: Object.freeze([
      evaluation(
        "nexus.endpoint.application-instability",
        reliabilityKnown,
        eligible.length,
        reliabilityTriggered,
      ),
      evaluation(
        "nexus.endpoint.repeated-unclean-restart",
        restartKnown,
        eligible.length,
        restartTriggered,
      ),
      evaluation(
        "nexus.endpoint.battery-capacity-evidence-gap",
        batteryKnown,
        eligible.length,
        batteryTriggered,
      ),
    ]),
  });
}
