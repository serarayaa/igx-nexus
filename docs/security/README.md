# Seguridad

Requisitos de seguridad y notas de modelado de amenazas para IGX NEXUS.

## Documentos

- [`threat-model-v0.2.md`](threat-model-v0.2.md): threat model principal de Technology Intelligence v0.2.
- [`threat-model-v02-008-live-web-addendum.md`](threat-model-v02-008-live-web-addendum.md): frontera Browser → NEXUS API → provider Live.
- [`threat-model-v02-009-reconciliation-addendum.md`](threat-model-v02-009-reconciliation-addendum.md): integridad de identidad, provenance y evidencia multisource.
- [`glpi-rbac-baseline.md`](glpi-rbac-baseline.md): línea base de perfiles, asignaciones y principio de menor privilegio para el núcleo GLPI.

## Línea base inicial

- No almacenar credenciales reales ni secretos en Git.
- No permitir acceso directo desde el navegador a las tablas de la base de datos de GLPI.
- Utilizar identidades de servicio con privilegios mínimos.
- Utilizar transporte cifrado en entornos no locales.
- Implementar RBAC y SSO corporativo en producción.
- Mantener registros de auditoría para operaciones privilegiadas y cambios sobre activos.
- Utilizar identificadores QR seguros que no incorporen datos sensibles del activo.
- Incorporar gestión de parches y dependencias como parte del proceso de liberación.
- No auto-fusionar activos por señales débiles como hostname/IP; la identidad multisource requiere evidencia explícita y auditable.
- Evitar duplicar identificadores sensibles dentro de errores, logs o explicaciones cuando el tipo de evidencia sea suficiente para diagnosticar la decisión.
