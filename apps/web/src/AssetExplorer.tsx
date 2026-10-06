import { useEffect, useRef, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, Pagination, Search, Toolbar } from "@igx-nexus/ui";
import { demoProvider } from "./demo-provider";
import { assertSnapshotMatchesMode, resolveProviderForMode, type ModeAwareProviderProps } from "./data-mode-guard";
import type { InventoryProvider, InventorySnapshot } from "./asset-model";
import { emptyFilters, explore, facetOptions, hasFacetCoverage, type ExplorerQuery } from "./explorer-model";
import { ExplorerFilters } from "./ExplorerFilters";
import { AssetTable } from "./AssetTable";
import { applyExplorerQuery, buildContextualAssetLink, selectionAvailability, selectionAvailabilityLabels } from "./navigation-state";
import { useInvestigationNavigation } from "./use-investigation-navigation";
import "./explorer.css";

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; snapshot: InventorySnapshot };
const initialQuery: ExplorerQuery = { search: "", filters: emptyFilters, sort: { columnId: "name", direction: "ascending" }, page: 1, pageSize: 25 };
const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" });

export function AssetExplorer(props: ModeAwareProviderProps<InventoryProvider> & { navigation?: boolean }) {
  const mode = props.mode ?? "demo";
  const provider = resolveProviderForMode(mode, props.provider, demoProvider);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const navigation = useInvestigationNavigation();
  const query: ExplorerQuery = props.navigation ? navigation.state : localQuery;
  function setQuery(update: (current: ExplorerQuery) => ExplorerQuery, history: "push" | "replace" = "push") {
    if (props.navigation) navigation.update(applyExplorerQuery(navigation.state, update(navigation.state)), history);
    else setLocalQuery(update);
  }
  const [showTechnical, setShowTechnical] = useState(false);
  const searchRegion = useRef<HTMLDivElement>(null);
  const resultSummary = useRef<HTMLParagraphElement>(null);
  const restoredFocus = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.resolve().then(() => {
      controller.signal.throwIfAborted();
      return provider(controller.signal);
    }).then(snapshot => assertSnapshotMatchesMode(mode, snapshot)).then(snapshot => {
      if (!controller.signal.aborted) {
        if (!props.navigation) setLocalQuery(current => ({ ...current, page: 1 }));
        setState({ status: "ready", snapshot });
      }
    }).catch(() => { if (!controller.signal.aborted) setState({ status: "error" }); });
    return () => controller.abort();
  }, [provider, mode, attempt]);

  function changeQuery(update: Partial<ExplorerQuery>, history: "push" | "replace" = "push") {
    setQuery(current => ({ ...current, ...update, page: 1 }), history);
  }
  function clearAll() {
    changeQuery({ search: "", filters: emptyFilters });
    searchRegion.current?.querySelector("input")?.focus();
  }
  const result = state.status === "ready" ? explore(state.snapshot, query) : null;
  const live = mode === "live";
  const contextCovered = state.status === "ready" ? hasFacetCoverage(state.snapshot, "context") : false;
  const compatibilityFallbackCount = state.status === "ready"
    ? facetOptions(state.snapshot, query, "compatibilityFallback").find(option => option.value === "yes")?.count ?? 0
    : 0;

  useEffect(() => {
    if (props.navigation && result && query.page !== result.page) navigation.update({ ...navigation.state, page: result.page }, "replace");
  }, [props.navigation, result?.page, query.page]);

  useEffect(() => {
    if (!props.navigation || restoredFocus.current || !result) return;
    restoredFocus.current = true;
    if (!navigation.state.selectedId) { const heading = document.querySelector<HTMLElement>("main h1"); heading?.setAttribute("tabindex", "-1"); heading?.focus(); return; }
    const link = Array.from(document.querySelectorAll<HTMLElement>("[data-asset-link]"))
      .find(candidate => candidate.dataset.assetLink === navigation.state.selectedId);
    const frame = requestAnimationFrame(() => (link ?? resultSummary.current)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [props.navigation, Boolean(result)]);

  return <div className="nexus-explorer" id="assets">
    <PageHeader
      title="Explorador de activos"
      eyebrow="ASSETS · TECHNOLOGY INTELLIGENCE"
      description={live
        ? "Investiga el inventario disponible en NEXUS API por identidad, clasificación, fuente y lifecycle."
        : "Investiga el inventario sintético por identidad, clasificación, contexto, fuente y lifecycle."}
      meta={<Badge>{live ? "LIVE LAB · NEXUS API" : "Datos sintéticos · escenario de demostración"}</Badge>}
    />
    {props.navigation && navigation.issues.length > 0 && <p role="status">Algunos parámetros del enlace no se pudieron aplicar. Revisa la búsqueda y los filtros.</p>}
    {props.navigation && navigation.state.view === "graph" && <p role="status">La vista de mapa no está disponible para este enlace. Se muestra el inventario y se conserva el contexto solicitado.</p>}
    {props.navigation && navigation.state.selectedId && <p role="status">Selección: {navigation.state.selectedId} · {selectionAvailabilityLabels[selectionAvailability(navigation.state, state.status === "ready" ? state.snapshot : null)]}</p>}
    {state.status === "loading" && <LoadingState title="Cargando inventario de activos" description={live ? "Consultando NEXUS API en modo Live." : "Preparando el inventario de demostración."} />}
    {state.status === "error" && <ErrorState title="No se pudo cargar el inventario" description={live ? "Vuelve a intentar. No se mostrarán detalles internos del error." : "Vuelve a intentar. Tu búsqueda se conservará."} action={<Button onPress={() => setAttempt(n => n + 1)}>Reintentar</Button>} />}
    {state.status === "ready" && state.snapshot.assets.length === 0 && <EmptyState title="El inventario está vacío" description={live ? "NEXUS API no devolvió activos para el provider Live." : "No hay activos disponibles en este escenario."} action={<Button onPress={() => setAttempt(n => n + 1)}>Volver a cargar</Button>} />}
    {state.status === "ready" && state.snapshot.assets.length > 0 && result && <>
      <div ref={searchRegion}>
        <Search
          label="Buscar activos"
          showLabel
          value={query.search}
          onChange={search => changeQuery({ search }, "replace")}
          placeholder="Nombre, serial, clase, rol, fuente, sitio…"
          description={live
            ? "Busca por identidad, hostname, serial, etiqueta, fabricante/modelo, dominio, clase, rol, fuente o IP cuando exista cobertura."
            : "Busca por identidad, hostname, serial, etiqueta, fabricante/modelo, dominio, clase, rol, fuente, contexto o IP demo."}
        />
      </div>

      <section className="nexus-explorer-scope" aria-labelledby="explorer-scope-heading">
        <div>
          <p className="nexus-overline">Scope</p>
          <h2 id="explorer-scope-heading">Cobertura de investigación</h2>
          <p>{live
            ? "Las facetas reflejan únicamente metadata entregada por NEXUS API. La ausencia de una dimensión no se completa con datos Demo ni inferencias."
            : "Las facetas canónicas provienen del snapshot Demo v0.2; los campos históricos continúan disponibles como compatibilidad."}</p>
        </div>
        <dl className="nexus-explorer-scope-facts">
          <div><dt>Taxonomía</dt><dd>Domain · Class · Role</dd></div>
          <div><dt>Contexto operacional</dt><dd>{contextCovered ? "Disponible" : "Sin cobertura del provider"}</dd></div>
          <div><dt>Fuentes</dt><dd>{[...new Set(state.snapshot.assets.flatMap(asset => asset.sourceSystems ?? []))].length || "Sin cobertura"}</dd></div>
        </dl>
        {compatibilityFallbackCount > 0 && <p className="nexus-explorer-coverage-warning" role="note">
          <strong>{compatibilityFallbackCount}</strong> {compatibilityFallbackCount === 1 ? "activo usa" : "activos usan"} una proyección escalar de compatibilidad taxonómica dentro del scope actual. Se muestran como proyección, no como clasificación resuelta.
        </p>}
      </section>

      <ExplorerFilters
        snapshot={state.snapshot}
        query={query}
        onChange={(key, value) => changeQuery({ filters: { ...query.filters, [key]: value } })}
        onClear={() => changeQuery({ filters: emptyFilters })}
      />
      <Toolbar ariaLabel="Presentación del inventario" primary={<p ref={resultSummary} tabIndex={-1} className="nexus-explorer-results" role="status" aria-atomic="true">
        <strong>{result.total} de {state.snapshot.assets.length} activos</strong>{result.total > 0 && <span> · Mostrando {result.first}–{result.last}</span>}
      </p>} secondary={<label className="nexus-explorer-checkbox"><input type="checkbox" checked={showTechnical} onChange={e => setShowTechnical(e.target.checked)} />Mostrar identificación técnica</label>} />
      {result.total === 0 ? <EmptyState
        title="No hay activos que coincidan"
        description={live
          ? "Prueba otra búsqueda o elimina filtros. El resultado sólo representa la cobertura disponible en NEXUS API."
          : "Prueba otra búsqueda o elimina filtros para ampliar el inventario sintético."}
        action={<Button onPress={clearAll}>Restablecer búsqueda y filtros</Button>}
      /> : <>
        <p className="nexus-muted nexus-explorer-scroll-hint">Desplaza la tabla horizontalmente para consultar todas las columnas. Puedes ordenar desde sus encabezados.</p>
        <AssetTable {...(props.navigation ? { assetLink: (id: string) => buildContextualAssetLink(id, { ...navigation.state, selectedId: id }), onAssetNavigate: (id: string) => navigation.update({ ...navigation.state, selectedId: id }, "replace") } : {})} rows={result.rows} asOf={state.snapshot.asOf} sort={query.sort} onSortChange={sort => changeQuery({ sort })} showTechnical={showTechnical} caption={live ? "Inventario de activos Live" : "Inventario de activos demo"} />
        <div className="nexus-explorer-pagination">
          <label className="nexus-select-field"><span>Activos por página</span><select value={query.pageSize} onChange={e => changeQuery({ pageSize: Number(e.target.value) })}>{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
          <Pagination page={result.page} totalPages={result.totalPages} ariaLabel="Páginas del inventario" onPageChange={page => {
            setQuery(current => ({ ...current, page }));
            resultSummary.current?.focus();
          }} />
        </div>
      </>}
      {live
        ? <p className="nexus-muted"><time dateTime={state.snapshot.asOf}>{dateFormat.format(new Date(state.snapshot.asOf))}</time> · UTC. Snapshot canónico servido por NEXUS API; GLPI permanece detrás del adapter Live.</p>
        : <p className="nexus-muted">Corte demo: <time dateTime={state.snapshot.asOf}>{dateFormat.format(new Date(state.snapshot.asOf))}</time> · UTC. Frescura relativa al corte; incluye activos dados de baja. Sin conexión a fuentes corporativas.</p>}
    </>}
  </div>;
}
