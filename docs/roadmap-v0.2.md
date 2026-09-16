# IGX NEXUS v0.2 — Technology Intelligence

Estado: **iniciado**. La Demo v0.1 permanece cerrada en 13/13 tickets y no se reabre mediante este roadmap.

## Objetivo

La pregunta de v0.2 es:

> **¿Puede IGX NEXUS convertirse realmente en una plataforma de Technology Intelligence para Innergex?**

v0.2 convierte la prueba de concepto local en una plataforma capaz de integrar fuentes reales de forma segura, conservar procedencia, modelar IT/OT correctamente y producir inteligencia operacional explicable.

El despliegue/hardening corporativo completo se reserva para **v0.3 — Corporate Deployment**. v0.2 debe, sin embargo, evitar decisiones que impidan ese traslado: secretos fuera del código, configuración por entorno, servicios desacoplados y arquitectura desplegable.

## Principios

1. GLPI continúa como System of Record CMDB/ITAM.
2. NEXUS actúa como Intelligence Layer, no como segunda CMDB.
3. Evidence before inference.
4. IT and OT share a platform, not a taxonomy.
5. Human before automation.
6. Every screen must answer an operational question.
7. Jira continúa como Service Desk y queda fuera del alcance funcional de NEXUS.

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
| V02-010 | IT/OT Taxonomy v2 | P0 | 🟡 En revisión — issue #66 / PR #67 |
| V02-011 | Demo Dataset v0.2 Migration | P0 | ⚪ Pendiente |
| V02-012 | Relationship Evidence v2 | P1 | ⚪ Pendiente |
| V02-013 | Product IA & Visual Direction | P0 | ⚪ Pendiente |
| V02-014 | Shell & Motion 2.0 | P1 | ⚪ Pendiente |
| V02-015 | Technology Overview | P1 | ⚪ Pendiente |
| V02-016 | Asset Explorer 2.0 | P1 | ⚪ Pendiente |
| V02-017 | Asset 360 2.0 | P1 | ⚪ Pendiente |
| V02-018 | Technology Map 2.0 | P1 | ⚪ Pendiente |
| V02-019 | Analytics Contract Layer | P0 | ⚪ Pendiente |
| V02-020 | CMDB Quality 2.0 | P1 | ⚪ Pendiente |
| V02-021 | Lifecycle & Investment | P1 | ⚪ Pendiente |
| V02-022 | IT / OT Intelligence | P1 | ⚪ Pendiente |
| V02-023 | Intune Analytics Feasibility Spike | P0 | ⚪ Pendiente |
| V02-024 | Windows / Dell Lab Telemetry | P1 | ⚪ Pendiente |
| V02-025 | Endpoint Experience | P1 | ⚪ Pendiente |
| V02-026 | Proactive Findings Engine | P2 | ⚪ Pendiente |
| V02-027 | Knowledge Research Workflow | P2 | ⚪ Pendiente |
| V02-028 | Backend & Integration CI | P0 | ⚪ Pendiente |
| V02-029 | v0.2 Demo / Live Lab Readiness | P1 | ⚪ Pendiente |

Los nombres y dependencias posteriores pueden refinarse cuando la evidencia de integración real lo justifique. Crear tickets sólo cuando su alcance esté suficientemente definido; no abrir 29 issues por adelantado para aparentar progreso.

## Epic 1 — Platform Foundation

### V02-001 — Canonical Technology Model

Objetivo: crear el lenguaje de dominio compartido de v0.2 con identidad canónica, IT/OT, source references, provenance, observations y relaciones con evidencia.

Dependencias: v0.1 cerrada.

Resultado integrado: `@igx-nexus/types` compilable, validado y documentado mediante PR #41.

### V02-002 — NEXUS API Runtime

Objetivo: convertir `services/api` en un servicio real con health endpoint, configuración, logging, contratos HTTP y OpenAPI.

Dependencias: V02-001 ✅.

Resultado integrado: issue #42 cerrado mediante PR #44; runtime incorporado a `main` en el merge `7eede47465da03019c78465837dbde2c3bad3c96`.

### V02-003 — API Security Baseline

Objetivo: definir autenticación/autorización de frontera, manejo seguro de configuración, permisos, auditoría y controles HTTP antes de conectar fuentes reales.

Dependencias: V02-002 ✅.

Resultado integrado: issue #46 cerrado mediante PR #47; baseline incorporado a `main` en el merge `900540033a0b0ff62bd4be1edcb52bcf6fb7ef97`; CI post-merge #175 verde.

### V02-004 — Provider Mode Contract

Objetivo: permitir Demo sintética y Live Lab mediante los mismos contratos, sin dispersar condicionales `if demo` por la aplicación.

Dependencias: V02-001 / V02-002 / V02-003 ✅.

Resultado integrado: issue #49 cerrado mediante PR #50; Provider Mode incorporado a `main` en el merge `70ae174d53ea09df5123ab136b849745200f4b11`; CI post-merge #204 verde.

## Epic 2 — Live CMDB / GLPI

