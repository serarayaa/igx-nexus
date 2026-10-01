# Evidencia sanitizada — V02-024 Windows / Dell Lab Telemetry

## Ejecución LAB-01

- Fecha: 2026-10-01
- Endpoint: LAB-01
- Autorización: sí
- Plataforma: Windows 11 / Dell
- Lookback: 14 días
- PowerShell elevado: sí

## Windows CIM

- OperatingSystem: observed
- uptimeHours: 1
- manufacturerClass: dell
- memoryGiB: 31.5
- batteryInstances: 1
- batteryChargeCoverage: 1/1
- batteryCapacityCoverage: 0/1
- ReliabilityRecords class: available

Interpretación:

- CIM local está disponible y entrega datos básicos defendibles;
- Win32_Battery entrega estado/carga en este endpoint, pero no expone FullChargeCapacity/DesignCapacity utilizables;
- la salud/capacidad de batería no debe inferirse desde Win32_Battery en este equipo.

## Windows Event Log — 14 días

- OS start / Kernel-General 12: 10
- OS shutdown / Kernel-General 13: 1
- Kernel-Power 41: 9
- WER bugcheck 1001: 0
- User32 1074: 5
- EventLog 6005: 10
- unexpected shutdown 6008: 9
- Windows boot 6009: 10

Interpretación:

- Event Log local es una fuente observable y repetible;
- 9 pares 41/6008 confirman reinicios/apagados no limpios observados en la ventana;
- 0 eventos WER 1001 significa que el probe no observó bugchecks registrados en la misma ventana;
- los eventos 41/6008 no establecen causa raíz y no se clasifican como hardware fault;
- los eventos 1074 muestran que también hubo reinicios/shutdown iniciados de forma explícita;
- V02-024 conserva estas señales como hechos, no como diagnóstico.

## Dell Command | Monitor

- instalación detectada: no
- namespace root/DCIM/SYSMAN: unavailable

Interpretación:

- ausencia de DCM es un estado soportado por el laboratorio;
- no se intentó instalar software;
- batería/thermal/fan/sensors Dell no pueden evaluarse todavía mediante DCM en LAB-01.

## Conclusión

- Windows Event Log: ADOPT para laboratorio
- Windows CIM: ADOPT para laboratorio
- Dell Command | Monitor: ASSESS / unavailable en LAB-01
- Estado global: PASS

## Privacidad / seguridad

La ejecución no emitió hostname, serial/Service Tag, usuario, dominio, IP/MAC ni mensajes XML/raw de Event Log.
