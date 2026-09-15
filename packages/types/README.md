# Tipos de Dominio Compartidos

`@igx-nexus/types` contiene el **modelo canónico de Technology Intelligence de IGX NEXUS v0.2**.

La regla principal es que el dominio de NEXUS no pertenece a GLPI, Intune, Entra ID ni a otra fuente individual. Los adapters traducen esas fuentes hacia contratos compartidos; los identificadores externos se conservan como evidencia y nunca reemplazan automáticamente la identidad canónica de NEXUS.

## Principios

- **NEXUS identity is canonical.** `TechnologyAsset.id` es independiente de los IDs de origen.
- **Sources remain evidence.** `SourceReference` y `ProvenanceRecord` permiten explicar de dónde proviene un dato.
- **Evidence before inference.** Una señal débil puede descubrir candidatos, pero no justifica por sí sola una fusión automática.
- **IT and OT share a platform, not a taxonomy.** `domain`, `assetClass` y `role` son conceptos distintos.
- **Observations are temporal.** Una señal de batería, crash o evento no es un atributo permanente ni un score de CMDB Health.
- **Relationships require evidence.** Una relación canónica conserva dirección, estado, tiempo y evidencia.
- **Unresolved evidence is visible.** Los validadores pueden producir warnings para referencias aún no reconciliadas en lugar de ocultarlas.
- **Snapshots are versioned.** `TechnologySnapshot.schemaVersion` permite detectar contratos incompatibles antes de interpretar datos.

## Estructura

- `src/model.ts`: contratos canónicos y catálogos base.
- `src/validation.ts`: validadores puros e invariantes runtime.
- `src/reconciliation.ts`: decisiones de matching, evidencia evaluada, claims por atributo, conflictos y canonical projection.
- `src/model.test.ts`: casos IT/OT, fuentes múltiples, observaciones, relaciones y snapshots.
- `src/reconciliation.test.ts`: validación contractual de V02-009.

## Provenance & Reconciliation

V02-009 extiende el package de forma aditiva con contratos que permiten explicar una reconciliación sin acoplarla a GLPI o a una integración futura específica:

- `ReconciliationDecision` y `ReconciliationCandidateEvaluation` describen la decisión final y cada candidato evaluado;
- `ReconciliationEvidence` conserva regla, fuerza, outcome, razón y fuentes implicadas sin duplicar el valor crudo del identificador dentro de la explicación;
- `AttributeClaim` conserva valor, source record, timestamps, autoridad y evidence;
- `AttributeResolution` conserva todos los claims considerados y la regla que seleccionó el valor canónico;
- `AttributeConflict` representa contradicciones resueltas o aún no resueltas;
- `CanonicalProjectionResult` agrupa el activo proyectado con sus resoluciones y conflictos auditables.

Los resultados admitidos distinguen `matched`, `not_matched`, `ambiguous`, `conflict` y `manual_review_required`. La reconciliación efectiva se implementa fuera de este package, en la capa de dominio de NEXUS API; aquí sólo viven contratos compartidos y validadores.

`TechnologyAsset.id` no se recalcula por hostname, IP, orden de fuentes o atributos observados. El matching y la asignación inicial de identidad son responsabilidades separadas.

Ver `docs/reconciliation.md` y `docs/architecture/adr-0019-provenance-reconciliation.md`.

## IT / OT

La clasificación es deliberadamente independiente de las clases físicas de GLPI. Por ejemplo:

```text
OT
└─ control
   └─ plc
```

puede ser adaptado posteriormente a la representación soportada por GLPI sin convertir `Peripheral`, `Computer` u otra clase GLPI en la semántica del producto.

Los roles conocidos son una base, no una lista exhaustiva. Extensiones justificadas utilizan el namespace `custom:<nombre>` para impedir strings arbitrarios silenciosos.

`TechnologyRelationship` conecta activos tecnológicos canónicos. Sitios y ubicaciones no se falsifican como activos para poder usar una relación; su modelo se resolverá explícitamente cuando corresponda.

## Compatibilidad de runtime

El package emite ESM compatible con Node (`NodeNext`) y utiliza imports relativos con extensión `.js`. El objetivo es que los mismos contratos puedan ser consumidos posteriormente por NEXUS API y adapters sin depender de la resolución especial del bundler Web.

Los timestamps aceptados por los validadores requieren ISO-8601 con timezone explícita y calendario válido; no se confía sólo en la normalización permisiva de `Date.parse`.

## Compatibilidad con v0.1

Las extensiones v0.2 son **aditivas**. No reemplazan todavía:

- `apps/web/src/asset-model.ts`;
- el dataset sintético v0.1;
- Relationship Graph;
- CMDB Health;
- Dashboard / Explorer / QR.

Asset Explorer y Asset 360 ya disponen de un vertical Live V02-008 detrás de NEXUS API. La migración completa de la experiencia 2.0 y del dataset Demo continuará en tickets posteriores.

## Validación

Desde la raíz:

```bash
npm run typecheck --workspace @igx-nexus/types
npm run test --workspace @igx-nexus/types
npm run build --workspace @igx-nexus/types
npm pack --dry-run --workspace @igx-nexus/types
```

El script de tests ejecuta todos los `src/*.test.ts`, por lo que los contratos de reconciliación forman parte efectiva de CI.

El package no contiene secretos, IDs corporativos reales ni integración de red.