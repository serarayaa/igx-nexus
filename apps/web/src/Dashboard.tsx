import { useEffect, useState, type CSSProperties } from "react";
import { Activity, Boxes, CalendarClock, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, ContentSection, DataTable, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge, Toolbar, type DataTableColumn } from "@igx-nexus/ui";
import { demoProvider } from "./demo-provider";
import { lifecycleLabels, percentage, summarize, typeLabels, warrantyDays, type AssetType, type DashboardAsset, type DashboardProvider, type DashboardSnapshot, type Domain, type Lifecycle } from "./dashboard-model";
import { NexusShell } from "./NexusShell";

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; snapshot: DashboardSnapshot };
const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat("es-CL");

function Distribution({ title, rows, total }: { title: string; rows: readonly { label: string; value: number }[]; total: number }) {
  return <Card><ContentSection title={title} description={`${numberFormat.format(total)} activos registrados · incluye bajas`}>
    <ul className="nexus-distribution">
      {rows.map(row => <li key={row.label}>
        <div className="nexus-distribution-label"><span>{row.label}</span><span><strong>{row.value}</strong> <span className="nexus-muted">· {percentage(row.value, total)}</span></span></div>
        <div className="nexus-bar-track" aria-hidden="true"><div className="nexus-bar" style={{ width: `${total ? row.value / total * 100 : 0}%` } as CSSProperties} /></div>
      </li>)}
    </ul>
  </ContentSection></Card>;
}

