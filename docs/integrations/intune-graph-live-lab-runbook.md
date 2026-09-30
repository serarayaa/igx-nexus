# Intune / Microsoft Graph Live Lab — V02-023

Estado: **feasibility spike**. Este runbook valida únicamente lectura autorizada y disponibilidad de señales. No crea una integración productiva.

## Objetivo

Validar de forma controlada:

```text
service identity autorizada
        ↓
Microsoft Graph v1.0
        ↓
Intune managedDevices / reports metadata
        ↓
evidencia sanitizada para decidir factibilidad NEXUS
```

V02-023 no escribe en Intune, no ejecuta acciones remotas y no crea export jobs.

## Límites obligatorios

- usar una identidad de laboratorio autorizada;
- preferir permiso application `DeviceManagementManagedDevices.Read.All`;
- no solicitar ReadWrite sólo para hacer funcionar el spike;
- no usar Graph beta;
- no ejecutar POST/PATCH/DELETE;
- no ejecutar wipe, retire, reboot, sync u otras managedDevice actions;
- no pegar access tokens, client secrets, tenant IDs ni device IDs en GitHub, issues, PRs o chat;
- no guardar respuesta JSON cruda;
- no guardar nombres, seriales, usuarios, correos, IP/MAC ni identificadores Entra/Intune reales;
- no interpretar compliance o ausencia de eventos como Device Health.

## Prerrequisitos

1. autorización para consultar el tenant de laboratorio/corporativo;
2. identidad técnica dedicada o token temporal aprobado;
3. Microsoft Graph **v1.0**;
4. permiso efectivo de lectura de managed devices;
5. PowerShell 7 recomendado;
6. repositorio actualizado en la rama del spike.

V02-023 no prescribe cómo crear la app registration ni cómo entregar admin consent. Esas operaciones corresponden a administración Entra/Intune autorizada y quedan fuera del script.

## Token

El preflight sólo lee:

```text
NEXUS_INTUNE_ACCESS_TOKEN
```

Configurar el valor **sólo en el proceso/sesión local** y eliminarlo después de la prueba.

Ejemplo conceptual:

```powershell
$env:NEXUS_INTUNE_ACCESS_TOKEN = '<token obtenido por un mecanismo corporativo autorizado>'
```

No guardar este comando con el valor real en scripts, historial compartido, documentación o capturas.

## Ejecutar preflight

Desde la raíz del repositorio:

```powershell
.\scripts\live-lab\Test-IntuneGraphPreflight.ps1 -PermissionReviewConfirmed

# Opcional: cambiar la muestra sin superar 100
.\scripts\live-lab\Test-IntuneGraphPreflight.ps1 -PermissionReviewConfirmed -SampleSize 50
```

El script:

- trata el access token como **opaque string** y nunca intenta decodificarlo;
- exige `-PermissionReviewConfirmed` después de revisar manualmente la app registration/service principal;
- el review debe confirmar `DeviceManagementManagedDevices.Read.All` y ausencia de permisos Intune ReadWrite;
- usa sólo `GET`;
- consulta una muestra acotada de 25 `managedDevices` por defecto (configurable 1–100);
- sólo informa conteos de cobertura por campo, nunca sus valores;
- prueba reachability del contenedor `deviceManagement/reports`;
- no crea export jobs;
- no imprime valores de dispositivos.

### Revisión de permisos

Antes de ejecutar el script, revisar la API permission efectiva de la app/service principal autorizada. Para el probe de inventario el baseline esperado es `DeviceManagementManagedDevices.Read.All`; los permisos Intune `ReadWrite` deben estar ausentes.

El switch `-PermissionReviewConfirmed` registra esa revisión humana. No demuestra ni modifica permisos y no autoriza sobreprivilegio.

El script no parsea el access token: Microsoft indica que los clientes deben tratarlo como una credencial opaca cuyo formato no es contrato estable.

## Resultado esperado

Ejemplo sanitizado:

```text
permission.review=confirmed (manual least-privilege review completed)
token.format=opaque (contents intentionally not inspected)
graph.managedDevices=reachable
graph.managedDevices.sample=available
graph.managedDevices.sampleCount=25 (bounded sample; no values printed)
field.id.coverage=25/25 (values suppressed)
field.azureADDeviceId.coverage=25/25 (values suppressed)
field.serialNumber.coverage=23/25 (values suppressed)
field.operatingSystem.coverage=25/25 (values suppressed)
graph.reportsContainer=reachable
graph.exportJobs.create=not-probed (POST excluded from read-only spike)
result=complete (no token or device values printed)
```

Una cobertura parcial no es un error automático: puede depender de plataforma, enrolamiento o calidad de datos. El preflight no pagina el tenant completo; la muestra sólo sirve para decidir factibilidad y diseñar el siguiente paso.

## Validación manual en Intune

Sin copiar datos reales a Git, confirmar:

1. existe al menos un dispositivo administrado elegible;
2. el preflight devolvió `managedDevices=reachable`;
3. la cobertura de serial y Entra device ID es suficiente o sus gaps quedan documentados;
4. Endpoint Analytics está habilitado o se marca unavailable;
5. Advanced Analytics está licenciado/entitled o se mantiene Hold;
6. la estrategia para consumir reportes no obliga a sobreprivilegiar la identidad NEXUS;
7. los timestamps/ventanas se entienden antes de usarlos como señales operacionales.

## Evidencia sanitizada

Usar:

`docs/integrations/intune-graph-live-lab-evidence-template.md`

Se permite versionar:

- fecha;
- tipo de identidad de forma genérica;
- permiso esperado/presente como nombre del scope/role, nunca token;
- status HTTP/reachability de forma genérica;
- presencia/ausencia de campos;
- disponibilidad de Endpoint Analytics / Advanced Analytics como sí/no/no determinado;
- conclusión Adopt / Assess / Hold / Reject.

Está prohibido versionar:

- tenant ID o dominio;
- client/application/object IDs reales;
- access/refresh token;
- client secret/certificado privado;
- device ID Intune o Entra;
- serial, IMEI, UDID;
- hostname/deviceName;
- usuario/correo;
- MAC/IP;
- response JSON completa;
- capturas sin sanitizar.

## Limpieza

Al finalizar:

```powershell
Remove-Item Env:NEXUS_INTUNE_ACCESS_TOKEN -ErrorAction SilentlyContinue
```

Revocar el token/credencial temporal según el procedimiento corporativo cuando corresponda.

## Gate para cerrar V02-023

Repo-side puede quedar completo con documentación, threat model, preflight y CI. El spike sólo puede declararse **validado contra el tenant** cuando exista al menos una ejecución autorizada con evidencia sanitizada.

Si no existe permiso/licencia para una capacidad, el resultado correcto es `unavailable/Hold`, no simularla.
