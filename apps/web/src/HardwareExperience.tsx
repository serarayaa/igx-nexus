import { Badge, Button, ErrorState } from "@igx-nexus/ui";
import { useState, useSyncExternalStore } from "react";
import type { HardwareInventoryV2 } from "@igx-nexus/types";
import { HardwareCollection, HardwareCoverageStatus, LogicalVolumeCard, MemoryModuleCard, PhysicalStorageCard, ProcessorCard } from "./HardwareCards";
import { hardwareErrorMessages, type HardwareReader } from "./hardware-client";
import { hardwareBytes, memoryCapacity } from "./hardware-format";
import { useHardware } from "./use-hardware";
import "./hardware-experience.css";

export function HardwareLoading() {
  return <div className="nexus-hardware-loading" role="status" aria-label="Cargando hardware"><p>Recuperando inventario de hardware…</p><div aria-hidden="true" className="nexus-hardware-skeleton-grid">{[0, 1, 2, 3].map(index => <div key={index} className="nexus-hardware-skeleton"><span /><span /><span /></div>)}</div></div>;
}
function focusComponent(button: HTMLElement, id: string) {
  const heading = button.closest(".nexus-hardware")?.querySelector<HTMLElement>(`#${id}`);
  heading?.focus();
  heading?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(listener: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function Confluence() {
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(reducedMotionQuery).matches, () => false);
  const [iteration, setIteration] = useState(0);
  return <button type="button" className="nexus-confluence" disabled={reduced} aria-label={reduced ? "Firma Confluencia estática · movimiento reducido" : "Reproducir firma Confluencia"} onClick={() => setIteration(value => value + 1)}>
    <svg key={iteration} viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      <g className="nexus-confluence-depth"><path d="M25 18v31q0 21 21 21h89M25 122V91q0-21 21-21" /></g>
      <g className="nexus-confluence-lines"><path pathLength="1" d="M25 18v31q0 21 21 21h89" /><path pathLength="1" d="M25 122V91q0-21 21-21h89" /><path pathLength="1" d="M80 18v104" /></g>
      <g className="nexus-confluence-nodes"><circle cx="25" cy="18" r="4" /><circle cx="25" cy="122" r="4" /><circle cx="80" cy="70" r="8" /><circle cx="135" cy="70" r="4" /></g>
    </svg><span>Confluencia {reduced ? "· estática" : <span aria-hidden="true">↻</span>}</span>
  </button>;
}
export function HardwareOverview({ inventory }: { inventory: HardwareInventoryV2 }) {
  const memory = memoryCapacity(inventory.memoryModules);
  return <div className="nexus-hardware-overview" aria-label="Panorama de hardware">
    <div className="nexus-hardware-overview-intro"><span className="nexus-hardware-kicker">CAPACIDAD Y COMPONENTES</span><h3>Del equipo físico a sus volúmenes</h3><p>Recorre los componentes y consulta su evidencia. La cobertura describe la recopilación, no la salud del activo.</p><button type="button" onClick={event => focusComponent(event.currentTarget, "hardware-processors")}>Explorar componentes <span aria-hidden="true">↓</span></button></div>
    <div className="nexus-hardware-overview-memory"><Confluence /><div><span>{memory.total ? "Capacidad RAM informada" : "Capacidad RAM conocida"}</span><strong>{hardwareBytes(memory.value)}</strong><HardwareCoverageStatus state={inventory.memoryModules.state} /></div></div>
    {!memory.total && memory.value !== null && <p className="nexus-hardware-overview-note">La suma RAM incluye sólo capacidades conocidas; no representa un total verificado del equipo.</p>}
  </div>;
}
function LiveHardware({ assetId, reader }: { assetId: string; reader?: HardwareReader }) {
  const { state, retry } = useHardware(assetId, reader);
  if (state.status === "loading") return <HardwareLoading />;
  if (state.status === "error") {
    const error = hardwareErrorMessages[state.kind];
    return <ErrorState title={error.title} description={error.detail} {...(error.retry ? { action: <Button onPress={retry}>Reintentar hardware</Button> } : {})} />;
  }
  const inventory = state.inventory;
  return <div className="nexus-hardware-ready">
    <HardwareOverview inventory={inventory} />
    <div className="nexus-hardware-layout"><nav className="nexus-hardware-index" aria-label="Componentes de hardware">{(["hardware-processors", "hardware-memory", "hardware-storage", "hardware-volumes"] as const).map((id, index) => <button type="button" key={id} onClick={event => focusComponent(event.currentTarget, id)}><span>0{index + 1}</span>{["Procesadores", "Memoria RAM", "Discos físicos", "Volúmenes"][index]}</button>)}<p>Firma gráfica abstracta.<br />Sin telemetría ni relaciones inferidas.</p></nav><div className="nexus-hardware-sections">
    <HardwareCollection title="Procesadores" id="hardware-processors" section={inventory.processors}>{(item, index) => <ProcessorCard key={index} item={item} index={index} />}</HardwareCollection>
    <HardwareCollection title="Memoria RAM" id="hardware-memory" section={inventory.memoryModules}>{(item, index) => <MemoryModuleCard key={index} item={item} index={index} />}</HardwareCollection>
    <HardwareCollection title="Almacenamiento físico" id="hardware-storage" section={inventory.physicalStorageDevices}>{(item, index) => <PhysicalStorageCard key={index} item={item} index={index} />}</HardwareCollection>
    <HardwareCollection title="Volúmenes lógicos" id="hardware-volumes" section={inventory.logicalVolumes}>{(item, index) => <LogicalVolumeCard key={index} item={item} />}</HardwareCollection>
    </div></div>
  </div>;
}
export function HardwareExperience({ assetId, mode, reader }: { assetId: string; mode: "live" | "demo"; reader?: HardwareReader }) {
  return <section className="nexus-asset-panel nexus-hardware" aria-labelledby="hardware-heading">
    <header className="nexus-hardware-heading"><div><span className="nexus-hardware-kicker">ASSET 360 · INVENTARIO TÉCNICO</span><h2 id="hardware-heading" data-asset-section-heading="hardware">Hardware</h2><p>Componentes físicos y capacidad lógica, con cobertura y evidencia.</p></div><Badge>Hardware V2</Badge></header>
    {mode === "demo" ? <div className="nexus-hardware-demo"><h3>Hardware V2 disponible en Live</h3><p>Esta ficha Demo no consulta inventario corporativo. El hardware requiere una fuente Live configurada y acceso autorizado.</p></div> : <LiveHardware key={assetId} assetId={assetId} {...(reader ? { reader } : {})} />}
  </section>;
}
