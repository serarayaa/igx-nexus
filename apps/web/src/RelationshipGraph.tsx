import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@igx-nexus/ui";
import { Network, RotateCcw } from "lucide-react";
import {
  assetClassLabel,
  criticalityLabels,
  lifecycleLabels,
  taxonomyStateLabels,
  technologyRoleLabel,
  type Asset,
  type AssetDataMode,
  type InventoryProvider,
  type InventorySnapshot,
} from "./asset-model";
import { demoProvider } from "./demo-provider";
import { demoRelationshipProvider } from "./demo-relationship-provider";
import {
  assetHash,
  defaultTechnologyMapState,
  relationsHash,
  type TechnologyMapState,
} from "./navigation-model";
import {
  assetTypeShortLabels,
  buildRelationshipGraph,
  layoutRelationshipGraph,
  perspectiveFrom,
  relationshipEdgeEndpoints,
  relationshipSentence,
  relationshipTypeLabels,
  relationshipTypeNouns,
  relationshipTypes,
  type Relationship,
  type RelationshipFilters,
  type RelationshipProvider,
  type RelationshipSnapshot,
} from "./relationship-model";
import "./relationship-graph.css";

type InventoryLoadState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly snapshot: InventorySnapshot };

type RelationshipLoadState =
  | { readonly status: "unavailable" }
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly snapshot: RelationshipSnapshot };

const perspectiveLabels = {
  upstream: "Dependencias upstream",
  downstream: "Dependencias downstream",
  peer: "Conexiones entre pares",
  indirect: "Relaciones de segundo nivel",
} as const;

const visibleCountLabel = (count: number) => `${count} ${count === 1 ? "relación visible" : "relaciones visibles"}`;
const nodeCountLabel = (count: number) => `${count} ${count === 1 ? "CI visible" : "CIs visibles"}`;

function displayDate(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Sin fecha verificable";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  const id = `relationship-filter-${label.toLocaleLowerCase("es-CL").replaceAll(" ", "-")}`;
  return <label className="nexus-relationship-field" htmlFor={id}><span>{label}</span><select id={id} value={value} onChange={(event) => onChange(event.currentTarget.value)}>{children}</select></label>;
}

function VisualGraph({ focusId, selectedId, assets, nodeIds, relationships, onSelect }: {
  focusId: string;
  selectedId: string;
  assets: ReadonlyMap<string, Asset>;
  nodeIds: readonly string[];
  relationships: readonly Relationship[];
  onSelect: (id: string) => void;
}) {
  const positions = layoutRelationshipGraph(nodeIds, focusId);
  const byId = new Map(positions.map((position) => [position.id, position]));
  return <div className="nexus-relationship-visual" aria-label="Mapa visual de relaciones">
    <svg className="nexus-relationship-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="relationship-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
      </defs>
      {relationships.map((relationship) => {
        const source = byId.get(relationship.sourceId);
        const target = byId.get(relationship.targetId);
        if (!source || !target) return null;
        const edge = relationshipEdgeEndpoints(source, target);
        return <line key={relationship.id} data-relationship-id={relationship.id} className={`nexus-relationship-edge nexus-relationship-edge--${relationship.type}`} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} markerEnd="url(#relationship-arrow)" markerStart={relationship.direction === "bidirectional" ? "url(#relationship-arrow)" : undefined} />;
      })}
    </svg>
    {positions.map((position) => {
      const asset = assets.get(position.id);
      const isFocus = position.id === focusId;
      return <button
        key={position.id}
        type="button"
        className="nexus-relationship-node"
        data-focus={isFocus || undefined}
        data-selected={position.id === selectedId || undefined}
        data-unresolved={!asset || undefined}
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
        onClick={() => onSelect(position.id)}
        aria-pressed={position.id === selectedId}
        aria-label={`${asset?.name ?? `CI no disponible ${position.id}`}${isFocus ? ", CI enfocado" : ""}`}
      >
        <span className="nexus-relationship-node__type" aria-hidden="true">{asset ? assetTypeShortLabels[asset.type] : "?"}</span>
        <strong>{asset?.name ?? "CI no disponible"}</strong>
        <span>{position.id}</span>
        {isFocus && <em>FOCUS</em>}
      </button>;
    })}
  </div>;
}

function EndpointLink({ id, assets, focusId }: { id: string; assets: ReadonlyMap<string, Asset>; focusId: string }) {
  const asset = assets.get(id);
  if (!asset) return <span>CI no disponible <code>{id}</code></span>;
  return id === focusId
    ? <strong>{asset.name} (focus)</strong>
    : <a href={assetHash(id)}>{asset.name}</a>;
}

