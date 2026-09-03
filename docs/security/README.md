# Seguridad

Requisitos de seguridad y notas de modelado de amenazas para IGX NEXUS.

Línea base inicial:

- No almacenar credenciales reales ni secretos en Git.
- No permitir acceso directo desde el navegador a las tablas de la base de datos de GLPI.
- Utilizar identidades de servicio con privilegios mínimos.
- Utilizar transporte cifrado en entornos no locales.
- Implementar RBAC y SSO corporativo en producción.
- Mantener registros de auditoría para operaciones privilegiadas y cambios sobre activos.
- Utilizar identificadores QR seguros que no incorporen datos sensibles del activo.
- Incorporar gestión de parches y dependencias como parte del proceso de liberación.
