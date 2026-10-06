import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { FlaskConical } from "lucide-react";
import { Button, CoverageIndicator, DataTable, EmptyState, ErrorState, EvidenceBadge, Input, LoadingState, SeverityBadge, type EvidenceState, type SeverityState } from "../src/index.js";
import "./foundations.css";

const evidence: EvidenceState[] = ["observed", "inferred", "manual", "normalized", "unknown", "unavailable", "partial", "conflict"];
const severity: SeverityState[] = ["healthy", "attention", "degraded", "critical", "stale"];
function ReviewBoard({ longContent = false }: { longContent?: boolean }) {
  return <main className="igx-foundation-review" aria-label="Revisión de foundations NEXUS">
    <header className="review-header"><div><p className="review-eyebrow">IGX NEXUS · PRODUCT EXPERIENCE 3.0</p><h1>Claridad para investigar</h1><p className="review-muted">Foundation propuesta · revisión humana pendiente</p></div><span className="review-mode"><FlaskConical aria-hidden="true" size={16} /> Demo · fixture de diseño</span></header>
    <section className="review-section" aria-labelledby="evidence-title"><div className="review-section-heading"><h2 id="evidence-title">Lo que sabemos y cómo lo sabemos</h2><p className="review-muted">Procedencia antes de condición. Un dato inferido conserva su método y límites.</p></div><div className="review-badges">{evidence.map(state => <EvidenceBadge key={state} state={state} />)}</div><p className="review-provenance">Fuente: escenario sintético · captura de ejemplo 2026-10-06 · no representa un tenant Live.</p></section>
    <section className="review-section" aria-labelledby="coverage-title"><h2 id="coverage-title">Cobertura y severidad son ejes distintos</h2><div className="review-columns"><div><h3>Disponibilidad de evidencia</h3><CoverageIndicator covered={7} total={20} scope="activos con propietario" /><p className="review-muted">Faltan datos para 13 activos. Esto no afirma riesgo ni fallo de servicio.</p><CoverageIndicator covered={null} total={20} scope="relaciones" /></div><div><h3>Condición suministrada por la fuente</h3><div className="review-badges">{severity.map(state => <SeverityBadge key={state} state={state} />)}</div><p className="review-muted">Cada condición necesita motivo y fecha en su contexto; no se calcula desde coverage.</p></div></div></section>
    <section className="review-section" aria-labelledby="entity-title"><div className="review-section-heading"><h2 id="entity-title">Una entidad, contexto suficiente</h2><p className="review-muted">Secciones y separadores; no una tarjeta por cada dato.</p></div><div className="review-entity"><div><h3>{longContent ? "NEXUS-PLATAFORMA-OPERACIONAL-IDENTIFICADOR-EXCEPCIONALMENTE-LARGO-001" : "NEXUS-LAB-001"}</h3><p className="review-muted">Servidor · Región de ejemplo · propietario desconocido</p><div className="review-badges"><EvidenceBadge state="inferred" /><CoverageIndicator covered={0} total={4} scope="relaciones validadas" /></div></div><Button variant="secondary">Ver evidencia</Button></div><div className="review-filters"><Input label="Buscar entidad" placeholder="Nombre o identificador" /><Button>Aplicar filtro</Button><Button variant="secondary" isDisabled>Exportar no disponible</Button></div><p className="review-provenance">Selecciona con checkbox. El foco de teclado puede moverse sin perder la selección.</p><DataTable caption="Entidades de demostración" showCaption selectionMode="multiple" getRowKey={row => row.id} getSelectionLabel={row => `Seleccionar ${row.id}`} rows={[{id:"NEXUS-LAB-001",method:"observed" as const},{id:"NEXUS-LAB-002",method:"inferred" as const}]} columns={[{id:"id",header:"Entidad",isRowHeader:true,cell: row => <code>{row.id}</code>},{id:"evidence",header:"Evidencia",cell: row => <EvidenceBadge state={row.method} />},{id:"coverage",header:"Cobertura",cell: () => <CoverageIndicator covered={7} total={20} scope="atributos" /> }]} /></section>
    <footer className="review-footer">Marca sin adoptar · API aditiva · sin nuevos providers ni contratos · V02-023 separado</footer>
  </main>;
}
const meta = { title: "Foundations/Product Experience 3", component: ReviewBoard, args: { longContent: false }, argTypes: { longContent: { control: "boolean" } }, parameters: { layout: "fullscreen" } } satisfies Meta<typeof ReviewBoard>;
export default meta;
type Story = StoryObj<typeof meta>;

const semanticPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByText(/7\/20 · 35% · Cobertura parcial/)).toHaveLength(3);
  await expect(canvas.getByText("Cobertura desconocida · relaciones")).toBeVisible();
  const checkbox = canvas.getByRole("checkbox", { name: "Seleccionar NEXUS-LAB-001" });
  await userEvent.click(checkbox);
  await expect(checkbox).toBeChecked();
  await expect(checkbox.closest("tr")).toHaveAttribute("data-selected", "true");
  await userEvent.tab();
  await expect(canvas.getByRole("checkbox", { name: "Seleccionar NEXUS-LAB-002" })).toHaveFocus();
  await userEvent.keyboard(" ");
  await expect(canvas.getByRole("checkbox", { name: "Seleccionar NEXUS-LAB-002" })).toBeChecked();
  await userEvent.keyboard(" ");
  await expect(canvas.getByRole("checkbox", { name: "Seleccionar NEXUS-LAB-002" })).not.toBeChecked();
  await expect(checkbox).toBeChecked();
  await expect(canvas.getByRole("button", { name: "Exportar no disponible" })).toBeDisabled();
};
export const LightComfortable: Story = { globals: { theme: "light", density: "comfortable" }, play: semanticPlay };
export const DarkCompact: Story = { globals: { theme: "dark", density: "compact" }, play: semanticPlay };
export const DarkComfortableLong: Story = { globals: { theme: "dark", density: "comfortable" }, args: { longContent: true }, play: semanticPlay };
export const LightCompactLong: Story = { globals: { theme: "light", density: "compact" }, args: { longContent: true }, play: semanticPlay };

export const CoverageBoundaries: Story = {
  render: () => <main className="igx-foundation-review"><h1>Cobertura: límites del contrato</h1><div className="review-badges">{[null,NaN,-1,21,1.5,Number.MAX_SAFE_INTEGER+1].map((covered,index) => <CoverageIndicator key={index} covered={covered} total={20} scope={`inválido ${index}`} />)}<CoverageIndicator covered={0} total={0} scope="denominador cero" /><CoverageIndicator covered={0} total={20} scope="cero conocido" /><CoverageIndicator covered={20} total={20} scope="completo" /><CoverageIndicator covered={199} total={200} scope="casi completo" /></div></main>,
  play: async ({canvasElement}) => { const c=within(canvasElement); await expect(c.getAllByText(/Cobertura desconocida/)).toHaveLength(7); await expect(c.getByText("0/20 · 0% · Cobertura parcial · cero conocido")).toBeVisible(); await expect(c.getByText("20/20 · 100% · Cobertura completa · completo")).toBeVisible(); await expect(c.getByText("199/200 · 99% · Cobertura parcial · casi completo")).toBeVisible(); await expect(canvasElement.querySelector('[data-severity]')).toBeNull(); }
};
export const FeedbackStates: Story = { render: () => <main className="igx-foundation-review"><h1>Feedback explícito</h1><section className="review-section"><LoadingState title="Consultando fuente" description="Actividad de ejemplo; no simula datos recibidos." /><EmptyState title="Sin entidades en este filtro" description="La consulta terminó; ajusta el scope." /><ErrorState title="Fuente no disponible" description="No se sustituye el error por una lista vacía." /><EvidenceBadge state="partial" /><p>Resultado parcial: 7 de 20 entidades; captura de ejemplo.</p></section></main>, play: async ({canvasElement}) => {const c=within(canvasElement);await expect(c.getByText("Fuente no disponible")).toBeVisible();await expect(c.getByText("Sin entidades en este filtro")).toBeVisible();} };
