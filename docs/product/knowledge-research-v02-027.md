# V02-027 — Knowledge Research Workflow

Estado: **implementación funcional** · issue #123.

## Pregunta operacional

> **¿Cómo puede NEXUS investigar conocimiento técnico externo para enriquecer un finding, preservando fuente, temporalidad, contradicciones y revisión humana, sin confundir documentación externa con evidencia observada ni ejecutar instrucciones obtenidas desde Internet?**

V02-027 extiende Proactive Findings con una capa de investigación auditable.

No implementa un buscador web genérico, crawler, root-cause engine ni remediation automática.

## Cadena semántica

```text
Local evidence
    ↓
Finding
    ↓
Research question
    ↓
External sources
    ↓
Claims
    ↓
Recommendation
    ↓
Human review
```

Las capas no se fusionan:

- external source != observation;
- research claim != local evidence;
- recommendation != remediation;
- human review != execution authorization.

## Contrato

El contrato vive en `@igx-nexus/types`.

### KnowledgeResearchRequest

Define ID estable, pregunta, `createdAt`, `findingId` opcional y `assetId` opcional.

`researchRequestFromFinding(...)` crea una pregunta investigativa desde un finding sin asumir causalidad ni mutar el finding.

### KnowledgeSource

Conserva ID, título, publisher, source class, location, `retrievedAt`, fechas de publicación/actualización cuando existan, `contentTrust="untrusted"` y notas.

Source classes:

- `vendor_official`;
- `standards_body`;
- `government_or_cert`;
- `project_official`;
- `community`;
- `other`;
- `synthetic_fixture`.

La clase describe procedencia. No transforma automáticamente una fuente en verdad.

### ResearchClaim

Un claim conserva statement, source IDs, support state, applicability, temporal scope opcional y `localEvidence=false`.

Support states:

- `supported`;
- `partially_supported`;
- `contested`;
- `unsupported`;
- `unknown`.

### ResearchConflict

Una contradicción referencia dos o más claims y permanece `resolution = unresolved`.

V02-027 no usa majority vote ni elimina la fuente minoritaria.

### ResearchRecommendation

Toda recomendación requiere:

```text
humanReviewRequired = true
executionAllowed = false
```

Debe enlazar claims, declarar rationale y limitaciones.

### ResearchHumanReview

Estados:

- `pending`;
- `approved_for_follow_up`;
- `needs_more_evidence`;
- `rejected`.

Incluso después de revisión, `executionAuthorized = false`.

`applyResearchReview(...)` produce un nuevo report inmutable y no ejecuta ninguna acción.

## External content como untrusted input

Todo contenido de research se trata como no confiable desde el punto de vista de ejecución.

Una página o documento puede contener comandos, scripts, instrucciones dirigidas a un agente, recomendaciones inseguras, prompts de credenciales o texto tipo "ignore previous instructions".

NEXUS puede representar ese contenido como conocimiento para revisión, pero no debe interpretarlo como instrucción ejecutable.

V02-027 no ejecuta shell o PowerShell, no descarga/ejecuta scripts, no modifica endpoints, no solicita secrets y no realiza remediation.

## Temporalidad

Se diferencian:

- `publishedAt` / `updatedAt`: temporalidad declarada de la fuente;
- `retrievedAt`: cuándo se incorporó al research packet;
- `generatedAt`: cuándo se produjo el research report.

Las fechas desconocidas permanecen `null` o ausentes. No se fabrican fechas.

## Demo

La Demo no finge fuentes externas reales.

Sus sources usan `sourceClass = synthetic_fixture`, `location.kind = synthetic_reference` y `publisher = IGX NEXUS Demo`.

No contienen URLs externas falsas.

Los packets se generan determinísticamente desde cada Proactive Finding.

La regla de reinicios incluye deliberadamente un fixture contradictorio para demostrar que un claim puede ser `contested`, la contradicción se conserva y NEXUS no la resuelve automáticamente.

## Live

Un finding Live no recibe research Demo.

Si no existe un research packet real, la UI muestra **Research packet no disponible**.

La ausencia no significa que no existan causas posibles, que el finding esté resuelto o que no haya documentación externa relevante.

No existe fallback Live → Demo.

## UX

V02-027 se integra dentro de Proactive Findings mediante la acción contextual **Investigar conocimiento**.

El panel presenta:

1. pregunta de investigación;
2. fuentes y provenance;
3. claims y support state;
4. contradicciones;
5. recomendaciones;
6. limitaciones;
7. estado de revisión humana;
8. bloqueo explícito de ejecución.

No se crea una ruta global de buscador web.

### Revisión Demo

La Demo permite simular localmente aprobar seguimiento, pedir más evidencia o rechazar.

La interacción no persiste, no modifica el endpoint, no habilita ejecución y utiliza la transición pura del contrato.

## Guardrails

1. Evidence before inference.
2. External knowledge never replaces local evidence.
3. External content is untrusted input.
4. LLM output is not a source.
5. No fabricated citations.
6. No fabricated publication dates.
7. Contradictions remain visible.
8. Human review is mandatory.
9. Human review never authorizes execution in V02-027.
10. No command execution.
11. No remediation.
12. No script download/autorun.
13. No Live → Demo fallback.
14. No active OT scanning.

## Retrieval

V02-027 define el contrato de salida que un mecanismo futuro de retrieval deberá producir.

En esta versión no se incorpora crawler, scraping masivo, buscador web genérico, agente de navegación autónoma ni vendor API específica.

Esto mantiene separado cómo se obtiene conocimiento de cómo NEXUS lo modela, valida y presenta.

Una integración futura deberá adaptarse a este contrato y no al revés.

## Validación

La suite comprueba source provenance, referencias rotas, synthetic fixtures sin URL falsa, `contentTrust=untrusted`, claims no convertidos en local evidence, contradicción unresolved, human review obligatorio, execution bloqueada, transición inmutable, packets Demo deterministas y Live sin fallback.

## Fuera de alcance

- root-cause analysis;
- automatic web search;
- crawling;
- remediation;
- command execution;
- auto-run de scripts;
- ticket automation;
- SIEM/SOAR;
- agentic remediation;
- ML/LLM diagnosis obligatorio;
- secrets management para research providers.
