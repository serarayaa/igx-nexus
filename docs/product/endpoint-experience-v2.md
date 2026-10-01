# V02-025 — Endpoint Experience

Estado: **implementación funcional en curso** · issue #117.

## Pregunta operacional

> **¿Qué experiencia operacional muestran los endpoints a partir de señales observables de crashes, hangs, restarts, startup y batería, con ventanas y cobertura explícitas?**

Endpoint Experience no es CMDB Health, Device Health, risk score ni root-cause engine.

## Fuente canónica

La capa analítica consume exclusivamente `TechnologySnapshot.observations`.

No utiliza:

- `TechnologyAsset.attributes` como contenedor informal de telemetría;
- compatibility projection como clasificación analítica;
- datos Demo para completar Live;
- inferencia causal desde frecuencia de eventos.

## Población elegible

Clases Taxonomy v2 inicialmente elegibles:

- `endpoint`;
- `operator_interface`;
- `industrial_compute`.

Lifecycle operacional:

- `active`;
- `maintenance`;
- `repair`.

Cuando se selecciona IT u OT, el dominio sólo se acepta desde `taxonomy.domain.state=classified`.

## Ventana

V02-025 soporta ventanas gobernadas de 7, 14 y 30 días. La presentación inicial usa **14 días**.

Para distinguir cero observado de ausencia de colección, el snapshot puede transportar markers:

- `endpoint.event_log.window.days`;
- `endpoint.reliability.window.days`;
- `endpoint.startup.window.days`.

El marker es una observation numérica con unidad `day` y debe estar cortada en `snapshot.asOf`. Sólo cubre una consulta cuando su valor es mayor o igual a la ventana solicitada.

Consecuencia:

- marker válido + 0 eventos = cero observado dentro de la ventana;
- marker ausente/insuficiente = unavailable/partial;
- un evento aislado sin marker no autoriza a afirmar cobertura completa.

## Confiabilidad de aplicaciones

Observations:

- `application.crash`;
- `application.hang`.

V02-025 cuenta eventos y activos afectados únicamente dentro de assets cubiertos por `endpoint.reliability.window.days`.

No conserva Message, username, ComputerName, insertion strings ni nombres de ejecutables como requisito del reporte.

## Reinicios

Observations:

- `system.unexpected_restart`;
- `system.stop_error_restart`.

`system.unexpected_restart` describe un reinicio/apagado no limpio observado. No equivale a:

- falla eléctrica;
- defecto de hardware;
- bugcheck;
- causalidad demostrada.

`system.stop_error_restart` permanece separado para no convertir todo Event 41/6008 en stop error.

## Startup

Observation:

- `startup.duration.ms`.

La presentación muestra media descriptiva de muestras dentro de la ventana y coverage independiente mediante `endpoint.startup.window.days`.

No se inicia captura ETW/TSS desde NEXUS.

## Batería

Observations:

- `battery.present` — capability conocida true/false;
- `battery.capacity.percent` — capacidad observada en porcentaje cuando la fuente la soporta.

Separaciones:

- capability coverage: cuántos endpoints declaran si existe batería;
- present: cuántos declaran batería presente;
- capacity coverage: entre baterías presentes, cuántas tienen capacidad observable.

Un desktop con `battery.present=false` no reduce capacity coverage. Un notebook con batería presente pero sin capacidad sí la reduce.

LAB-01 de V02-024 demostró por qué esto importa: `Win32_Battery` podía entregar carga pero no FullChargeCapacity/DesignCapacity defendibles.

## Demo

El dataset Demo agrega observations sintéticas deterministas:

- cobertura parcial deliberada;
- eventos de crash/hang/restart sólo en una fracción de endpoints;
- startup samples deterministas;
- `battery.present` para capability;
- capacidad sólo para una fracción de notebooks.

La proyección legacy v0.1 no cambia.

## Live

El provider Live ya preserva el `TechnologySnapshot` canónico completo.

Actualmente GLPI Live entrega `observations=[]`, por lo que Endpoint Experience permanece unavailable hasta existir evidencia endpoint real. No existe fallback a Demo.

V02-023 puede aportar una fuente futura, pero V02-025 no depende de Intune para funcionar semánticamente.

## Presentación

Technology Overview incorpora una sección Endpoint Experience con:

- población endpoint elegible;
- ventana;
- coverage por familia de señales;
- crashes/hangs;
- reinicios no limpios/stop errors;
- startup;
- batería.

No se crea una nueva ruta global en este ticket.

## Invariantes

1. `0` y `unavailable` nunca son equivalentes.
2. Ausencia de eventos no prueba buen estado.
3. Coverage pertenece a la medición, no al score.
4. Endpoint Experience y CMDB Quality son conceptos separados.
5. Event evidence no se convierte en causalidad.
6. Live no recibe fixtures Demo.
7. Taxonomy unresolved no se usa para cohortes IT/OT.
8. El builder es puro y no muta el snapshot.

## Fuentes técnicas

- Microsoft — Win32_ReliabilityRecords:
  https://learn.microsoft.com/previous-versions/windows/desktop/racwmiprov/win32-reliabilityrecords
- Microsoft — application/service crash behavior:
  https://learn.microsoft.com/troubleshoot/windows-server/performance/troubleshoot-application-service-crashing-behavior
- Microsoft — unexpected reboot Event Log:
  https://learn.microsoft.com/troubleshoot/windows-server/performance/troubleshoot-unexpected-reboots-system-event-logs
