import { useEffect, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ContentSection,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
  Toolbar,
  type DataTableColumn,
} from "@igx-nexus/ui";
import {
  buildLifecyclePlanningReport,
  lifecycleHorizonMonths,
  lifecyclePlanningKinds,
  lifecycleWindowPosition,
  type LifecycleHorizonMonths,
  type LifecycleMilestoneEvidence,
  type LifecyclePlanningKind,
} from "@igx-nexus/types";
import type { Asset, InventoryProvider, InventorySnapshot } from "./asset-model";
import { demoProvider } from "./demo-provider";
import { assetHash } from "./navigation-model";
import "./lifecycle-planning.css";

type LifecycleMode = "demo" | "live";
type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly snapshot: InventorySnapshot };

interface LifecycleAttentionRow {
  readonly id: string;
  readonly assetId: string;
  readonly assetName: string;
  readonly kind: LifecyclePlanningKind;
  readonly at: string | null;
  readonly state: "expired" | "in_window" | "invalid" | "unverified";
  readonly source: string;
}

const milestoneLabels: Readonly<Record<LifecyclePlanningKind, string>> = {
  warranty_end: "Garantía",
  eol: "Fin de vida (EOL)",
  eos: "Fin de soporte (EOS)",
  replacement_target: "Objetivo de reemplazo",
};

const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat("es-CL");

function percentage(value: number | null): string {
  return value === null ? "No disponible" : `${Math.round(value * 100)} %`;
}

function sourceLabel(evidence: LifecycleMilestoneEvidence): string {
  const values = [...new Set(evidence.provenance.map(record => {
    const instance = record.source.sourceInstanceId ? ` · ${record.source.sourceInstanceId}` : "";
    return `${record.source.source}${instance}`;
  }))];
  return values.length > 0 ? values.join(", ") : "Sin provenance";
}

function attentionRows(
  snapshot: InventorySnapshot,
  horizonMonths: LifecycleHorizonMonths,
): readonly LifecycleAttentionRow[] {
  const canonical = snapshot.canonical;
  if (!canonical) return [];
  const names = new Map(snapshot.assets.map((asset: Asset) => [asset.id, asset.name]));
  const report = buildLifecyclePlanningReport(canonical.assets, canonical.asOf, horizonMonths);
  const rows: LifecycleAttentionRow[] = [];

  for (const asset of report.assets) {
    for (const milestone of asset.milestones) {
      if (!lifecyclePlanningKinds.includes(milestone.kind as LifecyclePlanningKind)) continue;
      const kind = milestone.kind as LifecyclePlanningKind;
      if (milestone.state === "invalid" || milestone.state === "unverified") {
        rows.push({
          id: `${asset.assetId}:${kind}`,
          assetId: asset.assetId,
          assetName: names.get(asset.assetId) ?? asset.assetId,
          kind,
          at: milestone.at,
          state: milestone.state,
          source: sourceLabel(milestone),
        });
        continue;
      }
      if (milestone.state !== "known" || !milestone.at) continue;
      const position = lifecycleWindowPosition(milestone.at, report.asOf, horizonMonths);
      if (position === "outside_window") continue;
      rows.push({
        id: `${asset.assetId}:${kind}`,
        assetId: asset.assetId,
        assetName: names.get(asset.assetId) ?? asset.assetId,
        kind,
        at: milestone.at,
        state: position,
        source: sourceLabel(milestone),
      });
    }
  }

  const order = { expired: 0, in_window: 1, invalid: 2, unverified: 3 } as const;
  return rows.sort((left, right) =>
    order[left.state] - order[right.state]
      || (left.at ?? "").localeCompare(right.at ?? "")
      || left.assetId.localeCompare(right.assetId),
  );
}

function rowStatus(row: LifecycleAttentionRow) {
  if (row.state === "expired") return <StatusBadge status="critical">Vencido</StatusBadge>;
  if (row.state === "in_window") return <StatusBadge status="warning">En horizonte</StatusBadge>;
  if (row.state === "invalid") return <StatusBadge status="critical">Fecha inválida</StatusBadge>;
  return <StatusBadge status="info">Sin evidencia</StatusBadge>;
}

