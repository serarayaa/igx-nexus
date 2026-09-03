# Arquitectura

Aquí se documentan las decisiones de arquitectura, diagramas y líneas base técnicas de IGX NEXUS.

Principios fundamentales:

- GLPI es un motor CMDB/ITAM, no la interfaz de usuario del producto.
- IGX NEXUS es responsable de la experiencia de usuario y de los contratos de dominio.
- La NEXUS API aísla la aplicación web de los detalles de implementación de los sistemas aguas arriba.
- Las fuentes autoritativas se reconcilian en lugar de duplicarse ciegamente.
- La seguridad, auditabilidad y capacidad de actualización son restricciones de diseño desde el primer día.
