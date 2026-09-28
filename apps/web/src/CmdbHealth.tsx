import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, PageHeader, Pagination, StatusBadge } from "@igx-nexus/ui";
import { typeLabels, type InventoryProvider } from "./asset-model";
import type { RelationshipInventoryProvider } from "./relationship-model";
import { demoProvider } from "./demo-provider";
import { demoRelationshipInventoryProvider } from "./demo-relationship-provider";
import { emptyHealthFilters, filterHealth, type HealthFilters } from "./health-engine";
import { healthDimensions, healthStates, healthWeights } from "./health-model";
import { dimensionLabels, healthLabels, healthTones, scoreLabel, coverageLabel, findingCatalog, findingTitle } from "./health-presentation";
import { HealthFindings } from "./HealthDetails";
import { assetHash } from "./navigation-model";
import { useHealthReport } from "./use-health-report";
import "./cmdb-health.css";

const PAGE_SIZE = 20;
const ratioLabel = (value: number | null) => value === null ? "No disponible" : `${Math.floor(Math.min(1, value) * 100)} %`;
const metricCoverageLabel = (ratio: number | null) => ratio === null ? "No disponible" : `${Math.floor(Math.min(1, ratio) * 100)} %`;

export function CmdbHealth({ inventoryProvider = demoProvider, relationshipProvider = demoRelationshipInventoryProvider }: {
  inventoryProvider?: InventoryProvider; relationshipProvider?: RelationshipInventoryProvider;
}) {
  const { state, retry } = useHealthReport(inventoryProvider, relationshipProvider);
  const [filters, setFilters] = useState<HealthFilters>(emptyHealthFilters);
  const [page, setPage] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (state.status === "loading") return;
    const frame = requestAnimationFrame(() => {
      const heading = contentRef.current?.querySelector<HTMLElement>("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [state.status]);
  const rows = useMemo(() => state.status === "ready" ? filterHealth(state.report.assets, filters) : [], [state, filters]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const setFilter = (key: keyof HealthFilters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(1); };
  const focusResults = () => requestAnimationFrame(() => { resultsRef.current?.focus(); });
  const reset = () => { setFilters(emptyHealthFilters); setPage(1); };
  const report = state.status === "ready" ? state.report : null;
  const summary = report?.summary;
  return <div className="nexus-health-page" ref={contentRef}>
    <PageHeader title="CMDB Health" eyebrow="CALIDAD DEL REGISTRO · V02-020" description="Entiende qué información es confiable, qué falta y qué evidencia respalda el registro." meta={<Badge>Sin telemetría operacional</Badge>} />
    {state.status === "loading" && <LoadingState title="Calculando CMDB Health" description="Evaluando inventario y relaciones del mismo corte." />}
    {state.status === "error" && <ErrorState title="No se pudo calcular CMDB Health" description="Vuelve a intentar cargar los datos para la evaluación." action={<Button onPress={retry}>Reintentar</Button>} />}
    {report && summary && <>
      <p className="nexus-muted">Corte de evaluación: <time dateTime={report.asOf}>{new Date(report.asOf).toLocaleString("es-CL", { timeZone: "UTC" })} UTC</time>. Incluye todos los lifecycle y ambos dominios. Los filtros inferiores sólo cambian la lista de CI.</p>
      {summary.total === 0 ? <EmptyState title="El inventario está vacío" description="No hay registros CI para evaluar. No se asigna un score de cero." action={<a href="#assets">Ir al inventario</a>} /> : <>
        <section className="nexus-health-overview" aria-labelledby="health-overview-heading">
          <div><h2 id="health-overview-heading">Score de registros CI</h2><strong className="nexus-health-score">{scoreLabel(summary.score)}</strong><StatusBadge status={healthTones[summary.state]}>{healthLabels[summary.state]}</StatusBadge><p>Calidad de datos; no mide hardware, disponibilidad ni criticidad.</p></div>
          <div><h2>Cobertura de evidencia</h2><strong className="nexus-health-score">{coverageLabel(summary.coverage)}</strong><p>Proporción ponderada de comprobaciones aplicables con evidencia. No es una probabilidad de confianza.</p><p>{summary.evaluated} de {summary.total} CI evaluados · {coverageLabel(100 * summary.evaluated / summary.total)}</p></div>
        </section>
        <section className="nexus-health-panel" aria-labelledby="health-evidence-heading">
          <h2 id="health-evidence-heading">Evidencia canónica</h2>
          {report.canonicalQuality ? <>
            <p>Estas métricas complementan el score histórico de CMDB Health con denominadores y coverage propios. V02-020 no les asigna un peso corporativo inventado dentro del score.</p>
            <dl className="nexus-health-dimensions">
              <div><dt>Identidad de instancia de fuentes</dt><dd>{ratioLabel(report.canonicalQuality.sourceInstanceIdentity.value)} · Coverage de medición: {metricCoverageLabel(report.canonicalQuality.sourceInstanceIdentity.coverage.ratio)}</dd></div>
              <div><dt>Provenance de campos canónicos gobernados</dt><dd>{ratioLabel(report.canonicalQuality.provenanceCoreFields.value)} · Coverage de medición: {metricCoverageLabel(report.canonicalQuality.provenanceCoreFields.coverage.ratio)}</dd></div>
              <div><dt>Conflictos Taxonomy v2</dt><dd>{ratioLabel(report.canonicalQuality.taxonomyConflicts.value)} · Coverage de assessment: {metricCoverageLabel(report.canonicalQuality.taxonomyConflicts.coverage.ratio)}</dd></div>
            </dl>
            <p className="nexus-muted">Conflictos de reconciliación por atributo: no disponibles en TechnologySnapshot schema 0.2. No se reconstruyen ni se infieren desde la UI.</p>
          </> : <p>Este snapshot no expone evidencia canónica para estas métricas. Se muestra como no disponible; no se interpreta como un error del CI.</p>}
        </section>
        <section className="nexus-health-panel" aria-labelledby="health-distribution-heading"><h2 id="health-distribution-heading">Distribución de registros</h2>
          <ul className="nexus-health-distribution">{healthStates.map(value => <li key={value}><Button variant="secondary" onPress={() => { setFilters({ ...emptyHealthFilters, state: value }); setPage(1); focusResults(); }} aria-label={`Ver ${healthLabels[value]}: ${summary.distribution[value]} CI`}><StatusBadge status={healthTones[value]}>{healthLabels[value]}</StatusBadge><strong>{summary.distribution[value]}</strong></Button></li>)}</ul>
        </section>
        <section className="nexus-health-panel" aria-labelledby="health-dimensions-heading"><h2 id="health-dimensions-heading">Qué compone el score</h2>
          <dl className="nexus-health-dimensions">{summary.dimensions.map(d => <div key={d.dimension}><dt>{dimensionLabels[d.dimension]} · peso base {healthWeights[d.dimension]} %</dt><dd>{d.coverage === null ? "No aplicable" : scoreLabel(d.score)} · Cobertura: {coverageLabel(d.coverage)}</dd></div>)}</dl>
          <details><summary>Reglas, pesos y límites de la evaluación</summary>
            <p>Por dimensión: media de comprobaciones evaluables. Correcto = 100; faltante obligatorio o inválido = 0; observación de más de 7 y hasta 30 días = 50; más de 30 días = 0. Los desconocidos no valen cero y reducen cobertura; lo no aplicable queda fuera.</p>
            <p>El peso efectivo es el peso base multiplicado por la fracción evaluable de la dimensión. El score CI es la suma ponderada dividida por los pesos efectivos. El global suma puntos y pesos efectivos de todos los CI, antes de dividir; no promedia scores redondeados.</p>
            <p>Confiable ≥ 90; Atención ≥ 70 y &lt; 90; Degradado &lt; 70. Cobertura &lt; 60 % se muestra como insuficiente. Sin comprobaciones evaluables: sin evaluación. Los valores visibles se truncan al entero inferior; el cálculo conserva decimales.</p>
            <p>Hostname se exige sólo a computadores y equipos de red. Responsable sólo a activos asignados. No se penalizan cero relaciones, lifecycle legítimo ni garantía vencida. Estas reglas son heurísticas demo, no políticas corporativas aprobadas.</p>
          </details>
        </section>
        <section className="nexus-health-panel" aria-labelledby="health-causes-heading"><h2 id="health-causes-heading">Principales señales de calidad</h2>
          <p>Cada causa cuenta CI afectados una vez. Incluye faltantes, errores y datos desconocidos; información no equivale a error.</p>
          {summary.topFindings.length ? <ul className="nexus-health-causes">{summary.topFindings.map(f => <li key={f.code}><Button variant="secondary" onPress={() => { setFilters({ ...emptyHealthFilters, cause: f.code }); setPage(1); focusResults(); }}>{findingCatalog[f.code].title} · {f.count} CI</Button></li>)}</ul>
            : <p>No se detectaron señales de calidad que requieran revisión en el alcance evaluado.</p>}
        </section>
        <section className="nexus-health-panel" aria-labelledby="health-results-heading">
          <h2 id="health-results-heading" tabIndex={-1} ref={resultsRef}>Localizar registros y revisar causas</h2>
          <p>Orden: score ascendente, severidad de calidad y ID. Los CI sin evaluación aparecen primero.</p>
          <div className="nexus-health-filters">
            <label>Estado Health<select value={filters.state} onChange={e => setFilter("state", e.currentTarget.value)}><option value="">Todos</option>{healthStates.map(s => <option key={s} value={s}>{healthLabels[s]}</option>)}</select></label>
            <label>Dimensión con señales<select value={filters.dimension} onChange={e => setFilter("dimension", e.currentTarget.value)}><option value="">Todas</option>{healthDimensions.map(d => <option key={d} value={d}>{dimensionLabels[d]}</option>)}</select></label>
            <label>Tipo de activo<select value={filters.type} onChange={e => setFilter("type", e.currentTarget.value)}><option value="">Todos</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Causa<select value={filters.cause} onChange={e => setFilter("cause", e.currentTarget.value)}><option value="">Todas</option>{summary.topFindings.map(f => <option key={f.code} value={f.code}>{findingCatalog[f.code].title}</option>)}</select></label>
          </div>
          <Button variant="secondary" onPress={reset}>Restablecer filtros</Button>
          <p role="status">{rows.length} CI coinciden · Página {currentPage} de {totalPages}</p>
          {rows.length ? <ol className="nexus-health-rows" start={(currentPage - 1) * PAGE_SIZE + 1}>{rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((row, index) => <li key={`${row.asset.id}-${index}`}>
            <div className="nexus-health-row-heading"><h3>{row.findings.some(f => f.code === "identity_duplicate" && f.field === "id") || !row.asset.id.trim() ? row.asset.name : <a href={assetHash(row.asset.id)}>{row.asset.name}</a>}</h3><span>{row.asset.id} · {typeLabels[row.asset.type]}</span></div>
            <div className="nexus-health-status"><strong>{scoreLabel(row.score)}</strong><StatusBadge status={healthTones[row.state]}>{healthLabels[row.state]}</StatusBadge><span>Cobertura: {coverageLabel(row.coverage)}</span></div>
            {row.findings.length ? <><ul>{row.findings.slice(0, 3).map((f, i) => <li key={i}>{findingTitle(f)}</li>)}</ul>{row.findings.length > 3 && <p>{row.findings.length - 3} señales adicionales.</p>}<details><summary>Revisar todas las causas y acciones de {row.asset.id || "este registro"}</summary><HealthFindings findings={row.findings} /></details></> : <p>Sin señales de calidad pendientes.</p>}
          </li>)}</ol> : <EmptyState title="Sin registros para estos filtros" description="Amplía el estado, tipo, dimensión o causa para encontrar registros." action={<Button onPress={reset}>Ver todos los registros</Button>} />}
          {rows.length > PAGE_SIZE && <Pagination page={currentPage} totalPages={totalPages} onPageChange={value => { setPage(value); focusResults(); }} />}
        </section>
      </>}
      {report.relationshipFindings.length > 0 && <section className="nexus-health-panel" aria-labelledby="health-relationship-heading"><h2 id="health-relationship-heading">Señales del registro de relaciones</h2><p>{report.orphanRelationships} relaciones sin ningún extremo en inventario. Se informan aquí aunque no puedan atribuirse al score de un CI.</p><HealthFindings findings={report.relationshipFindings} /></section>}
    </>}
  </div>;
}
