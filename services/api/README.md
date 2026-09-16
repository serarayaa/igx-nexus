# NEXUS API

`@igx-nexus/api` es la frontera HTTP de backend de **IGX NEXUS v0.2 — Technology Intelligence**.

V02-002 creó el runtime real, V02-003 incorporó el baseline de seguridad, V02-004 desacopló Demo/Live mediante `TechnologyProvider`, V02-005 incorporó el adapter GLPI read-only, V02-006 añadió la identidad técnica OAuth, V02-009 formalizó provenance/reconciliation y **V02-010 — IT/OT Taxonomy v2** añade el contrato taxonómico explícito usado por Demo y GLPI Live.

## Arquitectura

```text
NEXUS Web
   |
   v
NEXUS API
   |
   v
TechnologyProvider
   |-- Demo Provider
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

La Web no accede a tablas internas de GLPI/MariaDB ni conoce tipos del adapter. GLPI sigue siendo System of Record CMDB/ITAM; NEXUS normaliza sus registros al modelo canónico antes de que participen en lógica de producto.

La identidad upstream de GLPI es distinta de la autenticación de callers de NEXUS API.

## Runtime

- Node.js 24
- TypeScript ESM / `NodeNext`
- Fastify 5
- logging estructurado Pino
- OpenAPI 3.0.3 mediante `@fastify/swagger`
- security headers mediante `@fastify/helmet`
- CORS explícito mediante `@fastify/cors`
- rate limiting mediante `@fastify/rate-limit`
- contratos canónicos desde `@igx-nexus/types`
- `TechnologyProvider` como frontera común Demo/Live
- GLPI v2.3 read-only como primer adapter Live
- OAuth Password Grant para service identity GLPI de v0.2
- `GlpiCredentialSource` como frontera de secretos reemplazable
- taxonomy v2 y gate taxonómico para providers migrados

`buildApp()` compone el servidor sin abrir un socket y permite inyectar `AuthenticationProvider` y `TechnologyProvider` en tests. `startServer()` es el bootstrap real: en modo Live compone credenciales → OAuth → transporte GLPI → provider y luego abre host/puerto.

## Endpoints base

| Método | Ruta | Propósito | Política actual |
| --- | --- | --- | --- |
| GET | `/health` | liveness del proceso y estado declarado del provider | pública, exenta de rate limit |
| GET | `/ready` | readiness del runtime + disponibilidad efectiva del provider | pública, exenta de rate limit |
| GET | `/api/v1` | metadata/versionado HTTP | pública, rate-limited |
| GET | `/api/v1/provider` | descriptor público del provider activo | pública, rate-limited |
| GET | `/api/v1/technology/snapshot` | snapshot tecnológico canónico | permiso `technology:read` |
| GET | `/openapi.json` | contrato OpenAPI generado | pública, rate-limited |

## Provider Mode

Los modos soportados son:

```text
demo
live
```

La selección se realiza una sola vez durante composición mediante `NEXUS_PROVIDER_MODE`.

### Demo

`demo` usa un provider canónico mínimo sobre identidades sintéticas existentes. Actualmente normaliza un subconjunto deliberado de la demo v0.1 (`DEMO-0007` y `DEMO-0013`) al `TechnologySnapshot` v0.2 y conserva `SourceReference.source = demo`.

Los assets del provider Demo ya emiten `TechnologyTaxonomyAssessment` v2 y pasan tanto el validador base como `validateTechnologySnapshotTaxonomy()`.

La NEXUS API **no importa código desde `apps/web`**. El catálogo completo de 240 CIs continúa en la Web v0.1 hasta V02-011 — Demo Dataset v0.2 Migration.

### Live / GLPI

```text
GlpiCredentialSource
        |
        v
Password Grant Token Provider
        |
        v
GlpiApiTransport (GET-only para recursos)
        |
        v
createGlpiLiveTechnologyProvider
        |
        v
