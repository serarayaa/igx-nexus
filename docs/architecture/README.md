# Arquitectura

Aquí se documentan las decisiones de arquitectura, diagramas y líneas base técnicas de IGX NEXUS.

Principios fundamentales:

- GLPI es un motor CMDB/ITAM, no la interfaz de usuario del producto.
- IGX NEXUS es responsable de la experiencia de usuario y de los contratos de dominio.
- La NEXUS API aísla la aplicación web de los detalles de implementación de los sistemas aguas arriba.
- Las fuentes autoritativas se reconcilian en lugar de duplicarse ciegamente.
- La seguridad, auditabilidad y capacidad de actualización son restricciones de diseño desde el primer día.

## Architecture Decision Records

- [ADR-0001 — Límites del producto](adr-0001-product-boundaries.md)
- [ADR-0002 — Taxonomía inicial de activos y CI](adr-0002-asset-ci-taxonomy.md)
- [ADR-0003 — Sistema de Diseño de IGX NEXUS](adr-0003-ui-design-system.md)
- [ADR-0004 — Panel principal con proveedor sintético](adr-0004-dashboard-demo.md)
- [ADR-0005 — Explorador de activos sobre inventario compartido](adr-0005-asset-explorer.md)
- [ADR-0006 — Asset 360 con rutas hash por identidad NEXUS](adr-0006-asset-360-routing.md)

Los ADR canónicos viven en `docs/architecture/`. El directorio histórico `docs/decisions/` no debe utilizarse para duplicar decisiones ya registradas aquí.
