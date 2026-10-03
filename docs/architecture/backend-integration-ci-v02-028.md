# V02-028 — Backend & Integration CI

Estado: **implementación**.

Issue: #126  
PR: #127  
Baseline inicial: `main @ 065280995d332babc7b83654a648974548c3e2de`.

## Objetivo

V02-028 extiende el rigor de QA de IGX NEXUS desde tests por capa hacia fronteras reales de ejecución.

El objetivo no es maximizar un porcentaje de coverage. El objetivo es comprobar invariantes que pueden romperse aunque unit tests aislados permanezcan verdes:

- artefacto compilado que realmente levanta;
- HTTP/TCP real;
- seguridad runtime alineada con OpenAPI;
- serialización canónica sin pérdida de semántica;
- adapter/provider GLPI atravesando la frontera API;
- payload runtime externo rechazado cuando contiene estados no soportados;
- separación Demo/Live y fail-closed preservados.

## Gate 1 — API black-box HTTP

Archivo:

- `scripts/qa-api-blackbox.mjs`.

CI ejecuta el artefacto compilado:

```text
node services/api/dist/server.js
        ↓
listener TCP loopback
        ↓
HTTP fetch real
```

El gate verifica:

1. puerto local libre;
2. startup del entrypoint compilado;
3. `GET /health = 200`;
4. `GET /ready = 200` en provider Demo controlado;
5. `GET /api/v1/technology/snapshot = 401` sin autenticación;
6. el rechazo no filtra activos;
7. el mismo snapshot responde `200` con identidad de laboratorio válida;
8. schema v0.2 y dataset esperado cruzan HTTP;
9. shutdown mediante `SIGTERM`.

El bearer usado por CI es sintético, local al proceso de prueba y nunca representa una credencial corporativa.

## Gate 2 — Vertical backend contract

Archivo:

- `services/api/src/backend-integration.test.ts`.

Cadena cubierta:

```text
GLPI payload sintético
  → GlpiApiTransport
  → GLPI TechnologyProvider
  → canonical mapping
  → NEXUS API route
  → JSON serialization
  → parseTechnologySnapshot()
```

Se comprueba explícitamente que sobreviven al round-trip:

- Taxonomy v2;
- `operationalContexts`;
- source references;
- provenance;
- atributos GLPI normalizados;
- identidad NEXUS;
- arrays de relationships/observations sin fabricación de evidencia.

Un provider que entrega un contrato runtime incompatible falla cerrado y produce un 5xx enmascarado; los valores inválidos no se reflejan al cliente.

### Frontera Web

El repositorio ya conserva `apps/web/src/contract-round-trip.test.ts`, introducido por la remediación AUD-API-001. Ese gate cruza:

```text
canonical snapshot
  → Fastify route
  → HTTP serialization
  → parseTechnologySnapshot()
  → projectCanonicalSnapshot()
  → Web Live model
```

Además, `live-provider.test.ts` y Contract Integrity cubren rechazo de payloads incompatibles y proyección Live.

V02-028 complementa esa cadena desde el otro extremo con GLPI → provider → API. En conjunto, los gates cubren la vertical sin introducir una dependencia runtime nueva Web → API sólo para construir un test monolítico.

## Gate 3 — OpenAPI / runtime security alignment

El runtime ya exigía `technology:read` para:

- `GET /api/v1/technology/snapshot`.

V02-028 hace explícito el mismo contrato en OpenAPI:

- `nexusBearer` como `http/bearer`;
- operación snapshot marcada como protegida;
- respuestas `401`, `403` y `503` declaradas;
- test automático que evita divergencia silenciosa.

La existencia del esquema Bearer no define un IdP productivo. Entra/OIDC permanece fuera de v0.2.

## Gate 4 — Knowledge Research runtime hardening

TypeScript no es una frontera de confianza para JSON externo.

V02-028 endurece `validateKnowledgeResearchReport()` para rechazar estados runtime no soportados en:

- `ResearchClaim.supportState`;
- `ResearchHumanReview.state`.

Esto complementa los invariants ya existentes:

- external knowledge != local evidence;
- `executionAllowed=false`;
- `executionAuthorized=false`;
- contradicciones permanecen unresolved;
- source provenance obligatorio;
- contenido externo permanece `untrusted`.

## Hardening UI secundario

`KnowledgeResearchPanel` ahora:

- resincroniza su estado local cuando cambia la identidad/versión temporal del research packet;
- usa un reloj de revisión separado de `generatedAt`;
- permite inyectar el reloj en tests para mantener determinismo.

La revisión sigue siendo local en Demo y nunca habilita ejecución.

## Lo que este ticket no demuestra

Un CI verde en V02-028 **no** significa:

- despliegue productivo aprobado;
- autenticación corporativa terminada;
- autorización por objeto/sitio implementada;
- GLPI corporativo probado desde GitHub Actions;
- Intune listo;
- seguridad OT validada mediante scanning;
- remediation autorizada.

Esos límites son deliberados.

## Relación con V02-023

V02-023 continúa bloqueado por RBAC/App Registration tenant.

Cuando exista acceso autorizado a Entra/Intune:

- retomar el runbook existente;
- no rehacer el spike;
- no ampliar permisos para sortear controles;
- V02-028 no depende de ese acceso para entregar valor.

## Guardrails

- no secretos reales en CI;
- no GLPI real en GitHub Actions;
- no Intune tenant;
- no permisos Write;
- no active OT scanning;
- no remediation;
- no network discovery;
- no fallback Live → Demo;
- no weakening de assertions existentes;
- evidence before inference;
- human before automation.
