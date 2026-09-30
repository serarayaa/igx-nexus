# Integraciones

Conectores y adaptadores de reconciliación para fuentes corporativas autoritativas como GLPI, Microsoft Intune, Microsoft Entra ID, Microsoft Defender, plataformas de virtualización, descubrimiento SNMP/red y futuras fuentes.

El código de integración nunca debe omitir los contratos de datos de NEXUS ni escribir directamente en las tablas de la base de datos de GLPI.


## V02-023 — Intune Analytics Feasibility Spike

La integración Intune aún **no existe como provider productivo**. V02-023 evalúa Graph v1.0, Endpoint Analytics, permisos y licencias. El único artefacto ejecutable inicial es un preflight GET-only y sanitizado.

Ver `docs/integrations/intune-analytics-feasibility-v02-023.md`.