TechnologyProvider
```

`live` nunca cae automáticamente a Demo. Configuración o secretos Live incompletos fallan cerrados durante bootstrap.

### Readiness dinámica

`TechnologyProvider` admite `checkAvailability()` para providers con dependencias aguas arriba.

El provider GLPI usa un probe mínimo y read-only:

```text
GET Assets/Computer?start=0&limit=1
```

Con GLPI inaccesible, autenticación inválida o payload incompatible:

- `/health` permanece 200 porque el proceso sigue vivo;
- `/ready` responde 503;
- no se propagan detalles del upstream;
- no se presenta Demo como sustituto.

## GLPI API v2 Adapter

### Versión

Se soporta explícitamente:

```text
v2.3
```

El transporte de recursos construye rutas bajo:

```text
<glpi-root>/api.php/v2.3/
```

No consume una versión flotante y no usa `apirest.php` legacy.

### Transporte de recursos

`createGlpiFetchTransport()`:

- sólo implementa `GET`;
- exige HTTPS por defecto;
- permite HTTP únicamente con `allowInsecureHttp=true` para laboratorio;
- rechaza credenciales embebidas en URL;
- rechaza redirects automáticos;
- usa `Authorization: Bearer ...`;
- aplica timeout/cancelación;
- no incluye body de GLPI en errores HTTP;
- no agrega tokens a URL, evidence ni descriptor público.

La obtención/renovación del token continúa desacoplada mediante `GlpiAccessTokenProvider`.

### Lectura `Assets/Computer`

La colección se pagina con parámetros GLPI `start` y `limit`.

El adapter aplica:

- page size acotado;
- máximo total configurable;
- detección de IDs duplicados entre páginas;
- error ante truncamiento potencial;
- validación de que el payload sea un array;
- validación mínima de cada registro antes del mapping.

### Taxonomía v2 y mapping GLPI

El mapping vive en `services/api/src/taxonomy.ts`. La regla arquitectónica es:

```text
GLPI item type != NEXUS assetClass
GLPI Type != NEXUS role
hardware shape != NEXUS domain
```

GLPI permite que `ComputerType` sea configurable. NEXUS no presupone que todos los `Computer` sean IT ni trata los nombres de Type como un estándar universal.

Reglas iniciales gobernadas:

```text
Notebook/Laptop/Desktop/Workstation
  -> taxonomy: unclassified / unclassified / unclassified
  -> hardware genérico no determina domain, clase canónica ni función

Server/Physical Server
  -> taxonomy: unclassified / unclassified / unclassified
  -> hardware genérico no determina domain, clase canónica ni función

Engineering Workstation/Industrial Workstation
  -> OT / industrial_compute / engineering_workstation
  -> reviewRequired=true

HMI/Human Machine Interface/Operator Station
  -> OT / operator_interface / supervision
  -> reviewRequired=true

Historian/Historian Server
  -> OT / industrial_compute / historian
  -> reviewRequired=true
```

Los aliases OT con semántica operacional explícita se normalizan como candidatos concretos, pero siguen requiriendo revisión porque `ComputerType` continúa siendo configurable por la instancia GLPI.

Casos no resueltos:

```text
Computer sin Type
  -> taxonomy: unknown / unknown / unknown

Computer con Type genérico de hardware
  -> taxonomy: unclassified / unclassified / unclassified

Computer con Type sin regla
  -> taxonomy: unclassified / unclassified / unclassified

item type futuro sin mapping
  -> taxonomy: unclassified / unclassified / unclassified
```

No se infiere clasificación desde hostname, modelo, fabricante ni coincidencias parciales.

### Bridge temporal para V02-008/V02-011

El contrato base `0.2` todavía exige scalars `domain`, `assetClass` y `role`. Para no romper consumidores legacy, `projectGlpiTaxonomyForLegacyScalars()` mantiene temporalmente:

```text
assessment resuelto
  -> scalars del assessment
  -> nexus.taxonomy.compatibilityProjection = false

