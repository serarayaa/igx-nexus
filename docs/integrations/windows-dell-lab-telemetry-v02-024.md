# V02-024 — Windows / Dell Lab Telemetry

Estado: **en implementación** · issue #114.

Investigación oficial: **2026-10-01**.

## Pregunta

> **¿Qué señales endpoint pueden observarse de forma local, repetible y segura desde Windows Event Log, WMI/CIM y Dell Command | Monitor antes de diseñar Endpoint Experience?**

V02-024 es un laboratorio de observabilidad. No crea un agente NEXUS, no instala software y no define todavía métricas de Device Health.

## Windows Event Log

Se usa una allowlist de pares ProviderName + Event ID:

| Señal | Provider | ID | Lectura |
| --- | --- | ---: | --- |
| OS start | Microsoft-Windows-Kernel-General | 12 | inicio del sistema operativo |
| OS shutdown | Microsoft-Windows-Kernel-General | 13 | shutdown del sistema operativo |
| unexpected restart | Microsoft-Windows-Kernel-Power | 41 | reboot sin clean shutdown |
| bugcheck | Microsoft-Windows-WER-SystemErrorReporting | 1001 | bugcheck registrado |
| initiated restart | User32 | 1074 | restart/shutdown iniciado |
| Event Log start | EventLog | 6005 | servicio Event Log iniciado |
| unexpected shutdown | EventLog | 6008 | shutdown previo inesperado |
| Windows boot | EventLog | 6009 | información de boot |

Event 41 no demuestra causa. Puede aparecer tras pérdida de energía, stop error, hang u otros escenarios. NEXUS no lo transforma en diagnóstico causal.

El probe cuenta eventos dentro de una ventana configurable de 1–30 días y no imprime Message, usuario, proceso, dump path ni payload XML.

## Windows WMI/CIM

Clases del laboratorio:

- Win32_OperatingSystem;
- Win32_ComputerSystem;
- Win32_Battery;
- capability check de Win32_ReliabilityRecords.

El output queda limitado a datos no identificables o cobertura agregada:

- uptime;
- versión/build;
- fabricante clasificado como dell / other / unknown;
- memoria total;
- número de baterías;
- cobertura de charge/capacity fields;
- disponibilidad de ReliabilityRecords sin exportar sus records.

Win32_Battery puede devolver propiedades no soportadas como cero o ausentes; esos gaps permanecen como coverage parcial y no se corrigen por inferencia.

## Dell Command | Monitor

Dell publica Dell Command | Monitor 10.13.2, release 08/2026.

Namespace Windows:

root\DCIM\SYSMAN

El laboratorio detecta y cuenta instancias de:

- DCIM_Battery;
- DCIM_Fan;
- DCIM_ThermalInformation;
- DCIM_NumericSensor;
- DCIM_MemoryError.

El probe usa exclusivamente Get-CimClass y Get-CimInstance.

Queda prohibido en V02-024:

- Invoke-CimMethod;
- cambios BIOS;
- cambios de thermal mode;
- acciones de administración;
- instalación automática de Dell Command | Monitor.

DCM ausente es un estado soportado, no un error de NEXUS.

## Salida

Artefacto:

scripts/live-lab/Test-WindowsDellTelemetry.ps1

Ejemplos de lectura sanitizada:

- WindowsEventLog unexpectedRestart observed 2
- WindowsCIM batteryCapacityCoverage observed 1/1
- DellCommandMonitor namespace unavailable not-observed

Los números son evidencia local del laboratorio. No constituyen score ni diagnóstico.

## Relación con V02-025

V02-024 responde qué puede observarse y con qué cobertura.

V02-025 decidirá por separado:

- ventanas analíticas;
- denominadores;
- cohortes;
- hangs/crashes;
- restart experience;
- startup;
- battery experience;
- presentación explicable.

No adelantar esas decisiones al probe.

## Fuentes

- Microsoft — unexpected reboot event logs:
  https://learn.microsoft.com/troubleshoot/windows-server/performance/troubleshoot-unexpected-reboots-system-event-logs
- Microsoft — Event ID 41:
  https://learn.microsoft.com/troubleshoot/windows-client/performance/event-id-41-restart
- Microsoft — Get-CimInstance:
  https://learn.microsoft.com/powershell/scripting/samples/getting-wmi-objects--get-ciminstance-
- Microsoft — Win32_Battery:
  https://learn.microsoft.com/windows/win32/cimwin32prov/win32-battery
- Microsoft — Win32_ReliabilityRecords:
  https://learn.microsoft.com/previous-versions/windows/desktop/racwmiprov/win32-reliabilityrecords
- Dell Command | Monitor:
  https://www.dell.com/support/kbdoc/en-us/000177080/dell-command-monitor
- Dell Command | Monitor documentation:
  https://www.dell.com/support/manuals/en-us/command-monitor/
