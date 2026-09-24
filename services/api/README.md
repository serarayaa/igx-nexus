# NEXUS API

`@igx-nexus/api` es la frontera HTTP/backend de **IGX NEXUS v0.2 — Technology Intelligence**.

## Responsabilidad

NEXUS API separa la experiencia Web de los sistemas fuente y concentra:

- autenticación y autorización;
- configuración segura;
- Provider Mode Demo/Live;
- normalización de fuentes;
- provenance;
- reconciliation;
- Taxonomy v2;
- Relationship Evidence v2;
- readiness y health;
- contratos HTTP/OpenAPI.

La Web nunca accede directamente a GLPI/MariaDB ni conoce detalles del adapter.

## Arquitectura

```text
NEXUS Web
   |
   v
NEXUS API
   |
   v
TechnologyProvider
   |-- Demo Provider --> packages/demo-data
   `-- GLPI Live Provider
          |
          v
  GLPI 11 High-Level API v2.3
          ^
          |
 GlpiAccessTokenProvider
          ^
          |
 GlpiCredentialSource
```

GLPI continúa como System of Record CMDB/ITAM. NEXUS actúa como capa de integración, contexto e inteligencia.

## Runtime

- Node.js 24
- TypeScript ESM / `NodeNext`
- Fastify 5
- Pino
- OpenAPI 3.0.3 mediante `@fastify/swagger`
- `@fastify/helmet`
- `@fastify/cors`
- `@fastify/rate-limit`
- contratos `@igx-nexus/types`
- `TechnologyProvider` Demo/Live
- GLPI v2.3 read-only
- Taxonomy v2, reconciliation y relaciones con evidencia

## Endpoints base

| Método | Ruta | Propósito | Política |
| --- | --- | --- | --- |
| GET | `/health` | liveness del proceso | pública |
| GET | `/ready` | readiness + disponibilidad del provider | pública |
| GET | `/api/v1` | metadata/versionado HTTP | pública |
| GET | `/api/v1/provider` | descriptor del provider activo | pública |
| GET | `/api/v1/technology/snapshot` | snapshot tecnológico canónico | `technology:read` |
| GET | `/openapi.json` | contrato OpenAPI | pública |

## Provider Mode

Modos soportados:

```text
demo
live
```

`NEXUS_PROVIDER_MODE` se resuelve durante composición. En production debe declararse explícitamente.

### Integridad del contrato HTTP

El snapshot se serializa con el schema explícito compartido de `@igx-nexus/types` y se valida antes de publicarse. Conserva `taxonomy`, `operationalContexts` y el resto de campos canónicos; no abre objetos mediante `additionalProperties: true`. Web acepta la versión declarada por `technologySchemaVersion`, valida timestamps antes del render y conserva el contrato completo junto a su proyección. Los snapshots históricos sin evaluación taxonómica opcional mantienen un fallback explícito que no sobrescribe evaluaciones presentes.

Ver [AUD-API-001: corrección y pruebas de round-trip](../../docs/audits/remediation-01-contract-integrity.md).

### Demo

Desde V02-011, Demo consume `packages/demo-data` como fuente compartida y devuelve el universo sintético completo.

V02-012 incorpora además las relaciones al mismo snapshot canónico. El resultado contiene:

- 240 `TechnologyAsset`;
- IDs `DEMO-0001..DEMO-0240`;
- 18 `TechnologyRelationship` con IDs estables `DEMO-REL-001..018`;
- `TechnologyTaxonomyAssessment` v2;
- provenance/source references Demo;
- site operational contexts cuando existe ubicación;
- relationship evidence explícita;
- temporalidad relacional conocida o `null` cuando realmente se desconoce;
- `authority` separada de `derivation`;
- marca explícita `demo.synthetic=true` para assets;
- snapshots deterministas e inmutables.

Antes de publicar ejecuta:

```text
validateTechnologySnapshot()
validateTechnologySnapshotTaxonomy()
```

La API no importa desde `apps/web`. Web y API consumen la misma fuente compartida.

Las relaciones Demo representan claims sintéticos autorados manualmente. No implican discovery real, network scanning ni evidencia corporativa. `DEMO-REL-013` conserva `observedAt=null`: la fecha de corte del dataset no se reutiliza como fecha inventada del hecho.

El provider Live GLPI continúa con `relationships=[]` mientras no exista una fuente real y defendible de relaciones. V02-012 no deriva topología desde hostname, ubicación, fabricante, modelo ni proximidad de red.

### Live / GLPI

```text
GlpiCredentialSource
        |
        v
Password Grant Token Provider
        |
        v
GlpiApiTransport
        |
        v
createGlpiLiveTechnologyProvider
        |
        v
