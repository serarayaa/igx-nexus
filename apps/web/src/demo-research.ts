import {
  researchRequestFromFinding,
  type KnowledgeResearchReport,
  type ProactiveFinding,
  type ResearchClaim,
  type ResearchConflict,
} from "@igx-nexus/types";

function sourceId(finding: ProactiveFinding, suffix: string): string {
  return "demo-research:" + finding.ruleId + ":" + suffix;
}

function baseClaims(finding: ProactiveFinding): readonly ResearchClaim[] {
  if (finding.ruleId === "nexus.endpoint.application-instability") {
    return Object.freeze([
      Object.freeze({
        id: sourceId(finding, "claim-context"),
        statement: "Fixture Demo: crashes y hangs repetidos justifican revisar aplicación, versión y eventos temporalmente cercanos antes de formular una causa.",
        sourceIds: [sourceId(finding, "source-guide")],
        supportState: "supported",
        applicability: "Aplica como guía de investigación del escenario sintético; no demuestra una causa en el endpoint.",
        localEvidence: false,
      }),
      Object.freeze({
        id: sourceId(finding, "claim-limit"),
        statement: "Fixture Demo: el research packet no contiene evidencia suficiente para atribuir el patrón a software, hardware o configuración.",
        sourceIds: [sourceId(finding, "source-limitations")],
        supportState: "supported",
        applicability: "Limita explícitamente cualquier conclusión causal del escenario Demo.",
        localEvidence: false,
      }),
    ]);
  }

  if (finding.ruleId === "nexus.endpoint.repeated-unclean-restart") {
    return Object.freeze([
      Object.freeze({
        id: sourceId(finding, "claim-noncausal"),
        statement: "Fixture Demo: un reinicio no limpio describe un resultado observado y no identifica por sí solo pérdida de energía, hardware u otra causa específica.",
        sourceIds: [sourceId(finding, "source-guide")],
        supportState: "supported",
        applicability: "Guía sintética de interpretación para el finding de reinicios.",
        localEvidence: false,
      }),
      Object.freeze({
        id: sourceId(finding, "claim-power"),
        statement: "Fixture contradictorio: atribuir pérdida de energía como explicación principal sólo a partir del reinicio no limpio.",
        sourceIds: [sourceId(finding, "source-community"), sourceId(finding, "source-limitations")],
        supportState: "contested",
        applicability: "Se conserva para demostrar una discrepancia de fuentes; no debe adoptarse como conclusión.",
        localEvidence: false,
      }),
      Object.freeze({
        id: sourceId(finding, "claim-limit"),
        statement: "Fixture Demo: se requiere evidencia local adicional para diferenciar stop-error, apagado abrupto y otras hipótesis.",
        sourceIds: [sourceId(finding, "source-limitations")],
        supportState: "supported",
        applicability: "Limita la interpretación causal del patrón observado.",
        localEvidence: false,
      }),
    ]);
  }

  return Object.freeze([
    Object.freeze({
      id: sourceId(finding, "claim-gap"),
      statement: "Fixture Demo: batería presente sin capacidad porcentual válida representa un gap de evidencia, no una medición de degradación.",
      sourceIds: [sourceId(finding, "source-guide")],
      supportState: "supported",
      applicability: "Aplica al escenario sintético de cobertura de batería.",
      localEvidence: false,
    }),
    Object.freeze({
      id: sourceId(finding, "claim-limit"),
      statement: "Fixture Demo: no corresponde calcular battery health si la fuente no entrega una métrica defendible de capacidad.",
      sourceIds: [sourceId(finding, "source-limitations")],
      supportState: "supported",
      applicability: "Limita las inferencias permitidas por el research packet.",
      localEvidence: false,
    }),
  ]);
}

function conflicts(finding: ProactiveFinding): readonly ResearchConflict[] {
  if (finding.ruleId !== "nexus.endpoint.repeated-unclean-restart") return Object.freeze([]);
  return Object.freeze([
    Object.freeze({
      id: sourceId(finding, "conflict-cause"),
      claimIds: [
        sourceId(finding, "claim-power"),
        sourceId(finding, "claim-noncausal"),
      ],
      summary: "Los fixtures difieren sobre si el síntoma permitiría atribuir una causa eléctrica. NEXUS conserva la discrepancia y no la resuelve automáticamente.",
      resolution: "unresolved",
    }),
  ]);
}

export function createDemoResearchReport(
  finding: ProactiveFinding,
): KnowledgeResearchReport {
  const retrievedAt = finding.asOf;
  const sources = [
    Object.freeze({
      id: sourceId(finding, "source-guide"),
      title: "Fixture Demo · Guía técnica de investigación",
      publisher: "IGX NEXUS Demo",
      sourceClass: "synthetic_fixture" as const,
      location: Object.freeze({
        kind: "synthetic_reference" as const,
        reference: "demo-research:" + finding.ruleId + ":guide",
      }),
      retrievedAt,
      publishedAt: null,
      updatedAt: null,
      contentTrust: "untrusted" as const,
      notes: "Fuente sintética para demostrar provenance y workflow. No representa documentación real de fabricante.",
    }),
    Object.freeze({
      id: sourceId(finding, "source-limitations"),
      title: "Fixture Demo · Nota de limitaciones de evidencia",
      publisher: "IGX NEXUS Demo",
      sourceClass: "synthetic_fixture" as const,
      location: Object.freeze({
        kind: "synthetic_reference" as const,
        reference: "demo-research:" + finding.ruleId + ":limitations",
      }),
      retrievedAt,
      publishedAt: null,
      updatedAt: null,
      contentTrust: "untrusted" as const,
      notes: "Fuente sintética orientada a preservar límites de interpretación.",
    }),
  ];

  if (finding.ruleId === "nexus.endpoint.repeated-unclean-restart") {
    sources.push(Object.freeze({
      id: sourceId(finding, "source-community"),
      title: "Fixture Demo · Aporte comunitario contradictorio",
      publisher: "IGX NEXUS Demo",
      sourceClass: "synthetic_fixture" as const,
      location: Object.freeze({
        kind: "synthetic_reference" as const,
        reference: "demo-research:" + finding.ruleId + ":community-contradiction",
      }),
      retrievedAt,
      publishedAt: null,
      updatedAt: null,
      contentTrust: "untrusted" as const,
      notes: "Fixture deliberadamente contradictorio para demostrar que el workflow conserva desacuerdos.",
    }));
  }

  const claims = baseClaims(finding);
  const claimIds = claims.map((claim) => claim.id);

  return Object.freeze({
    schemaVersion: "1",
    request: researchRequestFromFinding(finding, finding.asOf),
    sources: Object.freeze(sources),
    claims,
    recommendations: Object.freeze([
      Object.freeze({
        id: sourceId(finding, "recommendation"),
        text: "Continuar con investigación humana comparando la evidence local del finding con fuentes técnicas reales autorizadas antes de formular una causa o acción.",
        rationale: "El research packet Demo aporta estructura y límites de interpretación, pero no sustituye evidencia del endpoint ni una fuente externa real.",
        claimIds: Object.freeze(claimIds),
        limitations: Object.freeze([
          "Todos los sources de este packet son fixtures sintéticos.",
          "La recomendación no autoriza remediation, command execution ni cambios sobre el endpoint.",
        ]),
        humanReviewRequired: true,
        executionAllowed: false,
      }),
    ]),
    conflicts: conflicts(finding),
    generatedAt: finding.asOf,
    review: Object.freeze({
      state: "pending",
      reviewedAt: null,
      executionAuthorized: false,
    }),
  });
}
