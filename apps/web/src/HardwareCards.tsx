import { Cpu, Database, HardDrive, MemoryStick } from "lucide-react";
import { Badge, Button, StatusBadge } from "@igx-nexus/ui";
import { useState, type ReactNode } from "react";
import type { HardwareComponentV2, HardwareCoverageReason, HardwareSectionV2, LogicalVolumeV2, MemoryModuleV2, PhysicalStorageDeviceV2, ProcessorV2 } from "@igx-nexus/types";
import { HardwareEvidence } from "./HardwareEvidence";
import { hardwareBytes, volumeUsage } from "./hardware-format";

export const coverageLabels = { complete: "Cobertura completa", partial: "Cobertura parcial", unavailable: "No disponible", not_applicable: "No aplica", not_requested: "No solicitado" } as const;
const reasons: Record<HardwareCoverageReason, string> = { not_observed: "No se obtuvo una observación", unsupported: "La fuente no soporta esta capacidad", unauthorized: "La fuente no autorizó la consulta", not_implemented: "Capacidad aún no implementada", source_error: "La fuente no pudo completar la consulta", pagination_incomplete: "La consulta no cubrió todos los registros" };
export function HardwareCoverageStatus({ state }: { state: keyof typeof coverageLabels }) { return <StatusBadge status={state === "complete" ? "success" : state === "partial" || state === "unavailable" ? "warning" : "neutral"}>{coverageLabels[state]}</StatusBadge>; }
export function HardwareField({ label, value, bytes }: { label: string; value: ReactNode; bytes?: number | null }) { return <div><dt>{label}</dt><dd title={bytes === undefined || bytes === null ? undefined : `${bytes.toLocaleString("es-CL")} bytes`}>{value ?? "No informado"}</dd></div>; }
function ComponentIdentity({ item }: { item: HardwareComponentV2 }) {
  return <div className="nexus-hardware-identity"><span>{item.manufacturer ?? "Fabricante no informado"}</span><small>{item.componentId ? `Identidad física: ${item.componentId}` : "Identidad física desconocida"}</small>
    {item.identifiers.length > 0 && <dl className="nexus-hardware-fields">{item.identifiers.map((id, index) => <HardwareField key={index} label={id.kind === "serial_number" ? "Número de serie" : id.kind} value={id.value} />)}</dl>}</div>;
}
export function ProcessorCard({ item, index }: { item: ProcessorV2; index: number }) {
  const frequency = (value: ProcessorV2["baseFrequency"]) => value ? `${value.value.toLocaleString("es-CL")} ${value.unit}` : "No informada";
  return <article className="nexus-hardware-card nexus-hardware-cpu">
    <header><Cpu aria-hidden="true" /><div><span className="nexus-hardware-kicker">Procesador {index + 1}</span><h4>{item.model ?? "Modelo no informado"}</h4></div></header>
    <dl className="nexus-hardware-cpu-metrics"><HardwareField label="Núcleos" value={item.cores ?? <span className="nexus-hardware-unknown">Desconocidos</span>} /><HardwareField label="Hilos" value={item.threads ?? <span className="nexus-hardware-unknown">Desconocidos</span>} /></dl>
    <details className="nexus-hardware-technical"><summary>Detalles técnicos del procesador</summary><div><dl className="nexus-hardware-fields"><HardwareField label="Frecuencia base" value={frequency(item.baseFrequency)} /><HardwareField label="Frecuencia máxima" value={frequency(item.maxFrequency)} /></dl><ComponentIdentity item={item} /></div></details><HardwareEvidence value={item} />
  </article>;
}
export function MemoryModuleCard({ item, index }: { item: MemoryModuleV2; index: number }) {
  return <article className="nexus-hardware-card nexus-hardware-memory">
    <header><MemoryStick aria-hidden="true" /><span className="nexus-hardware-kicker">Módulo {index + 1}</span><Badge>{item.technology ?? "DDR no informada"}</Badge></header>
    <p className="nexus-hardware-capacity" title={item.capacityBytes === null ? undefined : `${item.capacityBytes} bytes`}>{hardwareBytes(item.capacityBytes)}</p>
    <h4>{item.model ?? "Modelo no informado"}</h4>
    <dl className="nexus-hardware-fields"><HardwareField label="Slot informado" value={item.slot} /><HardwareField label="Velocidad" value={item.speed ? `${item.speed.value.toLocaleString("es-CL")} ${item.speed.unit}` : null} /><HardwareField label="Formato" value={item.formFactor} /></dl>
    <ComponentIdentity item={item} /><HardwareEvidence value={item} />
  </article>;
}
export function PhysicalStorageCard({ item, index }: { item: PhysicalStorageDeviceV2; index: number }) {
  return <article className="nexus-hardware-card nexus-hardware-disk">
    <header><HardDrive aria-hidden="true" /><span className="nexus-hardware-kicker">Disco físico {index + 1}</span></header>
    <p className="nexus-hardware-capacity" title={item.capacityBytes === null ? undefined : `${item.capacityBytes} bytes`}>{hardwareBytes(item.capacityBytes)}</p>
    <h4>{item.model ?? "Modelo no informado"}</h4>
    <div className="nexus-hardware-tags"><Badge>{item.medium ?? "Medio desconocido"}</Badge><Badge>{item.interface ?? "Interfaz desconocida"}</Badge></div>
    <dl className="nexus-hardware-fields"><HardwareField label="Protocolo" value={item.protocol} /><HardwareField label="Formato" value={item.formFactor} /></dl>
    <ComponentIdentity item={item} /><HardwareEvidence value={item} />
  </article>;
}
export function LogicalVolumeCard({ item }: { item: LogicalVolumeV2 }) {
  const usage = volumeUsage(item.capacityBytes, item.availableBytes);
  return <article className="nexus-hardware-card nexus-hardware-volume">
    <header><Database aria-hidden="true" /><h4>{item.name ?? "Volumen sin nombre informado"}</h4><Badge>{item.fileSystem ?? "Filesystem desconocido"}</Badge></header>
    <dl className="nexus-hardware-volume-metrics"><HardwareField label="Capacidad" value={hardwareBytes(item.capacityBytes)} bytes={item.capacityBytes} /><HardwareField label="Disponible" value={hardwareBytes(item.availableBytes)} bytes={item.availableBytes} /><HardwareField label="Utilizado calculado" value={usage ? hardwareBytes(usage.used) : "No calculable"} /></dl>
    {usage && <><meter min={0} max={item.capacityBytes!} value={usage.used} aria-label={`Espacio utilizado de ${item.name ?? "volumen"}`}>{hardwareBytes(usage.used)}</meter><p className="nexus-hardware-note">{usage.percent.toLocaleString("es-CL", { maximumFractionDigits: 1 })}% utilizado según el inventario recopilado</p></>}
    <p className="nexus-hardware-note">{item.physicalDeviceIds === null ? "Sin asociación física verificable" : item.physicalDeviceIds.length === 0 ? "La fuente declara sin discos físicos asociados" : `Discos físicos referenciados: ${item.physicalDeviceIds.join(", ")}`}</p>
    <HardwareEvidence value={item} />
  </article>;
}
export function HardwareCollection<T>({ title, id, section, children }: { title: string; id: string; section: HardwareSectionV2<T>; children: (item: T, index: number) => ReactNode }) {
  const [limit, setLimit] = useState(12);
  const collected = section.state === "complete" || section.state === "partial";
  return <section className="nexus-hardware-collection" aria-labelledby={id}>
    <header className="nexus-hardware-section-heading"><div><h3 id={id} tabIndex={-1}>{title}</h3>{collected && <span>{section.items.length} registros informados</span>}</div><HardwareCoverageStatus state={section.state} /></header>
    {section.state === "unavailable" && <p className="nexus-hardware-state-message">{reasons[section.reason]}</p>}
    {section.state === "not_applicable" && <p className="nexus-hardware-state-message">Esta categoría no aplica al alcance declarado.</p>}
    {section.state === "not_requested" && <p className="nexus-hardware-state-message">Esta categoría no fue solicitada.</p>}
    {section.state === "partial" && <details className="nexus-hardware-gaps"><summary>Ver brechas de cobertura · {section.gaps.length}</summary><ul>{section.gaps.map((gap, index) => <li key={index}>{reasons[gap.reason]} · {gap.fieldPath}</li>)}</ul></details>}
    {collected && <>
      {section.items.length === 0 && <p className="nexus-hardware-state-message">{section.state === "complete" ? "Consulta completa sin registros." : "Consulta parcial sin registros disponibles."}</p>}
      <div className="nexus-hardware-card-grid">{section.items.slice(0, limit).map(children)}</div>
      {section.items.length > limit && <div className="nexus-hardware-more"><span>Mostrando {limit} de {section.items.length}</span><Button variant="secondary" onPress={() => setLimit(value => value + 12)}>Mostrar más {title.toLowerCase()}</Button></div>}
      <HardwareEvidence value={section} />
    </>}
  </section>;
}
