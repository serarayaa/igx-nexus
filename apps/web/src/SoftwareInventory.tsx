import { Badge, Button, Search } from "@igx-nexus/ui";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { HardwareCoverageReason, OperatingSystemInstallationV2, SoftwareInventoryV2, SoftwareInstallationV2, SoftwareSectionV2 } from "@igx-nexus/types";
import { SoftwareEvidence, SoftwareField } from "./SoftwareEvidence";
import { softwareInstallationDate, softwareRows, type SoftwareSort } from "./software-model";

const coverage = { complete: "Cobertura completa", partial: "Cobertura parcial", unavailable: "No disponible", not_applicable: "No aplica", not_requested: "No solicitado" };
const reasons: Record<HardwareCoverageReason, string> = { not_observed: "Sin observación verificable", unsupported: "Capacidad no soportada por la fuente", unauthorized: "Consulta no autorizada por la fuente", not_implemented: "Capacidad aún no implementada", source_error: "La fuente no pudo completar la consulta", pagination_incomplete: "No se recopilaron todos los registros" };
function Collection<T>({ title, id, section, children }: { title: string; id: string; section: SoftwareSectionV2<T>; children: ReactNode }) {
  const collected = section.state === "complete" || section.state === "partial";
  return <section className="nexus-software-collection" aria-labelledby={id}>
    <header className="nexus-software-section-heading"><h3 id={id}>{title}</h3><Badge>{coverage[section.state]}</Badge></header>
    {section.state === "unavailable" && <p className="nexus-software-message">{reasons[section.reason]}</p>}
    {section.state === "not_applicable" && <p className="nexus-software-message">Esta sección no aplica al alcance declarado.</p>}
    {section.state === "not_requested" && <p className="nexus-software-message">Esta sección no fue consultada.</p>}
    {section.state === "partial" && <div className="nexus-software-message"><p>Adquisición incompleta. Los registros cargados no representan necesariamente todo el inventario del activo.</p><details><summary>Brechas de cobertura ({section.gaps.length})</summary><ul>{section.gaps.map((gap, index) => <li key={index}>{reasons[gap.reason]} · <code>{gap.fieldPath}</code></li>)}</ul></details></div>}
    {collected && <>
      {section.items.length === 0 ? <p className="nexus-software-message">{section.state === "complete" ? "Consulta completa sin instalaciones registradas." : "Consulta parcial sin instalaciones disponibles; no demuestra ausencia de software."}</p> : children}
      <details className="nexus-software-acquisition"><summary>Alcance y paginación de la adquisición</summary>
        {section.pagination ? <dl className="nexus-software-fields"><SoftwareField label="Offset de fuente" value={section.pagination.offset} /><SoftwareField label="Registros recuperados" value={section.pagination.retrieved} /><SoftwareField label="Total declarado por fuente" value={section.pagination.total ?? "Desconocido"} /><SoftwareField label="Continuación declarada" value={section.pagination.nextOffset ?? "Sin continuación suministrada"} /></dl> : <p>Sin ventana contigua de paginación verificable.</p>}
        <p>La ausencia de continuación no demuestra agotamiento. La paginación de presentación sólo recorre registros ya cargados.</p>
      </details><SoftwareEvidence value={section} />
    </>}
  </section>;
}
function OperatingSystem({ item, index }: { item: OperatingSystemInstallationV2; index: number }) {
  return <article className="nexus-software-os"><header><span className="nexus-software-kicker">Instalación de sistema {index + 1}</span><h4>{item.name ?? "Sistema no informado"}</h4></header>
    <dl className="nexus-software-fields"><SoftwareField label="Versión" value={item.version} /><SoftwareField label="Edición" value={item.edition} /><SoftwareField label="Arquitectura" value={item.architecture} /><SoftwareField label="Service pack" value={item.servicePack} /><SoftwareField label="Kernel" value={item.kernelVersion} /><SoftwareField label="Instalación y precisión" value={softwareInstallationDate(item.installedAt)} /></dl>
    <details><summary>Identidad de esta instalación de sistema</summary><dl className="nexus-software-fields"><SoftwareField label="installationId" value={item.installationId} /><SoftwareField label="operatingSystemId" value={item.operatingSystemId} /><SoftwareField label="Fecha de instalación literal" value={item.installedAt?.value} /></dl></details>
    <SoftwareEvidence value={item} label={`Evidencia del sistema ${index + 1}`} />
  </article>;
}
function InstallationEvidence({ item, index }: { item: SoftwareInstallationV2; index: number }) {
  return <details className="nexus-software-installation-evidence"><summary>Evidencia instalación {index + 1}</summary>
    <dl className="nexus-software-fields"><SoftwareField label="installationId" value={item.installationId} /><SoftwareField label="softwareId" value={item.software?.softwareId} /><SoftwareField label="versionId" value={item.version?.versionId} /><SoftwareField label="Fecha de instalación literal" value={item.installedAt?.value} /><SoftwareField label="Precisión" value={item.installedAt?.precision} /></dl>
    <SoftwareEvidence value={item} label="Evidencia de la instalación" />
    {item.software && <SoftwareEvidence value={item.software} label="Evidencia del producto" />}
    {item.version && <SoftwareEvidence value={item.version} label="Evidencia de la versión" />}
  </details>;
}
function Installations({ items }: { items: readonly SoftwareInstallationV2[] }) {
  const [query, setQuery] = useState(""); const [publisher, setPublisher] = useState("all");
  const [sort, setSort] = useState<SoftwareSort>("name"); const [direction, setDirection] = useState<"ascending" | "descending">("ascending"); const [page, setPage] = useState(0);
  const rows = softwareRows(items, query, publisher, sort, direction);
  const pages = Math.max(1, Math.ceil(rows.length / 25)); const current = Math.min(page, pages - 1); const visible = rows.slice(current * 25, (current + 1) * 25);
  const publishers = [...new Set(items.map(item => item.software?.publisher).filter((value): value is string => value != null))].sort((a, b) => a.localeCompare(b, "es-CL"));
  function order(field: SoftwareSort) { setDirection(sort === field && direction === "ascending" ? "descending" : "ascending"); setSort(field); setPage(0); }
  return <div className="nexus-software-installations">
    <div className="nexus-software-controls"><Search label="Buscar instalaciones" showLabel value={query} onChange={value => { setQuery(value); setPage(0); }} placeholder="Nombre, editor, versión o ID…" />
      <label>Editor<select value={publisher} onChange={event => { setPublisher(event.target.value); setPage(0); }}><option value="all">Todos los editores</option><option value="unknown">Editor no informado</option>{publishers.map(value => <option value={`publisher:${value}`} key={value}>{value}</option>)}</select></label>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true">{items.length} instalaciones cargadas · {rows.length} coincidencias · {visible.length} visibles · Página {current + 1} de {pages}</p>
    {rows.length === 0 && <p className="nexus-software-message">Sin coincidencias en los registros cargados. Ajusta la búsqueda o el filtro.</p>}
    <div className="nexus-software-table-scroll" tabIndex={0} role="region" aria-label="Tabla de software desplazable"><table className="nexus-software-table"><caption>Instalaciones de software observadas · orden literal, sin interpretación SemVer</caption>
      <thead><tr>{(["name", "publisher", "version"] as const).map((field, index) => <th key={field} scope="col" aria-sort={sort === field ? direction : "none"}><button type="button" onClick={() => order(field)}>{["Software", "Editor", "Versión"][index]}{sort === field && (direction === "ascending" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />)}</button></th>)}<th scope="col">Arquitectura</th><th scope="col">Fecha de instalación</th><th scope="col">Identidad y evidencia</th></tr></thead>
      <tbody>{visible.map(({ item, index }) => <tr key={index}><th scope="row">{item.software?.name ?? "Software no resuelto"}</th><td>{item.software?.publisher ?? "No informado"}</td><td>{item.version?.value ?? "No informada"}</td><td>{item.version?.architecture ?? "No informada"}</td><td>{softwareInstallationDate(item.installedAt)}</td><td><InstallationEvidence item={item} index={index} /></td></tr>)}</tbody>
    </table></div>
    <nav className="nexus-software-pages" aria-label="Páginas de instalaciones"><Button variant="secondary" isDisabled={current === 0} onPress={() => setPage(current - 1)}>Anterior</Button><span>Página {current + 1} de {pages}</span><Button variant="secondary" isDisabled={current >= pages - 1} onPress={() => setPage(current + 1)}>Siguiente</Button></nav>
  </div>;
}
export function SoftwareInventory({ inventory }: { inventory: SoftwareInventoryV2 }) {
  const os = inventory.operatingSystems, software = inventory.installations;
  const osCollected = os.state === "complete" || os.state === "partial", softwareCollected = software.state === "complete" || software.state === "partial";
  return <div className="nexus-software-ready"><div className="nexus-software-overview"><div><span className="nexus-software-kicker">EL ENTORNO DEL ACTIVO</span><h3>Instalaciones observadas, con su evidencia</h3><p>La cobertura describe la recopilación; no indica salud, seguridad ni cumplimiento.</p></div><dl><SoftwareField label="Instalaciones de OS cargadas" value={osCollected ? os.items.length : "Sin recopilación"} /><SoftwareField label="Instalaciones de software cargadas" value={softwareCollected ? software.items.length : "Sin recopilación"} /></dl></div>
    <Collection title="Sistema operativo" id="software-operating-systems" section={os}>{osCollected && <div className="nexus-software-os-list">{os.items.map((item, index) => <OperatingSystem key={index} item={item} index={index} />)}</div>}</Collection>
    <Collection title="Software instalado" id="software-installations" section={software}>{softwareCollected && <Installations items={software.items} />}</Collection>
  </div>;
}
