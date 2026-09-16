# Tipos de Dominio Compartidos

`@igx-nexus/types` contiene el **modelo canónico de Technology Intelligence de IGX NEXUS v0.2**.

La regla principal es que el dominio de NEXUS no pertenece a GLPI, Intune, Entra ID ni a otra fuente individual. Los adapters traducen esas fuentes hacia contratos compartidos; los identificadores externos se conservan como evidencia y nunca reemplazan automáticamente la identidad canónica de NEXUS.

## Principios

- **NEXUS identity is canonical.** `TechnologyAsset.id` es independiente de los IDs de origen.
- **Sources remain evidence.** `SourceReference`, `ProvenanceRecord` y `RelationshipEvidence` explican de dónde proviene un claim.
- **Evidence before inference.** Una señal débil puede descubrir candidatos, pero no convierte una inferencia en hecho observado.
- **IT and OT share a platform, not a taxonomy.** `domain`, `assetClass` y `role` son conceptos distintos.
- **Observations are temporal.** Una señal de batería, crash o evento no es un atributo permanente ni un score de CMDB Health.
- **Relationships are claims with evidence.** Una relación canónica conserva dirección, estado, temporalidad y evidencia.
- **Unknown time stays unknown.** En relaciones, `observedAt=null` significa que la fecha del claim no es conocida; nunca se sustituye por `snapshot.asOf`.
- **Authority is not derivation.** `authority` expresa confianza/gobernanza de la fuente; `derivation` distingue `observed`, `normalized`, `inferred` y `manual`.
- **Unresolved evidence is visible.** Referencias aún no reconciliadas pueden generar warnings en vez de ser descartadas.
- **Snapshots are versioned.** `TechnologySnapshot.schemaVersion` permite detectar contratos incompatibles.

## Estructura

- `src/model.ts`: contratos canónicos y catálogos base.
- `src/validation.ts`: validadores puros e invariantes runtime.
- `src/reconciliation.ts`: decisiones de matching, evidencia evaluada, claims por atributo, conflictos y canonical projection.
- `src/taxonomy.ts`: Taxonomy v2 y sus invariantes.
- `src/model.test.ts`: identidad, observaciones, relaciones y snapshots.
- `src/reconciliation.test.ts`: contratos de reconciliación.
- `src/taxonomy.test.ts`: contratos Taxonomy v2.

## Provenance & Reconciliation

V02-009 formalizó reconciliación sin acoplarla a una integración específica:

- `ReconciliationDecision` y `ReconciliationCandidateEvaluation` describen decisión y candidatos;
- `ReconciliationEvidence` conserva regla, fuerza, outcome y razón;
- `AttributeClaim` conserva valor, source record, timestamps, autoridad y evidence;
- `AttributeResolution` conserva claims considerados y la regla que seleccionó el valor canónico;
- `AttributeConflict` representa contradicciones resueltas/no resueltas;
- `CanonicalProjectionResult` agrupa el activo proyectado con resoluciones y conflictos.

`TechnologyAsset.id` no se recalcula por hostname, IP, orden de fuentes ni atributos observados. Candidate discovery, matching y asignación de identidad son responsabilidades distintas.

Ver `docs/reconciliation.md` y `docs/architecture/adr-0019-provenance-reconciliation.md`.

## IT / OT

Taxonomy v2 separa:

```text
domain      -> IT | OT
assetClass  -> familia funcional
role        -> función técnica
assessment -> classified | unknown | unclassified | conflict
```

La forma física de un equipo no determina automáticamente su dominio o función. Los roles extendidos utilizan `custom:<nombre>`.

Ver `docs/taxonomy-v2.md` y `docs/architecture/adr-0020-it-ot-taxonomy-v2.md`.

## Relationship Evidence v2

V02-012 lleva los relationship fixtures de Demo al contrato canónico.

`TechnologyRelationship` conecta exclusivamente IDs canónicos de activos y mantiene:

```text
id
sourceAssetId
targetAssetId
type
direction
status
observedAt: string | null
evidence[]
```

`RelationshipEvidence` mantiene:

```text
source
authority
derivation?
confidence?
observedAt: string | null
evidence?
```

La fecha del `SourceReference` y la fecha del claim relacional son conceptos distintos. Una fuente puede haber sido leída en el corte del snapshot mientras la fecha de la relación sigue siendo desconocida.

Los validators además detectan:

- self-relations;
- dirección incompatible;
- status/direction runtime inválidos;
- evidence vacío;
- confidence inválida;
- derivation inválida;
- timestamps inválidos cuando existen;
- IDs de relación duplicados;
- duplicados semánticos de edges;
- endpoints no presentes como warnings.

Para un edge bidireccional, invertir source/target no crea otra relación canónica. Si varias fuentes respaldan el mismo edge, la dirección futura es combinar evidence sobre el claim, no duplicar el edge.

Ver `docs/architecture/adr-0022-relationship-evidence-v2.md`.

## Compatibilidad de runtime

El package emite ESM compatible con Node (`NodeNext`) e imports relativos `.js`.

Los timestamps conocidos requieren ISO-8601 con timezone y calendario válido. `null` sólo se admite donde el contrato declara explícitamente temporalidad desconocida; no convierte timestamps generales en opcionales.

## Compatibilidad Web

La migración es progresiva, no big-bang.

La Web v0.1 conserva modelos de presentación para Asset/Relationship mientras los adapters proyectan desde contratos canónicos. La fuente de verdad de Demo vive en `packages/demo-data`.

Technology Map 2.0, Asset 360 2.0 y el resto de Product Design evolucionarán en tickets posteriores sin redefinir identidad/evidence.

## Validación

Desde la raíz:

```bash
npm run typecheck --workspace @igx-nexus/types
npm run test --workspace @igx-nexus/types
npm run build --workspace @igx-nexus/types
npm pack --dry-run --workspace @igx-nexus/types
```

El package no contiene secretos, IDs corporativos reales ni integración de red.
