import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@igx-nexus/ui";
import {
  ageInDays,
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
import { warrantyDays } from "./dashboard-model";
import { demoProvider } from "./demo-provider";
import { demoRelationshipInventoryProvider } from "./demo-relationship-provider";
import { AssetHealthSection } from "./HealthDetails";
import { validHealthDate } from "./health-engine";
import {
  otherEndpoint,
  perspectiveFrom,
  relationshipTypeNouns,
  type RelationshipInventoryProvider,
  type RelationshipSnapshot,
} from "./relationship-model";
import { assetHash, assetSectionHash, demoQrHash, labelHash, relationsHash, type AssetSection } from "./navigation-model";
import { demoLocatorForAsset } from "./qr-locator";
import "./asset-360.css";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; snapshot: InventorySnapshot };

type RelationshipLoadState =
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; snapshot: RelationshipSnapshot };

const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" });
const lifecycleTones = {
  assigned: "success",
  stock: "info",
  repair: "warning",
  retired: "neutral",
  planned: "info",
  in_stock: "info",
  active: "success",
  maintenance: "warning",
  disposed: "neutral",
  unknown: "neutral",
} as const;

const sectionLabels: Record<AssetSection, string> = {
  summary: "Resumen",
  inventory: "Inventario",
  evidence: "Evidencia y fuentes",
  relationships: "Relaciones",
};

function displayDate(value: string | null): string {
  return value && validHealthDate(value) ? dateFormat.format(new Date(value)) : "Sin fecha verificable";
}

function warrantyPresentation(asset: Asset, asOf: string, isLive: boolean) {
  if (asset.warrantyEnds && !validHealthDate(asset.warrantyEnds)) {
    return {
      label: "No verificable",
      detail: isLive ? "La fecha registrada no es válida; revisar calidad de datos." : "La fecha registrada no es válida; revisar CMDB Health.",
      tone: "neutral" as const,
    };
  }
  const days = warrantyDays(asset, asOf);
  if (days === null) return { label: "Desconocida", detail: "No hay fecha de garantía disponible.", tone: "neutral" as const };
  if (days < 0) return { label: "Vencida", detail: `Venció hace ${Math.abs(Math.ceil(days))} días.`, tone: "danger" as const };
  if (days <= 90) {
    return {
      label: "Próxima a vencer",
      detail: `Quedan ${Math.floor(days)} días según ${isLive ? "el snapshot" : "el corte demo"}.`,
      tone: "warning" as const,
    };
  }
  return {
    label: "Vigente",
    detail: `Quedan ${Math.floor(days)} días según ${isLive ? "el snapshot" : "el corte demo"}.`,
    tone: "success" as const,
  };
}

function freshnessPresentation(asset: Asset, asOf: string) {
  const age = ageInDays(asset.lastSeen, asOf);
  if (age === null || age < 0) return { label: "Sin fecha verificable", tone: "neutral" as const, detail: "No existe una observación utilizable para este CI." };
  if (age <= 7) return { label: "Reciente", tone: "success" as const, detail: `Observado hace ${Math.floor(age)} días.` };
  if (age <= 30) return { label: "Antigua", tone: "warning" as const, detail: `Observado hace ${Math.floor(age)} días.` };
  return { label: "Muy antigua", tone: "danger" as const, detail: `Observado hace ${Math.floor(age)} días.` };
}

