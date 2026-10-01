# Scripts

Scripts de desarrollo, mantenimiento, bootstrap, migración, datos de demostración y validación controlada para IGX NEXUS.

Los scripts deben ser idempotentes cuando sea práctico y nunca deben incorporar credenciales de producción.

## Live Lab

`scripts/live-lab/` contiene utilidades de diagnóstico **read-only** para laboratorios autorizados.

`Test-GlpiAgentPreflight.ps1` valida el baseline seguro del GLPI Agent sin instalar software, modificar registro, forzar inventario ni imprimir secretos. Su resultado no reemplaza la evidencia manual de que un endpoint real llegó correctamente a GLPI.


`Test-WindowsDellTelemetry.ps1` realiza un probe local read-only de Event Log, Windows CIM y Dell Command | Monitor. Agrega conteos/cobertura y no imprime hostname, serial, usuario, dominio, IP/MAC ni mensajes crudos de eventos. No instala DCM, no crea sesiones remotas y no invoca métodos CIM mutables.
