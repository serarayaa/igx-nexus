import { Badge, Card, ContentSection, StatusBadge } from "@igx-nexus/ui";
import {
  proactiveFindingRules,
  type EndpointExperienceCoverage,
  type ProactiveFindingRuleEvaluation,
  type ProactiveFindingsReport,
} from "@igx-nexus/types";
import { assetHash } from "./navigation-model";

const numberFormat = new Intl.NumberFormat("es-CL");
const percentFormat = new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 0 });

function coverageText(coverage: EndpointExperienceCoverage): string {
  if (coverage.ratio === null) return "Sin población elegible";
  return `${numberFormat.format(coverage.known)} de ${numberFormat.format(coverage.total)} · ${percentFormat.format(coverage.ratio)}`;
}

function evaluationLabel(evaluation: ProactiveFindingRuleEvaluation): string {
  const definition = proactiveFindingRules.find(rule => rule.id === evaluation.ruleId);
  if (!definition) return evaluation.ruleId;
  if (definition.id === "nexus.endpoint.application-instability") return "Inestabilidad de aplicación";
  if (definition.id === "nexus.endpoint.repeated-unclean-restart") return "Reinicios no limpios";
  return "Evidencia de capacidad de batería";
}

function evaluationTone(state: ProactiveFindingRuleEvaluation["state"]): "warning" | "neutral" | "info" {
  if (state === "triggered") return "warning";
  if (state === "unavailable") return "info";
  return "neutral";
}

function evaluationStateText(evaluation: ProactiveFindingRuleEvaluation): string {
  if (evaluation.state === "triggered") {
    return `${numberFormat.format(evaluation.triggeredAssets)} activo(s) con finding`;
  }
  if (evaluation.state === "unavailable") return "No evaluable";
  return "Sin patrón dentro de la población cubierta";
}

export function ProactiveFindingsSummary({ report }: { report: ProactiveFindingsReport | null }) {
  if (!report) {
    return <section className="nexus-overview-section" aria-labelledby="proactive-findings-heading">
      <div className="nexus-overview-section-heading">
        <div>
          <p className="nexus-overline">Evidence → pattern → hypothesis</p>
          <h2 id="proactive-findings-heading">Proactive Findings</h2>
        </div>
        <p>El motor requiere un TechnologySnapshot canónico. NEXUS no sustituye ausencia Live con findings Demo.</p>
      </div>
      <div className="nexus-attention-empty">
        <StatusBadge status="info">Sin evidencia canónica</StatusBadge>
        <p>No hay observations canónicas disponibles para evaluar reglas de findings.</p>
      </div>
    </section>;
  }

  const availableEvaluations = report.evaluations.filter(evaluation => evaluation.coverage.known > 0);

  return <section className="nexus-overview-section" aria-labelledby="proactive-findings-heading">
    <div className="nexus-overview-section-heading">
      <div>
        <p className="nexus-overline">Evidence → pattern → hypothesis</p>
        <h2 id="proactive-findings-heading">Proactive Findings</h2>
      </div>
      <p>Reglas deterministas sobre evidencia observable. Un finding propone una investigación; no demuestra causa, riesgo ni severidad.</p>
    </div>

    <div className="nexus-findings-contract">
      <div>
        <Badge>{report.domain === "all" ? "IT y OT" : report.domain}</Badge>
        <strong>{numberFormat.format(report.findings.length)}</strong>
        <span>findings derivados de {numberFormat.format(report.population.eligible)} endpoints elegibles.</span>
      </div>
      <div>
        <span>Ventana: <strong>{report.windowDays} días</strong></span>
        <small>Confidence expresa soporte de evidencia del patrón; nunca probabilidad causal.</small>
      </div>
    </div>

    <div className="nexus-findings-evaluations" aria-label="Cobertura de reglas de findings">
      {report.evaluations.map(evaluation =>
        <div key={evaluation.ruleId}>
          <div>
            <strong>{evaluationLabel(evaluation)}</strong>
            <StatusBadge status={evaluationTone(evaluation.state)}>{evaluationStateText(evaluation)}</StatusBadge>
          </div>
          <span>Coverage: {coverageText(evaluation.coverage)}</span>
        </div>)}
    </div>

    {report.findings.length > 0
      ? <div className="nexus-findings-list">
          {report.findings.map(finding => {
            const evaluation = report.evaluations.find(item => item.ruleId === finding.ruleId);
            return <Card key={finding.id}>
              <ContentSection
                title={finding.title}
                description={finding.summary}
                action={<a href={assetHash(finding.assetId)}>Abrir Asset 360</a>}
              >
                <div className="nexus-findings-meta">
                  <Badge>{finding.assetId}</Badge>
                  <StatusBadge status="neutral">Evidencia {finding.confidence.state === "supported" ? "soportada" : "limitada"}</StatusBadge>
                  <span>Rule v{finding.ruleVersion}</span>
                  {evaluation && <span>Coverage regla: {coverageText(evaluation.coverage)}</span>}
                </div>

                <dl className="nexus-findings-detail">
                  <div>
                    <dt>Patrón observado</dt>
                    <dd>{finding.pattern.description}</dd>
                  </div>
                  <div>
                    <dt>Hipótesis de investigación</dt>
                    <dd>{finding.hypothesis.text}</dd>
                  </div>
                  <div>
                    <dt>Evidencia</dt>
                    <dd>{finding.evidence.length} observation(s) · {Array.from(new Set(finding.evidence.map(item => item.name))).join(" · ")}</dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{finding.confidence.rationale}</dd>
                  </div>
                </dl>

                <div className="nexus-findings-guidance">
                  <strong>Siguiente investigación sugerida</strong>
                  <ul>
                    {finding.investigationGuidance.map(step => <li key={step}>{step}</li>)}
                  </ul>
                </div>
              </ContentSection>
            </Card>;
          })}
        </div>
      : <div className="nexus-attention-empty">
          <StatusBadge status={availableEvaluations.length > 0 ? "neutral" : "info"}>
            {availableEvaluations.length > 0 ? "Sin findings dentro de la cobertura actual" : "Reglas no evaluables"}
          </StatusBadge>
          <p>{availableEvaluations.length > 0
            ? "Las reglas evaluables no encontraron sus patrones de referencia. Esto no demuestra que los endpoints estén saludables."
            : "No existe coverage suficiente para evaluar las reglas. NEXUS no transforma falta de evidencia en cero findings."}</p>
        </div>}

    <p className="nexus-muted">V02-026 no ejecuta remediation, comandos ni búsquedas externas. Correlación y recurrencia se presentan como patrones observables, no como root cause.</p>
  </section>;
}
