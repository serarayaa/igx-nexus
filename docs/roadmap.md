# Roadmap de IGX NEXUS

## Alcance actual

La implementación inicial corresponde exclusivamente a **Innergex Chile**. La eventual expansión a otras entidades o países se considera una etapa posterior.

## v0.1 — Demo Local Innergex Chile

Avance formal actual: **3 de 13 tickets completados (~23%)**.

- CMDB-001 ✅ Inicio / Arquitectura / Alcance
- CMDB-002 ✅ Repositorio y Entorno Local
- CMDB-003 ✅ Stack de Desarrollo Docker
- CMDB-004 ⬜ Núcleo GLPI
- CMDB-005 ⬜ Sistema de Diseño IGX
- CMDB-006 ⬜ Panel Principal
- CMDB-007 ⬜ Explorador de Activos
- CMDB-008 ⬜ Asset 360°
- CMDB-009 ⬜ Motor QR
- CMDB-010 ⬜ Grafo de Relaciones
- CMDB-011 ⬜ CMDB Health
- CMDB-012 ⬜ Dataset de Demo
- CMDB-013 ⬜ Demo v0.1

La Demo v0.1 actúa como gate para decidir si IGX NEXUS se oficializa y se promueve desde el notebook de desarrollo hacia un servidor corporativo de Innergex Chile.

Ver también:

- `docs/demo-readiness.md` — criterios de la demo, gate de oficialización y estrategia de migración a servidor.
- `docs/future-vision.md` — backlog de evolución: discovery, garantías, actas digitales, KPI, seguridad, automatización y ciencia de datos.

## Después de la demo

Si la demo es aprobada, la siguiente fase debe priorizar hardening y operación corporativa: servidor definitivo, HTTPS, Entra ID SSO, RBAC, secretos, backups/restauración, monitoreo y habilitación progresiva de fuentes reales de Innergex Chile.

Posteriormente podrán incorporarse capacidades de descubrimiento avanzado, reconciliación, gestión completa de ciclo de vida, garantías, actas digitales, analítica, seguridad y una posible integración desacoplada con DATRYA.

Los flujos de Service Desk y tickets de soporte se excluyen de forma intencional, ya que Innergex utiliza Jira para esa responsabilidad.
