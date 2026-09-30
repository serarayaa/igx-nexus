# Evidencia sanitizada — Intune / Graph Feasibility Spike

> Plantilla de V02-023. Registrar sólo hechos técnicos que no identifiquen tenant, personas ni dispositivos.

## Ejecución

- Fecha: `YYYY-MM-DD`
- Operador: `equipo TI / rol genérico`
- Autorización confirmada: `sí / no`
- Graph API: `v1.0`
- Tipo de identidad: `application / delegated / otro autorizado`

## Guardrails

- Token entregado sólo por environment: `sí / no`
- Token o secret registrado en evidencia: `no`
- Operaciones ejecutadas: `GET only`
- Graph beta utilizado: `no`
- Export job creado: `no`
- Remote action ejecutada: `no`
- API permissions de la app/service principal revisadas manualmente: `sí / no`
- `DeviceManagementManagedDevices.Read.All` presente: `sí / no`
- Permisos Intune ReadWrite ausentes: `sí / no`
- Access token decodificado/inspeccionado por el preflight: `no`

## managedDevices

- Endpoint reachable: `sí / no`
- HTTP esperado: `200 / otro sanitizado`
- Retornó al menos una fila: `sí / no`
- `id` presente: `sí / no`
- `azureADDeviceId` presente: `sí / no`
- `serialNumber` presente: `sí / no`
- `manufacturer` presente: `sí / no`
- `model` presente: `sí / no`
- `operatingSystem` presente: `sí / no`
- `osVersion` presente: `sí / no`
- `lastSyncDateTime` presente: `sí / no`
- `complianceState` presente: `sí / no`

No registrar los valores.

## Analytics

- `deviceManagement/reports` reachable: `sí / no / no autorizado`
- Endpoint Analytics habilitado: `sí / no / no determinado`
- EA Device Performance disponible: `sí / no / no determinado`
- EA Startup Performance disponible: `sí / no / no determinado`
- Advanced Analytics entitlement: `sí / no / no determinado`
- Battery reports: `available / unavailable / no probado`
- Resource performance: `available / unavailable / no probado`
- Anomalies: `available / unavailable / no probado`
- Export API adoptable con mínimo privilegio: `sí / no / pendiente`

## Identidad y reconciliación

- Entra device ID tiene cobertura útil: `sí / parcial / no / no determinado`
- Serial tiene cobertura útil: `sí / parcial / no / no determinado`
- Se observó algún placeholder/valor degenerado: `sí / no`
- Device name se tratará sólo como evidencia débil: `sí`
- Intune ID se mantiene source-local: `sí`

## Conclusión

- managedDevices: `ADOPT / ASSESS / HOLD / REJECT`
- Endpoint Analytics: `ADOPT / ASSESS / HOLD / REJECT`
- Advanced Analytics: `ADOPT / ASSESS / HOLD / REJECT`
- Export Jobs: `ADOPT / ASSESS / HOLD / REJECT`
- Estado global V02-023: `PASS / PARTIAL / FAIL`
- Observaciones sanitizadas: `<sin identificadores ni secretos>`

## Datos prohibidos

No copiar:

- tenant/domain ID;
- app/client/object IDs reales;
- access/refresh token;
- client secret o private key;
- Intune/Entra device IDs;
- serial, IMEI, UDID;
- hostname/device name;
- usuario/correo;
- MAC/IP;
- JSON crudo;
- URLs tenant-specific;
- logs completos;
- screenshots sin sanitizar.
