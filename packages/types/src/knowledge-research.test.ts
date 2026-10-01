import { describe, expect, it } from "vitest";
import type { ProactiveFinding } from "./proactive-findings.js";
import {
  researchRequestFromFinding,
  validateKnowledgeResearchReport,
  type KnowledgeResearchReport,
} from "./knowledge-research.js";

const at = "2026-10-01T12:00:00.000Z";

function report(overrides: Partial<KnowledgeResearchReport> = {}): KnowledgeResearchReport {
  return {
    schemaVersion: "1",
    request: {
      id: "research:1",
      question: "¿Qué documentación ayuda a investigar el patrón sin asumir causalidad?",
      createdAt: at,
      findingId: "finding:1",
      assetId: "ASSET-1",
    },
    sources: [{
      id: "SRC-1",
      title: "Vendor troubleshooting guide",
      publisher: "Example Vendor",
      sourceClass: "vendor_official",
      location: { kind: "external_uri", uri: "https://example.invalid/docs/guide" },
      publishedAt: null,
      updatedAt: null,
      retrievedAt: at,
      contentTrust: "untrusted",
    }],
    claims: [{
      id: "CLAIM-1",
      statement: "El proveedor documenta múltiples categorías posibles para este síntoma.",
      sourceIds: ["SRC-1"],
      supportState: "supported",
      applicability: "Aplicabilidad genérica al producto; no demuestra causa en ASSET-1.",
      localEvidence: false,
    }],
    recommendations: [{
      id: "REC-1",
      text: "Comparar la evidencia local con la guía del proveedor antes de formular una causa.",
      rationale: "La fuente externa aporta categorías de investigación, no evidencia del endpoint.",
      claimIds: ["CLAIM-1"],
      limitations: ["No confirma que ninguna categoría aplique a ASSET-1."],
      humanReviewRequired: true,
      executionAllowed: false,
    }],
    conflicts: [],
    generatedAt: at,
    review: {
      state: "pending",
      reviewedAt: null,
      executionAuthorized: false,
    },
    ...overrides,
  };
}

describe("Knowledge Research Workflow", () => {
  it("acepta un report trazable sin convertir conocimiento externo en evidence local", () => {
    expect(validateKnowledgeResearchReport(report())).toEqual([]);
  });

  it("rechaza recomendaciones que intentan habilitar ejecución automática", () => {
    const input = report({
      recommendations: [{
        ...report().recommendations[0]!,
        executionAllowed: true as false,
      }],
    });
    expect(validateKnowledgeResearchReport(input)).toContainEqual(expect.objectContaining({
      code: "research.recommendation.execution.invalid",
      severity: "error",
    }));
  });

  it("requiere revisión humana en toda recomendación", () => {
    const input = report({
      recommendations: [{
        ...report().recommendations[0]!,
        humanReviewRequired: false as true,
      }],
    });
    expect(validateKnowledgeResearchReport(input)).toContainEqual(expect.objectContaining({
      code: "research.recommendation.review.invalid",
      severity: "error",
    }));
  });

  it("no permite que un claim externo se marque como evidence local", () => {
    const input = report({
      claims: [{
        ...report().claims[0]!,
        localEvidence: true as false,
      }],
    });
    expect(validateKnowledgeResearchReport(input)).toContainEqual(expect.objectContaining({
      code: "research.claim.localEvidence.invalid",
      severity: "error",
    }));
  });

  it("preserva fuentes sintéticas como referencias sin URL real", () => {
    const valid = report({
      sources: [{
        id: "SYN-1",
        title: "Synthetic vendor guidance fixture",
        publisher: "IGX NEXUS Demo",
        sourceClass: "synthetic_fixture",
        location: { kind: "synthetic_reference", reference: "demo-research:vendor-guidance" },
        retrievedAt: at,
        contentTrust: "untrusted",
      }],
      claims: [{
        ...report().claims[0]!,
        sourceIds: ["SYN-1"],
      }],
    });
    expect(validateKnowledgeResearchReport(valid)).toEqual([]);

    const invalid = report({
      sources: [{
        id: "SYN-1",
        title: "Synthetic vendor guidance fixture",
        publisher: "IGX NEXUS Demo",
        sourceClass: "synthetic_fixture",
        location: { kind: "external_uri", uri: "https://fake.example.test/fixture" },
        retrievedAt: at,
        contentTrust: "untrusted",
      }],
      claims: [{
        ...report().claims[0]!,
        sourceIds: ["SYN-1"],
      }],
    });
    expect(validateKnowledgeResearchReport(invalid)).toContainEqual(expect.objectContaining({
      code: "research.source.synthetic.location",
      severity: "error",
    }));
  });

  it("mantiene contradicciones explícitas y no las resuelve por mayoría", () => {
    const input = report({
      sources: [
        report().sources[0]!,
        {
          id: "SRC-2",
          title: "Independent technical bulletin",
          publisher: "Standards Example",
          sourceClass: "standards_body",
          location: { kind: "external_uri", uri: "https://example.invalid/standards/bulletin" },
          retrievedAt: at,
          contentTrust: "untrusted",
        },
      ],
      claims: [
        {
          ...report().claims[0]!,
          id: "CLAIM-1",
          supportState: "contested",
          sourceIds: ["SRC-1", "SRC-2"],
        },
        {
          id: "CLAIM-2",
          statement: "La segunda fuente limita la aplicabilidad del primer claim.",
          sourceIds: ["SRC-2"],
          supportState: "supported",
          applicability: "Contradice la generalización para cierto contexto técnico.",
          localEvidence: false,
        },
      ],
      recommendations: [{
        ...report().recommendations[0]!,
        claimIds: ["CLAIM-1", "CLAIM-2"],
      }],
      conflicts: [{
        id: "CONFLICT-1",
        claimIds: ["CLAIM-1", "CLAIM-2"],
        summary: "Las fuentes difieren sobre la aplicabilidad de la recomendación.",
        resolution: "unresolved",
      }],
    });
    expect(validateKnowledgeResearchReport(input)).toEqual([]);
  });

  it("detecta referencias rotas entre claim, source y recommendation", () => {
    const input = report({
      claims: [{
        ...report().claims[0]!,
        sourceIds: ["MISSING-SOURCE"],
      }],
      recommendations: [{
        ...report().recommendations[0]!,
        claimIds: ["MISSING-CLAIM"],
      }],
    });
    const issues = validateKnowledgeResearchReport(input);
    expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "research.claim.source.missing",
      "research.recommendation.claim.missing",
    ]));
  });

  it("genera una pregunta no causal desde un finding sin mutarlo", () => {
    const finding: ProactiveFinding = {
      id: "nexus.endpoint.repeated-unclean-restart:ASSET-1",
      ruleId: "nexus.endpoint.repeated-unclean-restart",
      ruleVersion: "1",
      assetId: "ASSET-1",
      title: "Reinicios no limpios repetidos",
      summary: "2 reinicios no limpios observados.",
      asOf: at,
      windowDays: 14,
      pattern: { kind: "recurrence", observedCount: 2, threshold: 2, description: "Recurrencia observada." },
      hypothesis: { text: "Requiere investigación.", causal: false },
      confidence: { state: "supported", rationale: "Cobertura suficiente." },
      evidence: [],
      investigationGuidance: [],
    };
    const before = JSON.stringify(finding);
    const request = researchRequestFromFinding(finding, at);
    expect(request.findingId).toBe(finding.id);
    expect(request.assetId).toBe("ASSET-1");
    expect(request.question).toContain("sin asumir");
    expect(JSON.stringify(finding)).toBe(before);
  });
});
