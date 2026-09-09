import { useMemo } from "react";
import { Button, ErrorState, StatusBadge } from "@igx-nexus/ui";
import type { InventoryProvider, InventorySnapshot } from "./asset-model";
import type { RelationshipInventoryProvider } from "./relationship-model";
import { demoRelationshipInventoryProvider } from "./demo-relationship-provider";
import type { AssetHealth, HealthFinding } from "./health-model";
import { healthWeights } from "./health-model";
import { dimensionLabels, healthLabels, healthTones, findingTitle, findingCatalog, scoreLabel, coverageLabel,
  severityLabels, severityTones, checkLabels, healthCheckLabel } from "./health-presentation";
import { useHealthReport } from "./use-health-report";
import "./cmdb-health.css";

export function HealthFindings({ findings }: { findings: readonly HealthFinding[] }) {
  return findings.length ? <ul className="nexus-health-findings">{findings.map((finding, index) => <li key={`${finding.code}-${index}`}>
    <div><StatusBadge status={severityTones[finding.severity]}>{severityLabels[finding.severity]}</StatusBadge> <strong>{findingTitle(finding)}</strong></div>
    {finding.relationshipId && <p>Relación: <code>{finding.relationshipId}</code></p>}
    <p>{findingCatalog[finding.code].action}</p>
  </li>)}</ul> : <p>No se detectaron señales de calidad que requieran revisión en el alcance evaluado.</p>;
}
export function HealthDetails({ health }: { health: AssetHealth }) {
  return <div className="nexus-health-details">
    <div className="nexus-health-status"><strong>{scoreLabel(health.score)}</strong><StatusBadge status={healthTones[health.state]}>{healthLabels[health.state]}</StatusBadge><span>Cobertura: {coverageLabel(health.coverage)}</span></div>
    <p className="nexus-muted">Calidad del registro CMDB; no mide el estado físico ni la disponibilidad del equipo.</p>
    <dl className="nexus-health-dimensions">{health.dimensions.map(d => <div key={d.dimension}>
      <dt>{dimensionLabels[d.dimension]}</dt><dd>{d.applicable ? scoreLabel(d.score) : "No aplicable"} · Cobertura: {coverageLabel(d.coverage)}</dd>
    </div>)}</dl>
    <HealthFindings findings={health.findings} />
    <details><summary>Cómo se calcula este score</summary>
      <p>Se ponderan sólo las comprobaciones evaluables. Un faltante obligatorio vale 0; un desconocido reduce cobertura. Las reglas no aplicables quedan fuera.</p>
      {health.dimensions.map(d => <section key={d.dimension}>
        <h3>{dimensionLabels[d.dimension]} · peso base {healthWeights[d.dimension]} %</h3>
        <ul>{d.checks.map((c, index) => <li key={`${c.key}-${index}`}>
          {healthCheckLabel(c)}: {checkLabels[c.status]}{c.value !== null ? ` · ${scoreLabel(c.value)}` : ""}
        </li>)}</ul>
      </section>)}
    </details>
    <a className="nexus-asset-link" href="#health">Ver CMDB Health global</a>
  </div>;
}
export function AssetHealthSection({ inventory, assetId, relationshipProvider = demoRelationshipInventoryProvider }: {
  inventory: InventorySnapshot; assetId: string; relationshipProvider?: RelationshipInventoryProvider;
}) {
  const provider = useMemo<InventoryProvider>(() => async signal => { signal.throwIfAborted(); return inventory; }, [inventory]);
  const { state, retry } = useHealthReport(provider, relationshipProvider);
  const health = state.status === "ready" ? state.report.assets.find(row => row.asset.id === assetId) : null;
  return <section className="nexus-asset-section" aria-labelledby="asset-health-heading">
    <h2 id="asset-health-heading">CMDB Health</h2>
    {state.status === "loading" && <p role="status">Calculando calidad del registro…</p>}
    {state.status === "error" && <ErrorState title="No se pudo calcular CMDB Health" description="La ficha sigue disponible. Vuelve a intentar la evaluación." action={<Button onPress={retry}>Reintentar Health</Button>} />}
    {health && <HealthDetails health={health} />}
  </section>;
}
