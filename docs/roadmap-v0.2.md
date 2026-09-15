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
| V02-009 | Provenance & Reconciliation | P0 | 🟡 En curso — issue #63 |
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

Resultado integrado: issue #42 cerrado mediante PR #44; runtime incorporado a `main` en el merge `7eede47465da03019c78465837dbde2c3bad3c96`.

### V02-003 — API Security Baseline

Objetivo: definir autenticación/autorización de frontera, manejo seguro de configuración, permisos, auditoría y controles HTTP antes de conectar fuentes reales.

Dependencias: V02-002 ✅.

Resultado integrado: issue #46 cerrado mediante PR #47; baseline incorporado a `main` en el merge `900540033a0b0ff62bd4be1edcb52bcf6fb7ef97`; CI post-merge #175 verde.

Baseline integrado:

- `AuthenticationProvider` desacoplado y provider por defecto deny-all;
- `SecurityPrincipal` y autorización por permisos efectivos;
- policy explícita `public | authenticated | permission` para rutas `/api` y `/api/*`;
- security headers, `Cache-Control: no-store` y errores seguros;
- CORS deny-by-default con allowlist y HTTPS obligatorio para origins productivas;
- body limit, request receive timeout y rate limit configurables;
- `/health` y `/ready` exentos del limiter;
- `trustProxy=false` por defecto y sólo IP/CIDR explícitos no globales;
- logging HTTP por route pattern y audit events minimizados, sin URL/query cruda, tokens o bodies;
- `npm audit --audit-level=high` incorporado a CI;
- ADR-0013 y threat model v0.2.

V02-003 **no** implementa Entra SSO/OIDC, secretos corporativos, OAuth GLPI, Provider Mode ni TLS/reverse proxy; esos alcances permanecen en tickets posteriores.

### V02-004 — Provider Mode Contract

Objetivo: permitir Demo sintética y Live Lab mediante los mismos contratos, sin dispersar condicionales `if demo` por la aplicación.

Dependencias: V02-001 / V02-002 / V02-003 ✅.

Resultado integrado: issue #49 cerrado mediante PR #50; Provider Mode incorporado a `main` en el merge `70ae174d53ea09df5123ab136b849745200f4b11`; CI post-merge #204 verde.

Baseline integrado:

- `ProviderMode = demo | live` y selección centralizada mediante `NEXUS_PROVIDER_MODE`;
- `TechnologyProvider` desacoplado de GLPI/Intune/Web;
- descriptor inmutable con availability, capabilities y source systems;
- provider Demo canónico mínimo con procedencia `demo`;
- provider Live placeholder fail-closed, sin fallback silencioso a Demo;
- `production` exige declarar `NEXUS_PROVIDER_MODE` explícitamente;
- `/health` representa liveness y `/ready` depende de disponibilidad del provider;
- `/api/v1/provider` expone sólo metadata declarativa del provider;
- inyección de provider en `buildApp()` para tests y adapters futuros;
- ADR-0014 y documentación de NEXUS API.

V02-004 **no** implementa GLPI API v2, OAuth/service identity, reconciliación multisource ni la migración completa del dataset sintético. Esos alcances permanecen en V02-005/V02-006/V02-009/V02-011.

## Epic 2 — Live CMDB / GLPI

### V02-005 — GLPI API v2 Adapter

Objetivo: incorporar el primer adapter Live read-only de GLPI 11 High-Level REST API detrás de `TechnologyProvider`, normalizando registros reales al dominio NEXUS sin acceso directo a MariaDB ni acoplar la Web a GLPI.

Dependencias: V02-001 / V02-002 / V02-003 / V02-004 ✅.

Resultado integrado: issue #52 cerrado mediante PR #53; adapter incorporado a `main` en el merge `10acf2533877b19a261d8f5291e90269df2014e8`; CI post-merge #247 verde; housekeeping PR #54 y CI #249 verdes.

Baseline integrado:

- versión GLPI API `v2.3` explícita; no `/v2` flotante;
- transporte HTTP read-only (`GET`) con Bearer token inyectado;
- HTTPS por defecto, HTTP sólo opt-in de laboratorio;
- timeout/cancelación, redirects rechazados y errores sin copiar body de upstream;
- lectura paginada de `Assets/Computer` con `start` / `limit` hasta página vacía para evitar truncamiento silencioso;
- límite total, rechazo de páginas que exceden `limit` y detección de IDs duplicados;
- parser defensivo de payloads;
- mapping conservador a `TechnologyAsset`: IT / compute / `custom:glpi-computer`, lifecycle y criticality desconocidos;
- serial, asset tag y UUID preservados cuando existen;
- identidad NEXUS determinista namespaced sin convertir el ID GLPI en identidad pública;
- `SourceReference`, provenance y evidence GLPI;
- `domain`, `assetClass` y `role` registrados como inferencia NEXUS;
- `TechnologySnapshot` validado antes de salir del provider;
- `checkAvailability()` opcional en `TechnologyProvider` para upstreams reales;
- probe GLPI mínimo `Assets/Computer?start=0&limit=1` para readiness dinámica, con cache corto y deduplicación de probes en vuelo;
- ADR-0015 y threat model v0.2 actualizados.

### V02-006 — GLPI Service Identity & RBAC

Objetivo: incorporar la identidad técnica OAuth y el baseline de mínimo privilegio que permiten al runtime Live autenticarse contra GLPI sin introducir secretos en el dominio ni en `ApiConfig`.

Dependencias: V02-005 ✅.

