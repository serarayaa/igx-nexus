# Windows / Dell Lab Telemetry — V02-024

Estado: **laboratorio read-only**.

## Alcance

Máximo inicial: **1–3 endpoints Windows autorizados**.

La ejecución es local en cada endpoint. El script no abre WinRM, no crea CIM sessions remotas y no descubre equipos vecinos.

## Prerrequisitos

- Windows 10/11 o Windows Server compatible;
- PowerShell 5.1+;
- acceso de lectura a System Event Log;
- WMI/CIM operativo;
- Dell Command | Monitor opcional.

El script no solicita elevación. Si una fuente requiere permisos que la sesión no tiene, se registra access-denied/unavailable.

Dell documenta ejemplos de consulta de Command | Monitor usando PowerShell administrativo. Si el probe sin elevación no obtiene el namespace, registrar el gap antes de decidir una ejecución autorizada como administrador.

## Ejecutar

Desde la raíz del repositorio:

    .\scripts\live-lab\Test-WindowsDellTelemetry.ps1

Ventana distinta:

    .\scripts\live-lab\Test-WindowsDellTelemetry.ps1 -LookbackDays 7

JSON sanitizado:

    .\scripts\live-lab\Test-WindowsDellTelemetry.ps1 -AsJson

## Qué hace

- consulta CIM local;
- cuenta eventos System por Provider + ID;
- detecta presencia de Dell Command | Monitor;
- consulta únicamente clases Dell allowlisted;
- agrega conteos/cobertura;
- suprime detalles de errores.

## Qué no hace

- no lee equipos remotos;
- no instala DCM;
- no cambia BIOS;
- no llama Invoke-CimMethod;
- no exporta EVTX;
- no lee dumps;
- no imprime mensajes de eventos;
- no imprime hostname, serial, usuario, dominio, IP o MAC;
- no diagnostica causa;
- no genera score.

## Interpretación

observed significa que la fuente respondió y el valor agregado pudo obtenerse.

unavailable puede significar clase ausente, producto no instalado, plataforma sin soporte u otro gap.

access-denied significa que el contexto de ejecución no pudo leer esa fuente.

Un conteo de unexpectedRestart no significa automáticamente problema de hardware. Event 41 registra un shutdown/restart no limpio, no una causa raíz.

## Dell Command | Monitor

Al 2026-10-01 Dell publica 10.13.2 como versión más reciente, release 08/2026.

Si DCM no está instalado:

1. no instalar automáticamente;
2. registrar not-detected;
3. decidir por separado si un endpoint Dell de laboratorio justifica instalar el paquete oficial;
4. validar versión/origen/firma según proceso corporativo antes de instalar.

## Evidencia

Usar:

docs/integrations/windows-dell-lab-telemetry-evidence-template.md

No subir output sin revisarlo, aunque el script esté diseñado para ser sanitizado.

## Gate

El repo-side puede completarse con script/docs/CI.

Para considerar validado el laboratorio se requiere al menos una ejecución autorizada y evidencia sanitizada. Idealmente:

- un Dell portátil con batería;
- opcionalmente un endpoint no-Dell o Dell sin DCM para probar unavailable;
- máximo 1–3 equipos.
