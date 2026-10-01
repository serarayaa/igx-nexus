import { Badge, Card, ContentSection, StatusBadge } from "@igx-nexus/ui";
import type { EndpointExperienceCoverage, EndpointExperienceReport } from "@igx-nexus/types";
import type { Domain } from "./asset-model";

const numberFormat = new Intl.NumberFormat("es-CL");
const percentFormat = new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 0 });

function coverageText(coverage: EndpointExperienceCoverage): string {
  if (coverage.ratio === null) return "Sin población elegible";
  return `${numberFormat.format(coverage.known)} de ${numberFormat.format(coverage.total)} · ${percentFormat.format(coverage.ratio)}`;
}

function eventText(eventCount: number, affectedAssets: number, coverage: EndpointExperienceCoverage): string {
  if (coverage.known === 0) return "No disponible";
  return `${numberFormat.format(eventCount)} eventos · ${numberFormat.format(affectedAssets)} activos afectados`;
}

function seconds(ms: number | null): string {
  if (ms === null) return "No disponible";
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(ms / 1000)} s`;
}

function capacity(value: number | null): string {
  if (value === null) return "No disponible";
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(value)} %`;
}

export function EndpointExperienceSummary({
  report,
  selectedDomain,
}: {
  report: EndpointExperienceReport | null;
  selectedDomain: Domain | "all";
}) {
  const scopeLabel = selectedDomain === "all" ? "IT y OT" : selectedDomain;

  if (!report) {
    return <section className="nexus-overview-section" aria-labelledby="endpoint-experience-heading">
      <div className="nexus-overview-section-heading">
        <div>
          <p className="nexus-overline">Endpoint signals</p>
          <h2 id="endpoint-experience-heading">Endpoint Experience</h2>
        </div>
        <p>La lectura requiere un TechnologySnapshot canónico con observations. NEXUS no sustituye esa ausencia con datos Demo.</p>
      </div>
      <div className="nexus-attention-empty">
        <StatusBadge status="info">Sin evidencia canónica</StatusBadge>
        <p>No hay observations canónicas disponibles para evaluar experiencia endpoint.</p>
      </div>
    </section>;
  }

  if (report.population.eligible === 0) {
    return <section className="nexus-overview-section" aria-labelledby="endpoint-experience-heading">
      <div className="nexus-overview-section-heading">
        <div>
          <p className="nexus-overline">Endpoint signals</p>
          <h2 id="endpoint-experience-heading">Endpoint Experience</h2>
        </div>
        <p>Ventana analítica de {report.windowDays} días. Sólo entran clases endpoint gobernadas y lifecycle operacional.</p>
      </div>
      <div className="nexus-attention-empty">
        <StatusBadge status="info">Sin población elegible</StatusBadge>
        <p>El alcance {scopeLabel} no contiene endpoints con Asset Class Taxonomy v2 classified y lifecycle operacional.</p>
      </div>
    </section>;
  }

  return <section className="nexus-overview-section" aria-labelledby="endpoint-experience-heading">
    <div className="nexus-overview-section-heading">
      <div>
        <p className="nexus-overline">Endpoint signals</p>
        <h2 id="endpoint-experience-heading">Endpoint Experience</h2>
      </div>
      <p>Ventana de {report.windowDays} días. Los valores separan eventos observados de coverage; ausencia de eventos no se interpreta como buen estado.</p>
    </div>

    <div className="nexus-endpoint-coverage">
      <div>
        <Badge>{scopeLabel}</Badge>
        <strong>{numberFormat.format(report.population.eligible)}</strong>
        <span>endpoints elegibles de {numberFormat.format(report.population.scoped)} activos en scope.</span>
      </div>
      <div>
        <span>Ventana: <strong>{report.windowDays} días</strong></span>
        <small>Clases: endpoint · operator interface · industrial compute. Lifecycle: active / maintenance / repair.</small>
      </div>
    </div>

    <div className="nexus-endpoint-grid">
      <Card>
        <ContentSection title="Confiabilidad de aplicaciones" description={`Coverage de Reliability Records: ${coverageText(report.reliability.coverage)}.`}>
          <dl className="nexus-endpoint-facts">
            <div><dt>Crashes</dt><dd>{eventText(report.reliability.crashes.eventCount, report.reliability.crashes.affectedAssets, report.reliability.coverage)}</dd></div>
            <div><dt>Hangs</dt><dd>{eventText(report.reliability.hangs.eventCount, report.reliability.hangs.affectedAssets, report.reliability.coverage)}</dd></div>
          </dl>
        </ContentSection>
      </Card>

      <Card>
        <ContentSection title="Reinicios" description={`Coverage de Event Log: ${coverageText(report.restarts.coverage)}.`}>
          <dl className="nexus-endpoint-facts">
            <div><dt>No limpios</dt><dd>{eventText(report.restarts.unexpected.eventCount, report.restarts.unexpected.affectedAssets, report.restarts.coverage)}</dd></div>
            <div><dt>Stop error</dt><dd>{eventText(report.restarts.stopError.eventCount, report.restarts.stopError.affectedAssets, report.restarts.coverage)}</dd></div>
          </dl>
          <p className="nexus-muted">Un reinicio no limpio es evidencia observable, no una causa raíz ni una falla de hardware demostrada.</p>
        </ContentSection>
      </Card>

      <Card>
        <ContentSection title="Startup" description={`Coverage de startup: ${coverageText(report.startup.coverage)}.`}>
          <dl className="nexus-endpoint-facts">
            <div><dt>Duración media observada</dt><dd>{report.startup.coverage.known === 0 ? "No disponible" : seconds(report.startup.averageMs)}</dd></div>
            <div><dt>Muestras</dt><dd>{report.startup.coverage.known === 0 ? "No disponible" : `${numberFormat.format(report.startup.samples)} · ${numberFormat.format(report.startup.assetsWithSamples)} activos`}</dd></div>
          </dl>
        </ContentSection>
      </Card>

      <Card>
        <ContentSection title="Batería" description={`Cobertura de capacidad física: ${coverageText(report.battery.capabilityCoverage)}.`}>
          <dl className="nexus-endpoint-facts">
            <div><dt>Con batería</dt><dd>{report.battery.capabilityCoverage.known === 0 ? "No disponible" : numberFormat.format(report.battery.present)}</dd></div>
            <div><dt>Capacidad media</dt><dd>{report.battery.capacityCoverage.known === 0 ? "No disponible" : capacity(report.battery.averageCapacityPercent)}</dd></div>
            <div><dt>Coverage capacidad</dt><dd>{coverageText(report.battery.capacityCoverage)}</dd></div>
          </dl>
        </ContentSection>
      </Card>
    </div>

    <p className="nexus-muted">Endpoint Experience no es CMDB Health, Device Health, risk score ni diagnóstico causal. Sólo resume observations canónicas dentro de una ventana explícita y muestra su cobertura.</p>
  </section>;
}
