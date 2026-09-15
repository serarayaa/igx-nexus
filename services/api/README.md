# NEXUS API

`@igx-nexus/api` es la frontera HTTP de backend de **IGX NEXUS v0.2 — Technology Intelligence**.

V02-002 creó el runtime real, V02-003 incorporó el baseline de seguridad y **V02-004 — Provider Mode Contract** desacopla el origen de datos del producto antes de conectar GLPI u otras fuentes reales.

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
   `-- Live Provider -> adapters futuros
```

La Web no debe acceder a tablas internas de GLPI/MariaDB ni conocer detalles de adapters. Autenticación/autorización y selección del provider son responsabilidad del servidor.

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

`buildApp()` compone el servidor sin abrir un socket y permite inyectar `AuthenticationProvider` y `TechnologyProvider` en tests. `startServer()` es el único bootstrap que escucha host/puerto y registra shutdown ordenado.

## Endpoints base

| Método | Ruta | Propósito | Política actual |
| --- | --- | --- | --- |
| GET | `/health` | liveness del proceso y estado declarado del provider | pública, exenta de rate limit |
| GET | `/ready` | readiness del runtime + provider | pública, exenta de rate limit |
| GET | `/api/v1` | metadata/versionado HTTP | pública, rate-limited |
| GET | `/api/v1/provider` | descriptor público del provider activo | pública, rate-limited |
| GET | `/openapi.json` | contrato OpenAPI generado | pública, rate-limited |

Todavía no existen endpoints productivos de activos. V02-004 define la frontera de datos; V02-005 incorporará el primer adapter real.

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

### Live

`live` no cae nunca automáticamente a Demo. Mientras V02-005 no entregue un adapter real, el provider Live se declara `unavailable`:

- `/health` sigue respondiendo 200 porque el proceso está vivo;
- `/ready` responde 503 porque el servicio no está apto para operar en modo Live;
- `getSnapshot()` del placeholder Live falla con `ProviderUnavailableError`;
- no se presentan datos sintéticos como si fueran datos reales.

Un provider Live inyectado en composición debe declarar `mode=live`, disponibilidad coherente y la capability requerida para leer el snapshot.

### Descriptor y capabilities

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

## Configuración

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

Valores inválidos fallan durante bootstrap. `production` exige `NEXUS_PROVIDER_MODE` explícito para evitar ejecutar Demo accidentalmente.

### CORS

CORS es deny-by-default. No se acepta `*`, no se reflejan origins dinámicamente y en `production` las origins configuradas deben usar HTTPS.

### Trust proxy

`trustProxy=false` por defecto. Sólo se aceptan IP/CIDR explícitos y nunca redes globales `/0`.

## Security headers

Helmet aplica headers apropiados para una API JSON. HSTS permanece desactivado hasta que TLS/reverse proxy sea una propiedad real del despliegue; CSP no aplica a esta API JSON y CORP global se mantiene desactivado para no contradecir una CORS allowlist válida.

Todas las respuestas actuales usan `Cache-Control: no-store`.

## Rate limiting y consumo de recursos

El limiter usa `request.ip`; `/health` y `/ready` quedan exentos. El store actual es en memoria por proceso y no se presenta como protección distribuida.

El runtime fija `bodyLimit` y `requestTimeout`; adapters futuros deben agregar sus propios timeouts/cancelación de upstream.

## Errores, logging y auditoría

Las respuestas de error mantienen:

```text
code
statusCode
message
requestId
```

Fastify no usa request logging automático. NEXUS registra método, route pattern y status, evitando persistir URL/query cruda. Headers sensibles se redactan y los security audit events no incluyen bearer tokens, cookies, API keys, bodies ni query strings crudas.

## Desarrollo y QA

Desde la raíz:

```bash
npm run typecheck --workspace @igx-nexus/api
npm run test --workspace @igx-nexus/api
npm run build --workspace @igx-nexus/api
npm pack --dry-run --workspace @igx-nexus/api
npm audit --audit-level=high
```

Por defecto la API escucha sólo en `127.0.0.1:3100`.

## Límites actuales

V02-004 **no implementa ni simula**:

- login o Entra SSO/OIDC real;
- OAuth/credenciales GLPI;
- adapter GLPI API v2;
- Intune/Entra/Windows/Dell providers;
- migración completa del dataset Web v0.1;
- reconciliación multisource;
- autorización por objeto;
- TLS, reverse proxy, DNS o WAF;
- secrets manager corporativo;
- despliegue productivo.

Ver [ADR-0013 — Baseline de seguridad](../../docs/architecture/adr-0013-api-security-baseline.md), [ADR-0014 — Provider Mode Contract](../../docs/architecture/adr-0014-provider-mode-contract.md) y [Threat Model v0.2](../../docs/security/threat-model-v0.2.md).
