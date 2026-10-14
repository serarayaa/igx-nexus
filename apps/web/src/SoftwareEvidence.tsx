import type { HardwareAcquisitionV2, SoftwareEvidenceV2, SourceReference } from "@igx-nexus/types";
const date = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC", hourCycle: "h23" });
export const softwareEvidenceDate = (value: string | null | undefined) => value ? `${date.format(new Date(value))} UTC` : "Sin fecha original verificable";
export function SoftwareField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div><dt>{label}</dt><dd>{value ?? "No informado"}</dd></div>;
}
function Source({ value }: { value: SourceReference }) {
  return <dl className="nexus-software-fields">
    <SoftwareField label="Fuente" value={value.source} /><SoftwareField label="Instancia" value={value.sourceInstanceId} />
    <SoftwareField label="Tipo de registro" value={value.entityType} /><SoftwareField label="Alcance" value={value.sourceScope} />
    <SoftwareField label="ID externo" value={value.externalId} /><SoftwareField label="Autoridad" value={value.authority} />
    <SoftwareField label="Fecha de referencia de fuente (UTC)" value={softwareEvidenceDate(value.observedAt)} />
    <SoftwareField label="Timestamp literal de fuente" value={value.observedAt} />
  </dl>;
}
export function SoftwareEvidence({ value, label = "Evidencia de adquisición" }: { value: HardwareAcquisitionV2 | SoftwareEvidenceV2; label?: string }) {
  return <details className="nexus-software-evidence"><summary>{label}</summary>
    <dl className="nexus-software-fields">
      <SoftwareField label="Recopilado por NEXUS (UTC)" value={softwareEvidenceDate(value.collectedAt)} />
      <SoftwareField label="Observación original (UTC)" value={softwareEvidenceDate(value.observedAt)} />
      <SoftwareField label="Recopilación literal" value={value.collectedAt} /><SoftwareField label="Observación literal" value={value.observedAt} />
    </dl>
    <ol aria-label="Referencias de fuente">{value.sourceReferences.map((source, index) => <li key={index}><Source value={source} /></li>)}</ol>
    {"provenance" in value && (value.provenance.length ? <ol aria-label="Provenance de atributos">{value.provenance.map((record, index) => <li key={index}>
      <dl className="nexus-software-fields"><SoftwareField label="Atributo" value={record.fieldPath} /><SoftwareField label="Derivación" value={record.derivation} />
        <SoftwareField label="Autoridad del atributo" value={record.authority} /><SoftwareField label="Confianza declarada" value={record.confidence} />
        <SoftwareField label="Observación del atributo" value={record.observedAt} /><SoftwareField label="Ingesta" value={record.ingestedAt} /></dl>
      <Source value={record.source} />
      {record.evidence?.length ? <ul>{record.evidence.map((evidence, n) => <li key={n}><dl className="nexus-software-fields"><SoftwareField label="Tipo de evidencia" value={evidence.kind} /><SoftwareField label="Referencia" value={evidence.reference} /><SoftwareField label="Etiqueta" value={evidence.label} /><SoftwareField label="Observado" value={evidence.observedAt} /></dl></li>)}</ul> : <p>Sin referencias adicionales de evidencia.</p>}
    </li>)}</ol> : <p>Sin provenance por atributo; se conservan las referencias directas de fuente.</p>)}
  </details>;
}
