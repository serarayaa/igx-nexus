import { ageInDays } from "./asset-model";
import { summarize, type DashboardSnapshot, type Domain } from "./dashboard-model";

export type OverviewMode = "demo" | "live";
export type AttentionTone = "critical" | "warning" | "info";

export interface OverviewAttentionItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly count: number;
  readonly tone: AttentionTone;
  readonly href: string;
}

export interface OverviewModel {
  readonly summary: ReturnType<typeof summarize>;
  readonly attention: readonly OverviewAttentionItem[];
  readonly freshnessKnown: number;
  readonly freshnessFresh: number;
  readonly freshnessStale: number;
  readonly freshnessUnknown: number;
}

export function buildOverview(snapshot: DashboardSnapshot, domain: Domain | "all", mode: OverviewMode): OverviewModel {
  const summary = summarize(snapshot, domain);
  const active = summary.active;

  let freshnessKnown = 0;
  let freshnessFresh = 0;
  let freshnessStale = 0;

  for (const asset of active) {
    const age = ageInDays(asset.lastSeen, snapshot.asOf);
    if (age === null || age < 0) continue;
    freshnessKnown += 1;
    if (age <= 7) freshnessFresh += 1;
    else freshnessStale += 1;
  }

  const freshnessUnknown = active.length - freshnessKnown;
  const attention: OverviewAttentionItem[] = [];

  if (mode === "demo") {
    if (summary.criticalStale > 0) {
      attention.push({
        id: "critical-stale",
        title: "Activos críticos sin información reciente",
        description: "Activos críticos vigentes cuya observación no está dentro de la ventana demo de 7 días.",
        count: summary.criticalStale,
        tone: "critical",
        href: "#health",
      });
    }

    const incomplete = active.length - summary.complete;
    if (incomplete > 0) {
      attention.push({
        id: "incomplete-core",
        title: "Registros con datos básicos incompletos",
        description: "Activos vigentes sin responsable o ubicación en el dataset de demostración.",
        count: incomplete,
        tone: "warning",
        href: "#health",
      });
    }

    if (freshnessStale + freshnessUnknown > 0) {
      attention.push({
        id: "freshness-gap",
        title: "Freshness requiere revisión",
        description: "Activos vigentes con observación anterior a 7 días o sin una fecha utilizable.",
        count: freshnessStale + freshnessUnknown,
        tone: "warning",
        href: "#health",
      });
    }

    if (summary.due.length > 0) {
      attention.push({
        id: "warranty-due",
        title: "Garantías próximas a vencer",
        description: "Activos vigentes con una fecha de garantía entre el corte del snapshot y los próximos 90 días.",
        count: summary.due.length,
        tone: "warning",
        href: "#assets",
      });
    }
  } else {
    if (freshnessStale > 0) {
      attention.push({
        id: "live-stale",
        title: "Observaciones Live fuera de la ventana reciente",
        description: "Activos con última actualización de inventario conocida anterior a 7 días respecto del snapshot.",
        count: freshnessStale,
        tone: "warning",
        href: "#assets",
      });
    }

    if (freshnessUnknown > 0) {
      attention.push({
        id: "live-freshness-unknown",
        title: "Cobertura de freshness incompleta",
        description: "NEXUS API no entrega una fecha de última observación utilizable para parte del alcance. No se infiere estado técnico.",
        count: freshnessUnknown,
        tone: "info",
        href: "#assets",
      });
    }
  }

  return Object.freeze({
    summary,
    attention: Object.freeze(attention),
    freshnessKnown,
    freshnessFresh,
    freshnessStale,
    freshnessUnknown,
  });
}
