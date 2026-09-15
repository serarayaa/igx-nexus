# Scripts

Scripts de desarrollo, mantenimiento, bootstrap, migración, datos de demostración y validación controlada para IGX NEXUS.

Los scripts deben ser idempotentes cuando sea práctico y nunca deben incorporar credenciales de producción.

## Live Lab

`scripts/live-lab/` contiene utilidades de diagnóstico **read-only** para laboratorios autorizados.

`Test-GlpiAgentPreflight.ps1` valida el baseline seguro del GLPI Agent sin instalar software, modificar registro, forzar inventario ni imprimir secretos. Su resultado no reemplaza la evidencia manual de que un endpoint real llegó correctamente a GLPI.