function SemanticRelationships({ relationships, assets, focusId }: { relationships: readonly Relationship[]; assets: ReadonlyMap<string, Asset>; focusId: string }) {
  const groups = ["upstream", "downstream", "peer", "indirect"] as const;
  return <section className="nexus-relationship-list" aria-labelledby="relationship-list-heading">
    <h2 id="relationship-list-heading">Relaciones en formato semántico</h2>
    <p className="nexus-muted">Esta vista entrega la misma información esencial del mapa visual y permanece disponible en cualquier tamaño de pantalla.</p>
    {groups.map((group) => {
      const entries = relationships.filter((relationship) => group === "indirect" ? perspectiveFrom(relationship, focusId) === null : perspectiveFrom(relationship, focusId) === group);
      if (entries.length === 0) return null;
      return <section key={group} aria-labelledby={`relationship-${group}-heading`}>
        <h3 id={`relationship-${group}-heading`}>{perspectiveLabels[group]}</h3>
        <ul>{entries.map((relationship) => <li key={relationship.id}>
          <div><EndpointLink id={relationship.sourceId} assets={assets} focusId={focusId} /> <span>{relationshipTypeLabels[relationship.type]}</span> <EndpointLink id={relationship.targetId} assets={assets} focusId={focusId} /></div>
          <div className="nexus-relationship-meta">
            <Badge>{relationshipTypeNouns[relationship.type]}</Badge>
            <span>{relationship.direction === "bidirectional" ? "Bidireccional" : "Dirigida"}</span>
            <span>Fuente: {relationship.source}</span>
            <span>Observada: {displayDate(relationship.observedAt)}</span>
            {relationship.status !== "active" && <StatusBadge status="warning">Estado {relationship.status}</StatusBadge>}
          </div>
        </li>)}</ul>
      </section>;
    })}
  </section>;
}

function SelectionPanel({ selectedId, focusId, graphAssets, relationships, onFocus }: {
  selectedId: string;
  focusId: string;
  graphAssets: ReadonlyMap<string, Asset>;
  relationships: readonly Relationship[];
  onFocus: (id: string) => void;
}) {
  const asset = graphAssets.get(selectedId);
  const incident = relationships.filter((relationship) => relationship.sourceId === selectedId || relationship.targetId === selectedId);
  if (!asset) {
    return <section className="nexus-relationship-selection" aria-labelledby="relationship-selection-heading" aria-live="polite">
      <div><h2 id="relationship-selection-heading">CI no disponible</h2><p><code>{selectedId}</code> · referencia fuera del inventario disponible</p></div>
      <p>NEXUS conserva la referencia relacional, pero no crea identidad, clasificación ni navegación falsas para este endpoint.</p>
    </section>;
  }

  const criticality = asset.criticality ?? "unknown";
  const taxonomyState = asset.taxonomyState ?? "unknown";
  return <section className="nexus-relationship-selection" aria-labelledby="relationship-selection-heading" aria-live="polite">
    <div className="nexus-relationship-selection__heading">
      <div><p className="nexus-overline">CI SELECCIONADO</p><h2 id="relationship-selection-heading">{asset.name}</h2><p><code>{selectedId}</code>{selectedId === focusId ? " · focus actual" : ""}</p></div>
      <div className="nexus-asset-actions">
        <a className="nexus-asset-link" href={assetHash(selectedId)}>Abrir Asset 360</a>
        {selectedId !== focusId && <button type="button" className="nexus-asset-link nexus-relationship-link-button" onClick={() => onFocus(selectedId)}>Enfocar este CI</button>}
      </div>
    </div>
    <dl className="nexus-relationship-context-grid">
      <div><dt>Dominio</dt><dd>{asset.taxonomyCompatibilityFallback ? `${asset.domain} (proyección)` : asset.domain}</dd></div>
      <div><dt>Clase</dt><dd>{assetClassLabel(asset.assetClass)}</dd></div>
      <div><dt>Rol</dt><dd>{technologyRoleLabel(asset.role)}</dd></div>
      <div><dt>Lifecycle</dt><dd>{lifecycleLabels[asset.lifecycle]}</dd></div>
      <div><dt>Criticidad</dt><dd>{criticalityLabels[criticality]}</dd></div>
      <div><dt>Taxonomía</dt><dd>{taxonomyStateLabels[taxonomyState]}{asset.taxonomyReviewRequired ? " · revisión requerida" : ""}</dd></div>
      <div><dt>Fuentes</dt><dd>{asset.sourceSystems?.length ? asset.sourceSystems.join(", ") : "Sin cobertura disponible"}</dd></div>
      <div><dt>Última observación</dt><dd>{displayDate(asset.lastSeen)}</dd></div>
    </dl>
    <div className="nexus-relationship-incident">
      <h3>Relaciones visibles del CI</h3>
      {incident.length
        ? <ul>{incident.map((relationship) => <li key={relationship.id}>
            <strong>{relationshipSentence(relationship, graphAssets)}</strong>
            <span>{relationshipTypeNouns[relationship.type]} · {relationship.direction === "bidirectional" ? "bidireccional" : "dirigida"} · {displayDate(relationship.observedAt)}</span>
          </li>)}</ul>
        : <p className="nexus-muted">Sin relaciones visibles para este CI con el scope actual.</p>}
    </div>
  </section>;
}

