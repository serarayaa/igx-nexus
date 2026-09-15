# GLPI Agent Live Lab — V02-007

Estado: **preparación de laboratorio**. Este documento define cómo ejecutar un inventario real controlado sin convertir el Live Lab en discovery de red ni en despliegue masivo.

## Objetivo

Validar el recorrido:

```text
endpoint autorizado
    ↓
GLPI Agent 1.19
    ↓
GLPI 11
    ↓
NEXUS API read-only
```

V02-007 valida `endpoint → Agent → GLPI`. La visualización Web del activo real pertenece a V02-008.

## Límites obligatorios

- máximo inicial: **1 a 3 endpoints** explícitamente autorizados;
- sólo inventario local;
- sólo clase `Computer` durante este ticket;
- sin NetDiscovery;
- sin NetInventory;
- sin RemoteInventory / WinRM / SSH;
- sin Deploy;
- sin WakeOnLan;
- sin ESX;
- sin scanning corporativo;
- sin OT;
- sin persistir inventarios brutos ni identificadores reales en Git.

Un endpoint de laboratorio no autoriza descubrir sus vecinos de red.

## Versión fijada

Versión del Agent para este Live Lab:

```text
GLPI Agent 1.19 — Windows x64
GLPI-Agent-1.19-x64.msi
```

SHA-256 oficial del MSI 1.19:

```text
f3f933a54bc325ffe0d6063e177874e05138dd887fe690adef337640e8d6335c
```

No usar nightly builds ni `latest` flotante durante V02-007.

### Verificar el instalador

En PowerShell, antes de ejecutar el MSI:

```powershell
Get-FileHash .\GLPI-Agent-1.19-x64.msi -Algorithm SHA256
```

El hash debe coincidir exactamente con el valor oficial anterior. Ante una diferencia, detener la instalación.

## Identidad separada de V02-006

Hay dos identidades distintas:

```text
NEXUS API → OAuth Password Grant → scope api
GLPI Agent → OAuth Client Credentials → scope inventory
```

No reutilizar:

- el usuario técnico de NEXUS API;
- su password;
- su OAuth client;
- su `client_secret`.

Crear en GLPI un OAuth client dedicado para el Agent con:

```text
Grant: Client Credentials
Scope: inventory
Nombre sugerido: NEXUS GLPI Agent Live Lab
```

El client secret se entrega al endpoint por un canal fuera de Git. Nunca se pega en issues, PR, evidencias o documentación versionada.

## Perfil seguro del Agent

Configuración objetivo:

| Opción | Valor de laboratorio | Motivo |
| --- | --- | --- |
| `ADDLOCAL` | `feat_AGENT` | instalar sólo el feature base + Inventory |
| `SERVER` | URL explícita del GLPI Lab | único destino autorizado |
| `TASKS` | `Inventory` | no planificar otras tareas |
| `ITEMTYPE` | `Computer` | mantener el slice V02-005/V02-007 |
| `NO_HTTPD` | `1` | no exponer el web server embebido |
| `NO_P2P` | `1` | no usar capacidades P2P del Agent |
| `ADD_FIREWALL_EXCEPTION` | `0` | no abrir inbound rules innecesarias |
| `SCAN_HOMEDIRS` | `0` | minimizar recolección |
| `SCAN_PROFILES` | `0` | minimizar recolección |
| `NO_SSL_CHECK` | `0` | no desactivar validación TLS |
| `TAG` | `nexus-live-lab` | distinguir el laboratorio |
| OAuth grant | Client Credentials | identidad específica de inventario |
| OAuth scope | `inventory` | mínimo privilegio del Agent |

`ADDLOCAL=feat_AGENT` restringe explícitamente los componentes instalados al feature base que incluye Inventory. `TASKS=Inventory` restringe además qué tarea se planifica durante la ejecución. Son controles complementarios.

La documentación oficial del Agent indica que su HTTP server embebido usa el puerto 62354 y escucha en todas las interfaces por defecto cuando está habilitado; por eso V02-007 exige `NO_HTTPD=1`.

## Instalación Windows

La documentación oficial del instalador advierte que sus parámetros MSI deben ejecutarse desde `cmd.exe`, no desde PowerShell.

### Paso 1 — instalar las opciones no secretas

Abrir **Command Prompt como administrador** y usar el MSI verificado. `RUNNOW=0` es deliberado: evita que el Agent contacte GLPI antes de que el OAuth client de inventario esté configurado.

```bat
msiexec /i GLPI-Agent-1.19-x64.msi /quiet ^
  ADDLOCAL=feat_AGENT ^
  RUNNOW=0 ^
  EXECMODE=1 ^
  SERVER="https://<glpi-lab>/" ^
  TASKS=Inventory ^
  ITEMTYPE=Computer ^
  TAG=nexus-live-lab ^
  NO_HTTPD=1 ^
  NO_P2P=1 ^
  ADD_FIREWALL_EXCEPTION=0 ^
  SCAN_HOMEDIRS=0 ^
  SCAN_PROFILES=0 ^
  NO_SSL_CHECK=0
```

`https://<glpi-lab>/` es un placeholder. No versionar ni copiar el hostname real a GitHub.

