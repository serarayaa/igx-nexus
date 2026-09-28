# IGX NEXUS v0.2 — Technology Intelligence

Estado: **en desarrollo**. Demo v0.1 permanece cerrada en 13/13 tickets.

## Objetivo

La pregunta de v0.2 es:

> **¿Puede IGX NEXUS convertirse realmente en una plataforma de Technology Intelligence para Innergex?**

v0.2 convierte la prueba de concepto local en una plataforma capaz de integrar fuentes reales de forma segura, conservar procedencia, modelar IT/OT correctamente y producir inteligencia operacional explicable.

El traslado completo a infraestructura corporativa se reserva para **v0.5 — Corporate Infrastructure**. v0.2 debe evitar decisiones que dificulten ese traslado.

Dirección conceptual posterior:

- v0.3 — Intelligence & Automation;
- v0.4 — Product Experience;
- v0.5 — Corporate Infrastructure;
- v0.6 — Cybersecurity Assurance;
- v0.7 — Quality Assurance.

## Principios

1. GLPI continúa como System of Record CMDB/ITAM.
2. NEXUS actúa como Intelligence Layer.
3. Evidence before inference.
4. IT and OT share a platform, not a taxonomy.
5. Human before automation.
6. Every screen must answer an operational question.
7. Jira continúa como Service Desk.
8. No active scanning OT.

## Estado

| Ticket | Nombre | Prioridad | Estado |
| --- | --- | --- | --- |
| V02-001 | Canonical Technology Model | P0 | ✅ Integrado — PR #41 / issue #40 |
| V02-002 | NEXUS API Runtime | P0 | ✅ Integrado — PR #44 / issue #42 |
| V02-003 | API Security Baseline | P0 | ✅ Integrado — PR #47 / issue #46 |
| V02-004 | Provider Mode Contract | P0 | ✅ Integrado — PR #50 / issue #49 |
| V02-005 | GLPI API v2 Adapter | P0 | ✅ Integrado — PR #53 / issue #52 |
| V02-006 | GLPI Service Identity & RBAC | P0 | ✅ Integrado — PR #56 / issue #55 |
| V02-007 | GLPI Agent Live Lab | P0 | ✅ Integrado — PR #59 / issue #58 |
| V02-008 | Live Asset 360 Vertical Slice | P0 | ✅ Integrado — PR #61 / issue #60 |
| V02-009 | Provenance & Reconciliation | P0 | ✅ Integrado — PR #64 / issue #63; housekeeping #65 |
| V02-010 | IT/OT Taxonomy v2 | P0 | ✅ Integrado — PR #67 / issue #66; housekeeping #68 |
| V02-011 | Demo Dataset v0.2 Migration | P0 | ✅ Integrado — PR #70 / merge `45b1adc4`; CI #454 verde |
| V02-012 | Relationship Evidence v2 | P1 | ✅ Integrado — PR #73 / issue #72 / merge `e174700c`; CI #481 verde |
| V02-013 | Product IA & Visual Direction | P0 | ✅ Integrado — PR #76 / issue #75 / merge `fe4ff067`; CI #493 verde |
| V02-014 | Shell & Motion 2.0 | P1 | ✅ Integrado — PR #80 / issue #79 / merge `e650e288`; CI #537 verde |
| V02-015 | Technology Overview | P1 | ✅ Integrado — PR #83 / issue #82 / merge `c30eb25f`; CI #573 verde |
| V02-016 | Asset Explorer 2.0 | P1 | ✅ Integrado — PR #87 / issue #85 / merge `68479fd9`; CI #608 verde |
| V02-017 | Asset 360 2.0 | P1 | ✅ Integrado — PR #90 / issue #89 / merge `4cc6e7b2`; CI #651 verde |
| V02-018 | Technology Map 2.0 | P1 | ✅ Integrado — PR #93 / issue #92 / merge `19ff461d` |
| V02-019 | Analytics Contract Layer | P0 | ✅ Integrado — PR #99 / issue #96 |
| V02-020 | CMDB Quality 2.0 | P1 | ✅ Integrado — PR #103 / issue #102 / merge `7f5d824`; CI #827 verde |
| V02-021 | Lifecycle & Investment | P1 | ⚪ Pendiente |
| V02-022 | IT / OT Intelligence | P1 | ⚪ Pendiente |
| V02-023 | Intune Analytics Feasibility Spike | P0 | ⚪ Pendiente |
| V02-024 | Windows / Dell Lab Telemetry | P1 | ⚪ Pendiente |
| V02-025 | Endpoint Experience | P1 | ⚪ Pendiente |
| V02-026 | Proactive Findings Engine | P2 | ⚪ Pendiente |
| V02-027 | Knowledge Research Workflow | P2 | ⚪ Pendiente |
| V02-028 | Backend & Integration CI | P0 | ⚪ Pendiente |
| V02-029 | v0.2 Demo / Live Lab Readiness | P1 | ⚪ Pendiente |

