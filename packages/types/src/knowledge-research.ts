import type { ProactiveFinding } from "./proactive-findings.js";
import { isIsoTimestamp } from "./validation.js";

export const knowledgeResearchSchemaVersion = "1" as const;
export type KnowledgeResearchSchemaVersion = typeof knowledgeResearchSchemaVersion;

export const knowledgeSourceClasses = [
  "vendor_official",
  "standards_body",
  "government_or_cert",
  "project_official",
  "community",
  "other",
  "synthetic_fixture",
] as const;
export type KnowledgeSourceClass = (typeof knowledgeSourceClasses)[number];

export const researchClaimSupportStates = [
  "supported",
  "partially_supported",
  "contested",
  "unsupported",
  "unknown",
] as const;
export type ResearchClaimSupportState = (typeof researchClaimSupportStates)[number];

export const researchReviewStates = [
  "pending",
  "approved_for_follow_up",
  "needs_more_evidence",
  "rejected",
] as const;
export type ResearchReviewState = (typeof researchReviewStates)[number];

export type KnowledgeSourceLocation =
  | {
      readonly kind: "external_uri";
      readonly uri: string;
    }
  | {
      readonly kind: "synthetic_reference";
      readonly reference: string;
    };

export interface KnowledgeResearchRequest {
  readonly id: string;
  readonly question: string;
  readonly createdAt: string;
  readonly findingId?: string;
  readonly assetId?: string;
}

export interface KnowledgeSource {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly sourceClass: KnowledgeSourceClass;
  readonly location: KnowledgeSourceLocation;
  readonly retrievedAt: string;
  readonly publishedAt?: string | null;
  readonly updatedAt?: string | null;
  readonly contentTrust: "untrusted";
  readonly notes?: string;
}

export interface ResearchClaim {
  readonly id: string;
  readonly statement: string;
  readonly sourceIds: readonly string[];
  readonly supportState: ResearchClaimSupportState;
  readonly applicability: string;
  readonly temporalScope?: string;
  readonly localEvidence: false;
}

export interface ResearchRecommendation {
  readonly id: string;
  readonly text: string;
  readonly rationale: string;
  readonly claimIds: readonly string[];
  readonly limitations: readonly string[];
  readonly humanReviewRequired: true;
  readonly executionAllowed: false;
}

export interface ResearchConflict {
  readonly id: string;
  readonly claimIds: readonly string[];
  readonly summary: string;
  readonly resolution: "unresolved";
}

export interface ResearchHumanReview {
  readonly state: ResearchReviewState;
  readonly reviewedAt: string | null;
  readonly note?: string;
  readonly executionAuthorized: false;
}

export interface KnowledgeResearchReport {
  readonly schemaVersion: KnowledgeResearchSchemaVersion;
  readonly request: KnowledgeResearchRequest;
  readonly sources: readonly KnowledgeSource[];
  readonly claims: readonly ResearchClaim[];
  readonly recommendations: readonly ResearchRecommendation[];
  readonly conflicts: readonly ResearchConflict[];
  readonly generatedAt: string;
  readonly review: ResearchHumanReview;
}

export type KnowledgeResearchValidationSeverity = "error" | "warning";

export interface KnowledgeResearchValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly severity: KnowledgeResearchValidationSeverity;
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function validExternalUri(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

function duplicateIds(values: readonly { readonly id: string }[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) duplicates.add(value.id);
    seen.add(value.id);
  }
  return [...duplicates].sort();
}