### V02-005 — GLPI API v2 Adapter

Objetivo: incorporar el primer adapter Live read-only de GLPI 11 High-Level REST API detrás de `TechnologyProvider`, normalizando registros reales al dominio NEXUS sin acceso directo a MariaDB ni acoplar la Web a GLPI.

Dependencias: V02-001 / V02-002 / V02-003 / V02-004 ✅.

Resultado integrado: issue #52 cerrado mediante PR #53; adapter incorporado a `main` en el merge `10acf2533877b19a261d8f5291e90269df2014e8`; CI post-merge #247 verde; housekeeping PR #54 y CI #249 verdes.

Nota histórica: V02-005 integró deliberadamente el mapping conservador `IT / compute / custom:glpi-computer`. V02-010 lo refina mediante assessment taxonómico v2, estados de incertidumbre y mappings explícitos. Esta sección conserva el resultado histórico del ticket, no la semántica vigente.

### V02-006 — GLPI Service Identity & RBAC

Objetivo: incorporar la identidad técnica OAuth y el baseline de mínimo privilegio que permiten al runtime Live autenticarse contra GLPI sin introducir secretos en el dominio ni en `ApiConfig`.

Dependencias: V02-005 ✅.

Resultado integrado: issue #55 cerrado mediante PR #56; identidad GLPI y baseline RBAC incorporados a `main` en el merge `1ea04772fd4fa57e956f7797b2cb298730bad5bc`; CI post-merge #275 verde.

### V02-007 — GLPI Agent Live Lab

Objetivo: comprobar de forma controlada que uno a tres endpoints autorizados pueden inventariarse mediante GLPI Agent y llegar a GLPI sin ampliar la prueba a discovery de red, administración remota, despliegue masivo u OT.

Dependencias: V02-005 / V02-006 ✅.

Resultado integrado: issue #58 cerrado mediante PR #59; merge `403f194bceef4d5050f2650a8bec7664d3c5cd4b`. El gate manual quedó satisfecho con un endpoint autorizado y evidencia sanitizada; la CI final del PR (#297) quedó verde.

### V02-008 — Live Asset 360 Vertical Slice

Primer recorrido real:

```text
endpoint autorizado → GLPI Agent → GLPI → NEXUS API → NEXUS Web
```

Dependencias: V02-007 ✅.

Resultado integrado: issue #60 cerrado mediante PR #61; merge `6471240dd1e32d1eab59fea94f03e6df552c1aea`. El housekeeping PR #62 dejó `main` en `340ccebc28aa2330d1df06dab55a2c6f0156f25d` con CI post-housekeeping #336 verde y ADR-0018 Accepted.

### V02-009 — Provenance & Reconciliation

Objetivo: formalizar identidad multisource, evidencia por atributo, conflictos y reglas explícitas de matching bajo **Evidence before inference**. Hostname por sí solo nunca fusiona CIs automáticamente.

Dependencias: V02-008 ✅.

Resultado integrado: issue #63 cerrado mediante PR #64 en merge `209c400f88f556975e525f99b9977cd00e8957be`; housekeeping PR #65 sincronizó documentación/ADR-0019 y dejó `main` en `b74b0cc5c9043f2087a7cf561cc9ff23ac03d36e` con CI post-housekeeping verde.

Baseline integrado:

- `candidate discovery → evidence evaluation → matching decision → conflict detection → canonical projection`;
- reglas deterministas para identificadores fuertes, auxiliares, volátiles e insuficientes;
- `hostname` e `ip_address` nunca producen auto-match por sí solos;
- resultados `matched`, `not_matched`, `ambiguous`, `conflict` y `manual_review_required`;
- claims/provenance por atributo con conflictos resueltos/no resueltos visibles;
- políticas centralizadas por familia de atributo;
- canonical projection preservando siempre el `TechnologyAsset.id` del activo ancla;
- ADR-0019 Accepted.

## Epic 3 — IT / OT Model

### V02-010 — IT/OT Taxonomy v2

Objetivo: formalizar `domain`, `assetClass`, `role`, estado/método de clasificación, operational contexts y mapping hacia GLPI sin realizar active scanning OT.

Dependencias: V02-009 ✅.

Trabajo en revisión: issue #66 / PR #67 / `feature/v02-010-it-ot-taxonomy`.

Alcance implementado en PR:

- `TechnologyTaxonomyAssessment` v2 con `classified`, `unknown`, `unclassified`, `conflict`;
- métodos `observed`, `normalized`, `inferred`, `manual` independientes de authority;
- catálogos IT y OT separados dentro de un contrato compartido;
- `OperationalContextReference` para system/service/environment/site/network segment/security zone;
- mapping GLPI centralizado con Type configurable tratado como evidencia, no estándar universal;
- `Computer` sin Type → assessment `unknown`; Type presente sin regla → `unclassified`;
- bridge escalar legacy explícito/auditable hasta V02-011;
- Demo y GLPI Live pasan gate base + gate taxonómico v2;
- reconciliation preserva assessment/context, y discrepancias no resueltas producen `conflict`;
- ADR-0020, documentación y threat-model addendum específicos;
- tests para invariantes IT/OT, mapping GLPI, incertidumbre, conflictos multisource y context merge.

