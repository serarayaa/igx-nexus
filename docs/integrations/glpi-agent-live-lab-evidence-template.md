# Evidencia sanitizada — GLPI Agent Live Lab

> Plantilla para V02-007. Copiar únicamente datos que no identifiquen a una persona, endpoint o infraestructura corporativa.

## Identificación de la ejecución

- Fecha: `YYYY-MM-DD`
- Operador: `equipo TI / rol genérico`
- Endpoint de laboratorio: `LAB-01`, `LAB-02` o alias no corporativo
- Autorización confirmada: `sí / no`

## Software

- GLPI Agent: `1.19`
- Plataforma: `Windows 11 / Windows Server / otra categoría genérica`
- Arquitectura: `x64`
- GLPI: `11.x`

## Guardrails

- `TASKS=Inventory`: `sí / no`
- `NO_HTTPD=1`: `sí / no`
- `NO_P2P=1`: `sí / no`
- TLS validation activa: `sí / no`
- OAuth Client Credentials separado de NEXUS API: `sí / no`
- scope OAuth: `inventory`
- NetDiscovery ejecutado: `no`
- NetInventory ejecutado: `no`
- RemoteInventory ejecutado: `no`
- Deploy ejecutado: `no`
- WakeOnLan ejecutado: `no`
- ESX ejecutado: `no`

## Resultado Agent → GLPI

- Inventario enviado: `sí / no`
- GLPI recibió un `Computer`: `sí / no`
- Duplicado inesperado: `sí / no`
- Timestamp de inventario reciente: `sí / no`
- Categorías principales presentes: `OS / CPU / RAM / Storage / Software / otras`
- Hallazgos de compatibilidad: `<sin identificadores reales>`

## Resultado GLPI → NEXUS API

- `/ready` Live: `200 / 503 / no probado`
- NEXUS API pudo leer el Computer: `sí / no / no probado`
- `TechnologySnapshot` válido: `sí / no / no probado`
- `SourceReference=glpi`: `sí / no / no probado`
- Mapping observado: `<descripción técnica sin IDs/seriales/hostname>`

## Problemas y resolución

- Síntoma: `<genérico>`
- Causa confirmada: `<genérica>`
- Acción tomada: `<sin secretos ni datos identificables>`
- Repetición del inventario: `sí / no`
- Resultado posterior: `<ok / pendiente>`

## Resultado final

- Estado: `PASS / PARTIAL / FAIL`
- El recorrido real `endpoint → Agent → GLPI` fue observado: `sí / no`
- El recorrido `GLPI → NEXUS API` fue observado: `sí / no`
- Apto para avanzar a V02-008: `sí / no`
- Observaciones: `<texto sanitizado>`

## Datos prohibidos en esta evidencia

No copiar:

- hostname;
- nombre de usuario;
- serial;
- asset tag corporativo;
- UUID;
- MAC/IP;
- dominio o tenant;
- URL real de GLPI;
- client id/secret;
- access token;
- inventario bruto JSON/XML;
- logs completos;
- capturas con datos reales sin sanitizar.