Para un laboratorio estrictamente local en el mismo host puede aceptarse HTTP sobre loopback. HTTP hacia otra máquina no forma parte del perfil seguro de V02-007.

### Paso 2 — configurar OAuth inventory

Configurar localmente en el endpoint:

```text
oauth-client-id     = <inventory-client-id>
oauth-client-secret = <inventory-client-secret>
```

Usar el mecanismo soportado por el instalador/configuración del Agent. El secret no debe quedar en scripts del repositorio, historial de shell compartido, tickets, PR ni capturas.

Si se utiliza el instalador gráfico para introducir el secret, mantener las opciones de seguridad definidas en este runbook.

### Paso 3 — iniciar el servicio después del OAuth

Sólo cuando el OAuth client de inventario y el destino GLPI estén configurados, iniciar el servicio:

```powershell
Start-Service glpi-agent
```

Si el servicio ya estuviera iniciado inesperadamente antes de configurar OAuth, detenerlo y revisar logs/configuración local antes de continuar. No copiar esos logs sin sanitizar a GitHub.

### Paso 4 — comprobar preflight

Ejecutar:

```powershell
.\scripts\live-lab\Test-GlpiAgentPreflight.ps1
```

El script es read-only. No instala, no fuerza inventario, no lee ni imprime el OAuth secret y no modifica el registro.

Debe comprobar al menos:

- Agent 1.19 instalado;
- servicio `glpi-agent` presente y corriendo;
- `TASKS=Inventory`;
- `NO_HTTPD=1`;
- `NO_SSL_CHECK` deshabilitado;
- OAuth client id/secret configurados sin mostrar sus valores;
- servidor configurado;
- HTTP sólo si el destino es loopback.

## Ejecutar el primer inventario

Sólo después de un preflight conforme.

El primer run puede dispararse mediante la opción soportada del Agent (`--force`) o reiniciando su ejecución planificada, según la instalación. No habilitar otras tareas para “probar si funciona”.

No adjuntar el log completo a GitHub: puede contener nombres de host, rutas, URL o identificadores de infraestructura.

## Validación en GLPI

Confirmar manualmente:

1. aparece exactamente el endpoint autorizado esperado;
2. el objeto recibido es `Computer`;
3. el tag de laboratorio es reconocible cuando aplique;
4. existe una fecha/hora reciente de inventario;
5. CPU/RAM/OS/almacenamiento/software relevantes llegaron de forma razonable;
6. no aparecieron activos vecinos por discovery;
7. no se ejecutó Deploy/NetDiscovery/NetInventory/RemoteInventory;
8. no se duplicó el mismo endpoint por un cambio de identidad accidental.

No cambiar permisos a Admin/Super-Admin para resolver un 401/403. Revisar primero OAuth, scope `inventory`, URL y configuración del Agent.

## Validación desde NEXUS API

V02-005/V02-006 deben permitir que el runtime Live consulte GLPI por API read-only usando **otra identidad** (`scope=api`).

Validar:

```text
GLPI contiene el Computer
        ↓
NEXUS GLPI adapter lo lee
        ↓
TechnologySnapshot válido
        ↓
SourceReference = glpi
```

No se exige todavía que NEXUS Web muestre el activo; eso es V02-008.

## Evidencia sanitizada

Usar `docs/integrations/glpi-agent-live-lab-evidence-template.md`.

Se permite registrar:

- fecha aproximada;
- versión del Agent;
- sistema operativo de forma genérica;
- `Computer` recibido sí/no;
- OAuth inventory usado sí/no;
- NEXUS API pudo leerlo sí/no;
- conteos genéricos de categorías;
- resultado final y observaciones técnicas sin datos identificables.

No registrar en Git:

- hostname real;
- nombre de usuario;
- serial de equipo;
- asset tag corporativo;
- UUID;
- MAC/IP;
- dominio/tenant;
- URL real de GLPI;
- OAuth client id o secret;
- token;
- inventario JSON/XML bruto;
- logs completos del Agent.

## Rollback del endpoint

Si el laboratorio debe desmontarse:

1. detener/desinstalar GLPI Agent en el endpoint de prueba;
2. revocar/eliminar el OAuth client de inventario si ya no se reutilizará;
3. retirar el CI de prueba de GLPI sólo si la política de laboratorio lo permite y preservando auditoría necesaria;
4. borrar archivos temporales de instalación/evidencia local que contengan datos reales;
5. no borrar evidencias sanitizadas de Git que formen parte del historial técnico.

## Referencias oficiales

- GLPI Agent releases: `https://github.com/glpi-project/glpi-agent/releases/tag/1.19`
- GLPI Agent Windows installer: `https://glpi-agent.readthedocs.io/en/latest/installation/windows-command-line.html`
- GLPI Agent command line: `https://glpi-agent.readthedocs.io/en/latest/man/glpi-agent.html`

## Gate para cerrar V02-007

La documentación, scripts y CI pueden quedar completos sin acceso al endpoint real. **V02-007 sólo puede declararse completamente validado cuando al menos un endpoint real autorizado haya enviado inventario a GLPI y el resultado se haya comprobado con evidencia sanitizada.**
