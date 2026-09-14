# NEXUS API

`@igx-nexus/api` es la frontera HTTP de backend de **IGX NEXUS v0.2 — Technology Intelligence**.

V02-002 creó el runtime real. **V02-003 — API Security Baseline** agrega la frontera de seguridad necesaria antes de conectar providers Live, identidades reales o credenciales de fuentes corporativas.

## Arquitectura

```text
NEXUS Web
   |
   v
NEXUS API (este workspace)
   |
   v
adapters / integrations   ← tickets posteriores
```

La Web no debe acceder a tablas internas de GLPI/MariaDB ni saltarse esta frontera. Autenticación y autorización son responsabilidad del servidor; la UI puede adaptar la experiencia, pero nunca concede permisos.

## Runtime

- Node.js 24
- TypeScript ESM / `NodeNext`
- Fastify 5
- logging estructurado Pino
- OpenAPI 3.0.3 generado mediante `@fastify/swagger`
- security headers mediante `@fastify/helmet`
- CORS explícito mediante `@fastify/cors`
- rate limiting mediante `@fastify/rate-limit`
- contratos canónicos importados desde `@igx-nexus/types`

`buildApp()` compone el servidor sin abrir un socket y permite tests mediante `Fastify.inject()`. `startServer()` es el único bootstrap que escucha host/puerto y registra shutdown ordenado para `SIGTERM` / `SIGINT`.

## Endpoints base

| Método | Ruta | Propósito | Política actual |
| --- | --- | --- | --- |
| GET | `/health` | liveness del proceso | pública, exenta de rate limit |
| GET | `/ready` | readiness del runtime actual | pública, exenta de rate limit |
| GET | `/api/v1` | metadata/versionado HTTP | pública, rate-limited |
| GET | `/openapi.json` | contrato OpenAPI generado | pública, rate-limited |

Todavía no existen endpoints productivos de activos: se agregarán cuando Provider Mode y adapters reales definan su comportamiento.

## Seguridad de rutas

Las rutas de dominio `/api` y `/api/*` deben declarar explícitamente una política de seguridad:

- `public` — acceso sin identidad;
- `authenticated` — requiere una identidad válida;
- `permission` — requiere identidad y un permiso efectivo concreto.

Registrar una ruta de esa frontera sin política falla de forma temprana. Esto evita que una ruta futura quede pública simplemente porque alguien olvidó agregar un hook.

El contrato `AuthenticationProvider` está desacoplado del proveedor de identidad. El provider por defecto **no autentica a nadie**. Los tests pueden inyectar un provider sintético mediante `buildApp({ authenticationProvider })`, pero no existe variable de entorno, header o token de desarrollo que habilite un bypass.

La autorización se evalúa por permisos efectivos de `SecurityPrincipal`, no por nombres de rol hardcodeados. Los roles se conservan como metadata para futuros mappers de identidad.

Permisos baseline:

```text
technology:read
technology:operate
audit:read
security:admin
```

Este vocabulario es deliberadamente pequeño y no reemplaza la definición posterior de permisos por objeto o por fuente.

## Configuración

| Variable | Default | Descripción |
| --- | --- | --- |
| `NEXUS_API_ENV` | `development` | `development`, `test` o `production` |
| `NEXUS_API_HOST` | `127.0.0.1` | host de escucha; loopback por defecto |
| `NEXUS_API_PORT` | `3100` | puerto 1..65535 |
| `NEXUS_API_LOG_LEVEL` | `info` (`silent` en test) | nivel Pino soportado |
| `NEXUS_API_CORS_ORIGINS` | vacío | origins permitidas separadas por coma |
| `NEXUS_API_BODY_LIMIT_BYTES` | `1048576` | límite de body; 1 MiB por defecto |
| `NEXUS_API_REQUEST_TIMEOUT_MS` | `30000` | timeout de recepción HTTP del runtime |
| `NEXUS_API_RATE_LIMIT_MAX` | `120` | requests permitidas por ventana/clave |
| `NEXUS_API_RATE_LIMIT_WINDOW_MS` | `60000` | ventana de rate limiting |
| `NEXUS_API_TRUST_PROXY` | vacío | IP/CIDR de proxies confiables, separados por coma |

Los valores inválidos fallan durante bootstrap.

