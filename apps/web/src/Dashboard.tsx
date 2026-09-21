import { useEffect, useState } from "react";
import { ArrowRight, Boxes, CalendarClock, Clock3, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, ContentSection, DataTable, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge, Toolbar, type DataTableColumn } from "@igx-nexus/ui";
import { demoProvider } from "./demo-provider";
import { percentage, warrantyDays, type DashboardAsset, type DashboardProvider, type DashboardSnapshot, type Domain } from "./dashboard-model";
import { assetHash } from "./navigation-model";
import { buildOverview, type OverviewMode } from "./overview-model";
import { NexusShell } from "./NexusShell";

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; snapshot: DashboardSnapshot };
const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat("es-CL");

const attentionLabels = {
  critical: "Prioridad alta",
  warning: "Revisar",
  info: "Cobertura parcial",
} as const;

export function DashboardContent({ provider = demoProvider, mode = "demo" }: { provider?: DashboardProvider; mode?: OverviewMode }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [domain, setDomain] = useState<Domain | "all">("all");

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.resolve().then(() => provider(controller.signal)).then(snapshot => {
      if (!controller.signal.aborted) setState({ status: "ready", snapshot });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: "error" });
    });
    return () => controller.abort();
  }, [provider, attempt]);

  const overview = state.status === "ready" ? buildOverview(state.snapshot, domain, mode) : null;
  const result = overview?.summary ?? null;
  const asOf = state.status === "ready" ? state.snapshot.asOf : "";
  const live = mode === "live";

  const columns: readonly DataTableColumn<DashboardAsset>[] = [
    { id: "asset", header: "Activo", isRowHeader: true, cell: a => <a className="nexus-id" href={assetHash(a.id)}>{a.id}</a> },
    { id: "location", header: "Ubicación", cell: a => a.location ?? "Sin ubicación" },
    { id: "domain", header: "Dominio", cell: a => <Badge>{a.domain}</Badge> },
    { id: "warranty", header: "Vence en", align: "end", cell: a => `${Math.ceil(warrantyDays(a, asOf) ?? 0)} días` },
  ];

  const dueRows = result
    ? [...result.due].sort((a, b) => (a.warrantyEnds ?? "").localeCompare(b.warrantyEnds ?? "") || a.id.localeCompare(b.id)).slice(0, 5)
    : [];
  const recover = <Button onPress={() => setAttempt(n => n + 1)}>Reintentar</Button>;
  const scopeLabel = domain === "all" ? "IT y OT" : domain;

  return <div className="nexus-dashboard nexus-overview" id="overview">
    <PageHeader
      title="Technology Overview"
      eyebrow="TECHNOLOGY INTELLIGENCE"
      description="Qué requiere atención ahora y por qué, dentro del alcance seleccionado."
      meta={<Badge>{live ? "LIVE LAB · NEXUS API" : "Datos sintéticos · escenario de demostración"}</Badge>}
    />

    <Toolbar
      ariaLabel="Alcance de Technology Overview"
      primary={<div className="nexus-filter" role="group" aria-label="Filtrar por dominio">
        {(["all", "IT", "OT"] as const).map(value =>
          <Button key={value} variant={domain === value ? "primary" : "secondary"} aria-pressed={domain === value} onPress={() => setDomain(value)}>
            {value === "all" ? "Todos los activos" : value}
          </Button>)}
      </div>}
      secondary={<span className="nexus-muted">
        {asOf
          ? <>{live ? "Corte Live" : "Corte demo"}: <time dateTime={asOf}>{dateFormat.format(new Date(asOf))}</time> · UTC</>
          : live ? "Consultando NEXUS API" : "Preparando escenario demo"}
      </span>}
    />

    {state.status === "loading" && <LoadingState title="Cargando Technology Overview" description={live ? "Consultando el snapshot disponible en NEXUS API." : "Preparando el snapshot sintético de demostración."} />}
    {state.status === "error" && <ErrorState title="No se pudo cargar Technology Overview" description={live ? "Vuelve a intentar. NEXUS no sustituirá esta ausencia con datos Demo." : "Vuelve a intentar cargar el snapshot de demostración."} action={recover} />}

    {state.status === "ready" && result && result.assets.length === 0 && <EmptyState
      title={state.snapshot.assets.length === 0 ? "El inventario está vacío" : "No hay activos para este alcance"}
      description={state.snapshot.assets.length === 0
        ? live ? "NEXUS API no devolvió activos. La ausencia se mantiene explícita y no se reemplaza con Demo." : "No hay activos disponibles en el dataset de demostración."
        : "Prueba con todos los dominios para ampliar el alcance."}
      action={state.snapshot.assets.length === 0
        ? <Button onPress={() => setAttempt(n => n + 1)}>Volver a cargar</Button>
        : <Button onPress={() => setDomain("all")}>Ver todos los activos</Button>}
    />}

    {overview && result && result.assets.length > 0 && <>
      <p className="nexus-sr-only" role="status">{result.assets.length} activos en el alcance {scopeLabel}.</p>

      <section className="nexus-overview-context" aria-labelledby="overview-context-heading">
        <div>
          <p className="nexus-overline">Contexto</p>
          <h2 id="overview-context-heading">Alcance y cobertura</h2>
          <p>{live
            ? "Overview Live resume únicamente inventario y freshness observables a través de NEXUS API. Campos no cubiertos permanecen desconocidos."
            : "Overview Demo utiliza el dataset canónico sintético y sus reglas históricas de frescura, datos básicos y garantía."}</p>
        </div>
        <dl className="nexus-overview-context-facts">
          <div><dt>Alcance</dt><dd>{scopeLabel}</dd></div>
          <div><dt>Activos visibles</dt><dd>{numberFormat.format(result.assets.length)}</dd></div>
          <div><dt>Freshness observable</dt><dd>{overview.freshnessKnown} de {result.active.length} vigentes</dd></div>
        </dl>
      </section>

      <section className="nexus-overview-section" aria-labelledby="attention-heading">
        <div className="nexus-overview-section-heading">
          <div>
            <p className="nexus-overline">Triage</p>
            <h2 id="attention-heading">Requiere atención</h2>
          </div>
          <p>Señales deterministas del snapshot actual. No constituyen un risk score ni una evaluación de salud técnica.</p>
        </div>

        {overview.attention.length > 0
          ? <ul className="nexus-attention-list">
              {overview.attention.map(item => <li key={item.id} className="nexus-attention-item">
                <div className="nexus-attention-status">
                  <StatusBadge status={item.tone}>{attentionLabels[item.tone]}</StatusBadge>
                  <strong>{numberFormat.format(item.count)}</strong>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <a href={item.href}>Investigar <ArrowRight aria-hidden="true" /></a>
              </li>)}
            </ul>
          : <div className="nexus-attention-empty">
              <StatusBadge status="success">Sin señales dentro de la cobertura actual</StatusBadge>
              <p>No detectar señales no significa que todos los activos estén saludables. Sólo indica que las reglas disponibles para este Overview no encontraron condiciones que priorizar.</p>
            </div>}
      </section>

      <section className="nexus-overview-section" aria-labelledby="summary-heading">
        <div className="nexus-overview-section-heading">
          <div>
            <p className="nexus-overline">Snapshot</p>
            <h2 id="summary-heading">Estado resumido</h2>
          </div>
          <p>Hechos descriptivos con denominador visible; las métricas analíticas formales pertenecen a V02-019.</p>
        </div>

        <dl className="nexus-overview-summary">
          <div>
            <dt><Boxes aria-hidden="true" />Inventario</dt>
            <dd>{numberFormat.format(result.assets.length)}</dd>
            <p>{result.active.length} vigentes dentro del alcance seleccionado.</p>
          </div>
          <div>
            <dt><Clock3 aria-hidden="true" />Freshness</dt>
            <dd>{percentage(overview.freshnessFresh, result.active.length)}</dd>
            <p>{overview.freshnessFresh} recientes · {overview.freshnessStale} antiguas · {overview.freshnessUnknown} sin fecha utilizable.</p>
          </div>
          {!live && <div>
            <dt><ShieldCheck aria-hidden="true" />Datos básicos presentes</dt>
            <dd>{percentage(result.complete, result.active.length)}</dd>
            <p>{result.complete} de {result.active.length} vigentes con responsable y ubicación.</p>
          </div>}
          {!live && <div>
            <dt><CalendarClock aria-hidden="true" />Garantía</dt>
            <dd>{result.due.length}</dd>
            <p>{result.due.length} vencen en 90 días · {result.expired} vencidas · {result.unknownWarranty} sin fecha válida.</p>
          </div>}
          {live && <div>
            <dt><ShieldCheck aria-hidden="true" />Cobertura Live</dt>
            <dd>Parcial</dd>
            <p>Responsable, garantía, Data Quality y Device Health no se infieren cuando el provider no entrega evidencia suficiente.</p>
          </div>}
        </dl>
      </section>

      {!live && <Card>
        <ContentSection title="Garantías próximas" description="Detalle de los próximos 5 vencimientos ya observables en el dataset Demo. No es una proyección de inversión.">
          <DataTable caption="Próximos vencimientos de garantía" columns={columns} rows={dueRows} getRowKey={a => a.id} emptyMessage="No hay garantías que venzan dentro de los próximos 90 días." />
          <p className="nexus-muted">Las fechas son simuladas; no se consultan fabricantes ni contratos. Los activos sin fecha no se cuentan como cubiertos.</p>
        </ContentSection>
      </Card>}

      <section className="nexus-overview-section" aria-labelledby="drilldowns-heading">
        <div className="nexus-overview-section-heading">
          <div>
            <p className="nexus-overline">Drill-down</p>
            <h2 id="drilldowns-heading">Continuar la investigación</h2>
          </div>
          <p>Overview orienta; las superficies especializadas contienen el detalle.</p>
        </div>
        <div className="nexus-overview-drilldowns">
          <a href="#assets"><Boxes aria-hidden="true" /><span><strong>Explorar activos</strong><small>Buscar, filtrar y abrir Asset 360.</small></span><ArrowRight aria-hidden="true" /></a>
          {!live && <a href="#health"><ShieldCheck aria-hidden="true" /><span><strong>Calidad de datos</strong><small>Investigar reglas y evidencia del registro CMDB.</small></span><ArrowRight aria-hidden="true" /></a>}
        </div>
      </section>
    </>}
  </div>;
}

/** Entrada aislada para los consumidores y pruebas de Technology Overview. */
export function Dashboard({ provider = demoProvider, mode = "demo" }: { provider?: DashboardProvider; mode?: OverviewMode }) {
  return <NexusShell mode={mode}><DashboardContent provider={provider} mode={mode} /></NexusShell>;
}
