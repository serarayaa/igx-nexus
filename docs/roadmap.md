# Roadmap de IGX NEXUS

## Alcance actual

La implementación inicial corresponde exclusivamente a **Innergex Chile**. La eventual expansión a otras entidades o países se considera una etapa posterior.

## v0.1 — Demo Local Innergex Chile

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

CMDB-013 no agrega una integración productiva nueva: valida y pule el recorrido completo, elimina lenguaje de roadmap de la experiencia de demo, agrega un smoke Browser de punta a punta y deja un guion reproducible en [Demo v0.1](demo-v0.1.md). Su integración completa **13/13 — 100%** del roadmap v0.1.

La Demo v0.1 actúa como gate para decidir si IGX NEXUS se oficializa y se promueve desde el notebook de desarrollo hacia un servidor corporativo de Innergex Chile.

Ver también:

- `docs/demo-v0.1.md` — preparación, walkthrough, activos hero y checklist pre-demo.
- `docs/demo-readiness.md` — criterios de la demo, estado real, gate de oficialización y estrategia de migración a servidor.
- `docs/design-system/README.md` — baseline visual/técnico de CMDB-005.
- `docs/future-vision.md` — backlog de evolución: discovery, garantías, actas digitales, KPI, seguridad, automatización y ciencia de datos.

## Después de la demo

Si la demo es aprobada, la siguiente fase debe priorizar hardening y operación corporativa: servidor definitivo, HTTPS, Entra ID SSO, RBAC, secretos, backups/restauración, monitoreo y habilitación progresiva de fuentes reales de Innergex Chile.

Posteriormente podrán incorporarse capacidades de descubrimiento avanzado, reconciliación, gestión completa de ciclo de vida, garantías, actas digitales, analítica, seguridad y una posible integración desacoplada con DATRYA.

Los flujos de Service Desk y tickets de soporte se excluyen de forma intencional, ya que Innergex utiliza Jira para esa responsabilidad.