No abrir todos los tickets futuros por adelantado. Crear issues cuando el alcance esté suficientemente definido.

## Epic 1 — Platform Foundation

### V02-001 — Canonical Technology Model ✅

Lenguaje de dominio compartido con identidad NEXUS, source references, provenance, observations y relaciones.

### V02-002 — NEXUS API Runtime ✅

Runtime Fastify/TypeScript real, health/config/logging/OpenAPI.

### V02-003 — API Security Baseline ✅

Deny-by-default, auth/authz, CORS, headers, rate limiting, límites y audit events.

### V02-004 — Provider Mode Contract ✅

Demo/Live detrás de `TechnologyProvider`, sin condicionales dispersos.

## Epic 2 — Live CMDB / GLPI

### V02-005 — GLPI API v2 Adapter ✅

Adapter GLPI 11 High-Level API v2.3 read-only. El mapping `IT / compute / custom:glpi-computer` de ese ticket es histórico y fue supersedido por Taxonomy v2.

### V02-006 — GLPI Service Identity & RBAC ✅

Identidad técnica OAuth, secretos desacoplados y mínimo privilegio.

### V02-007 — GLPI Agent Live Lab ✅

Inventario autorizado de laboratorio mediante GLPI Agent, sin discovery de red ni OT scanning.

### V02-008 — Live Asset 360 Vertical Slice ✅

```text
endpoint autorizado -> GLPI Agent -> GLPI -> NEXUS API -> NEXUS Web
```

### V02-009 — Provenance & Reconciliation ✅

Baseline:

- candidate discovery separado de matching;
- identificadores por fuerza de evidencia;
- hostname/IP no auto-fusionan CIs;
- `matched`, `not_matched`, `ambiguous`, `conflict`, `manual_review_required`;
- claims/provenance por atributo;
- canonical projection preserva ID del ancla.

ADR-0019 Accepted.

## Epic 3 — IT / OT Model

### V02-010 — IT/OT Taxonomy v2 ✅

Baseline:

- `TechnologyTaxonomyAssessment`;
- estados `classified`, `unknown`, `unclassified`, `conflict`;
- métodos `observed`, `normalized`, `inferred`, `manual`;
- catálogos IT/OT separados;
- `OperationalContextReference`;
- mapping GLPI gobernado;
- hardware genérico no determina IT/OT;
- reconciliation preserva assessment/context.

ADR-0020 Accepted.

### V02-011 — Demo Dataset v0.2 Migration ✅

Integrado mediante PR #70, merge `45b1adc4f4977732f10f707e993588ced368578a`; CI post-merge #454 verde.

Resultado:

- fuente única autorada en `packages/demo-data`;
- 240 CIs como `TechnologyAsset` canónicos;
- Taxonomy v2 válida 240/240;
- provenance/source references y site contexts;
- Web v0.1 consume adapter desde la misma fuente;
- IDs/QR/Health/hero scenarios preservados;
- digest histórico Web preservado;
- aliases pre-v2 retirados del contrato activo;
- 18 relationship fixtures preservados sin adelantar V02-012.

ADR-0021 Accepted.

### V02-012 — Relationship Evidence v2 ✅

Integrado mediante PR #73, merge `e174700cb5af944c622f4899d812eb9c6fb2c261`; issue #72 cerrado; CI post-merge #481 verde.

Resultado:

- 18 relaciones canónicas dentro del snapshot Demo;
- IDs y endpoints históricos preservados;
- `RelationshipEvidence` con source, authority, derivation, confidence y evidence;
- `observedAt=null` representa fecha realmente desconocida y no se sustituye por `snapshot.asOf`;
- separación explícita entre fecha de lectura/registro de la fuente y fecha del claim relacional;
- detección de self-relations, dirección/status inválidos y duplicados semánticos;
- edges bidireccionales consideran A↔B y B↔A la misma semántica;
- Web v0.1 proyecta desde el snapshot canónico y falla explícitamente ante tipos/estados aún no soportados;
- GLPI Live no fabrica relaciones y continúa vacío hasta disponer de una fuente real defendible.