export function RelationshipGraph({
  assetId,
  mode = "demo",
  mapState = defaultTechnologyMapState,
  inventoryProvider = demoProvider,
  relationshipProvider,
}: {
  assetId: string;
  mode?: AssetDataMode;
  mapState?: TechnologyMapState;
  inventoryProvider?: InventoryProvider;
  relationshipProvider?: RelationshipProvider;
}) {
  const effectiveRelationshipProvider = relationshipProvider ?? (mode === "demo" ? demoRelationshipProvider : undefined);
  const [inventoryState, setInventoryState] = useState<InventoryLoadState>({ status: "loading" });
  const [relationshipState, setRelationshipState] = useState<RelationshipLoadState>(() => effectiveRelationshipProvider ? { status: "loading" } : { status: "unavailable" });
  const [attempt, setAttempt] = useState(0);
  const [localMapState, setLocalMapState] = useState<TechnologyMapState>(mapState);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalMapState(mapState); }, [mapState]);

  useEffect(() => {
    const controller = new AbortController();
    setInventoryState({ status: "loading" });
    Promise.resolve().then(() => inventoryProvider(controller.signal))
      .then((snapshot) => { if (!controller.signal.aborted) setInventoryState({ status: "ready", snapshot }); })
      .catch(() => { if (!controller.signal.aborted) setInventoryState({ status: "error" }); });
    return () => controller.abort();
  }, [assetId, inventoryProvider, attempt]);

  useEffect(() => {
    if (!effectiveRelationshipProvider) {
      setRelationshipState({ status: "unavailable" });
      return;
    }
    const controller = new AbortController();
    setRelationshipState({ status: "loading" });
    Promise.resolve().then(() => effectiveRelationshipProvider({ assetId, depth: localMapState.depth }, controller.signal))
      .then((snapshot) => { if (!controller.signal.aborted) setRelationshipState({ status: "ready", snapshot }); })
      .catch(() => { if (!controller.signal.aborted) setRelationshipState({ status: "error" }); });
    return () => controller.abort();
  }, [assetId, effectiveRelationshipProvider, localMapState.depth, attempt]);

  useEffect(() => {
    if (inventoryState.status !== "ready") return;
    const frame = requestAnimationFrame(() => {
      const heading = contentRef.current?.querySelector<HTMLElement>("h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [inventoryState.status, assetId]);

  const filters: RelationshipFilters = {
    depth: localMapState.depth,
    type: localMapState.type,
    perspective: localMapState.perspective,
  };

  const graph = useMemo(() =>
    inventoryState.status === "ready" && relationshipState.status === "ready"
      ? buildRelationshipGraph(inventoryState.snapshot, relationshipState.snapshot, assetId, filters)
      : null,
  [assetId, filters.depth, filters.perspective, filters.type, inventoryState, relationshipState]);

  const selectedId = localMapState.selectedId ?? assetId;

  useEffect(() => {
    if (!graph || graph.nodeIds.includes(selectedId)) return;
    const next = { ...localMapState, selectedId: null };
    setLocalMapState(next);
    window.history.replaceState({ ...window.history.state }, "", relationsHash(assetId, next));
  }, [assetId, graph, localMapState, selectedId]);

  function navigate(next: TechnologyMapState, replace = false) {
    setLocalMapState(next);
    const hash = relationsHash(assetId, next);
    if (replace) window.history.replaceState({ ...window.history.state }, "", hash);
    else window.location.hash = hash.slice(1);
  }

  function updateFilters(patch: Partial<Pick<TechnologyMapState, "depth" | "type" | "perspective">>) {
    navigate({ ...localMapState, ...patch, selectedId: null });
  }

  if (inventoryState.status === "loading") return <LoadingState title="Cargando Technology Map" description={mode === "live" ? "Preparando el inventario disponible desde NEXUS API." : "Preparando el inventario y el scope sintético de demostración."} />;
  if (inventoryState.status === "error") return <ErrorState title="No se pudo cargar el inventario" description="Vuelve a intentar. No se mostrarán detalles técnicos del error." action={<Button onPress={() => setAttempt((value) => value + 1)}>Reintentar</Button>} />;

  const focusAsset = inventoryState.snapshot.assets.find((asset) => asset.id === assetId);
  if (!focusAsset) return <EmptyState title="Activo no encontrado" description={`No existe un activo con el identificador ${assetId} en este inventario.`} action={<a href="#assets">Volver al inventario</a>} />;

  const relationshipCount = graph?.relationships.length ?? 0;
  const nodeCount = graph?.nodeIds.length ?? 1;
  const coverageLabel = relationshipState.status === "unavailable"
    ? "Sin provider relacional"
    : relationshipState.status === "error"
      ? "Error de cobertura"
      : relationshipState.status === "loading"
        ? "Cargando relaciones"
        : "Cobertura disponible";

  return <div className="nexus-relationship-page" ref={contentRef}>
    <nav className="nexus-breadcrumb" aria-label="Breadcrumb"><ol><li><a href="#overview">Overview</a></li><li><a href="#assets">Activos</a></li><li><a href={assetHash(assetId)}>{focusAsset.name}</a></li><li aria-current="page">Technology Map</li></ol></nav>
    <PageHeader
      title="Technology Map"
      eyebrow="RELATIONSHIP WORKSPACE"
      description={`Scope centrado en ${focusAsset.name} (${focusAsset.id}). El mapa describe relaciones registradas; no demuestra causalidad ni blast radius.`}
      meta={<div className="nexus-asset-header-status">
        <Badge>{mode === "live" ? "Live" : "Demo sintética"}</Badge>
        <StatusBadge status={relationshipState.status === "ready" ? "info" : relationshipState.status === "error" ? "critical" : "neutral"}>{coverageLabel}</StatusBadge>
      </div>}
    />

    <section className="nexus-relationship-scope" aria-labelledby="relationship-scope-heading">
      <div><p className="nexus-overline">SCOPE ACTUAL</p><h2 id="relationship-scope-heading">Vecindario acotado</h2><p>El focus CI permanece como home node. Los filtros cambian el vecindario visible, no la evidencia original.</p></div>
      <dl>
        <div><dt>Focus CI</dt><dd>{focusAsset.name}</dd></div>
        <div><dt>Profundidad</dt><dd>{localMapState.depth} {localMapState.depth === 1 ? "nivel" : "niveles"}</dd></div>
        <div><dt>Nodos visibles</dt><dd>{nodeCountLabel(nodeCount)}</dd></div>
        <div><dt>Relaciones</dt><dd>{visibleCountLabel(relationshipCount)}</dd></div>
        <div><dt>Tipo</dt><dd>{localMapState.type === "all" ? "Todos" : relationshipTypeNouns[localMapState.type]}</dd></div>
        <div><dt>Perspectiva</dt><dd>{localMapState.perspective === "all" ? "Todas" : perspectiveLabels[localMapState.perspective]}</dd></div>
      </dl>
    </section>

    <section className="nexus-relationship-filters" aria-labelledby="relationship-filters-heading">
      <div><h2 id="relationship-filters-heading">Ajustar scope</h2><p>El estado esencial queda codificado en la URL para refresh, compartir y Atrás/Adelante.</p></div>
      <div className="nexus-relationship-filter-grid">
        <SelectField label="Tipo de relación" value={localMapState.type} onChange={(value) => updateFilters({ type: value as TechnologyMapState["type"] })}><option value="all">Todos los tipos</option>{relationshipTypes.map((type) => <option key={type} value={type}>{relationshipTypeNouns[type]}</option>)}</SelectField>
        <SelectField label="Perspectiva" value={localMapState.perspective} onChange={(value) => updateFilters({ perspective: value as TechnologyMapState["perspective"] })}><option value="all">Todas</option><option value="upstream">De qué depende / qué usa</option><option value="downstream">Qué depende de este CI</option><option value="peer">Conexiones entre pares</option></SelectField>
        <SelectField label="Profundidad" value={String(localMapState.depth)} onChange={(value) => updateFilters({ depth: Number(value) as 1 | 2 })}><option value="1">1 nivel</option><option value="2">2 niveles</option></SelectField>
        <Button variant="secondary" onPress={() => navigate(defaultTechnologyMapState)}><RotateCcw aria-hidden="true" /> Restablecer</Button>
      </div>
    </section>

    {relationshipState.status === "loading" && <LoadingState title="Cargando relaciones" description="El inventario ya está disponible; NEXUS está resolviendo el vecindario relacional solicitado." />}
    {relationshipState.status === "error" && <ErrorState title="No se pudo cargar la cobertura relacional" description="La identidad del CI sigue disponible. Reintenta sólo la consulta del mapa." action={<Button onPress={() => setAttempt((value) => value + 1)}>Reintentar relaciones</Button>} />}
    {relationshipState.status === "unavailable" && <EmptyState title="Relaciones no disponibles en este provider" description="El modo Live mantiene la misma arquitectura de producto, pero NEXUS API todavía no entrega relaciones defendibles para este workspace. No se usan fixtures Demo como fallback." action={<a href={assetHash(assetId)}>Volver a Asset 360</a>} />}

    {relationshipState.status === "ready" && relationshipState.snapshot.relationships.length === 0 && <EmptyState title="Sin relaciones registradas" description={mode === "live" ? "El provider no entregó relaciones para este CI y scope." : "Este CI no tiene relaciones sintéticas registradas dentro del scope solicitado."} action={<a href={assetHash(assetId)}>Volver a Asset 360</a>} />}

    {graph && relationshipState.status === "ready" && relationshipState.snapshot.relationships.length > 0 && (graph.relationships.length === 0
      ? <EmptyState title="Sin relaciones para estos filtros" description="Cambia el tipo, la perspectiva o la profundidad para ampliar el scope." action={<Button onPress={() => navigate(defaultTechnologyMapState)}>Restablecer filtros</Button>} />
      : <>
        <section className="nexus-relationship-map" aria-labelledby="relationship-map-heading">
          <div className="nexus-relationship-map__header"><div><h2 id="relationship-map-heading"><Network aria-hidden="true" /> Mapa visual</h2><p className="nexus-muted">Las flechas expresan orientación de la relación registrada. No representan causalidad ni una predicción de impacto.</p></div><Badge>{localMapState.depth} {localMapState.depth === 1 ? "nivel" : "niveles"}</Badge></div>
          <p className="nexus-relationship-mobile-note">En pantallas pequeñas se prioriza la vista semántica. El mismo scope y las mismas relaciones permanecen disponibles debajo.</p>
          <VisualGraph
            focusId={assetId}
            selectedId={selectedId}
            assets={graph.assets}
            nodeIds={graph.nodeIds}
            relationships={graph.relationships}
            onSelect={(id) => navigate({ ...localMapState, selectedId: id === assetId ? null : id })}
          />
          <div className="nexus-relationship-legend" aria-label="Leyenda del mapa"><strong>Leyenda</strong><span><i data-line="solid" /> Dependencia</span><span><i data-line="dashed" /> Uso</span><span><i data-line="dotted" /> Conectividad</span><span><b>FOCUS</b> home node</span></div>
        </section>

        <SelectionPanel
          selectedId={selectedId}
          focusId={assetId}
          graphAssets={graph.assets}
          relationships={graph.relationships}
          onFocus={(id) => { window.location.hash = relationsHash(id, { ...localMapState, selectedId: null }).slice(1); }}
        />

        {graph.unresolvedIds.length > 0 && <aside className="nexus-relationship-warning" role="status"><strong>Referencias fuera del inventario disponible</strong><p>{graph.unresolvedIds.length} CI referenciado no existe en el snapshot actual. Se conserva como endpoint relacional sin crear un Asset 360 falso.</p></aside>}
        <SemanticRelationships relationships={graph.relationships} assets={graph.assets} focusId={assetId} />
      </>)}

    <aside className="nexus-relationship-disclaimer">
      <strong>Interpretación</strong>
      <p>{mode === "demo"
        ? "Este workspace usa relaciones sintéticas del dataset canónico Demo. No representa topología corporativa real."
        : "Live sólo muestra relaciones entregadas por un provider defendible. NEXUS no infiere conexiones desde hostname, IP, fabricante, responsable o ubicación."}</p>
    </aside>
  </div>;
}