export function DashboardContent({ provider = demoProvider }: { provider?: DashboardProvider }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [domain, setDomain] = useState<Domain | "all">("all");
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.resolve().then(() => provider(controller.signal)).then(snapshot => {
      if (!controller.signal.aborted) setState({ status: "ready", snapshot });
    }).catch(() => { if (!controller.signal.aborted) setState({ status: "error" }); });
    return () => controller.abort();
  }, [provider, attempt]);

  const result = state.status === "ready" ? summarize(state.snapshot, domain) : null;
  const asOf = state.status === "ready" ? state.snapshot.asOf : "";
  const columns: readonly DataTableColumn<DashboardAsset>[] = [
    { id: "asset", header: "Activo demo", isRowHeader: true, cell: a => <span className="nexus-id">{a.id}</span> },
    { id: "type", header: "Tipo", cell: a => typeLabels[a.type] },
    { id: "location", header: "Ubicación", cell: a => a.location ?? "Sin ubicación" },
    { id: "domain", header: "Dominio", cell: a => <Badge>{a.domain}</Badge> },
    { id: "warranty", header: "Vence en", align: "end", cell: a => `${Math.ceil(warrantyDays(a, asOf) ?? 0)} días` },
  ];
  const dueRows = result ? [...result.due].sort((a, b) => (a.warrantyEnds ?? "").localeCompare(b.warrantyEnds ?? "") || a.id.localeCompare(b.id)).slice(0, 5) : [];
  const recover = <Button onPress={() => setAttempt(n => n + 1)}>Reintentar</Button>;

  return <div className="nexus-dashboard" id="overview">
      <PageHeader title="Panel principal" eyebrow="VISIÓN DE ACTIVOS" description="Inventario, calidad de información y próximos vencimientos." meta={<Badge>Datos sintéticos · escenario de demostración</Badge>} />
      <Toolbar ariaLabel="Alcance del panel" primary={<div className="nexus-filter" role="group" aria-label="Filtrar por dominio">
        {(["all", "IT", "OT"] as const).map(value => <Button key={value} variant={domain === value ? "primary" : "secondary"} aria-pressed={domain === value} onPress={() => setDomain(value)}>{value === "all" ? "Todos los activos" : value}</Button>)}
      </div>} secondary={<span className="nexus-muted">{asOf ? <>Corte demo: <time dateTime={asOf}>{dateFormat.format(new Date(asOf))}</time> · UTC</> : "Preparando escenario demo"}</span>} />
      {state.status === "loading" && <LoadingState title="Cargando resumen de activos" description="Preparando la información del panel." />}
      {state.status === "error" && <ErrorState title="No se pudo cargar el panel" description="Vuelve a intentar cargar el resumen de activos." action={recover} />}
      {result && result.assets.length === 0 && <EmptyState title="No hay activos para este alcance" description="Prueba con todos los dominios o vuelve a cargar el panel." action={domain !== "all" ? <Button onPress={() => setDomain("all")}>Ver todos los activos</Button> : <Button onPress={() => setAttempt(n => n + 1)}>Volver a cargar</Button>} />}
      {result && result.assets.length > 0 && <>
        <p className="nexus-sr-only" role="status">{result.assets.length} activos en el alcance {domain === "all" ? "IT y OT" : domain}.</p>
        <div className="nexus-metrics">
          <Card><div className="nexus-metric-label"><Boxes aria-hidden="true" />Activos registrados</div><strong className="nexus-metric-value">{numberFormat.format(result.assets.length)}</strong><p>{result.active.length} vigentes · {result.assets.length - result.active.length} dados de baja</p></Card>
          <Card><div className="nexus-metric-label"><ShieldCheck aria-hidden="true" />Información básica completa</div><strong className="nexus-metric-value">{percentage(result.complete, result.active.length)}</strong><p>{result.complete} de {result.active.length} vigentes con responsable y ubicación</p></Card>
          <Card><div className="nexus-metric-label"><Clock3 aria-hidden="true" />Información reciente</div><strong className="nexus-metric-value">{percentage(result.fresh, result.active.length)}</strong><p>{result.fresh} de {result.active.length} vigentes observados en los últimos 7 días</p></Card>
          <Card><div className="nexus-metric-label"><CalendarClock aria-hidden="true" />Garantías por vencer</div><strong className="nexus-metric-value">{result.due.length}</strong><p>Activos vigentes · desde el corte hasta 90 días</p></Card>
        </div>
        <div className="nexus-two-column" id="quality">
          <Card><ContentSection title="Calidad y frescura" description="Señales básicas del escenario; no constituyen el índice CMDB Health.">
            <dl className="nexus-signals">
              <div><dt>Sin responsable o ubicación</dt><dd><StatusBadge status={result.active.length - result.complete ? "warning" : "success"}>{result.active.length - result.complete} vigentes</StatusBadge></dd></div>
              <div><dt>Información antigua o no verificable</dt><dd><StatusBadge status={result.active.length - result.fresh ? "warning" : "success"}>{result.active.length - result.fresh} vigentes</StatusBadge></dd></div>
              <div><dt>Críticos sin información reciente</dt><dd><StatusBadge status={result.criticalStale ? "critical" : "success"}>{result.criticalStale} de {result.critical.length}</StatusBadge></dd></div>
            </dl>
            <p className="nexus-muted">«Vigente» excluye bajas. La frescura se mide contra la fecha de corte, no contra la hora actual.</p>
          </ContentSection></Card>
          <Distribution title="Distribución por tipo" total={result.assets.length} rows={result.countBy("type").map(r => ({ ...r, label: typeLabels[r.label as AssetType] }))} />
        </div>
        <div className="nexus-two-column">
          <Distribution title="Ubicaciones del escenario" total={result.assets.length} rows={result.countBy("location")} />
          <Distribution title="Estados de ciclo de vida" total={result.assets.length} rows={result.countBy("lifecycle").map(r => ({ ...r, label: lifecycleLabels[r.label as Lifecycle] }))} />
        </div>
        <Card id="lifecycle"><ContentSection title="Garantías y lifecycle" description="Próximos 5 vencimientos de activos vigentes, ordenados por fecha y código.">
          <div className="nexus-warranty-summary"><StatusBadge status="warning">{result.expired} vencidas</StatusBadge><Badge>{result.unknownWarranty} sin fecha válida</Badge><Badge>{result.due.length} vencen en 90 días</Badge></div>
          <DataTable caption="Próximos vencimientos de garantía" columns={columns} rows={dueRows} getRowKey={a => a.id} emptyMessage="No hay garantías que venzan dentro de los próximos 90 días." />
          <p className="nexus-muted">Las fechas son simuladas; no se consultan fabricantes ni contratos. Los activos sin fecha no se cuentan como cubiertos.</p>
        </ContentSection></Card>
      </>}
      <Card id="next-views"><ContentSection title="Próximas vistas" description="Accede al inventario y conoce los siguientes hitos del roadmap.">
        <div className="nexus-future"><span><Boxes aria-hidden="true" /><a href="#assets">Explorar activos</a><Badge>Inventario demo</Badge></span><span><MapPin aria-hidden="true" /><a href="#assets/DEMO-0002">Asset 360°</a><Badge>CMDB-008 · integrado</Badge></span><span><Activity aria-hidden="true" /><a href="#assets/DEMO-0002/label">QR y etiquetado</a><Badge>CMDB-009 · integrado</Badge></span><span><Activity aria-hidden="true" /><a href="#assets/DEMO-0002/relations">Grafo de Relaciones</a><Badge>CMDB-010 · integrado</Badge></span><span><Activity aria-hidden="true" /><a href="#health">CMDB Health</a><Badge>CMDB-011 · integrado</Badge></span></div>
      </ContentSection></Card>
    </div>;
}

/** Entrada aislada para los consumidores y pruebas del Dashboard. */
export function Dashboard({ provider = demoProvider }: { provider?: DashboardProvider }) {
  return <NexusShell><DashboardContent provider={provider} /></NexusShell>;
}