ADR-0022 Accepted.

No introduce discovery activo OT, graph analytics ni inferencia automática de topología.

## Epic 4 — Product Design 2.0

### V02-013 — Product IA & Visual Direction ✅

Integrado mediante PR #76, merge `fe4ff067b60f89645635bd3711e74abb593e3725`; CI post-merge #493 verde.

Resultado:

- arquitectura de información estable entre Demo y Live;
- navegación global separada de navegación contextual;
- Overview definido como superficie de monitoreo que responde **¿Qué requiere atención ahora y por qué?**;
- Assets/Explorer y Technology Map definidos como workspaces de investigación;
- Asset 360 organizado por intención (`Overview`, `Inventory`, `Evidence & Sources`, `Relationships`, `History`);
- Data Quality separada conceptualmente de Device Health;
- Technology Map focus/scope-first con alternativa semántica table/tree;
- QR/Label como acciones contextuales del CI;
- dirección visual técnica, sobria y data-dense cuando corresponde;
- WCAG 2.2 AA incorporado al contrato de producto;
- handoff normativo explícito a V02-014..019.

Documentos normativos:

- `docs/product/product-ia-v2.md`;
- `docs/product/visual-direction-v2.md`;
- `docs/product/screen-purpose-matrix.md`;
- ADR-0023 Product Information Architecture v2 — Accepted.

### V02-014 — Shell & Motion 2.0 ✅

Integrado mediante PR #80, merge `e650e288b47903d6811675aa265ac7f0141f51a7`; CI post-merge #537 verde.

Resultado:

- navegación global separada de anchors contextuales;
- header contextual por view/workspace;
- Demo/Live presentados como contexto de fuente, no como productos distintos;
- Live no cae silenciosamente a Demo;
- preferencias `light | dark` y `comfortable | compact` con persistencia segura;
- fallback de tema a `prefers-color-scheme` cuando no existe elección guardada;
- drawer móvil preserva focus trap, Escape, restore focus, `inert` y bloqueo de scroll;
- responsive reforzado hasta 320 CSS px;
- motion espacial del shell acotado localmente y compatible con reduced motion;
- regresión de contraste detectada por CI y corregida antes del merge;
- sin nuevas dependencias, router nuevo ni cambios de contratos/API/providers/reconciliación/demo-data.

Decisión tecnológica:

- CSS / Design System NEXUS — Adopt;
- Motion for React — Hold para V02-014 / Assess futuro;
- View Transitions API — Assess;
- router adicional — Hold mientras no exista necesidad demostrada.

Documentos:

- `docs/product/shell-motion-v2.md`;
- `docs/product/technology-scan-v02-014.md`.

### V02-015 — Technology Overview ✅

Integrado mediante PR #83, merge `c30eb25fa581f45eafa61c8bf7dd9d23fd7ccfe9`; CI post-merge #573 verde.

Pregunta central: **¿Qué requiere atención ahora y por qué?**

Resultado:

- `#overview` deja el dashboard promocional y adopta triage operacional;
- contexto, alcance y cobertura quedan explícitos;
- lista de atención determinista y explicable, sin convertir señales en un risk score;
- summary facts con denominadores visibles y semántica acotada;
- Demo y Live comparten Overview sin fallback silencioso;
- Live sólo presenta hechos soportados por NEXUS API y comunica cobertura parcial;
- estados loading/error/empty/no-attention/partial coverage quedan diferenciados;
- drill-downs conducen a Assets y Data Quality cuando la superficie existe y es defendible;
- se preservan routing hash, providers, contratos canónicos, dataset Demo y Shell 2.0;
- no se agregan librerías de charts, router nuevo ni analytics framework;
- V02-019 conserva ownership de contratos métricos;
- WCAG 2.2 AA, axe light/dark, 320 CSS px, reflow, High Contrast y reduced motion pasan en CI.

Documento: `docs/product/technology-overview-v2.md`.

Siguiente trabajo: **V02-016 — Asset Explorer 2.0**.

### V02-016 — Asset Explorer 2.0 ✅

Integrado mediante PR #87, merge `68479fd9dd8c45be06a99b0042be83cfba9a2277`; CI post-merge #608 verde.

Pregunta central:

