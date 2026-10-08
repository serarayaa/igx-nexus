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
- **Metric value is not metric coverage.** V02-019 separa el resultado analítico de la cobertura de evidencia, con numerador, denominador y población explícitos.

## Estructura

- `src/model.ts`: contratos canónicos y catálogos base.
- `src/validation.ts`: validadores puros e invariantes runtime.
- `src/reconciliation.ts`: decisiones de matching, evidencia evaluada, claims por atributo, conflictos y canonical projection.
- `src/taxonomy.ts`: Taxonomy v2 y sus invariantes.
- `src/analytics.ts`: definiciones métricas, scope/dimensiones, coverage y evaluador puro sobre `TechnologySnapshot`.
- `src/model.test.ts`: identidad, observaciones, relaciones y snapshots.
- `src/reconciliation.test.ts`: contratos de reconciliación.
- `src/taxonomy.test.ts`: contratos Taxonomy v2.
- `src/analytics.test.ts`: invariantes de métricas, denominadores, coverage, unknown y scopes.

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

## Analytics Contract Layer

V02-019 incorpora métricas como contrato semántico reutilizable, no como widgets ni como un backend analítico nuevo.

Cada `MetricDefinition` declara:

- identidad/version estable;
- tipo de valor y unidad;
- población;
- semántica de numerador y denominador;
- base temporal;
- evidencia requerida;
- dimensiones permitidas.

Cada `MetricResult` conserva por separado:

- `value`;
- `numerator` / `denominator`;
- población snapshot/scoped/eligible/excluded/unknown;
- `coverage.state`, ratio y razón;
- `asOf` y scope normalizado.

Las métricas ratio usan unidad base `1` y valores entre 0 y 1. La UI puede presentarlas como porcentaje sin alterar el contrato.

Dimensiones Taxonomy (`domain`, `assetClass`, `role`) sólo exponen decisiones `classified`. Los scalars de compatibility projection nunca se convierten en clasificación analítica. La dimensión `source` conserva `sourceInstanceId` mediante `metricSourceDimensionKey()`, una tupla JSON collision-safe (por ejemplo `["glpi","glpi-primary"]`) para no colapsar instalaciones distintas tras AUD-DATA-002. Operational Context usa el mismo principio con `metricOperationalContextDimensionKey()`.

Métricas de referencia iniciales:

- `nexus.inventory.assets.count`;
- `nexus.taxonomy.resolved.ratio`;
- `nexus.sources.instance_identity.ratio`;
- `nexus.lifecycle.known.ratio`.

El score histórico de CMDB Health permanece fuera de esta migración; V02-020 es dueño de su evolución.

Ver `docs/analytics/metric-contract.md` y ADR-0024.

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

## Hardware & Peripherals Contracts V2 — V03-CMDB-02 / PR 1

`hardware.ts` exporta `HardwareInventoryV2`, `ProcessorV2`, `MemoryModuleV2`,
`PhysicalStorageDeviceV2`, `LogicalVolumeV2`, `DetectedPeripheralV2` y
`ObservedPeripheralConnectionV2`. `hardware-validation.ts` proporciona
`validateHardwareInventoryV2(unknown)` y devuelve los `ValidationIssue` existentes.

Es un contrato complementario con `contractVersion="2"` y `assetId` canónico.
No altera `TechnologySnapshot.schemaVersion="0.2"`, TechnologyAsset, HTTP,
providers ni consumidores. Su transporte e integración quedan para PR 2.

- Las seis secciones discriminan `complete`, `partial` (gaps no vacíos con
  fieldPath/reason), `unavailable` (reason), `not_applicable` y `not_requested`.
- Complete y partial incluyen `HardwareAcquisitionV2`: collectedAt, observedAt
  original nullable y sourceReferences con al menos una fuente válida. Estos
  metadatos son obligatorios incluso con items=[] y no crean provenance ficticia.
- Complete expresa cobertura completa de la colección solicitada, no conocimiento
  de cada propiedad. Una colección vacía completa representa cero observado.
  Partial debe señalar capacidades, campos o páginas faltantes. No disponible
  no equivale a una colección vacía.
- Los motivos gobernados son `not_observed`, `unsupported`, `unauthorized`,
  `not_implemented`, `source_error` y `pagination_incomplete`.
- Los campos desconocidos son `null`; arrays vacíos significan ausencia de
  identificadores disponibles. Cada registro exige al menos una SourceReference
  válida o un ProvenanceRecord válido con fuente explícita; la evidencia de sección
  no sustituye esta procedencia del registro. Una fuente manual usa source=manual
  y observedAt=null si la observación original se desconoce. `other` significa un valor conocido
  fuera del catálogo; no sustituye desconocido. No se generan defaults.
- Capacidad y espacio disponible usan bytes enteros no negativos y seguros en
  JavaScript. Frecuencia conserva unidad Hz/MHz/GHz; velocidad RAM MT/s o MHz
  según evidencia, sin conversión que asuma doble transferencia.
- DDR3/DDR4 no se colapsan. Medio, protocolo, interfaz y formato de almacenamiento
  son ejes diferentes. M.2 es válido tanto para SATA/ATA como PCIe/NVMe.
- Volúmenes pueden referenciar varios dispositivos físicos. Mapping null es
  desconocido; [] es ausencia explícita de backing físico informado.
- componentId/volumeId sólo se asignan con evidencia estable; null admite
  múltiples componentes idénticos sin fusionarlos. Seriales usan AssetIdentifier
  (serial_number); no hay un segundo modelo de identificadores.
- detectionId sirve para correlacionar detección y conexión dentro del inventario;
  puede ser null si no existe correlación defendible. Null no genera referencias,
  matches por similitud ni fusión de dispositivos. Una conexión con detectionId=null
  permanece observada pero no vinculada. Un ID conocido debe venir de evidencia
  fuente, nunca de posición en lista. No demuestra
  identidad física estable entre recopilaciones. managedAssetId es nullable y
  requiere reconciliación explícita por el futuro adapter.
- Conexiones son claims de inventario periódico, no conectividad en tiempo real.
- collectedAt es recopilación; observedAt es observación original conocida o null.
  SourceReference.observedAt mantiene su semántica actual de fuente/registro.
  ProvenanceRecord se reutiliza sin cambio y se valida mediante el export aditivo
  validateProvenanceRecord. Si se desconoce la fecha original, no se fabrica un
  ProvenanceRecord fechado: se conservan referencias de fuente y observedAt=null.
- fieldPath en provenance es relativo al registro. No duplicar evidencia en cada
  propiedad: un record puede cubrir varias propiedades; provenance sólo cuando
  se necesita la trazabilidad por atributo.
- Referencias ausentes son errores cuando la sección destino es completa y
  warnings cuando su cobertura es parcial/no disponible/no solicitada.
  La validación reúne los IDs antes de resolver referencias y no asigna identidad.

Pruebas: `npm run test --workspace @igx-nexus/types -- src/hardware.test.ts`.
Los fixtures son exclusivamente sintéticos y están junto al validador.

PR 2 debe definir normalización de unidades originales de GLPI, claves de
componentes respaldadas por evidencia, paginación, clasificación de errores y
mapping periférico → activo administrado. No inferir observación original desde
hora de consulta ni inventar identidad si sólo existe un índice de colección.
No se implementan transporte, persistencia, historial, UI ni Printer 360 aquí.
