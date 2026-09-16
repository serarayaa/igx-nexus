# Roadmap de IGX NEXUS

## Alcance actual

La implementación corresponde exclusivamente a **Innergex Chile**. La eventual expansión a otras entidades o países se considera una etapa posterior.

## v0.1 — Demo Local Innergex Chile ✅

Avance formal integrado en `main`: **13 de 13 tickets — 100%**. CMDB-013 — Demo v0.1 quedó integrado mediante PR #37 (`58fabd8`); issue #35 completado y CI post-merge #138 verde.

- CMDB-001 ✅ Inicio / Arquitectura / Alcance
- CMDB-002 ✅ Repositorio y Entorno Local
- CMDB-003 ✅ Stack de Desarrollo Docker
- CMDB-004 ✅ Núcleo GLPI
- CMDB-005 ✅ Sistema de Diseño IGX — integrado mediante PR #16
- CMDB-006 ✅ Panel Principal — integrado mediante PR #17
- CMDB-007 ✅ Explorador de Activos — integrado mediante PR #19 (`2f7e61f`)
- CMDB-008 ✅ Asset 360° — integrado mediante PR #21 (`bdee501`)
- CMDB-009 ✅ Motor QR y Etiquetado — integrado mediante PR #23 (`5b0b0a9`); issue #22 cerrado
- CMDB-010 ✅ Grafo de Relaciones — integrado mediante PR #27 (`89ca343`)
- CMDB-011 ✅ CMDB Health — integrado mediante PR #29; issue #28 completado
- CMDB-012 ✅ Dataset de Demo — integrado mediante PR #32 (`9afb26d`); issue #31 completado
- CMDB-013 ✅ Demo v0.1 — integrado mediante PR #37 (`58fabd8`); issue #35 completado; CI post-merge #138 verde

CMDB-008 conecta **Panel principal → Activos → Asset 360**, con identidad NEXUS estable y estados accesibles. CMDB-009 separa el locator QR de la identidad visible y genera etiquetas SVG sin datos sensibles. CMDB-010 incorpora Technology Map con relaciones dirigidas/simétricas y representación semántica equivalente. CMDB-011 aporta [calidad explicable de registros](cmdb-health.md). CMDB-012 consolida el [dataset sintético](demo-dataset.md) compartido por todas las vistas.

CMDB-013 valida y pule el recorrido completo, elimina lenguaje de roadmap de la experiencia de demo, agrega un smoke Browser de punta a punta y deja un guion reproducible en [Demo v0.1](demo-v0.1.md). Su integración completa **13/13 — 100%** del roadmap v0.1.

La v0.1 respondió la pregunta: **«¿Podemos construir la idea?»**

## v0.2 — Technology Intelligence 🚧

Después del cierre de v0.1 se realizó un Discovery específico antes de promover el producto a infraestructura corporativa. La decisión resultante es validar primero el comportamiento real de la plataforma y sus integraciones, evitando trasladar al servidor una arquitectura que todavía dependa de datos sintéticos.

La v0.2 responde: **«¿Puede IGX NEXUS convertirse realmente en una plataforma de Technology Intelligence para Innergex?»**

El roadmap activo y sus epics se mantienen en [`roadmap-v0.2.md`](roadmap-v0.2.md).

Orden inicial:

```text
Canonical Technology Model
        ↓
NEXUS API
        ↓
Security + Demo/Live providers
        ↓
GLPI adapter + identidad técnica
        ↓
GLPI Agent Live Lab
        ↓
primer Asset 360 LIVE
        ↓
Provenance & Reconciliation
        ↓
IT/OT Taxonomy v2
        ↓
Demo Dataset v0.2 Migration
```

La v0.2 prioriza integraciones reales controladas, procedencia, modelo IT/OT correcto, Product Design 2.0, analytics orientado a decisiones y Endpoint Intelligence explicable. GLPI continúa como CMDB/ITAM; Jira continúa como Service Desk.

## Dirección conceptual posterior

El detalle posterior a v0.2 se definirá con evidencia obtenida durante el desarrollo. Como norte actual:

### v0.3 — Intelligence & Automation

Profundizar el valor operacional mediante automatización, reporting/auditoría, observabilidad, ciencia de datos, Graph Intelligence, detección de anomalías e IA/ML explicable. La IA puede recomendar, detectar y explicar, pero no reemplaza provenance ni revisión humana.

### v0.4 — Product Experience

Concentrar el esfuerzo en UI/UX, arquitectura de información, Design System, visualización, Asset 360, Technology Map, accesibilidad, responsive/mobile, motion y flujos por persona, evitando que esta etapa se convierta en otra gran expansión de backend.

### v0.5 — Corporate Infrastructure

Trasladar oficialmente NEXUS desde el entorno local/laboratorio hacia infraestructura centralizada, incluyendo:

- servidor/hosting corporativo;
- DNS / HTTPS;
- Entra ID / SSO;
- RBAC productivo;
- gestión de secretos;
- reverse proxy;
- persistencia y almacenamiento;
- backup/restore;
- observabilidad y logging;
- firewall/networking;
- estrategia dev/staging/prod;
- CI/CD y rollback;
- runbooks y recuperación ante fallos.

### v0.6 — Cybersecurity Assurance

Realizar auditoría integral de seguridad sobre aplicación, APIs, identidad, supply chain, dependencias, infraestructura, configuración y trust boundaries IT/OT ya desplegados.

### v0.7 — Quality Assurance

Realizar auditoría integral funcional, regresión, integración, performance, concurrencia, resiliencia, restore, accesibilidad, cross-browser y calidad de datos, incluyendo regresión de los controles incorporados en v0.6.

### v0.8+ / v1.0

Las siguientes etapas se definirán según evidencia. Podrán incluir Operational Readiness y piloto productivo antes de declarar una versión 1.0 corporativa.

v0.2 debe diseñarse para que el traslado de v0.5 sea una promoción/hardening del producto, no una reescritura.

## Referencias

- `docs/roadmap-v0.2.md` — roadmap activo de Technology Intelligence.
- `docs/demo-v0.1.md` — preparación, walkthrough, activos hero y checklist de la demo cerrada.
- `docs/demo-readiness.md` — evidencia histórica de readiness de v0.1.
- `docs/design-system/README.md` — baseline visual/técnico de CMDB-005.
- `docs/future-vision.md` — backlog histórico de evolución.

Los flujos de Service Desk y tickets de soporte se excluyen de forma intencional, ya que Innergex utiliza Jira para esa responsabilidad.