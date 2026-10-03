import { useEffect, useState } from "react";
import {
  applyResearchReview,
  type KnowledgeResearchReport,
  type KnowledgeSourceClass,
  type ResearchClaimSupportState,
  type ResearchReviewState,
} from "@igx-nexus/types";
import { Badge, Button, StatusBadge } from "@igx-nexus/ui";

const sourceLabels: Record<KnowledgeSourceClass, string> = {
  vendor_official: "Vendor official",
  standards_body: "Standards body",
  government_or_cert: "Government / CERT",
  project_official: "Project official",
  community: "Community",
  other: "Other",
  synthetic_fixture: "Synthetic fixture",
};

const claimLabels: Record<ResearchClaimSupportState, string> = {
  supported: "Supported",
  partially_supported: "Partially supported",
  contested: "Contested",
  unsupported: "Unsupported",
  unknown: "Unknown",
};

const reviewLabels: Record<ResearchReviewState, string> = {
  pending: "Pendiente",
  approved_for_follow_up: "Aprobado para seguimiento",
  needs_more_evidence: "Requiere más evidencia",
  rejected: "Rechazado",
};

function claimTone(state: ResearchClaimSupportState): "success" | "warning" | "critical" | "neutral" | "info" {
  if (state === "supported") return "success";
  if (state === "partially_supported" || state === "contested") return "warning";
  if (state === "unsupported") return "critical";
  if (state === "unknown") return "info";
  return "neutral";
}

function reviewTone(state: ResearchReviewState): "success" | "warning" | "critical" | "neutral" | "info" {
  if (state === "approved_for_follow_up") return "success";
  if (state === "needs_more_evidence") return "warning";
  if (state === "rejected") return "critical";
  return "neutral";
}

