import { Badge, Card, ContentSection, StatusBadge } from "@igx-nexus/ui";
import type {
  ItOtDomainCohort,
  ItOtEvidenceCoverage,
  ItOtIntelligenceReport,
  MetricResult,
} from "@igx-nexus/types";
import { assetClassLabel, technologyRoleLabel, type Domain } from "./asset-model";

const percentFormat = new Intl.NumberFormat("es-CL", {
  style: "percent",
  maximumFractionDigits: 1,
});
const numberFormat = new Intl.NumberFormat("es-CL");

function coverageText(coverage: ItOtEvidenceCoverage): string {
  if (coverage.ratio === null) return "No disponible";
  return `${numberFormat.format(coverage.known)} de ${numberFormat.format(coverage.total)} · ${percentFormat.format(coverage.ratio)}`;
}

function metricText(metric: MetricResult): string {
  if (metric.value === null) return "No disponible";
  if (metric.valueKind === "count") return numberFormat.format(metric.value);
  const denominator = metric.denominator ?? metric.population.eligible;
  return `${percentFormat.format(metric.value)} · ${numberFormat.format(metric.numerator)} de ${numberFormat.format(denominator)}`;
}

function topValues(
  entries: readonly { readonly value: string; readonly count: number }[],
  label: (value: string) => string,
): string {
  if (entries.length === 0) return "Sin valores clasificados";
  return [...entries]
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, 3)
    .map((entry) => `${label(entry.value)} (${entry.count})`)
    .join(" · ");
}

function CohortCard({ cohort }: { cohort: ItOtDomainCohort }) {
  return <Card>
    <ContentSection
      title={`Cohorte ${cohort.domain}`}
      description={`${numberFormat.format(cohort.population)} activos con domain Taxonomy v2 classified como ${cohort.domain}.`}
    >
      <dl className="nexus-itot-facts">
        <div><dt>Activos</dt><dd>{numberFormat.format(cohort.population)}</dd></div>
        <div><dt>Taxonomía completa</dt><dd>{metricText(cohort.metrics.taxonomyResolved)}</dd></div>
        <div><dt>Lifecycle conocido</dt><dd>{metricText(cohort.metrics.lifecycleKnown)}</dd></div>
        <div><dt>Identidad de fuente</dt><dd>{metricText(cohort.metrics.sourceInstanceIdentity)}</dd></div>
        <div><dt>Contexto operacional</dt><dd>{coverageText(cohort.operationalContext.coverage)}</dd></div>
      </dl>

      <div className="nexus-itot-composition">
        <div>
          <strong>Asset Class</strong>
          <span>{topValues(cohort.assetClass.distribution, value => assetClassLabel(value as Parameters<typeof assetClassLabel>[0]))}</span>
          <small>Cobertura: {coverageText(cohort.assetClass.coverage)}</small>
        </div>
        <div>
          <strong>Role</strong>
          <span>{topValues(cohort.role.distribution, value => technologyRoleLabel(value as Parameters<typeof technologyRoleLabel>[0]))}</span>
          <small>Cobertura: {coverageText(cohort.role.coverage)}</small>
        </div>
      </div>
    </ContentSection>
  </Card>;
}

export function ItOtIntelligenceSummary({
  report,
  selectedDomain,
}: {
  report: ItOtIntelligenceReport | null;
  selectedDomain: Domain | "all";
}) {
  if (!report) {
    return <section className="nexus-overview-section" aria-labelledby="itot-intelligence-heading">
      <div className="nexus-overview-section-heading">
        <div>
          <p className="nexus-overline">Domain lens</p>
          <h2 id="itot-intelligence-heading">IT / OT Intelligence</h2>
        </div>
        <p>La lente necesita un TechnologySnapshot canónico para no convertir una proyección de compatibilidad en clasificación.</p>
      </div>
      <div className="nexus-attention-empty">
        <StatusBadge status="info">Sin evidencia canónica</StatusBadge>
        <p>Este provider no transporta un snapshot canónico utilizable para cohortes IT/OT. NEXUS mantiene la lectura como no disponible.</p>
      </div>
    </section>;
  }

  const domains: readonly Domain[] = selectedDomain === "all" ? ["IT", "OT"] : [selectedDomain];
  const unresolved = report.population.unresolvedByReason;

  return <section className="nexus-overview-section" aria-labelledby="itot-intelligence-heading">
    <div className="nexus-overview-section-heading">
      <div>
        <p className="nexus-overline">Domain lens</p>
        <h2 id="itot-intelligence-heading">IT / OT Intelligence</h2>
      </div>
      <p>Comparación descriptiva sobre Taxonomy v2. Unknown, unclassified, conflict y assessment ausente nunca se reparten artificialmente entre IT y OT.</p>
    </div>

    <div className="nexus-itot-coverage">
      <div>
        <Badge>Taxonomy v2</Badge>
        <strong>{numberFormat.format(report.population.classified)} de {numberFormat.format(report.population.total)}</strong>
        <span>activos con domain classified · {report.population.domainCoverage.ratio === null ? "coverage no disponible" : percentFormat.format(report.population.domainCoverage.ratio)}</span>
      </div>
      <div>
        <span>Sin cohorte: <strong>{numberFormat.format(report.population.unresolved)}</strong></span>
        <small>
          assessment ausente {unresolved.assessmentMissing} · unknown {unresolved.unknown} · sin clasificar {unresolved.unclassified} · conflicto {unresolved.conflict}
        </small>
      </div>
    </div>

    <div className="nexus-itot-grid">
      {domains.map(domain => <CohortCard key={domain} cohort={report.cohorts[domain]} />)}
    </div>

    <p className="nexus-muted">Estos valores no constituyen ranking, maturity score, risk score ni Device Health. <a href="#assets">Abrir Explorer</a> para investigar los CIs y sus facetas.</p>
  </section>;
}
