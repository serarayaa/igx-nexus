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
| V02-002 | NEXUS API Runtime | P0 | PR #44 — cierre efectivo al merge manual / issue #42 |
| V02-003 | API Security Baseline | P0 | ⚪ Pendiente |
| V02-004 | Provider Mode Contract | P0 | ⚪ Pendiente |
| V02-005 | GLPI API v2 Adapter | P0 | ⚪ Pendiente |
| V02-006 | GLPI Service Identity & RBAC | P0 | ⚪ Pendiente |
| V02-007 | GLPI Agent Live Lab | P0 | ⚪ Pendiente |
| V02-008 | Live Asset 360 Vertical Slice | P0 | ⚪ Pendiente |
| V02-009 | Provenance & Reconciliation | P0 | ⚪ Pendiente |
| V02-010 | IT/OT Taxonomy v2 | P0 | ⚪ Pendiente |
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

Entrega: issue #42 / PR #44. El ticket se considera completado únicamente con el merge manual del PR a `main`.

### V02-003 — API Security Baseline

Objetivo: definir autenticación/autorización de frontera, manejo de secretos, RBAC y auditoría antes de conectar fuentes reales.

Dependencias: V02-002.

### V02-004 — Provider Mode Contract

Objetivo: permitir Demo sintética y Live Lab mediante los mismos contratos, sin dispersar condicionales `if demo` por la aplicación.

Dependencias: V02-001 / V02-002.

## Epic 2 — Live CMDB / GLPI

### V02-005 — GLPI API v2 Adapter

Lectura real soportada mediante APIs GLPI; mapping hacia dominio NEXUS; sin acceso Web→GLPI ni acceso directo a MariaDB.

### V02-006 — GLPI Service Identity & RBAC

Identidad técnica y permisos mínimos de la futura NEXUS API; secretos fuera del repositorio.

### V02-007 — GLPI Agent Live Lab

Inventario controlado de uno a tres endpoints de laboratorio autorizados. Sin scanning de red corporativa ni OT.

### V02-008 — Live Asset 360 Vertical Slice

Primer recorrido real:

```text
endpoint autorizado → GLPI Agent → GLPI → NEXUS API → NEXUS Web
```

Este ticket es el gate técnico principal de la primera etapa v0.2.

### V02-009 — Provenance & Reconciliation

Identidad multisource, evidencia por atributo, conflictos y reglas explícitas de matching. Hostname por sí solo nunca fusiona CIs automáticamente.

## Epic 3 — IT / OT Model

### V02-010 — IT/OT Taxonomy v2

Formalizar clases, roles, sistemas/contextos y mapping hacia GLPI. No realizar active scanning OT.

### V02-011 — Demo Dataset v0.2 Migration

Migrar la demo sintética al modelo canónico sin perder reproducibilidad, seguridad ni escenarios hero.

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
```

Sólo después de comprobar ese vertical slice deben crecer en paralelo IT/OT, Product Design, Analytics y Endpoint Intelligence.

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