export function validateKnowledgeResearchReport(
  report: KnowledgeResearchReport,
): readonly KnowledgeResearchValidationIssue[] {
  const issues: KnowledgeResearchValidationIssue[] = [];
  const error = (code: string, path: string, message: string) =>
    issues.push({ code, path, message, severity: "error" });
  const warning = (code: string, path: string, message: string) =>
    issues.push({ code, path, message, severity: "warning" });

  if (report.schemaVersion !== knowledgeResearchSchemaVersion) {
    error("research.schema.unsupported", "schemaVersion", "Knowledge Research requiere schemaVersion 1.");
  }

  if (!nonEmpty(report.request.id)) error("research.request.id.empty", "request.id", "El request requiere un ID estable.");
  if (!nonEmpty(report.request.question)) error("research.request.question.empty", "request.question", "La pregunta de investigación no puede estar vacía.");
  if (!isIsoTimestamp(report.request.createdAt)) error("research.request.createdAt.invalid", "request.createdAt", "createdAt debe ser un timestamp ISO válido.");
  if (!isIsoTimestamp(report.generatedAt)) error("research.generatedAt.invalid", "generatedAt", "generatedAt debe ser un timestamp ISO válido.");

  for (const collection of [
    ["sources", report.sources],
    ["claims", report.claims],
    ["recommendations", report.recommendations],
    ["conflicts", report.conflicts],
  ] as const) {
    for (const id of duplicateIds(collection[1])) {
      error("research.id.duplicate", collection[0], "ID duplicado: " + id + ".");
    }
  }

  const sourceIds = new Set(report.sources.map((source) => source.id));
  const claimIds = new Set(report.claims.map((claim) => claim.id));

  report.sources.forEach((source, index) => {
    const path = "sources[" + index + "]";
    if (!nonEmpty(source.id)) error("research.source.id.empty", path + ".id", "La fuente requiere ID.");
    if (!nonEmpty(source.title)) error("research.source.title.empty", path + ".title", "La fuente requiere título.");
    if (!nonEmpty(source.publisher)) error("research.source.publisher.empty", path + ".publisher", "La fuente requiere publisher.");
    if (!knowledgeSourceClasses.includes(source.sourceClass)) error("research.source.class.invalid", path + ".sourceClass", "Clase de fuente no soportada.");
    if (source.contentTrust !== "untrusted") error("research.source.trust.invalid", path + ".contentTrust", "Todo contenido externo/sintético de research se trata como untrusted.");
    if (!isIsoTimestamp(source.retrievedAt)) error("research.source.retrievedAt.invalid", path + ".retrievedAt", "retrievedAt debe ser ISO válido.");
    if (source.publishedAt !== undefined && source.publishedAt !== null && !isIsoTimestamp(source.publishedAt)) {
      error("research.source.publishedAt.invalid", path + ".publishedAt", "publishedAt debe ser ISO válido o null.");
    }
    if (source.updatedAt !== undefined && source.updatedAt !== null && !isIsoTimestamp(source.updatedAt)) {
      error("research.source.updatedAt.invalid", path + ".updatedAt", "updatedAt debe ser ISO válido o null.");
    }

    if (source.sourceClass === "synthetic_fixture") {
      if (source.location.kind !== "synthetic_reference") {
        error("research.source.synthetic.location", path + ".location", "Una fuente synthetic_fixture no puede presentarse como URL externa real.");
      }
    } else if (source.location.kind !== "external_uri") {
      error("research.source.external.location", path + ".location", "Una fuente no sintética requiere URI externa.");
    } else if (!validExternalUri(source.location.uri)) {
      error("research.source.uri.invalid", path + ".location.uri", "La URI externa debe usar http/https y ser válida.");
    }
  });

  report.claims.forEach((claim, index) => {
    const path = "claims[" + index + "]";
    if (!nonEmpty(claim.id)) error("research.claim.id.empty", path + ".id", "El claim requiere ID.");
    if (!nonEmpty(claim.statement)) error("research.claim.statement.empty", path + ".statement", "El claim no puede estar vacío.");
    if (!nonEmpty(claim.applicability)) error("research.claim.applicability.empty", path + ".applicability", "El claim debe declarar aplicabilidad.");
    if (!researchClaimSupportStates.includes(claim.supportState)) {
      error("research.claim.supportState.invalid", path + ".supportState", "Estado de soporte no soportado.");
    }
    if (claim.localEvidence !== false) error("research.claim.localEvidence.invalid", path + ".localEvidence", "Un research claim externo nunca se convierte en evidence local.");
    if (claim.sourceIds.length === 0) error("research.claim.sources.empty", path + ".sourceIds", "Todo claim debe enlazar al menos una fuente.");
    for (const sourceId of claim.sourceIds) {
      if (!sourceIds.has(sourceId)) error("research.claim.source.missing", path + ".sourceIds", "Fuente inexistente: " + sourceId + ".");
    }
    if (claim.supportState === "contested" && new Set(claim.sourceIds).size < 2) {
      warning("research.claim.contested.single_source", path + ".sourceIds", "Un claim contested debería conservar al menos dos fuentes independientes que permitan mostrar la discrepancia.");
    }
  });

  report.recommendations.forEach((recommendation, index) => {
    const path = "recommendations[" + index + "]";
    if (!nonEmpty(recommendation.id)) error("research.recommendation.id.empty", path + ".id", "La recomendación requiere ID.");
    if (!nonEmpty(recommendation.text)) error("research.recommendation.text.empty", path + ".text", "La recomendación no puede estar vacía.");
    if (!nonEmpty(recommendation.rationale)) error("research.recommendation.rationale.empty", path + ".rationale", "La recomendación requiere rationale.");
    if (recommendation.humanReviewRequired !== true) error("research.recommendation.review.invalid", path + ".humanReviewRequired", "Toda recomendación requiere revisión humana.");
    if (recommendation.executionAllowed !== false) error("research.recommendation.execution.invalid", path + ".executionAllowed", "V02-027 nunca autoriza ejecución automática.");
    if (recommendation.claimIds.length === 0) error("research.recommendation.claims.empty", path + ".claimIds", "Toda recomendación debe enlazar claims.");
    for (const claimId of recommendation.claimIds) {
      if (!claimIds.has(claimId)) error("research.recommendation.claim.missing", path + ".claimIds", "Claim inexistente: " + claimId + ".");
    }
  });

  report.conflicts.forEach((conflict, index) => {
    const path = "conflicts[" + index + "]";
    if (conflict.resolution !== "unresolved") error("research.conflict.resolution.invalid", path + ".resolution", "V02-027 conserva contradicciones como unresolved.");
    if (new Set(conflict.claimIds).size < 2) error("research.conflict.claims.insufficient", path + ".claimIds", "Un conflicto requiere al menos dos claims.");
    for (const claimId of conflict.claimIds) {
      if (!claimIds.has(claimId)) error("research.conflict.claim.missing", path + ".claimIds", "Claim inexistente: " + claimId + ".");
    }
  });

  if (!researchReviewStates.includes(report.review.state)) {
    error("research.review.state.invalid", "review.state", "Estado de revisión no soportado.");
  }
  if (report.review.executionAuthorized !== false) {
    error("research.review.execution.invalid", "review.executionAuthorized", "Human review no autoriza ejecución en V02-027.");
  }
  if (report.review.state === "pending" && report.review.reviewedAt !== null) {
    warning("research.review.pending.timestamp", "review.reviewedAt", "Un review pending normalmente no debería tener reviewedAt.");
  }
  if (report.review.state !== "pending" && report.review.reviewedAt === null) {
    error("research.review.timestamp.required", "review.reviewedAt", "Un review decidido requiere reviewedAt.");
  }
  if (report.review.reviewedAt !== null && !isIsoTimestamp(report.review.reviewedAt)) {
    error("research.review.reviewedAt.invalid", "review.reviewedAt", "reviewedAt debe ser ISO válido o null.");
  }

  return Object.freeze(issues);
}

export function researchRequestFromFinding(
  finding: ProactiveFinding,
  createdAt: string,
): KnowledgeResearchRequest {
  if (!isIsoTimestamp(createdAt)) throw new Error("createdAt must be a valid ISO timestamp.");
  return Object.freeze({
    id: "research:" + finding.id,
    question: "¿Qué conocimiento técnico externo puede ayudar a investigar \"" + finding.title + "\" en " + finding.assetId + ", sin asumir que el patrón observado demuestra una causa específica?",
    createdAt,
    findingId: finding.id,
    assetId: finding.assetId,
  });
}


export function applyResearchReview(
  report: KnowledgeResearchReport,
  decision: Exclude<ResearchReviewState, "pending">,
  reviewedAt: string,
  note?: string,
): KnowledgeResearchReport {
  if (!isIsoTimestamp(reviewedAt)) throw new Error("reviewedAt must be a valid ISO timestamp.");
  const nextReview: ResearchHumanReview = Object.freeze({
    state: decision,
    reviewedAt,
    ...(note?.trim() ? { note: note.trim() } : {}),
    executionAuthorized: false,
  });
  return Object.freeze({
    ...report,
    review: nextReview,
  });
}
