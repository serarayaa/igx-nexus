# NEXUS API

`@igx-nexus/api` es la frontera HTTP de backend de **IGX NEXUS v0.2 — Technology Intelligence**.

V02-002 creó el runtime real, V02-003 incorporó el baseline de seguridad, V02-004 desacopló Demo/Live mediante `TechnologyProvider` y **V02-005 — GLPI API v2 Adapter** incorpora el primer adapter Live read-only.

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
```

La Web no accede a tablas internas de GLPI/MariaDB ni conoce tipos del adapter. GLPI sigue siendo System of Record CMDB/ITAM; NEXUS normaliza sus registros al modelo canónico antes de que participen en lógica de producto.

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

`buildApp()` compone el servidor sin abrir un socket y permite inyectar `AuthenticationProvider` y `TechnologyProvider` en tests. `startServer()` es el único bootstrap que escucha host/puerto y registra shutdown ordenado.

## Endpoints base

| Método | Ruta | Propósito | Política actual |
| --- | --- | --- | --- |
| GET | `/health` | liveness del proceso y estado declarado del provider | pública, exenta de rate limit |
| GET | `/ready` | readiness del runtime + disponibilidad efectiva del provider | pública, exenta de rate limit |
| GET | `/api/v1` | metadata/versionado HTTP | pública, rate-limited |
| GET | `/api/v1/provider` | descriptor público del provider activo | pública, rate-limited |
| GET | `/openapi.json` | contrato OpenAPI generado | pública, rate-limited |

Todavía no existen endpoints productivos de activos. V02-008 agregará el primer vertical Live de producto después de Service Identity y Live Lab.

## Provider Mode

Los modos soportados son:

```text
demo
live
```

La selección se realiza una sola vez durante composición mediante `NEXUS_PROVIDER_MODE`.

### Demo

`demo` usa un provider canónico mínimo sobre identidades sintéticas existentes. Actualmente normaliza un subconjunto deliberado de la demo v0.1 (`DEMO-0007` y `DEMO-0013`) al `TechnologySnapshot` v0.2 y conserva `SourceReference.source = demo`.

La NEXUS API **no importa código desde `apps/web`**. El catálogo completo de 240 CIs continúa en la Web v0.1 hasta V02-011 — Demo Dataset v0.2 Migration.

### Live / GLPI

V02-005 implementa GLPI como provider Live inyectable. El adapter no se activa automáticamente por variables de entorno porque la identidad técnica/OAuth productiva pertenece a V02-006.

La composición esperada es:

```text
GlpiAccessTokenProvider
        |
        v
GlpiApiTransport (GET-only)
        |
        v
createGlpiLiveTechnologyProvider
        |
        v
TechnologyProvider
```

`live` nunca cae automáticamente a Demo.

### Readiness dinámica

`TechnologyProvider` admite `checkAvailability()` para providers con dependencias aguas arriba.

El provider GLPI usa un probe mínimo y read-only:

```text
GET Assets/Computer?start=0&limit=1
```

Con GLPI inaccesible, token inválido o payload incompatible:

- `/health` permanece 200 porque el proceso sigue vivo;
- `/ready` responde 503;
- no se propagan detalles del upstream;
- no se presenta Demo como sustituto.

## GLPI API v2 Adapter

### Versión

V02-005 soporta explícitamente:

```text
v2.3
```

El transporte construye rutas bajo:

```text
<glpi-root>/api.php/v2.3/
```

No consume una versión flotante y no usa `apirest.php` legacy.

### Transporte

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

La obtención/renovación del token es una dependencia inyectada (`GlpiAccessTokenProvider`) y queda fuera de este ticket.

### Lectura `Assets/Computer`

La colección se pagina con parámetros GLPI `start` y `limit`.

El adapter aplica:

- page size acotado;
- máximo total configurable;
- detección de IDs duplicados entre páginas;
- error ante truncamiento potencial;
- validación de que el payload sea un array;
- validación mínima de cada registro antes del mapping.

### Mapping canónico

El primer mapping es deliberadamente conservador:

```text
GLPI Computer
  -> domain: IT
  -> assetClass: compute
  -> role: custom:glpi-computer
  -> lifecycle: unknown
  -> criticality: unknown
```

No se infiere laptop/server/desktop desde strings de GLPI y no se traduce un status localizado a lifecycle NEXUS todavía.

Identificadores preservados cuando existen:

```text
serial      -> serial_number
otherserial -> asset_tag
uuid        -> hardware_uuid
```

Metadata adicional se conserva bajo atributos `glpi.*`, incluyendo timestamps y referencias de status/entity/manufacturer/location/type/model cuando el payload las entrega.

Cada asset conserva `SourceReference.source=glpi`, `entityType=Computer`, `sourceScope=Assets/Computer`, provenance y evidencia segura `api_response`.

La identidad NEXUS se deriva de forma determinista y namespaced desde fuente + colección + externalId. V02-009 revisará la reconciliación multisource definitiva.

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

V02-005 **no agrega variables con secretos GLPI**. Endpoint, token provider y transporte Live se inyectan en composición hasta que V02-006 defina la identidad técnica y su configuración segura.

Valores inválidos del runtime fallan durante bootstrap. `production` exige `NEXUS_PROVIDER_MODE` explícito para evitar ejecutar Demo accidentalmente.

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

El transporte GLPI nunca copia el body de un upstream fallido a `GlpiRequestError`.

## Desarrollo y QA

Desde la raíz:

```bash
npm run typecheck --workspace @igx-nexus/api
npm run test --workspace @igx-nexus/api
npm run build --workspace @igx-nexus/api
npm pack --dry-run --workspace @igx-nexus/api
npm audit --audit-level=high
```

Los tests GLPI utilizan exclusivamente fixtures sintéticos y transportes in-memory; no requieren acceso a una instancia corporativa.

## Límites actuales

V02-005 **no implementa ni simula**:

- login o Entra SSO/OIDC real;
- creación/configuración de OAuth Client GLPI;
- usuario técnico/RBAC/rotación de credenciales GLPI;
- GLPI Agent Live Lab;
- NetworkEquipment/Printer/Monitor/Phone u otros tipos GLPI;
- endpoints productivos de assets;
- migración completa del dataset Web v0.1;
- reconciliación multisource;
- taxonomía IT/OT definitiva;
- autorización por objeto;
- TLS, reverse proxy, DNS o WAF;
- secrets manager corporativo;
- despliegue productivo.

Ver [ADR-0013 — Baseline de seguridad](../../docs/architecture/adr-0013-api-security-baseline.md), [ADR-0014 — Provider Mode Contract](../../docs/architecture/adr-0014-provider-mode-contract.md), [ADR-0015 — GLPI API v2 Adapter](../../docs/architecture/adr-0015-glpi-api-v2-adapter.md) y [Threat Model v0.2](../../docs/security/threat-model-v0.2.md).
