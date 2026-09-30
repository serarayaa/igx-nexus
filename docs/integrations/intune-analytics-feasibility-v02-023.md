# V02-023 — Intune Analytics Feasibility Spike

Estado: **en implementación** · issue #112.

Investigación oficial: **2026-09-30**.

## Pregunta

> **¿Qué datos de Microsoft Intune / Endpoint Analytics están realmente disponibles para NEXUS, con qué permisos, licencias, temporalidad y estabilidad de API?**

Este ticket es un feasibility spike. No crea un provider Intune productivo ni solicita admin consent.

## Decisión inicial

### Adopt candidate — inventario v1.0

`GET /v1.0/deviceManagement/managedDevices` está disponible en Microsoft Graph v1.0 y documenta `DeviceManagementManagedDevices.Read.All` como permiso application de lectura.

Datos útiles: Intune device ID, `azureADDeviceId`, serial, device name, fabricante/modelo, OS/version, enrollment, last sync, compliance, encryption, storage y otros atributos según plataforma.

Reglas NEXUS:

- Intune ID permanece como `SourceReference.externalId`, nunca reemplaza `TechnologyAsset.id`;
- `azureADDeviceId` y serial son candidatos de reconciliación sujetos a quality gates;
- deviceName/hostname sigue siendo evidencia débil;
- compliance no equivale a Device Health;
- fabricante/modelo no determina IT/OT.

### Assess — Endpoint Analytics

El catálogo oficial de reportes expone señales útiles para V02-025, entre ellas:

- `EADevicePerformanceV2`: app crashes, hangs y mean time to failure;
- `EAStartupPerfDevicePerformanceV2`: boot/logon, restart count y blue screens;
- `EAStartupPerfDeviceProcesses`: procesos que afectan startup;
- `EADeviceScoresV2`: scores publicados por Microsoft.

Estos reportes requieren validación real de tenant, cobertura y permisos antes de diseñar contratos NEXUS.

Endpoint Analytics **no es telemetría en tiempo real**. Microsoft documenta latencia end-to-end de hasta 96 horas; Application Reliability usa una ventana móvil de 14 días y Startup Performance conserva eventos boot/sign-in durante 29 días.

### Hold — Advanced Analytics

Battery health, resource performance, anomalies y capacidades avanzadas dependen de entitlement/licenciamiento adicional. Hasta confirmar el tenant Innergex quedan en Hold.

Ejemplos del catálogo: `BRDeviceBatteryAgg`, `EAResourcePerfAggByDevice`, `EAAnomaly*`.

### Hold — Export Jobs

Microsoft expone `/deviceManagement/reports/exportJobs`, pero la creación de un export job está documentada actualmente con permisos application ReadWrite. NEXUS no elevará su service identity sólo por conveniencia.

Antes de adoptar reporting hay que resolver una alternativa read-only o aprobar explícitamente el riesgo.

### Reject para V02-023

- wipe / retire / reboot / sync y otras remote actions;
- operaciones write sobre Intune;
- beta-only production integration;
- Device Query ejecutado por NEXUS;
- almacenar tokens o inventario real en Git;
- reutilizar scores Microsoft como score NEXUS;
- presentar ausencia de eventos como prueba de salud.

## Matriz

| Capacidad | API/superficie | Gate | Decisión |
| --- | --- | --- | --- |
| Inventario / identidad | `managedDevices` v1.0 | Intune + Read.All | **Adopt candidate** |
| Entra device ID / serial | `managedDevice` v1.0 | calidad del valor | **Adopt candidate** |
| Crashes / hangs | `EADevicePerformanceV2` | Endpoint Analytics + permisos | **Assess** |
| Startup / restarts / BSOD | `EAStartupPerfDevicePerformanceV2` | Endpoint Analytics + permisos | **Assess** |
| Battery | `BR*` | Advanced Analytics | **Hold** |
| CPU/RAM | `EAResourcePerfAggByDevice` | Advanced Analytics | **Hold** |
| Anomalies | `EAAnomaly*` | Advanced Analytics | **Hold** |
| Export jobs | reports/exportJobs | ReadWrite documentado para create | **Hold** |
| Remote actions | managedDevice actions | write/action | **Reject** |

## Preflight

`scripts/live-lab/Test-IntuneGraphPreflight.ps1` debe:

1. recibir un access token sólo desde `NEXUS_INTUNE_ACCESS_TOKEN`;
2. tratarlo como **opaque string** y no depender de su formato/claims;
3. no imprimir token, IDs, seriales, nombres ni usuarios;
4. exigir confirmación humana de revisión de mínimo privilegio (`DeviceManagementManagedDevices.Read.All` presente y permisos Intune ReadWrite ausentes);
5. probar sólo GET contra Graph v1.0;
6. comprobar `managedDevices?$top=1` y presencia de campos sin revelar valores;
7. comprobar el contenedor `deviceManagement/reports`;
8. no crear export jobs ni ejecutar remote actions.

CI sólo valida sintaxis del preflight. Una CI verde no demuestra acceso al tenant.

## Evidencia manual para cerrar el spike

- [ ] identidad de laboratorio autorizada;
- [ ] permiso read-only efectivo confirmado;
- [ ] `managedDevices` responde 200;
- [ ] cobertura real de serial / Entra device ID / OS / lastSync evaluada sin versionar valores;
- [ ] Endpoint Analytics habilitado o marcado unavailable;
- [ ] Advanced Analytics confirmado o marcado unavailable;
- [ ] estrategia de reporting sin sobreprivilegio decidida;
- [ ] evidencia sanitizada, sin secretos ni identificadores reales.

## Fuentes Microsoft

- https://learn.microsoft.com/graph/api/intune-devices-manageddevice-list?view=graph-rest-1.0
- https://learn.microsoft.com/graph/api/resources/intune-devices-manageddevice?view=graph-rest-1.0
- https://learn.microsoft.com/intune/device-management/reports/export-graph-apis
- https://learn.microsoft.com/intune/device-management/reports/ref-graph-available-reports
- https://learn.microsoft.com/graph/api/intune-reporting-devicemanagementexportjob-create?view=graph-rest-1.0
- https://learn.microsoft.com/intune/endpoint-analytics/
- https://learn.microsoft.com/intune/endpoint-analytics/app-reliability
- https://learn.microsoft.com/intune/endpoint-analytics/startup-performance
- https://learn.microsoft.com/intune/endpoint-analytics/ref-data-collection
- https://learn.microsoft.com/intune/advanced-analytics/
- https://learn.microsoft.com/intune/fundamentals/licensing/

## Access token opacity

Microsoft indica que las aplicaciones cliente deben tratar access tokens como cadenas opacas y no depender de su formato o claims. El preflight no intenta validar ni decodificar el bearer token de Microsoft Graph. La ausencia de permisos ReadWrite se confirma revisando la configuración autorizada de la app/service principal y queda registrada en la evidencia sanitizada.

Referencia: https://learn.microsoft.com/entra/identity-platform/access-tokens