> **¿Qué tecnología existe, bajo qué clasificación/contexto/fuente, y cuál es el CI correcto para investigar?**

Resultado:

- evolución del Explorer existente, sin rewrite;
- facetas canónicas por Domain / Asset Class / Role / Lifecycle;
- refinamiento por source, taxonomy state, review required, compatibility fallback y otras dimensiones con cobertura real;
- facet counts contextuales que evitan opciones imposibles dentro del scope;
- source/context multi-value por membership;
- compatibility projection visible como tal, no como clasificación resuelta;
- tabla data-dense con seis grupos conceptuales;
- Demo conserva legacy compatibility digest mientras consume metadata canónica;
- Live conserva class/role/source/taxonomy metadata ya servida por NEXUS API;
- Operational Context no se inventa cuando el provider no lo expone;
- sin AQL/DSL, data-grid nueva, router nuevo ni backend search service;
- WCAG 2.2 AA, browser tests, reflow, High Contrast y reduced motion pasan en CI.

Documentos:

- `docs/product/asset-explorer-v2.md`;
- `docs/product/technology-scan-v02-016.md`.

Siguiente trabajo: **V02-017 — Asset 360 2.0**.

### V02-017 — Asset 360 2.0 ✅

Integrado mediante PR #90, merge `4cc6e7b25b8e4d1bde56fc7a735be6e81261fcd8`; CI post-merge #651 verde.

Pregunta central:

> **¿Qué es este CI, qué sabemos de él, de dónde lo sabemos y qué requiere atención?**

Resultado:

- navegación contextual deep-linkable: Resumen / Inventario / Evidencia y fuentes / Relaciones;
- header estable fuera del panel y clasificación defendible;
- compatibility scalar projection visible como compatibilidad, no como clasificación confirmada;
- criticidad canónica y Taxonomy v2 reutilizadas desde la proyección existente;
- Operational Context sólo cuando existe cobertura;
- referencias de fuente conservan su propia fecha de observación;
- provenance por atributo/authority/confidence no se inventa cuando la Web no lo transporta;
- calidad CMDB, freshness, lifecycle y futura salud técnica permanecen conceptualmente separadas;
- relaciones incidentes se muestran semánticamente y Technology Map sigue como drill-down;
- Live no recibe QR, Health sintético ni relaciones Demo;
- History permanece fuera hasta existir historia temporal real;
- sin router nuevo, analytics framework ni nuevas integraciones;
- browser/accessibility/reflow/High Contrast/reduced motion pasan en CI.

Documentos:

- `docs/product/asset-360-v2-plan.md`;
- `docs/product/technology-scan-v02-017.md`.

Siguiente trabajo: **V02-018 — Technology Map 2.0**.

### V02-018 — Technology Map 2.0 ✅

Integrado mediante PR #93, merge `19ff461d747ce39375c430f6ba59e0382d3976df`; issue #92 cerrado como completed.

Pregunta central:

> **¿Cómo está conectado este CI dentro de un alcance concreto, qué significan esas relaciones y qué puedo investigar sin confundir conectividad con impacto demostrado?**

Resultado:

- focus CI como home node estable;
- scope explícito por profundidad, tipo y perspectiva;
- state esencial compartible por URL sin router nuevo;
- contexto del CI seleccionado con taxonomy/lifecycle/criticality/source/freshness ya disponibles;
- alternativa semántica equivalente al mapa visual;
- relaciones con source/observedAt/status/dirección explícitos;
- lenguaje evita presentar downstream como impacto causal;
- Demo usa fixtures canónicos; Live comparte IA sin fallback a Demo cuando no existe provider relacional;
- endpoints no resueltos y fechas desconocidas permanecen explícitos;
- sin graph analytics, impact score, edición, discovery ni nueva graph library.

Documentos:

- `docs/product/technology-map-v2-plan.md`;
- `docs/product/technology-scan-v02-018.md`.

V02-019 conserva ownership de métricas y analytics.

Siguiente trabajo: **V02-019 — Analytics Contract Layer**.

## Epic 5 — Technology Analytics

### V02-019 — Analytics Contract Layer ✅

Integrado mediante PR #99 / issue #96.

Pregunta central:

> **¿Cómo define NEXUS una métrica para que su valor, población, denominador, cobertura, fuente, temporalidad y significado sean consistentes y explicables en cualquier superficie?**

Dirección implementada en la rama:

