# ADR-0018 — Live Asset 360 Vertical Slice

Estado: **Propuesto en V02-008 / issue #60**.

## Contexto

V02-007 probó inventario real desde un endpoint autorizado hacia GLPI y confirmó que NEXUS API Live puede leer `Assets/Computer` mediante una identidad GLPI dedicada. Sin embargo, la Web de v0.1 todavía consume exclusivamente un dataset sintético y Asset 360 contiene secciones explícitamente demo.

El siguiente gate es demostrar el recorrido completo:

```text
endpoint → GLPI Agent → GLPI → NEXUS API → NEXUS Web
```

La solución debe conservar los controles introducidos en V02-003/V02-006: datos de activos no públicos, secretos GLPI fuera del navegador, Web desacoplada de GLPI y fail-closed cuando Live no está configurado.

## Decisión

1. NEXUS API expone `GET /api/v1/technology/snapshot` como lectura canónica protegida por `technology:read`.
2. La respuesta proviene exclusivamente de `TechnologyProvider`; la ruta no conoce GLPI ni payloads GLPI.
3. La Web incorpora un provider Live que consume NEXUS API y proyecta `TechnologySnapshot` al contrato UI existente de forma conservadora.
4. Campos ausentes permanecen ausentes/desconocidos. No se infiere responsable, ubicación, garantía, hostname, IP, lifecycle ni criticidad sin evidencia.
5. Demo y Live se seleccionan de forma explícita mediante `VITE_NEXUS_DATA_MODE`; un valor inválido hace fallar la aplicación.
6. El Live Lab usa un bearer local independiente (`NEXUS_LAB_AUTH_TOKEN`) sólo para el salto Vite dev proxy → NEXUS API.
7. El bearer de laboratorio:
   - está prohibido en `production`;
   - requiere bind loopback;
   - debe tener al menos 32 caracteres;
   - no se entrega al código cliente porque no usa prefijo `VITE_`;
   - concede únicamente `technology:read`.
8. Vite inyecta el bearer en el proxy `/api` del servidor de desarrollo. El navegador sólo realiza requests same-origin a `/api/*`.
9. Asset 360 Live no renderiza QR/label, CMDB/Device Health ni relaciones sintéticas como si fueran información real.
10. Entra SSO/OIDC, reverse proxy productivo y secret manager corporativo quedan para v0.3.

## Consecuencias

### Positivas

- se valida la arquitectura NEXUS Web → NEXUS API → provider;
- GLPI continúa oculto detrás del adapter;
- no se exponen credenciales GLPI al navegador;
- se mantiene separación entre evidencia real y features demo;
- el mismo contrato canónico prepara V02-009 y la futura migración de la UI 2.0.

### Costos / límites

- el bearer local es deliberadamente un mecanismo de laboratorio y no puede usarse para deployment corporativo;
- el provider Web Live de V02-008 sólo soporta `Computer`;
- Dashboard, Health, Technology Map y otras vistas siguen perteneciendo al escenario demo hasta sus tickets de migración;
- no existe aún autorización por objeto/asset;
- no hay reconciliación multisource.

## Alternativas descartadas

### Hacer público el snapshot Live

Rechazado. Expondría inventario corporativo y revertiría el baseline de seguridad de V02-003.

### Web → GLPI directo

Rechazado. Acopla la UI al proveedor, filtra semántica/credenciales GLPI hacia cliente y rompe la arquitectura acordada.

### Incluir el bearer en una variable `VITE_*`

Rechazado. Las variables `VITE_*` se incorporan al bundle cliente y no son un lugar válido para secretos.

### Reutilizar OAuth GLPI en el navegador

Rechazado. La identidad `svc-nexus-api` pertenece al backend; su password/client secret/access token nunca deben llegar a Web.

## Gate de aceptación

Este ADR sólo se considera aceptado cuando:

- CI del ticket esté verde;
- el endpoint canónico protegido funcione;
- el Computer real validado en V02-007 sea visible en Asset 360 Live;
- exista evidencia manual sanitizada;
- PR # correspondiente sea mergeado manualmente por Sergio.