TechnologyProvider
```

`live` nunca cae automáticamente a Demo. Configuración/secrets incompletos fallan cerrados.

## Readiness dinámica

El provider GLPI realiza un probe read-only mínimo:

```text
GET Assets/Computer?start=0&limit=1
```

Si GLPI/auth/payload no están disponibles:

- `/health` puede permanecer 200 porque el proceso sigue vivo;
- `/ready` responde 503;
- no se filtran detalles sensibles del upstream;
- no se presenta Demo como sustituto.

## GLPI API v2 Adapter

Versión soportada:

```text
v2.3
```

Los recursos se construyen bajo:

```text
<glpi-root>/api.php/v2.3/
```

El transporte:

- implementa sólo GET para recursos;
- exige HTTPS por defecto;
- permite HTTP sólo mediante opt-in de laboratorio;
- rechaza credenciales embebidas en URL;
- rechaza redirects automáticos;
- usa Bearer token;
- aplica timeout/cancelación;
- minimiza errores y no retorna bodies sensibles;
- no incluye secretos en descriptor/evidence/URL.

### Lectura `Assets/Computer`

Se pagina con `start`/`limit` y se aplican safety bounds, validación de payload y detección de IDs duplicados.

## Taxonomy v2

Regla arquitectónica:

```text
GLPI item type != NEXUS assetClass
GLPI Type != NEXUS role
hardware shape != NEXUS domain
```

Un `ComputerType` genérico como Notebook/Laptop/Desktop/Workstation/Server no demuestra por sí solo dominio, clase ni función.

Mappings gobernados actuales incluyen:

```text
Engineering Workstation / Industrial Workstation
  -> OT / industrial_compute / engineering_workstation

HMI / Human Machine Interface / Operator Station
  -> OT / operator_interface / supervision

Historian / Historian Server
  -> OT / industrial_compute / historian
```

Estos mappings requieren revisión porque `ComputerType` es configurable por la instancia GLPI.

Casos sin evidencia suficiente:

```text
Computer sin Type
  -> unknown / unknown / unknown

Computer con Type físico genérico
  -> unclassified / unclassified / unclassified

Computer con Type sin regla
  -> unclassified / unclassified / unclassified
```

No se infiere clasificación desde hostname, modelo, fabricante ni coincidencias parciales.

## Compatibility scalar projection

V02-011 retiró los aliases taxonómicos pre-v2 del contrato activo. `TechnologyAssetClass` y `TechnologyRole` sólo aceptan vocabulario Taxonomy v2 más `custom:*` cuando corresponda.

Schema `0.2` todavía exige scalars concretos `domain`, `assetClass` y `role`. Cuando el assessment GLPI está sin resolver, `projectGlpiTaxonomyForLegacyScalars()` mantiene una **proyección de compatibilidad**, no una clasificación:

```text
assessment resuelto
  -> scalars = valores del assessment
  -> compatibilityProjection = false

assessment unknown/unclassified/conflict
  -> scalars = IT / endpoint / user_endpoint
  -> compatibilityProjection = true
  -> projectionRuleId = glpi.computer.compatibility-projection