export function LifecyclePlanning({
  inventoryProvider = demoProvider,
  mode = "demo",
}: {
  inventoryProvider?: InventoryProvider;
  mode?: LifecycleMode;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [horizon, setHorizon] = useState<LifecycleHorizonMonths>(12);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.resolve()
      .then(() => inventoryProvider(controller.signal))
      .then(snapshot => {
        if (!controller.signal.aborted) setState({ status: "ready", snapshot });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [inventoryProvider, attempt]);

  const report = state.status === "ready" && state.snapshot.canonical
    ? buildLifecyclePlanningReport(state.snapshot.canonical.assets, state.snapshot.canonical.asOf, horizon)
    : null;
  const rows = useMemo(
    () => state.status === "ready" ? attentionRows(state.snapshot, horizon) : [],
    [state, horizon],
  );

  const columns: readonly DataTableColumn<LifecycleAttentionRow>[] = [
    {
      id: "asset",
      header: "Activo",
      isRowHeader: true,
      cell: row => <span><a className="nexus-id" href={assetHash(row.assetId)}>{row.assetId}</a><small className="nexus-lifecycle-asset-name">{row.assetName}</small></span>,
    },
    { id: "milestone", header: "Hito", cell: row => milestoneLabels[row.kind] },
    { id: "date", header: "Fecha", cell: row => row.at ? <time dateTime={row.at}>{dateFormat.format(new Date(row.at))}</time> : "No utilizable" },
    { id: "status", header: "Estado", cell: row => rowStatus(row) },
    { id: "source", header: "Evidencia", cell: row => row.source },
  ];

  const live = mode === "live";
  const retry = <Button onPress={() => setAttempt(value => value + 1)}>Reintentar</Button>;

  return <div className="nexus-dashboard nexus-lifecycle">
    <PageHeader
      title="Lifecycle & Investment"
      eyebrow="TECHNOLOGY ANALYTICS"
      description="Cuándo vencen hitos observables del ciclo de vida y qué cobertura respalda la planificación. NEXUS no estima presupuesto ni costo de reemplazo."
      meta={<Badge>{live ? "LIVE LAB · NEXUS API" : "Datos sintéticos · escenario de demostración"}</Badge>}
    />

    <Toolbar
      ariaLabel="Horizonte de planificación lifecycle"
      primary={<div className="nexus-filter" role="group" aria-label="Seleccionar horizonte">
        {lifecycleHorizonMonths.map(months =>
          <Button
            key={months}
            variant={horizon === months ? "primary" : "secondary"}
            aria-pressed={horizon === months}
            onPress={() => setHorizon(months)}
          >
            {months} meses
          </Button>)}
      </div>}
      secondary={<span className="nexus-muted">
        {report ? <>Ventana hasta <time dateTime={report.windowEnd}>{dateFormat.format(new Date(report.windowEnd))}</time> · UTC</> : "Esperando evidencia canónica"}
      </span>}
    />

    {state.status === "loading" && <LoadingState
      title="Calculando Lifecycle & Investment"
      description={live ? "Consultando hitos lifecycle disponibles en NEXUS API." : "Preparando hitos lifecycle del dataset sintético."}
    />}
    {state.status === "error" && <ErrorState
      title="No se pudo calcular Lifecycle & Investment"
      description={live ? "Vuelve a intentar. NEXUS no sustituirá la ausencia Live con datos Demo." : "Vuelve a intentar cargar el snapshot de demostración."}
      action={retry}
    />}

    {state.status === "ready" && state.snapshot.assets.length === 0 && <EmptyState
      title="El inventario está vacío"
      description={live ? "NEXUS API no devolvió activos. No existe fallback hacia Demo." : "El dataset de demostración no contiene activos."}
      action={retry}
    />}

    {state.status === "ready" && state.snapshot.assets.length > 0 && !state.snapshot.canonical && <EmptyState
      title="Sin evidencia lifecycle canónica"
      description="El provider entregó inventario de presentación, pero no un TechnologySnapshot canónico. NEXUS mantiene la cobertura como no disponible en vez de inferir fechas."
    />}

    {report && <>
      <section className="nexus-lifecycle-context" aria-labelledby="lifecycle-context-heading">
        <div>
          <p className="nexus-overline">Cobertura</p>
          <h2 id="lifecycle-context-heading">Planificación respaldada por evidencia</h2>
          <p>Las fechas sólo cuentan como conocidas cuando existe un valor ISO válido y provenance explícito. Fechas ausentes, inválidas o sin evidencia no se convierten en supuestos.</p>
        </div>
        <dl>
          <div><dt>Activos</dt><dd>{numberFormat.format(report.assets.length)}</dd></div>
          <div><dt>Edad observable</dt><dd>{report.ageCoverage.known} de {report.ageCoverage.total}</dd></div>
          <div><dt>Cobertura de edad</dt><dd>{percentage(report.ageCoverage.ratio)}</dd></div>
          <div><dt>Horizonte</dt><dd>{report.horizonMonths} meses</dd></div>
        </dl>
      </section>

      <section className="nexus-lifecycle-section" aria-labelledby="lifecycle-summary-heading">
        <div className="nexus-overview-section-heading">
          <div>
            <p className="nexus-overline">Hitos</p>
            <h2 id="lifecycle-summary-heading">Cobertura y vencimientos</h2>
          </div>
          <p>Cada hito conserva su propio denominador. Un activo sin fecha reduce cobertura; no se considera automáticamente fuera de riesgo.</p>
        </div>

        <div className="nexus-lifecycle-cards">
          {report.summaries.map(summary => {
            const tone = summary.coverage.state === "unavailable"
              ? "info"
              : summary.expired > 0
                ? "critical"
                : summary.inWindow > 0
                  ? "warning"
                  : "success";
            return <Card key={summary.kind}>
              <ContentSection
                title={milestoneLabels[summary.kind]}
                description={`${summary.coverage.known} de ${summary.coverage.total} activos con fecha y provenance válidos.`}
              >
                <div className="nexus-lifecycle-card-status">
                  <StatusBadge status={tone}>{percentage(summary.coverage.ratio)} cobertura</StatusBadge>
                </div>
                <dl className="nexus-lifecycle-facts">
                  <div><dt>Vencidos</dt><dd>{summary.expired}</dd></div>
                  <div><dt>En {report.horizonMonths} meses</dt><dd>{summary.inWindow}</dd></div>
                  <div><dt>Fuera de ventana</dt><dd>{summary.outsideWindow}</dd></div>
                  <div><dt>Inválidos / sin evidence</dt><dd>{summary.invalid + summary.unverified}</dd></div>
                </dl>
              </ContentSection>
            </Card>;
          })}
        </div>
      </section>

      <section className="nexus-lifecycle-section" aria-labelledby="lifecycle-attention-heading">
        <div className="nexus-overview-section-heading">
          <div>
            <p className="nexus-overline">Planificación</p>
            <h2 id="lifecycle-attention-heading">Hitos que requieren revisión</h2>
          </div>
          <p>Incluye hitos vencidos, dentro del horizonte seleccionado y fechas que no pueden considerarse evidencia confiable.</p>
        </div>
        <DataTable
          caption="Hitos lifecycle que requieren revisión"
          columns={columns}
          rows={rows}
          getRowKey={row => row.id}
          emptyMessage="No hay hitos vencidos, dentro del horizonte o con evidencia inválida para este corte."
        />
      </section>

      <section className="nexus-lifecycle-boundary" aria-label="Límites de Lifecycle & Investment">
        <CalendarClock aria-hidden="true" />
        <div>
          <strong>Investment significa planificación temporal, no presupuesto.</strong>
          <p>NEXUS no asigna CAPEX, precios, vida útil estándar ni fechas de reemplazo por fabricante/modelo. Un costo o presupuesto sólo podrá aparecer cuando exista una fuente corporativa explícita que lo respalde.</p>
        </div>
      </section>
    </>}
  </div>;
}