Gate de cierre: CI completa verde, revisión final del diff, PR Ready for Review y merge manual de Sergio. No auto-merge.

### V02-011 — Demo Dataset v0.2 Migration

Migrar la demo sintética al modelo canónico sin perder reproducibilidad, seguridad ni escenarios hero. Debe retirar el bridge/aliases legacy que V02-010 mantiene temporalmente para evitar un big-bang.

### V02-012 — Relationship Evidence v2

Añadir provenance, observación temporal y evidencia a las relaciones canónicas.

## Epic 4 — Product Design 2.0

### V02-013 — Product IA & Visual Direction

Auditar/rediseñar arquitectura de información y lenguaje visual Innergex. No convertir el proyecto en otro dashboard SaaS basado únicamente en cards.

### V02-014 — Shell & Motion 2.0

Aplicar la nueva identidad, navegación, superficies y motion respetando reduced motion y WCAG 2.2 AA.

### V02-015 — Technology Overview

Responder: **¿Qué requiere atención ahora?**

### V02-016 — Asset Explorer 2.0

Exploración data-dense multisource por dominio, clase, rol, fuente, lifecycle y otros filtros con valor operacional.

### V02-017 — Asset 360 2.0

Convertir Asset 360 en la vista central de identidad, inventory, sources/evidence, relationships, lifecycle, CMDB Quality y señales Device Health sin mezclar conceptos.

### V02-018 — Technology Map 2.0

Evolucionar el grafo desde visualización a workspace de investigación e impacto; mantener alternativa semántica accesible.

## Epic 5 — Technology Analytics

### V02-019 — Analytics Contract Layer

Catálogo de métricas con numerador, denominador, ventana temporal, fuente, cobertura y semántica centralizados.

### V02-020 — CMDB Quality 2.0

Evolucionar el motor v0.1 incorporando provenance/source coverage/conflicts sin convertirlo en Device Health.

### V02-021 — Lifecycle & Investment

Horizontes de garantía/EOL/EOS/edad/reemplazo a 3/6/12/24 meses. No inventar presupuestos corporativos.

### V02-022 — IT / OT Intelligence

Dashboards/contextos especializados. No comparar métricas IT/OT sin denominadores y semántica compatibles.

## Epic 6 — Proactive Endpoint Intelligence

### V02-023 — Intune Analytics Feasibility Spike

Verificar datos realmente accesibles, permisos/licencias y APIs para Endpoint/Advanced Analytics antes de diseñar integración definitiva.

### V02-024 — Windows / Dell Lab Telemetry

Event Log, WMI/CIM y Dell Command Monitor read-only sobre laboratorio. No crear agente NEXUS propio.

### V02-025 — Endpoint Experience

Hangs, crashes, unexpected restarts, startup, battery degradation y cohortes con métricas explicables y cobertura explícita.

### V02-026 — Proactive Findings Engine

Reglas explicables: evidencia → patrón → hipótesis → confianza. Correlación no se presenta como causalidad.

### V02-027 — Knowledge Research Workflow

Fuentes técnicas confiables y recomendaciones auditables. NEXUS nunca ejecuta automáticamente comandos obtenidos desde Internet.

## Epic 7 — Hardening / Demo

### V02-028 — Backend & Integration CI

Extender el rigor de QA de v0.1 a API, contracts, adapters, auth, integración y seguridad.

### V02-029 — v0.2 Demo / Live Lab Readiness

Walkthrough reproducible Demo + Live Lab, documentación, seguridad y E2E. No declarar producción corporativa.

## Orden recomendado inicial

```text
V02-001 Canonical Technology Model
        ↓
V02-002 NEXUS API Runtime
        ↓
V02-003 Security + V02-004 Provider Contract
        ↓
V02-005 GLPI Adapter + V02-006 Service Identity
        ↓
V02-007 GLPI Agent Live Lab
        ↓
V02-008 primer Asset 360 LIVE
        ↓
V02-009 Provenance & Reconciliation
        ↓
V02-010 IT/OT Taxonomy v2
```

Sólo después de comprobar estos foundations deben crecer en paralelo Product Design, Analytics y Endpoint Intelligence.

## v0.3 — Corporate Deployment

v0.3 queda conceptualmente reservada para promover una v0.2 funcional a infraestructura corporativa con, entre otros:

- servidor/hosting corporativo;
- DNS y HTTPS;
- Entra ID / SSO;
- RBAC productivo;
- secrets management;
- reverse proxy;
- persistencia;
- backup/restore;
- observabilidad y logging;
- auditoría;
- hardening;
- firewall/networking;
- estrategia dev/staging/prod;
- CI/CD y rollback;
- runbooks y recuperación.

v0.2 NO debe depender del notebook local de Sergio de manera que obligue a una reescritura para realizar ese traslado.
