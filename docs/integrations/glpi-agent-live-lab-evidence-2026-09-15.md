# Evidencia sanitizada — GLPI Agent Live Lab

> Ejecución real controlada de V02-007. Este archivo excluye identificadores del endpoint, secretos, tokens, URL real, inventario bruto y logs completos.

## Identificación de la ejecución

- Fecha: `2026-09-15`
- Operador: `equipo TI`
- Endpoint de laboratorio: `LAB-01`
- Autorización confirmada: `sí`

## Software

- GLPI Agent: `1.19`
- Plataforma: `Windows 11`
- Arquitectura: `x64`
- GLPI: `11.0.8`

## Guardrails

- `TASKS=Inventory`: `sí`
- `ITEMTYPE=Computer`: `sí`
- `NO_HTTPD=1`: `sí`
- `NO_P2P=1`: `sí`
- TLS validation activa: `sí`
- OAuth Client Credentials separado de NEXUS API: `sí`
- scope OAuth del Agent: `inventory`
- preflight read-only: `PASS`
- puerto embebido 62354 escuchando: `no`
- NetDiscovery ejecutado: `no`
- NetInventory ejecutado: `no`
- RemoteInventory ejecutado: `no`
- Deploy ejecutado: `no`
- WakeOnLan ejecutado: `no`
- ESX ejecutado: `no`

## Resultado Agent → GLPI

- Inventario enviado: `sí`
- GLPI recibió un `Computer`: `sí`
- Duplicado inesperado: `no observado`
- Timestamp de inventario reciente: `sí`
- Tag de laboratorio aplicado: `sí`
- Metadata base de inventario recibida: `sí`
- Hallazgos de compatibilidad: GLPI Agent 1.19 requirió endpoint de inventario explícito y autenticación OAuth de inventario habilitada en GLPI.

## Resultado GLPI → NEXUS API

- OAuth NEXUS API: `Password Grant + scope=api`
- identidad NEXUS separada de la identidad del Agent: `sí`
- perfil GLPI de NEXUS: `read-only sobre Computers`
- lectura High-Level API `Assets/Computer` con identidad NEXUS: `HTTP 200`
- `/health` Live: `200`
- `/ready` Live: `200`
- provider mode: `live`
- provider availability: `ready`
- provider: `GLPI 11 High-Level API v2.3`
- NEXUS API pudo validar disponibilidad real de GLPI: `sí`
- `TechnologySnapshot` completo expuesto por endpoint público: `no aplica todavía; V02-008`
- `SourceReference=glpi` observado por endpoint público: `no aplica todavía; V02-008`

## Problemas y resolución

1. **Inventario rechazado inicialmente con 403.**
   - Causa: inventario nativo deshabilitado y autenticación del Agent aún no configurada en GLPI.
   - Acción: habilitar Inventory, seleccionar `OAuth - Client credentials` y usar el endpoint de inventario soportado.
   - Resultado: GLPI pasó a exigir autenticación correctamente.

2. **Agent informó `authentication required, no credentials available`.**
   - Causa: las credenciales OAuth debían quedar instaladas mediante el mecanismo soportado por GLPI Agent/MSI.
   - Acción: reinstalar/reconfigurar el feature Agent con `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`, manteniendo el perfil seguro.
   - Resultado: `prolog` y `contact` exitosos; tarea `Inventory` ejecutada y `Computer` recibido.

3. **Primer intento OAuth de NEXUS devolvió `invalid_client`.**
   - Causa: Client ID copiado incorrectamente en la sesión local.
   - Acción: recargar Client ID y Client Secret de forma interactiva, sin persistirlos en Git ni historial compartido.
   - Resultado: token `Bearer` obtenido con HTTP 200 y vigencia reportada por GLPI.

4. **Runtime local no compiló tras cambiar de rama.**
   - Causa: `node_modules` desalineado con el `package-lock.json` actual.
   - Acción: `npm ci`.
   - Resultado: build de `@igx-nexus/api` exitoso; auditoría local reportó 0 vulnerabilidades.

## Resultado final

- Estado: `PASS`
- El recorrido real `endpoint → Agent → GLPI` fue observado: `sí`
- El recorrido `GLPI → NEXUS API` fue observado: `sí`
- `/ready` del provider Live alcanzó `200`: `sí`
- Discovery/remote/deploy fuera de alcance permanecieron deshabilitados: `sí`
- Apto para avanzar a V02-008: `sí`
- Observaciones: el gate manual de V02-007 quedó satisfecho con un endpoint real autorizado y evidencia sanitizada. V02-008 debe exponer el primer vertical Live de producto sin ampliar todavía el alcance de inventario o discovery.

## Datos deliberadamente excluidos

No se versionan hostname, usuario, correo, serial, asset tag, UUID, MAC/IP, dominio/tenant, URL real de GLPI, Client ID, Client Secret, password, access token, inventario JSON/XML bruto, logs completos ni capturas con datos reales.