function Field({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return <div><dt>{label}</dt><dd className={mono ? "nexus-asset-mono" : undefined}>{value?.trim() || "No informado"}</dd></div>;
}

function AssetSectionNav({ assetId, section }: { assetId: string; section: AssetSection }) {
  return <nav className="nexus-asset-local-nav" aria-label="Secciones de Asset 360">
    {(["summary", "inventory", "evidence", "relationships"] as const).map(candidate =>
      <a key={candidate} href={assetSectionHash(assetId, candidate)} aria-current={candidate === section ? "page" : undefined}>
        {sectionLabels[candidate]}
      </a>
    )}
  </nav>;
}

function TaxonomyStatus({ asset }: { asset: Asset }) {
  const state = asset.taxonomyState ?? "unknown";
  const fallback = asset.taxonomyCompatibilityFallback === true;
  const review = asset.taxonomyReviewRequired !== false;
  return <div className="nexus-asset-taxonomy-status">
    <StatusBadge status={state === "classified" && !fallback ? "success" : state === "conflict" ? "critical" : "warning"}>
      {taxonomyStateLabels[state]}
    </StatusBadge>
    {review && <StatusBadge status="warning">Revisión requerida</StatusBadge>}
    {fallback && <Badge>Proyección de compatibilidad</Badge>}
  </div>;
}

function SummaryPanel({
  asset,
  snapshot,
  relationshipProvider,
}: {
  asset: Asset;
  snapshot: InventorySnapshot;
  relationshipProvider?: RelationshipInventoryProvider;
}) {
  const isLive = asset.dataMode === "live";
  const warranty = warrantyPresentation(asset, snapshot.asOf, isLive);
  const freshness = freshnessPresentation(asset, snapshot.asOf);
  const criticality = asset.criticality ?? "unknown";
  const taxonomyState = asset.taxonomyState ?? "unknown";
  const attention = [
    asset.taxonomyCompatibilityFallback ? "La clasificación visible es una proyección de compatibilidad." : null,
    asset.taxonomyReviewRequired ? "La taxonomía requiere revisión." : null,
    freshness.tone === "warning" || freshness.tone === "danger" ? `La observación es ${freshness.label.toLocaleLowerCase("es-CL")}.` : null,
    warranty.tone === "warning" || warranty.tone === "danger" ? `Garantía: ${warranty.label.toLocaleLowerCase("es-CL")}.` : null,
  ].filter((value): value is string => Boolean(value));

  return <section className="nexus-asset-panel" aria-labelledby="asset-section-summary">
    <div className="nexus-asset-panel-heading">
      <div>
        <p className="nexus-overline">ASSET 360</p>
        <h2 id="asset-section-summary" data-asset-section-heading="summary">Resumen</h2>
      </div>
      <p>Estado defendible del CI dentro de la cobertura disponible. No es un risk score.</p>
    </div>

    <div className="nexus-asset-overview-grid">
      <section className="nexus-asset-section" aria-labelledby="asset-attention-heading">
        <h3 id="asset-attention-heading">Requiere atención</h3>
        {attention.length
          ? <ul className="nexus-asset-attention-list">{attention.map(item => <li key={item}>{item}</li>)}</ul>
          : <p>No hay señales deterministas que requieran atención dentro de la cobertura actual.</p>}
        <p className="nexus-muted">Ausencia de señales no significa que el dispositivo esté técnicamente saludable.</p>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-classification-heading">
        <h3 id="asset-classification-heading">Clasificación</h3>
        <TaxonomyStatus asset={asset} />
        <dl className="nexus-asset-fields">
          <Field label={asset.taxonomyCompatibilityFallback ? "Dominio proyectado" : "Dominio"} value={asset.domain} />
          <Field label="Clase" value={assetClassLabel(asset.assetClass)} />
          <Field label="Rol" value={technologyRoleLabel(asset.role)} />
          <Field label="Estado taxonómico" value={taxonomyStateLabels[taxonomyState]} />
        </dl>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-lifecycle-summary-heading">
        <h3 id="asset-lifecycle-summary-heading">Lifecycle y garantía</h3>
        <div className="nexus-asset-status-row">
          <StatusBadge status={lifecycleTones[asset.lifecycle]}>{lifecycleLabels[asset.lifecycle]}</StatusBadge>
          <StatusBadge status={criticality === "critical" || criticality === "high" ? "critical" : "neutral"}>
            Criticidad {criticalityLabels[criticality]}
          </StatusBadge>
          <StatusBadge status={warranty.tone}>{warranty.label}</StatusBadge>
        </div>
        <p>{warranty.detail}</p>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-signal-heading">
        <h3 id="asset-signal-heading">Señal técnica</h3>
        <div className="nexus-asset-status-row"><StatusBadge status={freshness.tone}>{freshness.label}</StatusBadge><Badge>Observación de inventario</Badge></div>
        <p>{freshness.detail}</p>
        <p className="nexus-muted">Esto describe freshness de inventario; Device Health/Endpoint Experience todavía no está disponible en Asset 360.</p>
      </section>

      {!isLive && <AssetHealthSection inventory={snapshot} assetId={asset.id} {...(relationshipProvider ? { relationshipProvider } : {})} />}
      {isLive && <section className="nexus-asset-section" aria-labelledby="asset-quality-coverage-heading">
        <h3 id="asset-quality-coverage-heading">Calidad del registro CMDB</h3>
        <div className="nexus-asset-status-row"><StatusBadge status="neutral">Sin evaluación en esta vista Live</StatusBadge></div>
        <p className="nexus-muted">NEXUS no reutiliza el score sintético de Demo ni lo presenta como Device Health.</p>
      </section>}
    </div>
  </section>;
}

function InventoryPanel({ asset, snapshot }: { asset: Asset; snapshot: InventorySnapshot }) {
  const isLive = asset.dataMode === "live";
  const locator = isLive ? null : demoLocatorForAsset(asset.id);
  const warranty = warrantyPresentation(asset, snapshot.asOf, isLive);
  const criticality = asset.criticality ?? "unknown";
  const contexts = asset.operationalContexts ?? [];

  return <section className="nexus-asset-panel" aria-labelledby="asset-section-inventory">
    <div className="nexus-asset-panel-heading">
      <div><p className="nexus-overline">ASSET 360</p><h2 id="asset-section-inventory" data-asset-section-heading="inventory">Inventario</h2></div>
      <p>Identidad, clasificación, asignación y atributos normalizados disponibles para este CI.</p>
    </div>

    <div className="nexus-asset-section-grid">
      <section className="nexus-asset-section" aria-labelledby="asset-identity-heading">
        <h3 id="asset-identity-heading">Identidad</h3>
        <dl className="nexus-asset-fields">
          <Field label="ID NEXUS" value={asset.id} mono />
          <Field label="Hostname" value={asset.hostname} mono />
          <Field label="Serial" value={asset.serial} mono />
          <Field label="Asset tag" value={asset.assetTag} mono />
          <Field label="Tipo de fuente" value={typeLabels[asset.type]} />
          <Field label="IP" value={asset.ipAddress} mono />
        </dl>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-taxonomy-heading">
        <h3 id="asset-taxonomy-heading">Taxonomía y contexto</h3>
        <TaxonomyStatus asset={asset} />
        <dl className="nexus-asset-fields">
          <Field label={asset.taxonomyCompatibilityFallback ? "Dominio proyectado" : "Dominio"} value={asset.domain} />
          <Field label="Asset class" value={assetClassLabel(asset.assetClass)} />
          <Field label="Rol" value={technologyRoleLabel(asset.role)} />
          <Field label="Estado" value={taxonomyStateLabels[asset.taxonomyState ?? "unknown"]} />
        </dl>
        {asset.taxonomyCompatibilityFallback && <p role="note" className="nexus-asset-warning">Los scalars visibles preservan compatibilidad del schema; no equivalen a una clasificación resuelta.</p>}
        <div>
          <h4>Contextos operacionales</h4>
          {contexts.length
            ? <ul className="nexus-asset-context-list">{contexts.map(context => <li key={context.id}><strong>{context.displayName ?? context.id}</strong><span>{context.kind}</span></li>)}</ul>
            : <p className="nexus-muted">{isLive ? "Sin cobertura del provider para Operational Context." : "Este activo Demo no tiene contextos operacionales adicionales."}</p>}
        </div>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-assignment-heading">
        <h3 id="asset-assignment-heading">Asignación y ubicación</h3>
        <dl className="nexus-asset-fields">
          <Field label="Responsable" value={asset.owner} />
          <Field label="Ubicación / sitio" value={asset.location} />
        </dl>
        <p className="nexus-muted">{isLive ? "Los campos ausentes permanecen no informados; NEXUS no infiere responsable ni ubicación." : "La Demo conserva sus campos históricos de responsable y sitio."}</p>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-hardware-heading">
        <h3 id="asset-hardware-heading">Hardware</h3>
        <dl className="nexus-asset-fields">
          <Field label="Fabricante" value={asset.manufacturer} />
          <Field label="Modelo" value={asset.model} />
          <Field label="Categoría histórica" value={typeLabels[asset.type]} />
          <Field label={isLive ? "IP" : "IP demo"} value={asset.ipAddress} mono />
        </dl>
        <p className="nexus-muted">{isLive ? "Sólo se muestran atributos normalizados presentes en NEXUS API." : "Las direcciones Demo pertenecen a TEST-NET-1 y no representan direccionamiento corporativo."}</p>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-lifecycle-heading">
        <h3 id="asset-lifecycle-heading">Lifecycle y garantía</h3>
        <div className="nexus-asset-status-row">
          <StatusBadge status={lifecycleTones[asset.lifecycle]}>{lifecycleLabels[asset.lifecycle]}</StatusBadge>
          <StatusBadge status={criticality === "critical" || criticality === "high" ? "critical" : "neutral"}>Criticidad {criticalityLabels[criticality]}</StatusBadge>
          <StatusBadge status={warranty.tone}>{warranty.label}</StatusBadge>
        </div>
        <dl className="nexus-asset-fields">
          <Field label="Estado lifecycle" value={lifecycleLabels[asset.lifecycle]} />
          <Field label="Fecha de garantía" value={asset.warrantyEnds ? displayDate(asset.warrantyEnds) : null} />
          <Field label="Situación de garantía" value={warranty.detail} />
        </dl>
      </section>

      {!isLive && locator && <section className="nexus-asset-section nexus-asset-qr" aria-labelledby="asset-qr-heading">
        <h3 id="asset-qr-heading">Etiqueta y QR</h3>
        <div className="nexus-asset-status-row"><StatusBadge status="info">Demo</StatusBadge><Badge>No productivo</Badge></div>
        <dl className="nexus-asset-fields"><Field label="Locator demo" value={locator} mono /><Field label="Estado" value="Activo (fixture)" /></dl>
        <p className="nexus-muted">El locator no contiene serial, IP, hostname, usuario ni ubicación. Conocerlo no concede autorización.</p>
        <div className="nexus-asset-actions"><a className="nexus-asset-link" href={labelHash(asset.id)}>Diseñar etiqueta</a><a className="nexus-asset-link" href={demoQrHash(locator)}>Probar resolución demo</a></div>
      </section>}
    </div>
  </section>;
}

function EvidencePanel({ asset, snapshot }: { asset: Asset; snapshot: InventorySnapshot }) {
  const isLive = asset.dataMode === "live";
  const references = asset.sourceReferences?.length
    ? asset.sourceReferences
    : (asset.sourceSystems ?? []).map(source => ({ source, observedAt: asset.sourceObservedAt ?? null }));

  return <section className="nexus-asset-panel" aria-labelledby="asset-section-evidence">
    <div className="nexus-asset-panel-heading">
      <div><p className="nexus-overline">ASSET 360</p><h2 id="asset-section-evidence" data-asset-section-heading="evidence">Evidencia y fuentes</h2></div>
      <p>Qué fuentes respaldan la proyección visible y cuándo declararon su observación.</p>
    </div>

    <section className="nexus-asset-section" aria-labelledby="asset-source-heading">
      <h3 id="asset-source-heading">Referencias de fuente</h3>
      <dl className="nexus-asset-fields">
        <Field label="Corte del snapshot" value={displayDate(snapshot.asOf)} />
        <Field label="Última observación del activo" value={displayDate(asset.lastSeen)} />
      </dl>
      {references.length
        ? <div className="nexus-asset-source-table-wrap"><table className="nexus-asset-source-table">
            <caption>Fuentes conocidas para {asset.name}</caption>
            <thead><tr><th scope="col">Fuente</th><th scope="col">Observado en fuente</th></tr></thead>
            <tbody>{references.map((reference, index) => <tr key={`${reference.source}-${reference.observedAt ?? "unknown"}-${index}`}><td>{reference.source}</td><td>{displayDate(reference.observedAt)}</td></tr>)}</tbody>
          </table></div>
        : <EmptyState title="Sin referencias de fuente disponibles" description="La proyección actual no entrega referencias utilizables para este CI." />}
      <p className="nexus-muted">{isLive
        ? "La Web consume exclusivamente NEXUS API. Cada fecha se muestra sólo para la referencia que realmente la transporta."
        : "Las fuentes y fechas son evidencia sintética de la Demo y no representan sincronización corporativa real."}</p>
    </section>

    <section className="nexus-asset-section" aria-labelledby="asset-provenance-coverage-heading">
      <h3 id="asset-provenance-coverage-heading">Cobertura de provenance</h3>
      <div className="nexus-asset-status-row"><StatusBadge status="neutral">Cobertura parcial en la Web</StatusBadge></div>
      <p>Asset 360 no inventa authority, confidence ni claims por atributo cuando esa evidencia no llega a la proyección Web actual.</p>
      <p className="nexus-muted">La existencia de una fuente no implica por sí sola que todos los atributos visibles provengan de ella ni que una relación sea causal.</p>
    </section>
  </section>;
}

function RelationshipPanel({
  asset,
  inventory,
  provider,
}: {
  asset: Asset;
  inventory: InventorySnapshot;
  provider?: RelationshipInventoryProvider;
}) {
  const effectiveProvider = provider ?? (asset.dataMode === "live" ? undefined : demoRelationshipInventoryProvider);
  const [state, setState] = useState<RelationshipLoadState>(() => effectiveProvider ? { status: "loading" } : { status: "unavailable" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!effectiveProvider) {
      setState({ status: "unavailable" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.resolve(effectiveProvider(controller.signal))
      .then(snapshot => { if (!controller.signal.aborted) setState({ status: "ready", snapshot }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: "error" }); });
    return () => controller.abort();
  }, [effectiveProvider, attempt, asset.id]);

  const byId = useMemo(() => new Map(inventory.assets.map(candidate => [candidate.id, candidate])), [inventory]);
  const incident = state.status === "ready"
    ? state.snapshot.relationships.filter(relationship => relationship.sourceId === asset.id || relationship.targetId === asset.id)
    : [];

  return <section className="nexus-asset-panel" aria-labelledby="asset-section-relationships">
    <div className="nexus-asset-panel-heading">
      <div><p className="nexus-overline">ASSET 360</p><h2 id="asset-section-relationships" data-asset-section-heading="relationships">Relaciones</h2></div>
      <p>Claims incidentes al CI dentro de la cobertura disponible. Una relación no demuestra impacto ni causalidad por sí sola.</p>
    </div>

    {!effectiveProvider && <section className="nexus-asset-section" aria-labelledby="asset-relations-unavailable-heading">
      <h3 id="asset-relations-unavailable-heading">Sin cobertura de relaciones Live</h3>
      <div className="nexus-asset-status-row"><StatusBadge status="neutral">No disponible</StatusBadge></div>
      <p>NEXUS no sustituye esta ausencia con relaciones sintéticas de Demo.</p>
    </section>}

    {state.status === "loading" && <LoadingState title="Cargando relaciones" description="Consultando evidencia relacional disponible para este CI." />}
    {state.status === "error" && <ErrorState title="No se pudieron cargar las relaciones" description="La identidad y el inventario del CI siguen disponibles." action={<Button onPress={() => setAttempt(value => value + 1)}>Reintentar relaciones</Button>} />}
    {state.status === "ready" && incident.length === 0 && <EmptyState title="Sin relaciones conocidas" description="No hay claims relacionales incidentes a este CI dentro de la cobertura actual." />}

    {state.status === "ready" && incident.length > 0 && <>
      <ul className="nexus-asset-relationship-list">
        {incident.map(relationship => {
          const otherId = otherEndpoint(relationship, asset.id);
          const otherAsset = otherId ? byId.get(otherId) : undefined;
          const perspective = perspectiveFrom(relationship, asset.id);
          return <li key={relationship.id}>
            <div className="nexus-asset-relationship-main">
              <div>
                <strong>{relationshipTypeNouns[relationship.type]}</strong>
                <span>{perspective === "upstream" ? "Salida desde este CI" : perspective === "downstream" ? "Entrada hacia este CI" : "Relación bidireccional"}</span>
              </div>
              <StatusBadge status={relationship.status === "degraded" ? "warning" : relationship.status === "active" ? "success" : "neutral"}>{relationship.status}</StatusBadge>
            </div>
            <dl className="nexus-asset-fields">
              <Field label="Otro endpoint" value={otherAsset?.name ?? otherId ?? null} />
              <Field label="ID del endpoint" value={otherId ?? null} mono />
              <Field label="Observada" value={displayDate(relationship.observedAt)} />
              <Field label="Fuente" value={relationship.source} />
            </dl>
            {otherId && <a className="nexus-asset-link" href={assetHash(otherId)}>Abrir CI relacionado</a>}
          </li>;
        })}
      </ul>
      <div className="nexus-asset-actions"><a className="nexus-asset-link" href={relationsHash(asset.id)}>Abrir Technology Map</a></div>
    </>}
  </section>;
}

export function Asset360({
  assetId,
  section = "summary",
  mode = "demo",
  provider = demoProvider,
  relationshipProvider,
}: {
  assetId: string;
  section?: AssetSection;
  mode?: AssetDataMode;
  provider?: InventoryProvider;
  relationshipProvider?: RelationshipInventoryProvider;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        return provider(controller.signal);
      })
      .then((snapshot) => {
        if (!controller.signal.aborted) setState({ status: "ready", snapshot });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [provider, attempt, assetId]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const frame = requestAnimationFrame(() => {
      const target = section === "summary"
        ? contentRef.current?.querySelector<HTMLElement>("h1")
        : contentRef.current?.querySelector<HTMLElement>(`[data-asset-section-heading="${section}"]`);
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [state, assetId, section]);

  if (state.status === "loading") {
    return <LoadingState title="Cargando detalle del activo" description={mode === "live" ? "Consultando el CI mediante NEXUS API." : "Preparando la ficha Asset 360 con datos sintéticos Demo."} />;
  }

  if (state.status === "error") {
    return <ErrorState title="No se pudo cargar el activo" description="Vuelve a intentar. No se mostrarán detalles técnicos del error." action={<Button onPress={() => setAttempt((value) => value + 1)}>Reintentar</Button>} />;
  }

  if (state.snapshot.assets.length === 0) {
    return <EmptyState title="El inventario está vacío" description={mode === "live" ? "NEXUS API no devolvió activos dentro de la cobertura actual." : "No hay activos disponibles en el dataset sintético Demo."} action={<a href="#assets">Volver al inventario</a>} />;
  }

  const asset = state.snapshot.assets.find((candidate) => candidate.id === assetId);
  if (!asset) {
    return <EmptyState title="Activo no encontrado" description={`No existe un activo con el identificador ${assetId} en este inventario.`} action={<a href="#assets">Volver al inventario</a>} />;
  }

  const isLive = asset.dataMode === "live" || mode === "live";
  const criticality = asset.criticality ?? "unknown";
  const freshness = freshnessPresentation(asset, state.snapshot.asOf);
  const sourceCount = new Set(asset.sourceReferences?.map(reference => reference.source) ?? asset.sourceSystems ?? []).size;

  return <div className="nexus-asset-360" ref={contentRef}>
    <nav className="nexus-breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="#overview">Overview</a></li>
        <li><a href="#assets">Activos</a></li>
        <li aria-current="page">{asset.name}</li>
      </ol>
    </nav>

    <PageHeader
      title={asset.name}
      eyebrow={isLive ? "ASSET 360 · INNERGEX CHILE · LIVE" : "ASSET 360 · INNERGEX CHILE · DEMO"}
      description={`Identidad NEXUS ${asset.id}`}
      meta={<div className="nexus-asset-header-status">
        {asset.taxonomyCompatibilityFallback
          ? <Badge>Dominio {asset.domain} · compatibilidad</Badge>
          : <Badge>{asset.domain}</Badge>}
        <StatusBadge status={lifecycleTones[asset.lifecycle]}>{lifecycleLabels[asset.lifecycle]}</StatusBadge>
        <StatusBadge status={criticality === "critical" || criticality === "high" ? "critical" : "neutral"}>Criticidad {criticalityLabels[criticality]}</StatusBadge>
        {asset.taxonomyReviewRequired && <StatusBadge status="warning">Taxonomía por revisar</StatusBadge>}
      </div>}
    />

    <dl className="nexus-asset-summary" aria-label="Resumen del activo">
      <div><dt>Responsable</dt><dd>{asset.owner ?? "Sin responsable"}</dd></div>
      <div><dt>Ubicación</dt><dd>{asset.location ?? "Sin ubicación"}</dd></div>
      <div><dt>Freshness</dt><dd>{freshness.label}</dd></div>
      <div><dt>Fuentes conocidas</dt><dd>{sourceCount || "Sin cobertura"}</dd></div>
    </dl>

    <AssetSectionNav assetId={asset.id} section={section} />

    {section === "summary" && <SummaryPanel asset={asset} snapshot={state.snapshot} {...(relationshipProvider ? { relationshipProvider } : {})} />}
    {section === "inventory" && <InventoryPanel asset={asset} snapshot={state.snapshot} />}
    {section === "evidence" && <EvidencePanel asset={asset} snapshot={state.snapshot} />}
    {section === "relationships" && <RelationshipPanel asset={asset} inventory={state.snapshot} {...(relationshipProvider ? { provider: relationshipProvider } : {})} />}
  </div>;
}