assessment no resuelto
  -> scalars IT / endpoint / user_endpoint
  -> nexus.taxonomy.compatibilityProjection = true
  -> projectionRuleId = glpi.computer.compatibility-projection
```

El fallback **no cambia el assessment**. Un asset puede mostrar scalars legacy y seguir estando `unknown`, `unclassified` o `conflict` en taxonomía v2.

El adapter expone bajo `attributes`:

```text
nexus.taxonomy.version
nexus.taxonomy.<dimension>.state
nexus.taxonomy.<dimension>.ruleId
nexus.taxonomy.<dimension>.reviewRequired
nexus.taxonomy.compatibilityProjection
nexus.taxonomy.projectionRuleId
```

### Gate v2

El provider GLPI valida antes de devolver el snapshot:

```text
validateTechnologySnapshot(snapshot)
validateTechnologySnapshotTaxonomy(snapshot)
```

El primer gate mantiene compatibilidad de schema `0.2`; el segundo verifica assessment v2, invariantes y operational contexts.

### Identificadores y metadata

Identificadores preservados cuando existen:

```text
serial      -> serial_number
otherserial -> asset_tag
uuid        -> hardware_uuid
```

Metadata adicional se conserva bajo atributos `glpi.*`, incluyendo timestamps y referencias de status/entity/manufacturer/location/type/model cuando el payload las entrega.

Cada asset conserva `SourceReference.source=glpi`, `entityType=Computer`, `sourceScope=Assets/Computer`, provenance y evidencia segura `api_response`.

La identidad NEXUS se deriva de forma determinista y namespaced desde fuente + colección + externalId. Reconciliation multisource posterior preserva ese id canónico ancla.

## Reconciliation y taxonomy

V02-010 hace que `projectCanonicalAsset()` sea consciente de los campos añadidos por la taxonomía:

- preserva/reconstruye `TechnologyTaxonomyAssessment`;
- fusiona `operationalContexts` de forma determinista;
- mantiene el assessment asociado al claim elegido cuando la política resuelve una discrepancia;
- crea `state=conflict` cuando una discrepancia taxonómica queda sin resolver;
- usa `unclassified` si el claim seleccionado es legacy y carece de assessment v2;
- conserva claims/provenance alternativos en el envelope de reconciliación.

Así reconciliar una nueva fuente no borra la explicación de cómo se clasificó el activo.

## GLPI Service Identity & RBAC

### Restricción de GLPI 11

La documentación oficial de GLPI 11 indica que Client Credentials sólo está soportado para `scope=inventory`. Los recursos generales de High-Level API requieren un usuario autenticado y `scope=api`.

Por eso el runtime utiliza:

```text
grant_type=password
scope=api
```

### Token endpoint

El access token se obtiene en:

```text
POST <glpi-root>/api.php/token
Content-Type: application/x-www-form-urlencoded
```

`createGlpiPasswordGrantAccessTokenProvider()`:

- usa Password Grant + scope fijo `api`;
- recibe Client ID y username como configuración no secreta;
- obtiene `client_secret` y password mediante `GlpiCredentialSource`;
- exige HTTPS salvo opt-in de laboratorio;
- rechaza redirects;
- descarta bodies de error;
- valida `Bearer`, `access_token` y `expires_in`;
- mantiene el access token sólo en memoria;
- renueva antes de expiración con skew configurable;
- deduplica adquisiciones concurrentes;
- no usa ni persiste refresh tokens.

### Secret source

El backend de laboratorio incluido es `createEnvironmentGlpiCredentialSource()`.

Los secretos:

```text
NEXUS_GLPI_OAUTH_CLIENT_SECRET
NEXUS_GLPI_SERVICE_PASSWORD
```

no forman parte de `ApiConfig`.

### RBAC mínimo esperado en GLPI

Perfil sugerido:

```text
NEXUS API Read-Only
```

Baseline inicial:

```text
Assets > Computers > Read
```

Sin Create/Update/Delete/Purge y sin permisos administrativos/setup innecesarios.

La autorización usuario + perfil + entidad debe limitarse a las entidades realmente necesarias. La recursividad sólo se usa cuando exista un requerimiento explícito de lectura sobre entidades hijas.

Ver [runbook de GLPI Service Identity](../../docs/integrations/glpi-service-identity.md).

## Descriptor y capabilities

`TechnologyProviderDescriptor` publica sólo metadata declarativa:

```text
id
mode
displayName
availability
capabilities
sourceSystems
```

La capability inicial es:

```text
technology.snapshot.read
```

El descriptor no contiene tokens, credenciales, URLs privadas de upstream ni configuración secreta.

## Seguridad de rutas

Las rutas de dominio `/api` y `/api/*` deben declarar explícitamente una política:

- `public`;
- `authenticated`;
- `permission`.

Registrar una ruta de esa frontera sin policy falla tempranamente. El `AuthenticationProvider` por defecto no autentica a nadie y la autorización usa permisos efectivos de `SecurityPrincipal`.

Permisos baseline:

```text
technology:read
technology:operate
audit:read
security:admin
```

## Configuración del runtime HTTP

| Variable | Default | Descripción |
| --- | --- | --- |
| `NEXUS_API_ENV` | `development` | `development`, `test` o `production` |
| `NEXUS_API_HOST` | `127.0.0.1` | host de escucha |
| `NEXUS_API_PORT` | `3100` | puerto 1..65535 |
| `NEXUS_API_LOG_LEVEL` | `info` (`silent` en test) | nivel Pino |
| `NEXUS_API_CORS_ORIGINS` | vacío | origins permitidas separadas por coma |
| `NEXUS_API_BODY_LIMIT_BYTES` | `1048576` | límite de body |
| `NEXUS_API_REQUEST_TIMEOUT_MS` | `30000` | timeout de recepción HTTP |
| `NEXUS_API_RATE_LIMIT_MAX` | `120` | requests por ventana/clave |
| `NEXUS_API_RATE_LIMIT_WINDOW_MS` | `60000` | ventana de rate limiting |
| `NEXUS_API_TRUST_PROXY` | vacío | IP/CIDR de proxies confiables |
| `NEXUS_PROVIDER_MODE` | `demo` en dev/test | `demo` o `live`; obligatorio en `production` |

## Configuración GLPI Live no secreta

Requerida cuando el runtime real arranca con `NEXUS_PROVIDER_MODE=live`:

| Variable | Default | Descripción |
| --- | --- | --- |
| `NEXUS_GLPI_BASE_URL` | — | raíz GLPI; HTTPS por defecto |
| `NEXUS_GLPI_OAUTH_CLIENT_ID` | — | OAuth Client ID de NEXUS |
| `NEXUS_GLPI_SERVICE_USERNAME` | — | usuario técnico dedicado |
| `NEXUS_GLPI_REQUEST_TIMEOUT_MS` | `10000` | timeout OAuth + API GLPI |
| `NEXUS_GLPI_TOKEN_REFRESH_SKEW_SECONDS` | `60` | anticipación de renovación |
| `NEXUS_GLPI_PAGE_SIZE` | `100` | tamaño de página de Computer |
| `NEXUS_GLPI_MAX_RECORDS` | `10000` | safety bound del snapshot |
| `NEXUS_GLPI_ALLOW_INSECURE_HTTP` | `false` | sólo laboratorio; `true` prohibido en production |

## Secretos GLPI del backend de laboratorio

```text
NEXUS_GLPI_OAUTH_CLIENT_SECRET
NEXUS_GLPI_SERVICE_PASSWORD
```

Se leen mediante `GlpiCredentialSource`; no se incorporan a `ApiConfig`, descriptor ni respuestas.

No versionar archivos `.env` con valores reales. El secret manager corporativo definitivo queda reservado para la etapa de infraestructura corporativa (conceptualmente v0.5).

### CORS

CORS es deny-by-default. No se acepta `*`, no se reflejan origins dinámicamente y en `production` las origins configuradas deben usar HTTPS.

### Trust proxy

`trustProxy=false` por defecto. Sólo se aceptan IP/CIDR explícitos y nunca redes globales `/0`.

## Security headers

Helmet aplica headers apropiados para una API JSON. HSTS permanece desactivado hasta que TLS/reverse proxy sea una propiedad real del despliegue; CSP no aplica a esta API JSON y CORP global se mantiene desactivado para no contradecir una CORS allowlist válida.

Todas las respuestas actuales usan `Cache-Control: no-store`.

## Rate limiting y consumo de recursos

El limiter usa `request.ip`; `/health` y `/ready` quedan exentos. El store actual es en memoria por proceso y no se presenta como protección distribuida.

El runtime fija `bodyLimit` y `requestTimeout`; el adapter GLPI agrega además timeout propio de upstream y límites de paginación.

## Errores, logging y auditoría

Las respuestas de error mantienen:

```text
code
statusCode
message
requestId
```

Fastify no usa request logging automático. NEXUS registra método, route pattern y status, evitando persistir URL/query cruda. Headers sensibles se redactan y los security audit events no incluyen bearer tokens, cookies, API keys, bodies ni query strings crudas.

El transporte GLPI nunca copia el body de un upstream fallido a `GlpiRequestError`. El token provider tampoco copia bodies OAuth ni valores del secret source a errores.

## Desarrollo y QA

Desde la raíz:

```bash
npm run typecheck --workspace @igx-nexus/types
npm run test --workspace @igx-nexus/types
npm run build --workspace @igx-nexus/types
npm run typecheck --workspace @igx-nexus/api
npm run test --workspace @igx-nexus/api
npm run build --workspace @igx-nexus/api
npm pack --dry-run --workspace @igx-nexus/api
npm audit --audit-level=high
```

Los tests GLPI utilizan exclusivamente fixtures sintéticos, credenciales ficticias y transportes/fetches in-memory; no requieren acceso a una instancia corporativa.

V02-010 añade pruebas para:

- invariantes IT/OT;
- Type conocido/missing/unmapped;
- bridge legacy explícito;
- gate taxonómico en Demo y Live;
- mapping HMI/historian/engineering workstation;
- preservación de taxonomy durante reconciliation;
- conflicto taxonómico multisource;
- fusión de operational contexts;
- compatibilidad con activos legacy sin assessment.

## Límites actuales

V02-010 **no implementa ni simula**:

- login o Entra SSO/OIDC real para callers de NEXUS;
- secret manager corporativo definitivo;
- mappings completos de NetworkEquipment/Printer/Monitor/Phone u otros tipos GLPI;
- migración completa del dataset Web v0.1;
- integración Intune real;
- UI/persistencia de revisión manual taxonómica;
- modelado completo Purdue/ISA-95 o zones/conduits;
- autorización NEXUS por objeto;
- TLS, reverse proxy, DNS o WAF;
- despliegue productivo;
- escritura a GLPI.

Ver [ADR-0013 — Baseline de seguridad](../../docs/architecture/adr-0013-api-security-baseline.md), [ADR-0014 — Provider Mode Contract](../../docs/architecture/adr-0014-provider-mode-contract.md), [ADR-0015 — GLPI API v2 Adapter](../../docs/architecture/adr-0015-glpi-api-v2-adapter.md), [ADR-0016 — GLPI Service Identity & RBAC](../../docs/architecture/adr-0016-glpi-service-identity-rbac.md), [ADR-0019 — Provenance & Reconciliation](../../docs/architecture/adr-0019-provenance-reconciliation.md), [ADR-0020 — IT/OT Taxonomy v2](../../docs/architecture/adr-0020-it-ot-taxonomy-v2.md), [taxonomía v2](../../docs/taxonomy-v2.md) y [Threat Model v0.2](../../docs/security/threat-model-v0.2.md).