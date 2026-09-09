import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@igx-nexus/ui";
import { Network, RotateCcw } from "lucide-react";
import type { Asset, InventoryProvider, InventorySnapshot } from "./asset-model";
import { typeLabels } from "./asset-model";
import { demoProvider } from "./demo-provider";
import { demoRelationshipProvider } from "./demo-relationship-provider";
import { assetHash, relationsHash } from "./navigation-model";
import {
  assetTypeShortLabels,
  buildRelationshipGraph,
  layoutRelationshipGraph,
  perspectiveFrom,
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

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly inventory: InventorySnapshot; readonly relationships: RelationshipSnapshot };

const defaultFilters: RelationshipFilters = { type: "all", perspective: "all", depth: 2 };
const perspectiveLabels = { upstream: "Dependencia upstream", downstream: "Impacto downstream", peer: "Conexión entre pares", indirect: "Relaciones de segundo nivel" } as const;
const visibleCountLabel = (count: number) => `${count} ${count === 1 ? "relación visible" : "relaciones visibles"}`;

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
        return <line key={relationship.id} className={`nexus-relationship-edge nexus-relationship-edge--${relationship.type}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} markerEnd="url(#relationship-arrow)" markerStart={relationship.direction === "bidirectional" ? "url(#relationship-arrow)" : undefined} />;
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
        aria-label={`${asset?.name ?? `CI no disponible ${position.id}`}${isFocus ? ", activo enfocado" : ""}`}
      >
        <span className="nexus-relationship-node__type" aria-hidden="true">{asset ? assetTypeShortLabels[asset.type] : "?"}</span>
        <strong>{asset?.name ?? "CI no disponible"}</strong>
        <span>{position.id}</span>
        {isFocus && <em>ENFOCADO</em>}
      </button>;
    })}
  </div>;
}

function EndpointLink({ id, assets, focusId }: { id: string; assets: ReadonlyMap<string, Asset>; focusId: string }) {
  const asset = assets.get(id);
  if (!asset) return <span>CI no disponible <code>{id}</code></span>;
  return id === focusId
    ? <strong>{asset.name} (enfocado)</strong>
    : <a href={assetHash(id)}>{asset.name}</a>;
}

function SemanticRelationships({ relationships, assets, focusId }: { relationships: readonly Relationship[]; assets: ReadonlyMap<string, Asset>; focusId: string }) {
  const groups = ["upstream", "downstream", "peer", "indirect"] as const;
  return <section className="nexus-relationship-list" aria-labelledby="relationship-list-heading">
    <h2 id="relationship-list-heading">Relaciones en formato accesible</h2>
    <p className="nexus-muted">La lista entrega la misma información esencial del mapa visual y permanece disponible en cualquier tamaño de pantalla.</p>
    {groups.map((group) => {
      const entries = relationships.filter((relationship) => group === "indirect" ? perspectiveFrom(relationship, focusId) === null : perspectiveFrom(relationship, focusId) === group);
      if (entries.length === 0) return null;
      return <section key={group} aria-labelledby={`relationship-${group}-heading`}>
        <h3 id={`relationship-${group}-heading`}>{perspectiveLabels[group]}</h3>
        <ul>{entries.map((relationship) => <li key={relationship.id}>
          <div><EndpointLink id={relationship.sourceId} assets={assets} focusId={focusId} /> <span>{relationshipTypeLabels[relationship.type]}</span> <EndpointLink id={relationship.targetId} assets={assets} focusId={focusId} /></div>
          <div className="nexus-relationship-meta"><Badge>{relationshipTypeNouns[relationship.type]}</Badge><span>{relationship.direction === "bidirectional" ? "Bidireccional" : "Dirigida"}</span>{relationship.status !== "active" && <StatusBadge status="warning">Señal degradada</StatusBadge>}</div>
        </li>)}</ul>
      </section>;
    })}
  </section>;
}

export function RelationshipGraph({ assetId, inventoryProvider = demoProvider, relationshipProvider = demoRelationshipProvider }: { assetId: string; inventoryProvider?: InventoryProvider; relationshipProvider?: RelationshipProvider }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState<RelationshipFilters>(defaultFilters);
  const [selectedId, setSelectedId] = useState(assetId);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.all([
      Promise.resolve().then(() => inventoryProvider(controller.signal)),
      Promise.resolve().then(() => relationshipProvider({ assetId, depth: 2 }, controller.signal)),
    ]).then(([inventory, relationships]) => {
      if (!controller.signal.aborted) setState({ status: "ready", inventory, relationships });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: "error" });
    });
    return () => controller.abort();
  }, [assetId, inventoryProvider, relationshipProvider, attempt]);

  useEffect(() => { setSelectedId(assetId); }, [assetId]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const frame = requestAnimationFrame(() => {
      const heading = contentRef.current?.querySelector<HTMLElement>("h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [state.status, assetId]);

  const graph = useMemo(() => state.status === "ready"
    ? buildRelationshipGraph(state.inventory, state.relationships, assetId, filters)
    : null, [assetId, filters, state]);

  useEffect(() => {
    if (graph && !graph.nodeIds.includes(selectedId)) setSelectedId(assetId);
  }, [assetId, graph, selectedId]);

  if (state.status === "loading") return <LoadingState title="Cargando mapa de relaciones" description="Preparando el vecindario sintético del activo." />;
  if (state.status === "error") return <ErrorState title="No se pudo cargar el mapa" description="Vuelve a intentar. No se mostrarán detalles técnicos del error." action={<Button onPress={() => setAttempt((value) => value + 1)}>Reintentar</Button>} />;

  const focusAsset = state.inventory.assets.find((asset) => asset.id === assetId);
  if (!focusAsset) return <EmptyState title="Activo no encontrado" description={`No existe un activo con el identificador ${assetId} en este inventario.`} action={<a href="#assets">Volver al inventario</a>} />;
  if (state.relationships.relationships.length === 0) return <EmptyState title="Activo sin relaciones" description={`${focusAsset.name} todavía no tiene relaciones registradas en el escenario demo.`} action={<a href={assetHash(assetId)}>Volver a Asset 360</a>} />;
  if (!graph) return null;

  const selectedAsset = graph.assets.get(selectedId);
  const selectedRelationships = graph.relationships.filter((relationship) => relationship.sourceId === selectedId || relationship.targetId === selectedId);
  return <div className="nexus-relationship-page" ref={contentRef}>
    <nav className="nexus-breadcrumb" aria-label="Breadcrumb"><ol><li><a href="#overview">Panel principal</a></li><li><a href="#assets">Activos</a></li><li><a href={assetHash(assetId)}>{focusAsset.name}</a></li><li aria-current="page">Relaciones</li></ol></nav>
    <PageHeader title="Grafo de Relaciones" eyebrow="THE TECHNOLOGY MAP · CMDB-010" description={`Mapa centrado en ${focusAsset.name} (${focusAsset.id}).`} meta={<div className="nexus-asset-header-status"><Badge>Datos sintéticos</Badge><StatusBadge status="info">{visibleCountLabel(graph.relationships.length)}</StatusBadge></div>} />

    <section className="nexus-relationship-filters" aria-labelledby="relationship-filters-heading">
      <div><h2 id="relationship-filters-heading">Explorar vecindario</h2><p>Filtra sin alterar la identidad ni la semántica de las relaciones.</p></div>
      <div className="nexus-relationship-filter-grid">
        <SelectField label="Tipo de relación" value={filters.type} onChange={(value) => setFilters((current) => ({ ...current, type: value as RelationshipFilters["type"] }))}><option value="all">Todos los tipos</option>{relationshipTypes.map((type) => <option key={type} value={type}>{relationshipTypeNouns[type]}</option>)}</SelectField>
        <SelectField label="Dirección" value={filters.perspective} onChange={(value) => setFilters((current) => ({ ...current, perspective: value as RelationshipFilters["perspective"] }))}><option value="all">Todas</option><option value="upstream">De qué depende</option><option value="downstream">Qué podría afectarse</option><option value="peer">Conexiones entre pares</option></SelectField>
        <SelectField label="Profundidad" value={String(filters.depth)} onChange={(value) => setFilters((current) => ({ ...current, depth: Number(value) as 1 | 2 }))}><option value="1">1 nivel</option><option value="2">2 niveles</option></SelectField>
        <Button variant="secondary" onPress={() => setFilters(defaultFilters)}><RotateCcw aria-hidden="true" /> Restablecer</Button>
      </div>
    </section>

    {graph.relationships.length === 0 ? <EmptyState title="Sin relaciones para estos filtros" description="Cambia el tipo, la dirección o la profundidad para ampliar el mapa." action={<Button onPress={() => setFilters(defaultFilters)}>Restablecer filtros</Button>} /> : <>
      <section className="nexus-relationship-map" aria-labelledby="relationship-map-heading">
        <div className="nexus-relationship-map__header"><div><h2 id="relationship-map-heading"><Network aria-hidden="true" /> Mapa visual</h2><p className="nexus-muted">Las flechas apuntan desde el CI que usa o depende hacia el CI requerido. Una línea con flechas en ambos extremos representa conectividad simétrica.</p></div><Badge>{filters.depth} {filters.depth === 1 ? "nivel" : "niveles"}</Badge></div>
        <p className="nexus-relationship-mobile-note">En pantallas pequeñas se prioriza la lista accesible para mantener la legibilidad. Los mismos datos siguen disponibles debajo.</p>
        <VisualGraph focusId={assetId} selectedId={selectedId} assets={graph.assets} nodeIds={graph.nodeIds} relationships={graph.relationships} onSelect={setSelectedId} />
        <div className="nexus-relationship-legend" aria-label="Leyenda del mapa"><strong>Leyenda</strong><span><i data-line="solid" /> Dependencia</span><span><i data-line="dashed" /> Uso</span><span><i data-line="dotted" /> Conectividad</span><span><b>ENFOCADO</b> activo central</span></div>
      </section>

      <section className="nexus-relationship-selection" aria-labelledby="relationship-selection-heading" aria-live="polite">
        <div><h2 id="relationship-selection-heading">{selectedAsset?.name ?? "CI no disponible"}</h2><p><code>{selectedId}</code>{selectedAsset ? ` · ${typeLabels[selectedAsset.type]}` : " · Referencia incompleta"}</p></div>
        <div className="nexus-asset-actions">{selectedAsset && <a className="nexus-asset-link" href={assetHash(selectedId)}>Abrir Asset 360</a>}{selectedAsset && selectedId !== assetId && <a className="nexus-asset-link" href={relationsHash(selectedId)}>Enfocar este CI</a>}</div>
        <p>{selectedRelationships.length > 0 ? `${selectedRelationships.length} relaciones visibles para el nodo seleccionado.` : "Sin relaciones visibles para este nodo con los filtros actuales."}</p>
      </section>

      {graph.unresolvedIds.length > 0 && <aside className="nexus-relationship-warning" role="status"><strong>Relaciones incompletas</strong><p>{graph.unresolvedIds.length} CI referenciado no existe en el snapshot. Se muestra sin navegación para no crear un Asset 360 falso.</p></aside>}
      <SemanticRelationships relationships={graph.relationships} assets={graph.assets} focusId={assetId} />
    </>}

    <aside className="nexus-relationship-disclaimer"><strong>Alcance de la demo</strong><p>Este mapa usa fixtures sintéticos. No ejecuta discovery, escaneo activo ni consultas a GLPI, Intune, Graph, Entra, SNMP o redes OT/ICS.</p></aside>
  </div>;
}