- contrato `MetricDefinition / MetricScope / MetricResult / MetricCoverage` dentro de `@igx-nexus/types`;
- evaluación pura sobre `TechnologySnapshot`, sin nuevo servicio analítico;
- value y measurement coverage separados;
- count sin denominator artificial;
- ratio dimensionless en rango `0..1`;
- unknown / excluded / unavailable diferenciados;
- scope con dimensiones gobernadas;
- Taxonomy dimensions sólo desde assessments `classified`, nunca desde compatibility fallback;
- source dimension preserva `sourceInstanceId` tras AUD-DATA-002;
- cuatro métricas contractuales de referencia;
- CMDB Health histórico permanece sin reinterpretación; V02-020 conserva ownership de su evolución;
- OpenTelemetry/Prometheus usados como referencia de conventions; MetricFlow/Cube quedan Hold;
- sin endpoint/API ornamental mientras no exista consumer real;
- sin warehouse, TSDB, semantic engine, charts ni dashboard nuevo.

Documentos:

- `docs/analytics/metric-contract.md`;
- `docs/product/technology-scan-v02-019.md`;
- ADR-0024 Analytics Contract Layer — Accepted.

### V02-020 — CMDB Quality 2.0 ✅

Integrado mediante PR #103 / issue #102.

Pregunta central:

> **¿Qué tan defendible es la calidad del registro cuando además de campos y relaciones consideramos la evidencia canónica que explica de dónde provienen los datos?**

Dirección:

- conservar el score histórico de CMDB Health sin inventar nuevos pesos corporativos;
- reutilizar `nexus.sources.instance_identity.ratio`;
- incorporar provenance de seis campos canónicos gobernados;
- distinguir conflicto Taxonomy v2 explícito de assessment ausente;
- exponer findings por CI sin confundir gaps de evidencia con Device Health;
- mantener `AttributeConflict` como unavailable mientras no viaje en `TechnologySnapshot`;
- preservar Demo/Live bajo el mismo contrato canónico, sin fallback silencioso;
- no introducir telemetría endpoint, remediation automática ni inferencia de conflictos.

ADR-0025 CMDB Quality 2.0 — Accepted.

Siguiente trabajo: **V02-021 — Lifecycle & Investment**.

### V02-021 — Lifecycle & Investment

Garantía/EOL/EOS/edad/reemplazo a horizontes 3/6/12/24 meses sin inventar presupuesto corporativo.

### V02-022 — IT / OT Intelligence

Vistas/contextos especializados con denominadores y semántica compatibles.

## Epic 6 — Proactive Endpoint Intelligence

### V02-023 — Intune Analytics Feasibility Spike

Verificar datos, permisos/licencias y APIs disponibles antes de diseñar integración definitiva.

### V02-024 — Windows / Dell Lab Telemetry

Event Log, WMI/CIM y Dell Command Monitor read-only en laboratorio. No crear agente NEXUS propio todavía.

### V02-025 — Endpoint Experience

Hangs, crashes, restarts, startup, batería y cohortes con métricas explicables y cobertura explícita.

### V02-026 — Proactive Findings Engine

Evidencia -> patrón -> hipótesis -> confianza. Correlación no se presenta como causalidad.

### V02-027 — Knowledge Research Workflow

Fuentes técnicas confiables y recomendaciones auditables. NEXUS no ejecuta automáticamente comandos obtenidos desde Internet.

## Epic 7 — Hardening / Demo

### V02-028 — Backend & Integration CI

Extender rigor de QA a API, contracts, adapters, auth, integración y seguridad.

### V02-029 — v0.2 Demo / Live Lab Readiness

Cerrar demo/live-lab reproducible, documentación y narrativa de v0.2.

## Fuera de alcance de v0.2

- despliegue corporativo definitivo;
- HA productiva;
- full Intune production rollout;
- active OT scanning;
- remediation autónoma;
- ML/LLM obligatorio;
- rediseño completo de UX más allá de Product Design 2.0 planificado;
- promesas de causalidad no respaldadas.

## Criterio de salida de v0.2

v0.2 debe demostrar que NEXUS puede:

1. integrar Demo y Live con contratos compartidos;
2. conservar evidencia/provenance;
3. reconciliar identidad sin fusionar agresivamente;
4. clasificar IT/OT con incertidumbre explícita;
5. representar relaciones con evidencia;
6. producir UX y analytics útiles;
7. incorporar señales endpoint explicables;
8. mantenerse auditable, seguro y testeable.
