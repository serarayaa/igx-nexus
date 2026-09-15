# ADR-0017 — GLPI Agent Live Lab

Estado: **Propuesto en V02-007 / issue #58**. Este ADR sólo queda aceptado cuando el ticket se integre manualmente a `main` y la evidencia requerida por el Live Lab sea tratada de forma explícita.

## Contexto

V02-005 incorporó el adapter read-only GLPI → NEXUS y V02-006 agregó la identidad técnica de NEXUS API con `scope=api`.

Antes de construir Asset 360 Live, NEXUS necesita comprobar el origen del dato: un endpoint real autorizado debe poder inventariarse mediante GLPI Agent y aparecer correctamente en GLPI sin ampliar el laboratorio a scanning de red, administración remota ni despliegue masivo.

GLPI Agent es una herramienta multipropósito: además de Inventory soporta NetDiscovery, NetInventory, RemoteInventory, Deploy, WakeOnLan y otras tareas. El hecho de instalar el Agent no autoriza esas capacidades.

## Decisión

### 1. Live Lab mínimo

V02-007 se limita inicialmente a **1–3 endpoints autorizados**.

Sólo se ejecuta inventario local del propio endpoint.

Quedan fuera:

- NetDiscovery;
- NetInventory;
- RemoteInventory / WinRM / SSH;
- Deploy;
- WakeOnLan;
- ESX;
- scanning corporativo;
- OT.

### 2. Versión fijada

El laboratorio usa **GLPI Agent 1.19** x64 para Windows.

No se usa `latest` flotante ni nightly build.

El MSI debe verificarse mediante su SHA-256 oficial antes de instalarse.

### 3. Perfil cerrado del Agent

El perfil esperado fija:

```text
TASKS=Inventory
ITEMTYPE=Computer
NO_HTTPD=1
NO_P2P=1
ADD_FIREWALL_EXCEPTION=0
SCAN_HOMEDIRS=0
SCAN_PROFILES=0
NO_SSL_CHECK=0
TAG=nexus-live-lab
```

`TASKS=Inventory` es una allowlist, no sólo una intención documental.

Se deshabilita el HTTP server embebido porque V02-007 no necesita recibir peticiones entrantes en el endpoint.

### 4. Identidad específica de inventario

La identidad del Agent es distinta de la de NEXUS API:

```text
NEXUS API  → Password Grant       → scope api
GLPI Agent → Client Credentials   → scope inventory
```

El OAuth client del Agent:

- es dedicado al Live Lab;
- usa grant Client Credentials;
- usa únicamente `scope=inventory`;
- no se reutiliza en NEXUS API;
- puede revocarse independientemente.

### 5. Secretos y datos reales fuera de Git

No se versionan:

- OAuth client secret;
- access tokens;
- inventario bruto;
- logs completos;
- hostname;
- usuario;
- serial;
- UUID;
- MAC/IP;
- URL corporativa de GLPI;
- asset tags reales.

La evidencia versionable debe ser sanitizada y usar alias de laboratorio.

### 6. Preflight read-only

El repositorio incorpora un preflight Windows que puede comprobar configuración segura sin:

- instalar software;
- modificar registro;
- forzar inventario;
- transmitir datos;
- imprimir secretos.

El preflight no sustituye la validación real Agent → GLPI.

### 7. Evidencia antes de declarar éxito

CI puede demostrar que documentación/código del repositorio no rompieron el proyecto, pero **no demuestra que un endpoint real fue inventariado**.

V02-007 sólo se considera completamente validado cuando existe evidencia sanitizada de al menos un endpoint autorizado cuyo inventario haya sido recibido por GLPI.

La lectura posterior GLPI → NEXUS API puede registrarse como evidencia adicional y prepara V02-008.

## Consecuencias positivas

- se valida la fuente real antes de construir UX Live;
- Agent y NEXUS API tienen credenciales separadas y revocables;
- el alcance de red queda explícitamente cerrado;
- se reduce superficie al deshabilitar HTTPD/P2P/tareas no requeridas;
- los datos sensibles del endpoint no terminan en GitHub;
- la evidencia distingue simulación/CI de observación real.

## Costos y riesgos aceptados

- el Agent necesita un client secret local con scope `inventory`;
- el laboratorio requiere una acción manual autorizada sobre el endpoint;
- una configuración incorrecta del Agent podría ampliar tareas, por eso existe preflight;
- un endpoint real puede revelar diferencias de payload/mapping que obliguen a ajustar V02-005;
- HTTP sin TLS sólo se tolera sobre loopback/lab estrictamente local, no entre hosts;
- el Live Lab no resuelve todavía despliegue masivo ni gestión corporativa del Agent.

## Fuera de alcance

- GPO/Intune productivo;
- active discovery;
- RemoteInventory;
- OT;
- Asset 360 Live Web;
- reconciliación multisource;
- hardening de infraestructura productiva.

## Relación con ADR anteriores

- ADR-0014: el resultado Live sigue entrando por `TechnologyProvider`.
- ADR-0015: NEXUS consume GLPI vía API read-only; nunca recibe inventario directo del Agent.
- ADR-0016: la identidad `scope=api` de NEXUS no se reutiliza para el Agent.

## Referencias

- GLPI Agent 1.19 release: `https://github.com/glpi-project/glpi-agent/releases/tag/1.19`
- Windows installer options: `https://glpi-agent.readthedocs.io/en/latest/installation/windows-command-line.html`
- GLPI Agent CLI: `https://glpi-agent.readthedocs.io/en/latest/man/glpi-agent.html`
