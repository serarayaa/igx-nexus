import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@igx-nexus/ui";
import type { InventoryProvider, InventorySnapshot } from "./asset-model";
import { demoProvider } from "./demo-provider";
import { buildLabelModel, DEFAULT_LABEL_OPTIONS, DEFAULT_LABEL_PROFILE, LABEL_PROFILES, renderLabelSvg, type LabelContentOptions, type LabelDpi, type LabelProfileId } from "./label-engine";
import { assetHash, demoQrHash } from "./navigation-model";
import { buildQrPayload, DEMO_QR_ENVIRONMENT, demoLocatorForAsset } from "./qr-locator";
import "./label-designer.css";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; snapshot: InventorySnapshot };

export function LabelDesigner({ assetId, provider = demoProvider }: { assetId: string; provider?: InventoryProvider }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [profileId, setProfileId] = useState<LabelProfileId>(DEFAULT_LABEL_PROFILE.id);
  const [dpi, setDpi] = useState<LabelDpi>(203);
  const [options, setOptions] = useState<LabelContentOptions>(DEFAULT_LABEL_OPTIONS);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.resolve().then(() => provider(controller.signal)).then((snapshot) => {
      if (!controller.signal.aborted) setState({ status: "ready", snapshot });
    }).catch(() => {
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

  const asset = state.status === "ready" ? state.snapshot.assets.find((candidate) => candidate.id === assetId) : undefined;
  const profile = LABEL_PROFILES.find((candidate) => candidate.id === profileId) ?? DEFAULT_LABEL_PROFILE;
  const locator = asset ? demoLocatorForAsset(asset.id) : null;
  const model = useMemo(() => asset && locator ? buildLabelModel(asset, locator, DEMO_QR_ENVIRONMENT, profile, dpi, options) : null, [asset, locator, profile, dpi, options]);
  const svg = useMemo(() => model ? renderLabelSvg(model) : "", [model]);

  if (state.status === "loading") return <LoadingState title="Preparando diseñador de etiquetas" description="Cargando el activo y su identidad QR de demostración." />;
  if (state.status === "error") return <ErrorState title="No se pudo preparar la etiqueta" description="Vuelve a intentar. El error interno no se expone en la interfaz." action={<Button onPress={() => setAttempt((value) => value + 1)}>Reintentar</Button>} />;
  if (state.snapshot.assets.length === 0) return <EmptyState title="El inventario está vacío" description="No hay activos disponibles para diseñar etiquetas." action={<a href="#assets">Volver al inventario</a>} />;
  if (!asset || !locator || !model) return <EmptyState title="Activo no encontrado" description={`No existe ${assetId} en el inventario demo.`} action={<a href="#assets">Volver al inventario</a>} />;

  const payload = buildQrPayload(locator, DEMO_QR_ENVIRONMENT);
  const setOption = (key: keyof LabelContentOptions, checked: boolean) => setOptions((current) => ({ ...current, [key]: checked }));
  const downloadSvg = () => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${asset.id}-${profile.id}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="nexus-label-designer" ref={contentRef}>
    <nav className="nexus-label-breadcrumb" aria-label="Breadcrumb">
      <ol><li><a href="#overview">Overview</a></li><li><a href="#assets">Activos</a></li><li><a href={assetHash(asset.id)}>{asset.name}</a></li><li aria-current="page">Etiqueta</li></ol>
    </nav>

    <PageHeader title="Diseñar etiqueta" eyebrow="CMDB-009 · QR & LABEL ENGINE" description={`${asset.name} · ${asset.id}`} meta={<div className="nexus-label-status"><StatusBadge status="info">SVG listo para impresión</StatusBadge><Badge>Modo demo · no productivo</Badge></div>} />

    <div className="nexus-label-workbench">
      <section className="nexus-label-controls" aria-labelledby="label-settings-heading">
        <div><h2 id="label-settings-heading">Configuración física</h2><p className="nexus-muted">La salida de impresión es monocromática y no hereda light/dark mode.</p></div>
        <div className="nexus-label-field-grid">
          <label>Formato<select aria-label="Formato de etiqueta" value={profileId} onChange={(event) => setProfileId(event.currentTarget.value as LabelProfileId)}>{LABEL_PROFILES.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select></label>
          <label>DPI<select aria-label="DPI de impresión" value={dpi} onChange={(event) => setDpi(Number(event.currentTarget.value) as LabelDpi)}><option value={203}>203 DPI</option><option value={300}>300 DPI</option></select></label>
        </div>
        <fieldset className="nexus-label-options"><legend>Contenido visible</legend>
          <label><input type="checkbox" checked={options.name} onChange={(event) => setOption("name", event.currentTarget.checked)} /> Nombre corto</label>
          <label><input type="checkbox" checked={options.nexusId} onChange={(event) => setOption("nexusId", event.currentTarget.checked)} /> ID NEXUS</label>
          <label><input type="checkbox" checked={options.assetTag} onChange={(event) => setOption("assetTag", event.currentTarget.checked)} /> Asset Tag</label>
          <label><input type="checkbox" checked={options.branding} onChange={(event) => setOption("branding", event.currentTarget.checked)} /> Branding IGX NEXUS</label>
        </fieldset>
        <div className="nexus-label-security"><strong>Payload mínimo</strong><p>El QR contiene sólo un locator opaco. No codifica serial, IP, hostname, usuario, ubicación ni IDs de sistemas fuente.</p></div>
      </section>

      <section className="nexus-label-preview" aria-labelledby="label-preview-heading">
        <div className="nexus-label-preview-heading"><div><h2 id="label-preview-heading">Vista previa física</h2><p>{profile.label} · {dpi} DPI · {model.pixelWidth} × {model.pixelHeight} px</p></div><Badge>{model.modulePixels} px / módulo</Badge></div>
        <div className="nexus-label-stage"><div className="nexus-label-output" data-testid="label-output" dangerouslySetInnerHTML={{ __html: svg }} /></div>
        <div className="nexus-label-output-actions"><Button onPress={downloadSvg}>Descargar SVG</Button><span className="nexus-muted">Formato vectorial maestro · sin integración de impresora específica.</span></div>
      </section>
    </div>

    <section className="nexus-label-contract" aria-labelledby="label-contract-heading">
      <div className="nexus-label-contract-heading"><div><h2 id="label-contract-heading">Contrato QR</h2><p>Separación explícita entre identidad NEXUS, locator físico y entorno.</p></div><a href={demoQrHash(locator)}>Probar resolución demo</a></div>
      <dl>
        <div><dt>Activo NEXUS</dt><dd><code>{asset.id}</code></dd></div>
        <div><dt>Locator demo</dt><dd><code>{locator}</code></dd></div>
        <div><dt>Payload QR</dt><dd><code>{payload}</code></dd></div>
        <div><dt>QR</dt><dd>Version {model.qr.version} · ECC {model.qr.errorCorrection} · quiet zone {model.quietZoneModules} módulos</dd></div>
      </dl>
      <p className="nexus-muted">La URL `.invalid` es intencionalmente no productiva. Antes de imprimir etiquetas permanentes se requiere URL HTTPS estable, resolver `/q/:locator`, persistencia, autenticación/RBAC y política de revocación.</p>
    </section>
  </div>;
}
