# Evidencia sanitizada — Windows / Dell Lab Telemetry

> V02-024. Registrar sólo datos agregados que no identifiquen endpoint, persona o infraestructura.

## Ejecución

- Fecha: YYYY-MM-DD
- Endpoint: LAB-01 / alias no corporativo
- Autorización: sí / no
- Plataforma: Windows 11 / Windows Server / otra categoría genérica
- Lookback: N días
- PowerShell elevado: sí / no

## Windows CIM

- OperatingSystem: observed / unavailable / access-denied
- uptimeHours: valor / unavailable
- manufacturerClass: dell / other / unknown
- memoryGiB: valor / unavailable
- batteryInstances: N
- batteryChargeCoverage: x/y
- batteryCapacityCoverage: x/y
- ReliabilityRecords class: available / unavailable

## Windows Event Log

Registrar sólo conteos:

- OS start / 12: N
- OS shutdown / 13: N
- Kernel-Power / 41: N
- WER bugcheck / 1001: N
- initiated restart / 1074: N
- EventLog / 6005: N
- unexpected shutdown / 6008: N
- Windows boot / 6009: N

No copiar Message, XML ni nombres de procesos/usuarios.

## Dell Command | Monitor

- instalación detectada: sí / no
- versión: x.y.z / unknown / no aplica
- namespace root/DCIM/SYSMAN: observed / unavailable / access-denied
- DCIM_Battery instances: N / unavailable
- DCIM_Fan instances: N / unavailable
- DCIM_ThermalInformation instances: N / unavailable
- DCIM_NumericSensor instances: N / unavailable
- DCIM_MemoryError instances: N / unavailable

## Conclusión

- Windows Event Log: ADOPT / ASSESS / HOLD
- Windows CIM: ADOPT / ASSESS / HOLD
- Dell Command | Monitor: ADOPT / ASSESS / HOLD
- Estado: PASS / PARTIAL / FAIL
- Observaciones: sin datos identificables ni afirmaciones causales

## Prohibido

No versionar:

- hostname;
- serial / Service Tag;
- asset tag;
- usuario/correo;
- dominio;
- UUID;
- IP/MAC;
- event Message/XML;
- dump paths o dumps;
- EVTX;
- raw CIM export;
- capturas con datos reales sin sanitizar.