Resultado integrado: issue #55 cerrado mediante PR #56; identidad GLPI y baseline RBAC incorporados a `main` en el merge `1ea04772fd4fa57e956f7797b2cb298730bad5bc`; CI post-merge #275 verde.

Baseline integrado:

- `GlpiCredentialSource` como frontera reemplazable de secretos;
- backend environment sólo para laboratorio/desarrollo, sin valores versionados;
- Password Grant + scope exacto `api`, porque GLPI 11 restringe Client Credentials a `inventory`;
- token endpoint `/api.php/token` separado de recursos `/api.php/v2.3/...`;
- parser defensivo de `Bearer`, `access_token` y `expires_in`;
- access token sólo en memoria, renovación anticipada y deduplicación de adquisición concurrente;
- secretos fuera de `ApiConfig`, descriptors, evidence, provenance y errores;
- configuración Live no secreta validada y fail-closed;
- HTTP inseguro permitido sólo con opt-in de laboratorio y prohibido en `production`;
- composition root real: credenciales → OAuth → GLPI transport → GLPI Live TechnologyProvider;
- usuario técnico dedicado + perfil `NEXUS API Read-Only` con baseline `Assets > Computers > Read`;
- autorización por entidades mínimas y recursividad sólo con evidencia/necesidad;
- runbook operativo y ADR-0016.

V02-006 **no** configura una instancia corporativa automáticamente, no versiona credenciales, no implementa Entra SSO para callers NEXUS ni sustituye el secret manager corporativo de v0.3.

### V02-007 — GLPI Agent Live Lab

Objetivo: comprobar de forma controlada que uno a tres endpoints autorizados pueden inventariarse mediante GLPI Agent y llegar a GLPI sin ampliar la prueba a discovery de red, administración remota, despliegue masivo u OT.

Dependencias: V02-005 / V02-006 ✅.

Resultado integrado: issue #58 cerrado mediante PR #59; merge `403f194bceef4d5050f2650a8bec7664d3c5cd4b`. El gate manual quedó satisfecho con un endpoint autorizado y evidencia sanitizada; la CI final del PR (#297) quedó verde.

Baseline validado:

- GLPI Agent **1.19** x64 fijado y MSI verificado mediante SHA-256 oficial;
- sólo tarea `Inventory` y `ITEMTYPE=Computer`;
- HTTP server embebido y P2P deshabilitados;
- sin NetDiscovery, NetInventory, RemoteInventory, Deploy, WakeOnLan ni ESX;
- sin active scanning corporativo ni OT;
- OAuth del Agent separado de NEXUS API: Client Credentials + `scope=inventory`;
- secretos y datos identificables del endpoint fuera de Git;
- preflight Windows read-only;
- inventario real recibido por GLPI como `Computer` y leído posteriormente desde el vertical Live;
- runbook, evidencia sanitizada y ADR-0017.

### V02-008 — Live Asset 360 Vertical Slice

Primer recorrido real:

```text
endpoint autorizado → GLPI Agent → GLPI → NEXUS API → NEXUS Web
```

Dependencias: V02-007 ✅.

Resultado integrado: issue #60 cerrado mediante PR #61; merge `6471240dd1e32d1eab59fea94f03e6df552c1aea`. El housekeeping PR #62 dejó `main` en `340ccebc28aa2330d1df06dab55a2c6f0156f25d` con CI post-housekeeping #336 verde y ADR-0018 Accepted.

Baseline integrado:

- endpoint canónico `/api/v1/technology/snapshot` detrás de autorización `technology:read`;
- Web Live consume NEXUS API y nunca GLPI directamente;
- Provider Mode Live permanece fail-closed, sin fallback silencioso a Demo;
- Asset Explorer y Asset 360 pueden visualizar el Computer real a través del modelo canónico;
- features demo-only no se presentan como evidencia Live;
- secretos del bridge Live Lab no llegan al navegador;
- GLPI continúa como System of Record y NEXUS como Intelligence Layer.

V02-008 cerró el gate técnico principal de la primera etapa v0.2 y habilitó el trabajo multisource de V02-009.

### V02-009 — Provenance & Reconciliation

Objetivo: formalizar identidad multisource, evidencia por atributo, conflictos y reglas explícitas de matching bajo **Evidence before inference**. Hostname por sí solo nunca fusiona CIs automáticamente.

Dependencias: V02-008 ✅.

Trabajo activo: issue #63 / `feature/v02-009-provenance-reconciliation`.

Alcance implementado en revisión:

- capa explícita `candidate discovery → evidence evaluation → matching decision → conflict detection → canonical projection`;
- reglas deterministas para identificadores fuertes, auxiliares, volátiles e insuficientes;
- `hostname` e `ip_address` nunca producen auto-match por sí solos;
- resultados `matched`, `not_matched`, `ambiguous`, `conflict` y `manual_review_required`;
- evidencia estructurada y versionada sin duplicar valores crudos de identificadores sensibles en razones/errores;
- claims y provenance por atributo con conflictos resueltos/no resueltos visibles;
- políticas centralizadas por familia de atributo para fuente, autoridad y recencia;
- canonical projection que preserva siempre el `TechnologyAsset.id` del activo ancla;
- fixtures sintéticos para comportamiento multisource, sin integración Intune real;
- matriz de tests contractuales/unitarios, ADR-0019 propuesto y threat-model addendum.

Gate de cierre: PR revisado, CI completa verde, regresión V02-008/Demo sin degradación, revisión de datos/secretos y merge manual de Sergio. ADR-0019 no se marca Accepted antes de ese merge.

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