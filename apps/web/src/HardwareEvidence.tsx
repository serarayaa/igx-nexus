import type { HardwareAcquisitionV2, HardwareEvidenceV2 } from "@igx-nexus/types";
const date = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
export function hardwareDate(value: string | null) { return value ? `${date.format(new Date(value))} UTC` : "Sin fecha original verificable"; }
export function HardwareEvidence({ value }: { value: HardwareAcquisitionV2 | HardwareEvidenceV2 }) {
  return <details className="nexus-hardware-evidence">
    <summary>Evidencia y fechas <span>{value.sourceReferences.length} {value.sourceReferences.length === 1 ? "referencia" : "referencias"}</span></summary>
    <dl className="nexus-hardware-fields">
      <div><dt>Recopilado por NEXUS</dt><dd>{hardwareDate(value.collectedAt)}</dd></div>
      <div><dt>Observación original</dt><dd>{hardwareDate(value.observedAt)}</dd></div>
    </dl>
    <ul>{value.sourceReferences.map((source, index) => <li key={index}>
      <strong>{source.source.toUpperCase()}</strong> · Registro {source.externalId}
      <span>{source.sourceInstanceId?.trim() ? <>Instancia: {source.sourceInstanceId} · </> : null}Autoridad: {source.authority}</span>
      <span>Fecha de referencia de fuente: {hardwareDate(source.observedAt)}</span>
    </li>)}</ul>
    {"provenance" in value && value.provenance.length > 0 && <ul aria-label="Provenance de atributos">{value.provenance.map((record, index) => <li key={index}>{record.fieldPath} · {record.derivation ?? record.authority}<span>{hardwareDate(record.observedAt)}</span></li>)}</ul>}
  </details>;
}