export function KnowledgeResearchPanel({
  report,
  demoInteractive = false,
  reviewClock = () => new Date().toISOString(),
}: {
  report: KnowledgeResearchReport | null;
  demoInteractive?: boolean;
  reviewClock?: () => string;
}) {
  const [current, setCurrent] = useState(report);
  const reportRequestId = report?.request.id;
  const reportGeneratedAt = report?.generatedAt;

  useEffect(() => {
    setCurrent(report);
  }, [reportRequestId, reportGeneratedAt]);

  if (!current) {
    return <div className="nexus-research-panel nexus-research-unavailable">
      <div className="nexus-research-heading">
        <div>
          <p className="nexus-overline">Knowledge Research</p>
          <h4>Research packet no disponible</h4>
        </div>
        <StatusBadge status="info">Sin research</StatusBadge>
      </div>
      <p>Este finding no tiene conocimiento externo transportado. NEXUS no sustituye esta ausencia con fixtures Demo ni la interpreta como falta de causas posibles.</p>
    </div>;
  }

  const sourceById = new Map(current.sources.map((source) => [source.id, source]));
  const performReview = (decision: Exclude<ResearchReviewState, "pending">) => {
    setCurrent(applyResearchReview(
      current,
      decision,
      reviewClock(),
      "Revisión local de demostración; no persistida.",
    ));
  };

  return <div className="nexus-research-panel">
    <div className="nexus-research-heading">
      <div>
        <p className="nexus-overline">Knowledge Research</p>
        <h4>Pregunta de investigación</h4>
      </div>
      <div className="nexus-research-statuses">
        <StatusBadge status={reviewTone(current.review.state)}>{reviewLabels[current.review.state]}</StatusBadge>
        <Badge>Execution blocked</Badge>
      </div>
    </div>

    <p className="nexus-research-question">{current.request.question}</p>
    <p className="nexus-muted">External knowledge nunca reemplaza observations ni evidence local del finding.</p>

    <section className="nexus-research-block" aria-labelledby={current.request.id + "-sources"}>
      <div className="nexus-research-block-heading">
        <h5 id={current.request.id + "-sources"}>Fuentes</h5>
        <span>{current.sources.length}</span>
      </div>
      <ul className="nexus-research-source-list">
        {current.sources.map((source) => <li key={source.id}>
          <div>
            <strong>{source.title}</strong>
            <span>{source.publisher}</span>
          </div>
          <div className="nexus-research-source-meta">
            <Badge>{sourceLabels[source.sourceClass]}</Badge>
            <span>untrusted input</span>
          </div>
          {source.location.kind === "external_uri"
            ? <a href={source.location.uri} target="_blank" rel="noreferrer">Abrir fuente externa</a>
            : <code>{source.location.reference}</code>}
          {source.notes && <p>{source.notes}</p>}
        </li>)}
      </ul>
    </section>

    <section className="nexus-research-block" aria-labelledby={current.request.id + "-claims"}>
      <div className="nexus-research-block-heading">
        <h5 id={current.request.id + "-claims"}>Claims</h5>
        <span>{current.claims.length}</span>
      </div>
      <ul className="nexus-research-claim-list">
        {current.claims.map((claim) => <li key={claim.id}>
          <div className="nexus-research-claim-heading">
            <StatusBadge status={claimTone(claim.supportState)}>{claimLabels[claim.supportState]}</StatusBadge>
            <span>No es evidence local</span>
          </div>
          <strong>{claim.statement}</strong>
          <p>{claim.applicability}</p>
          <small>Fuentes: {claim.sourceIds.map((id) => sourceById.get(id)?.title ?? id).join(" · ")}</small>
        </li>)}
      </ul>
    </section>

    {current.conflicts.length > 0 && <section className="nexus-research-block nexus-research-conflicts" aria-labelledby={current.request.id + "-conflicts"}>
      <div className="nexus-research-block-heading">
        <h5 id={current.request.id + "-conflicts"}>Contradicciones conservadas</h5>
        <StatusBadge status="warning">{current.conflicts.length} unresolved</StatusBadge>
      </div>
      <ul>
        {current.conflicts.map((conflict) => <li key={conflict.id}>
          <strong>Unresolved</strong>
          <p>{conflict.summary}</p>
        </li>)}
      </ul>
    </section>}

    <section className="nexus-research-block" aria-labelledby={current.request.id + "-recommendations"}>
      <div className="nexus-research-block-heading">
        <h5 id={current.request.id + "-recommendations"}>Recomendaciones</h5>
        <Badge>Human review required</Badge>
      </div>
      <ul className="nexus-research-recommendation-list">
        {current.recommendations.map((recommendation) => <li key={recommendation.id}>
          <strong>{recommendation.text}</strong>
          <p>{recommendation.rationale}</p>
          <ul>
            {recommendation.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
          </ul>
          <div className="nexus-research-safety">
            <StatusBadge status="neutral">Execution allowed: no</StatusBadge>
            <span>Revisar no equivale a ejecutar.</span>
          </div>
        </li>)}
      </ul>
    </section>

    <section className="nexus-research-review" aria-labelledby={current.request.id + "-review"}>
      <div>
        <h5 id={current.request.id + "-review"}>Revisión humana</h5>
        <p>Estado: <strong>{reviewLabels[current.review.state]}</strong>. La revisión nunca habilita ejecución en V02-027.</p>
        {current.review.note && <p className="nexus-muted">{current.review.note}</p>}
      </div>
      {demoInteractive && <div className="nexus-research-review-actions" role="group" aria-label="Simular revisión humana Demo">
        <Button variant="secondary" onPress={() => performReview("approved_for_follow_up")}>Aprobar seguimiento</Button>
        <Button variant="secondary" onPress={() => performReview("needs_more_evidence")}>Pedir más evidencia</Button>
        <Button variant="secondary" onPress={() => performReview("rejected")}>Rechazar</Button>
      </div>}
      {demoInteractive && <small>Interacción local de Demo: no persiste y no ejecuta cambios.</small>}
    </section>
  </div>;
}