### CORS

CORS es **deny-by-default**: si `NEXUS_API_CORS_ORIGINS` está vacío, la API no emite una autorización cross-origin. No se acepta `*` ni se reflejan origins dinámicamente. En `production`, las origins configuradas deben usar `https:`.

`credentials` permanece deshabilitado porque V02-003 no implementa autenticación por cookie. Si el mecanismo de identidad cambia, CSRF y la política CORS deberán revisarse explícitamente.

### Trust proxy

`trustProxy` permanece `false` por defecto. `NEXUS_API_TRUST_PROXY` sólo acepta IP/CIDR explícitos, rechaza redes globales `/0` y no admite trust-all. Esto es crítico porque `request.ip`, audit events y rate limiting dependen de la frontera de proxy.

No configurar una red amplia sólo para “hacer funcionar” `X-Forwarded-For`: deben declararse únicamente los proxies realmente controlados.

## Security headers

Helmet aplica headers apropiados para una API JSON. V02-003 desactiva deliberadamente:

- HSTS: TLS/reverse proxy pertenece al despliegue corporativo de v0.3;
- CSP: NEXUS API no sirve una aplicación HTML;
- Cross-Origin-Resource-Policy: una política global podría contradecir la allowlist CORS del futuro frontend.

La API agrega `Cache-Control: no-store` a las respuestas actuales y conserva protecciones como `X-Content-Type-Options` y referrer policy.

## Rate limiting y consumo de recursos

El rate limit es global para las rutas normales y usa `request.ip` como clave. `/health` y `/ready` quedan exentos para no romper probes de infraestructura.

El store actual es **en memoria por proceso**. Es suficiente para desarrollo/Live Lab v0.2, pero no es una defensa distribuida. Un despliegue con múltiples instancias deberá adoptar un store compartido o control equivalente en la infraestructura.

El runtime además fija `bodyLimit` y `requestTimeout` explícitos. El timeout protege la recepción de la request HTTP; adapters futuros deberán definir además sus propios timeouts/cancelación para llamadas aguas arriba.

## Errores, logging y auditoría

Las respuestas de error mantienen el contrato:

```text
code
statusCode
message
requestId
```

Códigos seguros relevantes:

- `AUTHENTICATION_REQUIRED` — 401;
- `FORBIDDEN` — 403;
- `PAYLOAD_TOO_LARGE` — 413;
- `RATE_LIMITED` — 429;
- errores 5xx — `INTERNAL_ERROR` sin mensaje interno.

Fastify no utiliza su logging automático de requests en este runtime. NEXUS emite un registro HTTP propio con **método, route pattern y status**, evitando persistir la URL/query cruda. Los errores arbitrarios tampoco se serializan completos: se registra metadata segura como tipo/status/código cuando aplica.

Los security audit events registran sólo contexto mínimo: request ID, método, route pattern, IP remota y, cuando existe, subject/permiso requerido. No incluyen bearer tokens, cookies, API keys, bodies ni query strings crudas.

El logger redacta preventivamente Authorization, cookies, API keys, tokens/secret headers comunes y `set-cookie`.

## Desarrollo y QA

Desde la raíz:

```bash
npm run typecheck --workspace @igx-nexus/api
npm run test --workspace @igx-nexus/api
npm run build --workspace @igx-nexus/api
npm pack --dry-run --workspace @igx-nexus/api
npm audit --audit-level=high
npm run start --workspace @igx-nexus/api
```

Por defecto la API escucha sólo en `127.0.0.1:3100`.

## Límites de V02-003

V02-003 **no implementa ni simula**:

- login o Entra SSO/OIDC real;
- emisión/validación productiva de tokens;
- cuentas locales o passwords;
- API keys de usuario;
- OAuth/credenciales GLPI;
- Provider Mode Demo/Live;
- autorización por objeto sobre assets que aún no existen en la API;
- auth basada en cookies / CSRF;
- TLS, reverse proxy, DNS o WAF;
- secrets manager corporativo;
- despliegue productivo.

Ver [ADR-0013 — Baseline de seguridad de NEXUS API](../../docs/architecture/adr-0013-api-security-baseline.md) y [Threat Model v0.2](../../docs/security/threat-model-v0.2.md).
