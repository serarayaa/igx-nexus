import type { Asset } from "./asset-model";
import type { CheckStatus, HealthCheck, HealthDimension, HealthFinding, HealthFindingCode, HealthSeverity, HealthState } from "./health-model";

export const dimensionLabels: Record<HealthDimension, string> = {
  completeness: "Completitud", freshness: "Frescura", identity: "Identidad", relationships: "Integridad de relaciones", consistency: "Consistencia",
};
export const healthLabels: Record<HealthState, string> = {
  healthy: "Confiable", attention: "Atención", degraded: "Degradado", insufficient: "Cobertura insuficiente", unknown: "Sin evaluación",
};
export const healthTones = { healthy: "success", attention: "warning", degraded: "danger", insufficient: "neutral", unknown: "neutral" } as const;
export const severityLabels: Record<HealthSeverity, string> = { info: "Información", warning: "Revisar", critical: "Error de integridad" };
export const severityTones = { info: "info", warning: "warning", critical: "danger" } as const;
export const checkLabels: Record<CheckStatus, string> = {
  pass: "Correcto", missing: "Faltante", invalid: "Inválido", warning: "Revisar", unknown: "Desconocido", not_applicable: "No aplicable",
};
export const fieldLabels: Partial<Record<keyof Asset, string>> = {
  id: "ID NEXUS", name: "Nombre", serial: "Serial", assetTag: "Asset tag", hostname: "Hostname", manufacturer: "Fabricante",
  model: "Modelo", location: "Ubicación", owner: "Responsable", lastSeen: "Última observación", warrantyEnds: "Fecha de garantía", lifecycle: "Lifecycle",
};
export const findingCatalog: Record<HealthFindingCode, { title: string; action: string }> = {
  field_missing: { title: "Campo requerido no informado", action: "Completar el atributo aplicable con una fuente autorizada." },
  identity_duplicate: { title: "Identificador duplicado", action: "Revisar la identidad y la asignación del identificador; no fusionar registros automáticamente." },
  observation_unknown: { title: "Observación desconocida", action: "Obtener una fecha verificable de observación del registro." },
  observation_invalid: { title: "Observación inválida o futura", action: "Verificar fecha, calendario y zona horaria respecto al corte del inventario." },
  observation_stale: { title: "Datos antiguos (> 7 días)", action: "Revisar el registro en la fuente autorizada y actualizar su observación." },
  observation_very_stale: { title: "Datos muy antiguos (> 30 días)", action: "Priorizar la verificación del registro; no implica que el equipo esté desconectado." },
  relationship_invalid: { title: "Relación inválida", action: "Revisar identidad, extremos, tipo y dirección de la relación." },
  relationship_duplicate: { title: "ID de relación duplicado", action: "Revisar la identidad de las relaciones antes de consolidarlas." },
  relationship_reference_missing: { title: "Referencia ausente o ambigua", action: "Verificar que cada extremo identifique un único CI dentro del inventario evaluado." },
  relationship_observation_unknown: { title: "Relación sin observación", action: "Obtener la fecha de verificación de la relación." },
  relationship_observation_invalid: { title: "Fecha de relación inválida o futura", action: "Corregir el timestamp de observación de la relación." },
  relationship_observation_stale: { title: "Relación con observación antigua", action: "Verificar si la relación registrada sigue siendo correcta." },
  relationship_status_review: { title: "Estado de relación por aclarar", action: "Revisar el significado del estado de origen. No modifica el score ni representa disponibilidad operacional." },
  relationships_unknown: { title: "Relaciones no evaluadas", action: "Obtener el snapshot completo de relaciones para evaluar su integridad." },
  warranty_unknown: { title: "Garantía sin fecha verificable", action: "Confirmar si existe una fecha de garantía. Reduce cobertura, no el score." },
  warranty_invalid: { title: "Fecha de garantía inválida", action: "Verificar el calendario de la fecha registrada. Una garantía vencida es un dato válido." },
  lifecycle_invalid: { title: "Lifecycle no reconocido", action: "Normalizar el estado a uno de los valores admitidos por el modelo." },
  source_instance_missing: { title: "Fuente sin identidad de instancia", action: "Completar sourceInstanceId en la referencia de origen; no agrupar instalaciones distintas por nombre de sistema." },
  provenance_incomplete: { title: "Provenance canónico incompleto", action: "Completar provenance para los campos canónicos indicados con una fuente y observación defendibles." },
  taxonomy_conflict: { title: "Conflicto Taxonomy v2", action: "Revisar las decisiones taxonómicas en conflicto y resolverlas con evidencia; no inferir una clasificación desde la UI." },
};
export function findingTitle(finding: HealthFinding): string {
  if (finding.code === "field_missing" && finding.field) return `Falta ${fieldLabels[finding.field]?.toLocaleLowerCase("es-CL") ?? finding.field}`;
  return `${findingCatalog[finding.code].title}${finding.field ? ` · ${fieldLabels[finding.field] ?? finding.field}` : ""}`;
}
// Floor displayed scores so rounding never suggests a band threshold has been reached prematurely.
export const scoreLabel = (score: number | null) => score === null ? "Sin evaluación" : `${Math.floor(Math.min(100, score))} / 100`;
export const coverageLabel = (coverage: number | null) => coverage === null ? "No aplicable" : `${Math.floor(Math.min(100, coverage))} %`;

const checkNames = new Map<string, string>([...Object.entries(fieldLabels), ["no-relations", "Sin relaciones registradas"], ["snapshot", "Snapshot de relaciones"]]);
const relationshipCheckNames = new Map<string, string>([["structure", "Estructura e identidad"], ["references", "Referencias"], ["observation", "Observación"], ["status", "Estado de origen"]]);
export function healthCheckLabel(check: HealthCheck): string {
  if (check.finding) return findingTitle(check.finding);
  const label = checkNames.get(check.key);
  if (label) return label;
  const separator = check.key.lastIndexOf(":");
  return `Relación ${check.key.slice(0, separator)} · ${relationshipCheckNames.get(check.key.slice(separator + 1)) ?? "Comprobación"}`;
}
