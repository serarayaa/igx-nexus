# Arquitectura

Aquí se documentan las decisiones de arquitectura, diagramas y líneas base técnicas de IGX NEXUS.

Principios fundamentales:

- GLPI es un motor CMDB/ITAM, no la interfaz de usuario del producto.
- IGX NEXUS es responsable de la experiencia de usuario y de los contratos de dominio.
- La NEXUS API aísla la aplicación web de los detalles de implementación de los sistemas aguas arriba.
- Las fuentes autoritativas se reconcilian en lugar de duplicarse ciegamente.
- La seguridad, auditabilidad y capacidad de actualización son restricciones de diseño desde el primer día.
- El QR identifica una etiqueta/CI mediante locator opaco; nunca actúa como credencial ni apunta directamente a GLPI, bases de datos o dispositivos.
- Desde v0.2, la identidad NEXUS y el modelo canónico permanecen independientes de las taxonomías/IDs internos de GLPI, Intune, Entra u otras fuentes.
- La procedencia y la evidencia forman parte del contrato de dominio: NEXUS debe poder explicar de dónde proviene un dato antes de inferir sobre él.
- Demo y Live deben compartir contratos de producto; la selección de origen ocurre en composición, no dentro de componentes ni handlers de dominio.

## Architecture Decision Records

- [ADR-0001 — Límites del producto](adr-0001-product-boundaries.md)
- [ADR-0002 — Taxonomía inicial de activos y CI](adr-0002-asset-ci-taxonomy.md)
- [ADR-0003 — Sistema de Diseño de IGX NEXUS](adr-0003-ui-design-system.md)
- [ADR-0004 — Panel principal con proveedor sintético](adr-0004-dashboard-demo.md)
- [ADR-0005 — Explorador de activos sobre inventario compartido](adr-0005-asset-explorer.md)
- [ADR-0006 — Asset 360 con rutas hash por identidad NEXUS](adr-0006-asset-360-routing.md)
- [ADR-0007 — Locator QR opaco y motor de etiquetas desacoplado](adr-0007-qr-locator-label-engine.md)
- [ADR-0008 — Modelo y visualización del grafo de relaciones](adr-0008-relationship-graph.md)
- [ADR-0009 — Calidad explicable del registro CMDB](adr-0009-cmdb-health.md) — aceptado en CMDB-011 (PR #29).
- [ADR-0010 — Catálogo sintético único](adr-0010-demo-dataset.md) — aceptado en CMDB-012 (PR #32).
- [ADR-0011 — Modelo canónico de Technology Intelligence](adr-0011-canonical-technology-model.md) — aceptado en V02-001 (PR #41).
- [ADR-0012 — Runtime de NEXUS API](adr-0012-nexus-api-runtime.md) — aceptado en V02-002 (PR #44).
- [ADR-0013 — Baseline de seguridad de NEXUS API](adr-0013-api-security-baseline.md) — aceptado en V02-003 (PR #47 / issue #46).
- [ADR-0014 — Provider Mode Contract](adr-0014-provider-mode-contract.md) — aceptado en V02-004 (PR #50 / issue #49).
- [ADR-0015 — GLPI API v2 Adapter](adr-0015-glpi-api-v2-adapter.md) — aceptado en V02-005 (PR #53 / issue #52).
- [ADR-0016 — GLPI Service Identity & RBAC](adr-0016-glpi-service-identity-rbac.md) — aceptado en V02-006 (PR #56 / issue #55).

Los ADR canónicos viven en `docs/architecture/`. El directorio histórico `docs/decisions/` no debe utilizarse para duplicar decisiones ya registradas aquí.
