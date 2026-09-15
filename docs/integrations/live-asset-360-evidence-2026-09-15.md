# Evidencia sanitizada — V02-008 Live Asset 360 Vertical Slice

Fecha: **2026-09-15**

Estado: **PASS — gate manual completado**

## Alcance observado

Se validó manualmente el recorrido completo del primer vertical Live de producto:

```text
endpoint Windows autorizado → GLPI Agent → GLPI → NEXUS API → NEXUS Web
```

La evidencia se registró de forma deliberadamente sanitizada. No se versionan capturas ni identificadores reales del endpoint.

## Resultados

- Endpoint real autorizado inventariado previamente en V02-007: **sí**.
- `providerMode=live`: **sí**.
- NEXUS API `/health`: **HTTP 200**.
- NEXUS API `/ready`: **HTTP 200**.
- `GET /api/v1/technology/snapshot` sin autenticación: **HTTP 401**.
- Snapshot canónico accesible mediante el bridge autenticado del Live Lab: **sí**.
- Activos Live observados en Explorer: **1**.
- Explorer muestra explícitamente `LIVE LAB · NEXUS API`: **sí**.
- Asset 360 Live accesible mediante identidad NEXUS: **sí**.
- Fuente/procedencia `glpi` visible: **sí**.
- Campos ausentes tratados como `No informado` / `Desconocido`: **sí**.
- Lifecycle ausente no convertido artificialmente a estado positivo: **sí**.
- Criticidad ausente no inferida: **sí**.
- Responsable, ubicación, garantía, hostname e IP ausentes no inventados: **sí**.
- CMDB/Device Health sintético oculto en Live: **sí**.
- QR/label demo oculto en Live: **sí**.
- Relaciones sintéticas no presentadas como evidencia real: **sí**.
- La Web consume NEXUS API; no existe acceso Web → GLPI: **sí**.

## Hallazgo UX durante el gate

Durante la primera validación se detectó que una ruta/hash persistida del escenario Demo podía mantener visible Dashboard/CMDB Health sintéticos aun cuando `VITE_NEXUS_DATA_MODE=live` estaba activo. También el shell conservaba un footer y navegación hardcodeados como Demo.

Se corrigió antes de completar el gate:

- Live restringe la navegación a Explorer / Asset 360 soportados por V02-008;
- rutas Demo persistidas se normalizan a `#assets` en Live;
- sidebar/footer identifican explícitamente `LIVE LAB`;
- Demo v0.1 conserva su navegación y UX existentes.

La CI posterior a esta corrección quedó verde.

## Datos deliberadamente excluidos

No se registran ni adjuntan:

- hostname;
- serial;
- UUID;
- MAC/IP;
- usuario/correo;
- external IDs GLPI;
- OAuth client id/secret;
- passwords;
- access tokens o bearer del laboratorio;
- inventario bruto;
- logs completos;
- capturas con identificadores reales.

## Conclusión

V02-008 demuestra el primer recorrido real completo de IGX NEXUS desde un endpoint autorizado hasta Asset 360, manteniendo GLPI detrás del adapter, NEXUS API como frontera y una representación conservadora de la evidencia.

El ticket queda apto para **PR ready for review + merge manual por Sergio**. El ADR-0018 se considera técnicamente validado, pero su estado definitivo de aceptación queda condicionado al merge manual del PR #61, según el gate definido por el propio ADR.
