import { useEffect, useRef, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@igx-nexus/ui";
import { typeLabels, type Asset, type InventoryProvider, type InventorySnapshot } from "./asset-model";
import { warrantyDays } from "./dashboard-model";
import { demoProvider } from "./demo-provider";
import { AssetHealthSection } from "./HealthDetails";
import { validHealthDate } from "./health-engine";
import type { RelationshipInventoryProvider } from "./relationship-model";
import { demoQrHash, labelHash, relationsHash } from "./navigation-model";
import { demoLocatorForAsset } from "./qr-locator";
import "./asset-360.css";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; snapshot: InventorySnapshot };

const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" });
const lifecycleLabels = {
  assigned: "Asignado",
  stock: "En stock",
  repair: "En reparación",
  retired: "Dado de baja",
  planned: "Planificado",
  in_stock: "En stock",
  active: "Activo",
  maintenance: "En mantenimiento",
  disposed: "Dispuesto",
  unknown: "Desconocido",
} as const;
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
const criticalityLabels = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
  unknown: "Desconocida",
} as const;

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

function Field({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return <div><dt>{label}</dt><dd className={mono ? "nexus-asset-mono" : undefined}>{value?.trim() || "No informado"}</dd></div>;
}

export function Asset360({ assetId, provider = demoProvider, relationshipProvider }: { assetId: string; provider?: InventoryProvider; relationshipProvider?: RelationshipInventoryProvider }) {
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
      const heading = contentRef.current?.querySelector<HTMLElement>("h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [state, assetId]);

  if (state.status === "loading") {
    return <LoadingState title="Cargando detalle del activo" description="Preparando la ficha Asset 360 de demostración." />;
  }

  if (state.status === "error") {
    return <ErrorState title="No se pudo cargar el activo" description="Vuelve a intentar. No se mostrarán detalles técnicos del error." action={<Button onPress={() => setAttempt((value) => value + 1)}>Reintentar</Button>} />;
  }

  if (state.snapshot.assets.length === 0) {
    return <EmptyState title="El inventario está vacío" description="No hay activos disponibles en este escenario de demostración." action={<a href="#assets">Volver al inventario</a>} />;
  }

  const asset = state.snapshot.assets.find((candidate) => candidate.id === assetId);
  if (!asset) {
    return <EmptyState title="Activo no encontrado" description={`No existe un activo con el identificador ${assetId} en este inventario.`} action={<a href="#assets">Volver al inventario</a>} />;
  }

  const isLive = asset.dataMode === "live";
  const warranty = warrantyPresentation(asset, state.snapshot.asOf, isLive);
  const locator = isLive ? null : demoLocatorForAsset(asset.id);
  const criticality = asset.criticality ?? (asset.critical ? "critical" : "medium");
  const lifecycle = lifecycleLabels[asset.lifecycle];
  const liveVigency = asset.lifecycle === "unknown"
    ? "No determinada por la fuente"
    : asset.lifecycle === "retired" || asset.lifecycle === "disposed"
      ? "Fuera de servicio"
      : "Registrado en inventario";

  return <div className="nexus-asset-360" ref={contentRef}>
    <nav className="nexus-breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="#overview">Panel principal</a></li>
        <li><a href="#assets">Activos</a></li>
        <li aria-current="page">{asset.name}</li>
      </ol>
    </nav>

    <PageHeader
      title={asset.name}
      eyebrow={isLive ? "ASSET 360 · INNERGEX CHILE · LIVE" : "ASSET 360 · INNERGEX CHILE"}
      description={`Identidad NEXUS ${asset.id}`}
      meta={<div className="nexus-asset-header-status">
        <Badge>{asset.domain}</Badge>
        <StatusBadge status={lifecycleTones[asset.lifecycle]}>{lifecycle}</StatusBadge>
        {isLive
          ? <StatusBadge status={criticality === "critical" || criticality === "high" ? "critical" : "neutral"}>Criticidad {criticalityLabels[criticality]}</StatusBadge>
          : asset.critical && <StatusBadge status="critical">Crítico</StatusBadge>}
      </div>}
    />

    <dl className="nexus-asset-summary" aria-label="Resumen del activo">
      <div><dt>Responsable</dt><dd>{asset.owner ?? "Sin responsable"}</dd></div>
      <div><dt>Ubicación</dt><dd>{asset.location ?? "Sin ubicación"}</dd></div>
      <div><dt>Última observación</dt><dd>{displayDate(asset.lastSeen)}</dd></div>
      <div><dt>Garantía</dt><dd>{warranty.label}</dd></div>
    </dl>

    <div className="nexus-asset-section-grid">
      <section className="nexus-asset-section" aria-labelledby="asset-identity-heading">
        <h2 id="asset-identity-heading">Identidad</h2>
        <dl className="nexus-asset-fields">
          <Field label="ID NEXUS" value={asset.id} mono />
          <Field label="Hostname" value={asset.hostname} mono />
          <Field label="Serial" value={asset.serial} mono />
          <Field label="Asset tag" value={asset.assetTag} mono />
          <Field label="Tipo" value={typeLabels[asset.type]} />
          <Field label="Dominio" value={asset.domain} />
        </dl>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-assignment-heading">
        <h2 id="asset-assignment-heading">Asignación y ubicación</h2>
        <dl className="nexus-asset-fields">
          <Field label="Responsable" value={asset.owner} />
          <Field label="Ubicación / sitio" value={asset.location} />
        </dl>
        <p className="nexus-muted">{isLive ? "Los campos ausentes se mantienen como no informados; NEXUS no infiere responsable ni ubicación." : "El modelo demo todavía no separa área, unidad organizacional y sitio físico en campos independientes."}</p>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-hardware-heading">
        <h2 id="asset-hardware-heading">Hardware</h2>
        <dl className="nexus-asset-fields">
          <Field label="Fabricante" value={asset.manufacturer} />
          <Field label="Modelo" value={asset.model} />
          <Field label="Categoría" value={typeLabels[asset.type]} />
          <Field label={isLive ? "IP" : "IP demo"} value={asset.ipAddress} mono />
        </dl>
        <p className="nexus-muted">{isLive ? "Sólo se muestran atributos normalizados presentes en el snapshot canónico." : "Las direcciones pertenecen a TEST-NET-1 y no representan direccionamiento corporativo."}</p>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-lifecycle-heading">
        <h2 id="asset-lifecycle-heading">Estado y ciclo de vida</h2>
        {isLive
          ? <div className="nexus-asset-status-row"><StatusBadge status={lifecycleTones[asset.lifecycle]}>{lifecycle}</StatusBadge><StatusBadge status={criticality === "critical" || criticality === "high" ? "critical" : "neutral"}>Criticidad {criticalityLabels[criticality]}</StatusBadge></div>
          : <div className="nexus-asset-status-row"><StatusBadge status={lifecycleTones[asset.lifecycle]}>{lifecycle}</StatusBadge>{asset.critical ? <StatusBadge status="critical">Criticidad alta</StatusBadge> : <StatusBadge status="neutral">Criticidad normal</StatusBadge>}</div>}
        <dl className="nexus-asset-fields">
          <Field label="Estado lifecycle" value={lifecycle} />
          <Field label="Vigencia" value={isLive ? liveVigency : asset.lifecycle === "retired" ? "Dado de baja" : "Activo en inventario"} />
        </dl>
      </section>

      <section className="nexus-asset-section" aria-labelledby="asset-warranty-heading">
        <h2 id="asset-warranty-heading">Garantía</h2>
        <StatusBadge status={warranty.tone}>{warranty.label}</StatusBadge>
        <dl className="nexus-asset-fields">
          <Field label="Fecha de vencimiento" value={asset.warrantyEnds ? displayDate(asset.warrantyEnds) : null} />
          <Field label="Situación" value={warranty.detail} />
        </dl>
      </section>

      {!isLive && <AssetHealthSection inventory={state.snapshot} assetId={asset.id} {...(relationshipProvider ? { relationshipProvider } : {})} />}

      {!isLive && locator && <section className="nexus-asset-section nexus-asset-qr" aria-labelledby="asset-qr-heading">
        <h2 id="asset-qr-heading">Etiqueta y QR</h2>
        <div className="nexus-asset-status-row"><StatusBadge status="info">CMDB-009</StatusBadge><Badge>Modo demo · no productivo</Badge></div>
        <dl className="nexus-asset-fields">
          <Field label="Locator demo" value={locator} mono />
          <Field label="Estado" value="Activo (fixture)" />
        </dl>
        <p>El locator representa la identidad física del CI y permanece separado del ID visible del activo.</p>
        <p className="nexus-muted">No contiene serial, IP, hostname, usuario ni ubicación. Conocer el locator no concede autorización.</p>
        <div className="nexus-asset-actions"><a className="nexus-asset-link" href={labelHash(asset.id)}>Diseñar etiqueta</a><a className="nexus-asset-link" href={demoQrHash(locator)}>Probar resolución demo</a></div>
      </section>}

      <section className="nexus-asset-section" aria-labelledby="asset-source-heading">
        <h2 id="asset-source-heading">{isLive ? "Fuente y evidencia" : "Fuente de datos"}</h2>
        <dl className="nexus-asset-fields">
          <Field label="Fuente" value={isLive ? (asset.sourceSystems?.join(", ") || "Provider Live") : "Dataset sintético / provider demo"} />
          <Field label="Corte del snapshot" value={displayDate(state.snapshot.asOf)} />
          {isLive && <Field label="Observado en fuente" value={displayDate(asset.sourceObservedAt ?? null)} />}
        </dl>
        <p className="nexus-muted">{isLive ? "La Web consume exclusivamente NEXUS API. GLPI permanece detrás del adapter y la procedencia canónica; no existe acceso Web → GLPI." : "No representa sincronización real con GLPI, Intune, Entra, Defender ni otras fuentes corporativas."}</p>
      </section>

      {isLive ? <section className="nexus-asset-section" aria-labelledby="asset-relations-heading">
        <h2 id="asset-relations-heading">Relaciones</h2>
        <div className="nexus-asset-status-row"><StatusBadge status="neutral">Sin evidencia live todavía</StatusBadge><Badge>V02-009 / V02-012</Badge></div>
        <p>NEXUS no muestra relaciones sintéticas como si fueran reales.</p>
        <p className="nexus-muted">La reconciliación multisource y la evidencia de relaciones se incorporarán en tickets posteriores.</p>
      </section> : <section className="nexus-asset-section" aria-labelledby="asset-relations-heading">
        <h2 id="asset-relations-heading">Relaciones</h2>
        <div className="nexus-asset-status-row"><StatusBadge status="info">CMDB-010</StatusBadge><Badge>Technology Map</Badge></div>
        <p>Explora dependencias upstream, impacto downstream y conectividad del activo en un mapa navegable.</p>
        <p className="nexus-muted">Las relaciones de v0.1 son exclusivamente sintéticas y no provienen de discovery real.</p>
        <div className="nexus-asset-actions"><a className="nexus-asset-link" href={relationsHash(asset.id)}>Abrir grafo de relaciones</a></div>
      </section>}
    </div>
  </div>;
}
