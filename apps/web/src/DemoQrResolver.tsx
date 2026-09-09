import { useEffect, useRef, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@igx-nexus/ui";
import type { InventoryProvider, InventorySnapshot } from "./asset-model";
import { demoProvider } from "./demo-provider";
import { assetHash, labelHash } from "./navigation-model";
import { parseQrLocator, resolveDemoLocator } from "./qr-locator";
import "./label-designer.css";

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; snapshot: InventorySnapshot };

export function DemoQrResolver({ locator, provider = demoProvider }: { locator: string; provider?: InventoryProvider }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
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
  }, [provider, attempt, locator]);

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
  }, [state, locator]);

  if (state.status === "loading") return <LoadingState title="Resolviendo QR demo" description="Buscando el locator en el provider sintético." />;
  if (state.status === "error") return <ErrorState title="No se pudo resolver el QR" description="Vuelve a intentar sin exponer detalles internos." action={<Button onPress={() => setAttempt((value) => value + 1)}>Reintentar</Button>} />;

  let normalized: string;
  try {
    normalized = parseQrLocator(locator);
  } catch {
    return <EmptyState title="Locator QR inválido" description="El valor no cumple el contrato sintáctico de locators NEXUS." action={<a href="#assets">Volver al inventario</a>} />;
  }
  const assetId = resolveDemoLocator(normalized, state.snapshot.assets);
  if (!assetId) return <EmptyState title="QR no reconocido" description="El locator no está asociado a ningún activo del escenario demo." action={<a href="#assets">Volver al inventario</a>} />;
  const asset = state.snapshot.assets.find((candidate) => candidate.id === assetId)!;

  return <div className="nexus-label-designer nexus-qr-resolver" ref={contentRef}>
    <nav className="nexus-label-breadcrumb" aria-label="Breadcrumb"><ol><li><a href="#overview">Panel principal</a></li><li><a href="#assets">Activos</a></li><li aria-current="page">Resolver QR demo</li></ol></nav>
    <PageHeader title="Resolver QR demo" eyebrow="CMDB-009 · SIMULADOR DE RESOLUCIÓN" description="Prueba interna del contrato locator → identidad NEXUS." meta={<div className="nexus-label-status"><StatusBadge status="success">Locator reconocido</StatusBadge><Badge>No productivo</Badge></div>} />
    <section className="nexus-label-contract" aria-labelledby="qr-resolution-heading">
      <div><h2 id="qr-resolution-heading">Resolución controlada</h2><p>El locator se resolvió contra fixtures sintéticos. Esta ruta hash no representa el endpoint productivo.</p></div>
      <dl><div><dt>Locator</dt><dd><code>{normalized}</code></dd></div><div><dt>Identidad NEXUS</dt><dd><code>{asset.id}</code></dd></div><div><dt>Activo</dt><dd>{asset.name}</dd></div><div><dt>Autorización</dt><dd>No simulada · requerida en producción</dd></div></dl>
      <div className="nexus-label-output-actions"><a className="nexus-label-primary-link" href={assetHash(asset.id)}>Abrir Asset 360</a><a href={labelHash(asset.id)}>Diseñar etiqueta</a></div>
      <p className="nexus-muted">En producción, `/q/:opaqueLocator` deberá resolver del lado servidor y después aplicar autenticación y RBAC. Conocer la URL nunca equivale a tener acceso al CI.</p>
    </section>
  </div>;
}