```

El fallback nunca modifica el assessment. La verdad taxonómica sigue siendo `unknown`, `unclassified` o `conflict` cuando corresponde.

## Relationship Evidence v2

Una relación canónica es un claim entre IDs NEXUS y no una simple arista de presentación.

`TechnologyRelationship` conserva:

```text
id
sourceAssetId
targetAssetId
type
direction
status
observedAt: string | null
evidence[]
```

`RelationshipEvidence` separa:

- fuente (`SourceReference`);
- authority;
- derivation (`observed | normalized | inferred | manual`);
- confidence opcional;
- temporalidad conocida o `null`;
- referencias de evidencia.

Una relación con temporalidad desconocida no recibe `snapshot.asOf` artificialmente. El `SourceReference.observedAt` puede indicar cuándo se leyó/registró una fuente sin afirmar cuándo ocurrió el vínculo representado.

Los validators detectan además edges semánticamente duplicados. Para un edge bidireccional, invertir source/target no crea una segunda relación. Cuando múltiples fuentes soporten el mismo claim, la dirección es combinar evidence sobre un edge canónico, no duplicar la topología.

Ver ADR-0022.

## Identificadores y metadata GLPI

Cuando existen:

```text
serial      -> serial_number
otherserial -> asset_tag
uuid        -> hardware_uuid
```

Metadata adicional se conserva bajo `glpi.*`. Cada activo mantiene `SourceReference.source=glpi`, provenance y evidence segura.

## Reconciliation

La reconciliación:

- separa discovery de candidatos de identity assignment;
- trata hostname/IP como evidencia insuficiente para auto-merge;
- conserva claims alternativos;
- centraliza authority/recency policies;
- preserva el `TechnologyAsset.id` del ancla;
- mantiene taxonomy y operational contexts;
- hace visibles conflictos no resueltos.

V02-012 no implementa todavía reconciliation multisource de relaciones reales. Primero consolida el contrato y la Demo canónica.

## GLPI Service Identity & RBAC

Restricción actual de GLPI 11: Client Credentials se reserva para `scope=inventory`; la High-Level API general requiere identidad de usuario con `scope=api`.

Runtime Live utiliza:

```text
grant_type=password
scope=api
```

El token se solicita en:

```text
POST <glpi-root>/api.php/token
Content-Type: application/x-www-form-urlencoded
```

El access token:

- vive sólo en memoria;
- se renueva antes de expirar;
- no se persiste;
- no se expone en logs/respuestas;
- no usa refresh token.

Secretos de laboratorio:

```text
NEXUS_GLPI_OAUTH_CLIENT_SECRET
NEXUS_GLPI_SERVICE_PASSWORD
```

Se entregan vía `GlpiCredentialSource` y no forman parte de `ApiConfig`.

RBAC esperado: usuario técnico dedicado con permiso mínimo de lectura para los recursos necesarios y sin permisos administrativos innecesarios.

## Seguridad de rutas

Las rutas `/api` y `/api/*` deben declarar política explícita:

- `public`;
- `authenticated`;
- `permission`.

Permisos baseline:

```text
technology:read
technology:operate
audit:read
security:admin
```

## Configuración HTTP

| Variable | Default | Descripción |
| --- | --- | --- |
| `NEXUS_API_ENV` | `development` | `development`, `test`, `production` |
| `NEXUS_API_HOST` | `127.0.0.1` | host de escucha |
| `NEXUS_API_PORT` | `3100` | puerto |
| `NEXUS_API_LOG_LEVEL` | `info` | nivel Pino |
| `NEXUS_API_CORS_ORIGINS` | vacío | allowlist de origins |
| `NEXUS_API_BODY_LIMIT_BYTES` | `1048576` | límite de body |
| `NEXUS_API_REQUEST_TIMEOUT_MS` | `30000` | timeout HTTP |
| `NEXUS_API_RATE_LIMIT_MAX` | `120` | requests por ventana |
| `NEXUS_API_RATE_LIMIT_WINDOW_MS` | `60000` | ventana rate limit |
| `NEXUS_API_TRUST_PROXY` | vacío | proxies confiables |
| `NEXUS_PROVIDER_MODE` | demo en dev/test | `demo` o `live`; obligatorio en production |

## Configuración GLPI Live

| Variable | Default | Descripción |
| --- | --- | --- |
| `NEXUS_GLPI_BASE_URL` | — | raíz GLPI |
| `NEXUS_GLPI_OAUTH_CLIENT_ID` | — | OAuth Client ID |
| `NEXUS_GLPI_SERVICE_USERNAME` | — | usuario técnico |
| `NEXUS_GLPI_REQUEST_TIMEOUT_MS` | `10000` | timeout OAuth/API |
| `NEXUS_GLPI_TOKEN_REFRESH_SKEW_SECONDS` | `60` | renovación anticipada |
| `NEXUS_GLPI_PAGE_SIZE` | `100` | page size |
| `NEXUS_GLPI_MAX_RECORDS` | `10000` | safety bound |
| `NEXUS_GLPI_ALLOW_INSECURE_HTTP` | `false` | sólo laboratorio; prohibido en production |

## Validación

Desde raíz:

```bash
npm ci
npm run typecheck
npm run build
npm test
```

## Referencias

- [ADR-0012 — NEXUS API Runtime](../../docs/architecture/adr-0012-nexus-api-runtime.md)
- [ADR-0013 — API Security Baseline](../../docs/architecture/adr-0013-api-security-baseline.md)
- [ADR-0014 — Provider Mode Contract](../../docs/architecture/adr-0014-provider-mode-contract.md)
- [ADR-0015 — GLPI API v2 Adapter](../../docs/architecture/adr-0015-glpi-api-v2-adapter.md)
- [ADR-0016 — GLPI Service Identity & RBAC](../../docs/architecture/adr-0016-glpi-service-identity-rbac.md)
- [ADR-0017 — GLPI Agent Live Lab](../../docs/architecture/adr-0017-glpi-agent-live-lab.md)
- [ADR-0018 — Live Asset 360 Vertical Slice](../../docs/architecture/adr-0018-live-asset-360-vertical-slice.md)
- [ADR-0019 — Provenance & Reconciliation](../../docs/architecture/adr-0019-provenance-reconciliation.md)
- [ADR-0020 — IT/OT Taxonomy v2](../../docs/architecture/adr-0020-it-ot-taxonomy-v2.md)
- [ADR-0021 — Demo Dataset canónico v0.2](../../docs/architecture/adr-0021-canonical-demo-dataset-v02.md)
- [ADR-0022 — Relationship Evidence v2](../../docs/architecture/adr-0022-relationship-evidence-v2.md)
- [IT/OT Taxonomy v2](../../docs/taxonomy-v2.md)
- [Provenance & Reconciliation](../../docs/reconciliation.md)
- [Threat Model v0.2](../../docs/security/threat-model-v0.2.md)
