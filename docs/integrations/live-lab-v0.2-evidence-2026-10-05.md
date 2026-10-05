# Evidencia sanitizada — V02-029 Live Lab v0.2

Estado: **PASS**  
Fecha: **2026-10-05**  
HEAD validado inicialmente: `451dae46327b73356a495e23db554dd2c404b105`  
Alias de laboratorio: `LAB-01`

## Objetivo

Revalidar sobre el HEAD de cierre de V02-029 el vertical soportado:

```text
endpoint autorizado
  → GLPI Agent
  → GLPI
  → NEXUS API Live
  → Vite proxy local
  → NEXUS Web
```

La evidencia registrada aquí es deliberadamente sanitizada. No contiene hostname, usuario, serial, UUID, MAC/IP, tenant, URL corporativa, client id/secret, bearer, inventario bruto, logs completos ni screenshots reales.

## Agent preflight

Resultado: **PASS**.

Controles observados:

- GLPI Agent 1.19 presente;
- servicio Windows instalado y Running;
- única tarea habilitada: Inventory;
- HTTP server embebido deshabilitado;
- P2P deshabilitado;
- validación TLS habilitada;
- home/profile scan deshabilitados;
- item type Computer;
- tag Live Lab presente;
- target configurado;
- transporte del Agent reconocido como loopback;
- OAuth inventory client id/secret configurados sin exponer valores;
- puerto 62354 no escuchando.

No se ejecutó discovery, remote inventory, deploy, Wake-on-LAN ni scanning OT.

## NEXUS API Live

Resultado: **PASS**.

Validación observada:

- NEXUS API escuchando en loopback;
- `GET /health` → **HTTP 200**;
- `GET /ready` → **HTTP 200**;
- `providerMode=live`;
- `providerAvailability=ready`;
- `technologySchemaVersion=0.2`;
- `GET /api/v1/technology/snapshot` sin autenticación → **HTTP 401**;
- el rechazo sin auth quedó registrado como evento de seguridad y no filtró inventario.

El probe de readiness confirmó que OAuth + GLPI + lectura mínima del provider Live estaban disponibles.

## NEXUS Web Live

Resultado: **PASS**.

Cobertura observada sobre un único activo Live agregado:

### Overview

- contexto `LIVE LAB · NEXUS API`;
- provider Live visible;
- 1 activo visible;
- coverage parcial explícita;
- freshness basada en observación real;
- sin fallback a datos Demo.

### Asset Explorer

- 1 de 1 activos Live;
- fuente GLPI visible;
- compatibility taxonomy projection mostrada como proyección, no como clasificación resuelta;
- owner/location ausentes permanecen no informados;
- freshness final observada como reciente tras actualización de inventario;
- ningún asset `DEMO-*` visible.

Durante la ejecución inicial se observó un snapshot previo con freshness antigua. Tras la actualización del inventario del Agent, Explorer y Asset 360 convergieron a freshness reciente con fecha observable del mismo día. No se detectó divergencia de cálculo entre ambas superficies.

### Asset 360

- identidad NEXUS preservada;
- origen `NEXUS API / provider Live`;
- fuente GLPI visible;
- campos ausentes permanecen `No informado` / unknown;
- taxonomía unresolved/review-required explícita;
- no QR/label Demo;
- no CMDB Health sintético presentado como Device Health;
- provenance Web reconocida como parcial cuando no existe evidencia por atributo disponible.

### Relationships / Technology Map

- cobertura relacional Live no disponible;
- 0 relaciones visibles;
- ausencia de relaciones permanece ausencia;
- no se usaron fixtures Demo como fallback;
- no se infirió conectividad desde hostname, IP, fabricante, responsable o ubicación.

### Lifecycle & Investment

- 1 activo dentro del alcance;
- 0 de 1 con edad observable;
- 0 % de cobertura de edad;
- 0 de 1 con fecha + provenance válida para garantía, EOL, EOS y objetivo de reemplazo;
- horizontes 3/6/12/24 meses funcionan sin fabricar fechas;
- no se estiman CAPEX, precios, vida útil ni presupuesto;
- no existe fallback a hitos Demo.

## Señales endpoint

GLPI Live continúa entregando `observations=[]`.

Por lo tanto:

- Endpoint Experience Live puede permanecer unavailable;
- Proactive Findings puede no evaluar señales endpoint;
- esta ausencia es comportamiento correcto y no se reemplaza con Demo;
- V02-023 continúa bloqueado por dependencia externa de tenant y no es requisito para cerrar V02-029.

## No-fallback

Verificación manual: **PASS**.

No se observaron:

- 240 CIs Demo;
- IDs `DEMO-*`;
- synthetic research fixtures;
- relaciones Demo;
- lifecycle Demo;
- QR/Health sintético;
- findings Demo presentados como Live.

## Observación de higiene local

El contenedor GLPI existente del laboratorio había sido creado antes del compose actual y estaba publicado en `0.0.0.0:8080`.

El `docker-compose.yml` vigente de la rama ya restringe GLPI a `127.0.0.1:8080`.

Esta diferencia local no alteró los gates de NEXUS API/Web ni el bearer local, que permanecieron en loopback, pero debe corregirse al recrear el contenedor después de recuperar/restablecer el archivo de configuración local. No se recreó durante el gate para evitar introducir cambios de infraestructura o credenciales en medio de la validación.

## Resultado final

**PASS**

El vertical soportado de v0.2 funciona sobre el HEAD de cierre validado, conserva fail-closed, no filtra el snapshot sin autenticación y no sustituye cobertura Live ausente con fixtures Demo.

Limitaciones aceptadas:

- Live Lab, no producción corporativa;
- sin relaciones Live defendibles;
- sin Endpoint observations desde GLPI;
- lifecycle coverage parcial/unavailable según evidencia;
- provenance Web parcial;
- V02-023 Intune bloqueado/non-blocking;
- sin Entra/OIDC productivo, HA, remediation ni active OT scanning.
