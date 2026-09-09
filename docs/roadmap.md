# Roadmap de IGX NEXUS

## Alcance actual

La implementación inicial corresponde exclusivamente a **Innergex Chile**. La eventual expansión a otras entidades o países se considera una etapa posterior.

## v0.1 — Demo Local Innergex Chile

Avance formal integrado en `main`: **10 de 13 tickets (~76,9%)**. CMDB-011 se valida en su rama; después del merge manual serán **11/13 (~84,6%)**.

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
- CMDB-011 🟡 CMDB Health — implementado en rama, validación en curso; issue #28
- CMDB-012 ⬜ Dataset de Demo
- CMDB-013 ⬜ Demo v0.1

CMDB-008 está oficialmente integrado y cerrado. Conecta **Panel principal → Activos → Asset 360**, incorpora deep link estable por identidad NEXUS, estados de carga/error/not-found, detalle de identidad/hardware/asignación/lifecycle/garantía/frescura y mantiene datos exclusivamente sintéticos. Ver [Asset 360](asset-360.md) y [ADR-0006](architecture/adr-0006-asset-360-routing.md).

CMDB-009 está oficialmente integrado y cerrado. Separa la identidad física del CI mediante locator opaco, genera QR sin datos sensibles y añade un Label Engine con perfiles en milímetros, 203/300 DPI y exportación SVG. Ver [Motor QR y Etiquetado](qr-label-engine.md) y [ADR-0007](architecture/adr-0007-qr-locator-label-engine.md). Ese hito dejó 9/13 integrados; CMDB-010 ya se integró posteriormente.

CMDB-010 está integrado mediante PR #27 e issue #26 cerrado como completed. Añade modelo dirigido, provider demo, layout determinista, mapa navegable y lista semántica equivalente. Ver [Grafo](relationship-graph.md). CMDB-011 añade [calidad explicable de registros](cmdb-health.md), pendiente de merge. CMDB-012 y CMDB-013 no se han iniciado.

La Demo v0.1 actúa como gate para decidir si IGX NEXUS se oficializa y se promueve desde el notebook de desarrollo hacia un servidor corporativo de Innergex Chile.

Ver también:

- `docs/demo-readiness.md` — criterios de la demo, estado real, gate de oficialización y estrategia de migración a servidor.
- `docs/design-system/README.md` — baseline visual/técnico de CMDB-005.
- `docs/future-vision.md` — backlog de evolución: discovery, garantías, actas digitales, KPI, seguridad, automatización y ciencia de datos.

## Después de la demo

Si la demo es aprobada, la siguiente fase debe priorizar hardening y operación corporativa: servidor definitivo, HTTPS, Entra ID SSO, RBAC, secretos, backups/restauración, monitoreo y habilitación progresiva de fuentes reales de Innergex Chile.

Posteriormente podrán incorporarse capacidades de descubrimiento avanzado, reconciliación, gestión completa de ciclo de vida, garantías, actas digitales, analítica, seguridad y una posible integración desacoplada con DATRYA.

Los flujos de Service Desk y tickets de soporte se excluyen de forma intencional, ya que Innergex utiliza Jira para esa responsabilidad.
