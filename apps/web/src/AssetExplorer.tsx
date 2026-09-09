import { useEffect, useRef, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, Pagination, Search, Toolbar } from "@igx-nexus/ui";
import { demoProvider } from "./demo-provider";
import type { InventoryProvider, InventorySnapshot } from "./asset-model";
import { emptyFilters, explore, type ExplorerQuery } from "./explorer-model";
import { ExplorerFilters } from "./ExplorerFilters";
import { AssetTable } from "./AssetTable";
import "./explorer.css";

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; snapshot: InventorySnapshot };
const initialQuery: ExplorerQuery = { search: "", filters: emptyFilters, sort: { columnId: "name", direction: "ascending" }, page: 1, pageSize: 25 };
const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" });

export function AssetExplorer({ provider = demoProvider }: { provider?: InventoryProvider }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [showTechnical, setShowTechnical] = useState(false);
  const searchRegion = useRef<HTMLDivElement>(null);
  const resultSummary = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.resolve().then(() => {
      controller.signal.throwIfAborted();
      return provider(controller.signal);
    }).then(snapshot => {
      if (!controller.signal.aborted) {
        setQuery(current => ({ ...current, page: 1 }));
        setState({ status: "ready", snapshot });
      }
    }).catch(() => { if (!controller.signal.aborted) setState({ status: "error" }); });
    return () => controller.abort();
  }, [provider, attempt]);

  function changeQuery(update: Partial<ExplorerQuery>) {
    setQuery(current => ({ ...current, ...update, page: 1 }));
  }
  function clearAll() {
    changeQuery({ search: "", filters: emptyFilters });
    searchRegion.current?.querySelector("input")?.focus();
  }
  const result = state.status === "ready" ? explore(state.snapshot, query) : null;

  return <div className="nexus-explorer" id="assets">
    <PageHeader title="Explorador de activos" eyebrow="INVENTARIO · INNERGEX CHILE" description="Encuentra equipos, responsables y ubicaciones en un mismo lugar." meta={<Badge>Datos sintéticos · escenario de demostración</Badge>} />
    {state.status === "loading" && <LoadingState title="Cargando inventario de activos" description="Preparando el inventario de demostración." />}
    {state.status === "error" && <ErrorState title="No se pudo cargar el inventario" description="Vuelve a intentar. Tu búsqueda se conservará." action={<Button onPress={() => setAttempt(n => n + 1)}>Reintentar</Button>} />}
    {state.status === "ready" && state.snapshot.assets.length === 0 && <EmptyState title="El inventario está vacío" description="No hay activos disponibles en este escenario." action={<Button onPress={() => setAttempt(n => n + 1)}>Volver a cargar</Button>} />}
    {state.status === "ready" && state.snapshot.assets.length > 0 && result && <>
      <div ref={searchRegion}>
        <Search label="Buscar activos" showLabel value={query.search} onChange={search => changeQuery({ search })} placeholder="Nombre, serial, responsable, sitio…" description="Busca también por hostname, etiqueta, modelo, fabricante o IP demo. Combina palabras para afinar los resultados." />
      </div>
      <ExplorerFilters snapshot={state.snapshot} filters={query.filters}
        onChange={(key, value) => changeQuery({ filters: { ...query.filters, [key]: value } })}
        onClear={() => changeQuery({ filters: emptyFilters })} />
      <Toolbar ariaLabel="Presentación del inventario" primary={<p ref={resultSummary} tabIndex={-1} className="nexus-explorer-results" role="status" aria-atomic="true">
        <strong>{result.total} de {state.snapshot.assets.length} activos</strong>{result.total > 0 && <span> · Mostrando {result.first}–{result.last}</span>}
      </p>} secondary={<label className="nexus-explorer-checkbox"><input type="checkbox" checked={showTechnical} onChange={e => setShowTechnical(e.target.checked)} />Mostrar identificación técnica</label>} />
      {result.total === 0 ? <EmptyState title="No hay activos que coincidan" description="Prueba otra búsqueda o elimina filtros para ampliar el inventario." action={<Button onPress={clearAll}>Restablecer búsqueda y filtros</Button>} /> : <>
        <p className="nexus-muted nexus-explorer-scroll-hint">Desplaza la tabla horizontalmente para consultar todas las columnas. Puedes ordenar desde sus encabezados.</p>
        <AssetTable rows={result.rows} asOf={state.snapshot.asOf} sort={query.sort} onSortChange={sort => changeQuery({ sort })} showTechnical={showTechnical} />
        <div className="nexus-explorer-pagination">
          <label className="nexus-select-field"><span>Activos por página</span><select value={query.pageSize} onChange={e => changeQuery({ pageSize: Number(e.target.value) })}>{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
          <Pagination page={result.page} totalPages={result.totalPages} ariaLabel="Páginas del inventario" onPageChange={page => {
            setQuery(current => ({ ...current, page }));
            resultSummary.current?.focus();
          }} />
        </div>
      </>}
      <p className="nexus-muted">Corte demo: <time dateTime={state.snapshot.asOf}>{dateFormat.format(new Date(state.snapshot.asOf))}</time> · UTC. Frescura relativa al corte; incluye activos dados de baja. Sin conexión a fuentes corporativas.</p>
    </>}
  </div>;
}
