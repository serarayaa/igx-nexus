# ADR-0013 — Baseline de seguridad de NEXUS API

Estado: **Propuesto en V02-003 / issue #46 / PR #47**. Este ADR queda aceptado únicamente cuando dicho PR sea integrado manualmente a `main`.

## Contexto

V02-002 creó el primer runtime HTTP real de NEXUS API. Antes de conectar GLPI, Intune, Entra, credenciales de servicio o providers Live, la frontera necesita controles que fallen de forma segura incluso cuando todavía no existe un proveedor de identidad productivo.

El objetivo de V02-003 no es “hacer producción” ni implementar Entra SSO. Es establecer contratos y defaults que eviten que tickets posteriores introduzcan rutas públicas por accidente, confíen en headers no verificados, filtren secretos o consuman recursos sin límites.

El diseño toma como referencia los riesgos relevantes de **OWASP API Security Top 10 2023**, especialmente Broken Authentication, Broken Object/Function Level Authorization, Unrestricted Resource Consumption y Security Misconfiguration.

## Decisión

### 1. Autenticación desacoplada y deny-by-default

NEXUS API define `AuthenticationProvider` y `SecurityPrincipal` como contratos internos independientes de Entra/OIDC u otro proveedor.

El provider por defecto no autentica a nadie. No existe:

- usuario local de desarrollo;
- bearer token fijo;
- API key maestra;
- header de bypass;
- variable de entorno que desactive autenticación.

Los tests pueden inyectar programáticamente un provider sintético mediante `buildApp()`. Esa capacidad no está expuesta por configuración de runtime.

### 2. Autorización por permisos efectivos

Las políticas de ruta son:

```text
public
authenticated
permission(<NexusPermission>)
```

Una ruta `/api` o `/api/*` debe declarar su política al registrarse. Si no lo hace, el runtime falla temprano.

La autorización usa permisos efectivos del principal, no nombres de roles hardcodeados. Los roles permanecen como metadata que un proveedor futuro podrá mapear a permisos.

Permisos baseline:

```text
technology:read
technology:operate
audit:read
security:admin
```

La lista crecerá sólo cuando existan operaciones reales que necesiten distinguirse.

### 3. Endpoints runtime actuales permanecen públicos de forma explícita

`/health`, `/ready`, `/api/v1` y `/openapi.json` no exponen datos corporativos ni operaciones de dominio en V02-003, por lo que se marcan explícitamente como públicos.

`/health` y `/ready` quedan además exentos de rate limiting para no romper health probes.

La condición “público” no se hereda a futuros endpoints: las rutas de frontera API deben declarar policy.

### 4. CORS es allowlist, no mecanismo de autenticación

Se incorpora `@fastify/cors` con default deny-cross-origin.

- origins vacías → no se autoriza acceso cross-site;
- wildcard `*` está prohibido;
- no hay reflection dinámica de Origin;
- en producción sólo se aceptan origins HTTPS;
- `credentials=false` mientras no exista auth basada en cookies.

CORS reduce exposición desde browsers, pero **no autentica clientes**. Un cliente fuera del navegador puede llamar la API directamente y debe ser controlado por autenticación/autorización.

### 5. Security headers se adaptan a una API JSON

Se incorpora `@fastify/helmet`.

No se habilita ciegamente cada política por defecto:

- `HSTS` queda desactivado hasta que TLS/reverse proxy sea una propiedad real del despliegue v0.3;
- `CSP` queda desactivado porque la API no sirve HTML;
- `Cross-Origin-Resource-Policy` queda desactivado para no contradecir una CORS allowlist válida del futuro frontend.

Se mantienen headers útiles para respuestas HTTP de API, y todas las respuestas actuales usan `Cache-Control: no-store`.

### 6. Consumo de recursos queda limitado

Fastify recibe límites explícitos:

```text
bodyLimit       = 1 MiB por defecto
requestTimeout  = 30 s por defecto
```

`requestTimeout` limita la recepción de la request HTTP; no sustituye timeouts/cancelación de llamadas a adapters futuros.

Se agrega `@fastify/rate-limit` con default de 120 requests por 60 s y clave `request.ip`.

El store de rate limiting de V02-003 es en memoria y por proceso. Es aceptable para desarrollo/Live Lab, pero **no es una mitigación distribuida** y deberá revisarse antes de un despliegue multi-instancia.

### 7. `trustProxy` es cerrado por defecto

`trustProxy=false` salvo que `NEXUS_API_TRUST_PROXY` declare IP/CIDR explícitos.

No se admite `true`, wildcard, hostname arbitrario ni una red global `/0`. La razón es que habilitar confianza en proxies cambia cómo Fastify interpreta `X-Forwarded-*`, lo que afecta IP del cliente, auditoría y rate limiting.

Las pruebas verifican que un `X-Forwarded-For` falso se ignora por defecto y sólo se utiliza detrás de un proxy explícitamente confiable.

### 8. Logging y auditoría minimizan datos

El request logging automático de Fastify se desactiva. NEXUS emite un log HTTP propio que registra sólo:

```text
method
route pattern
status code
```

De este modo no se persiste la URL/query cruda por defecto.

Se generan security audit events estructurados para:

- autenticación denegada;
- error del proveedor de autenticación;
- autorización denegada;
- rate limit excedido.

Un evento puede contener:

```text
requestId
method
route pattern
remoteIp
principal subject (si existe)
required permission (si aplica)
```

No se guarda el URL crudo cuando el route pattern no está disponible; se usa un marcador seguro. Tampoco se incluyen Authorization, cookies, API keys, body ni query string cruda.

Las excepciones arbitrarias no se serializan completas en logs de request/auth: se registra metadata acotada como tipo, status y código seguro cuando aplica.

### 9. Errores fallan cerrados y no filtran implementación

Se mantienen respuestas pequeñas y correlacionables mediante request ID.

401/403/413/429 usan códigos estables y mensajes seguros. Fallas internas o del proveedor de identidad se responden como error interno sin stack ni detalle de upstream.

### 10. Dependencias se auditan en CI

CI agrega:

```text
npm audit --audit-level=high
```

Esto no reemplaza análisis de supply chain más completo ni V02-028; establece una barrera mínima inmediata antes de integrar nuevas fuentes.

## Threat model y fronteras

El threat model vivo de v0.2 queda en:

- [`docs/security/threat-model-v0.2.md`](../security/threat-model-v0.2.md)

Debe actualizarse cuando aparezcan nuevos trust boundaries, especialmente:

- Entra/OIDC real;
- GLPI API/OAuth;
- Provider Mode;
- endpoints de assets;
- adapters de Intune/Graph;
- reverse proxy/TLS;
- multi-instancia.

## Consecuencias positivas

- futuras rutas de frontera API no pueden quedar sin policy por omisión;
- un runtime sin IdP configurado falla cerrado;
- la lógica de autorización no queda acoplada a Entra ni a nombres de roles;
- CORS, proxy trust y resource limits dejan de depender de defaults implícitos;
- rate limiting, body limit y timeout reducen abuso básico de recursos;
- logs y auditoría de seguridad nacen con minimización de datos;
- V02-004/V02-005/V02-006 pueden construir sobre una frontera estable.

## Costos y riesgos aceptados

- el rate limit en memoria no coordina múltiples procesos;
- no existe autenticación real todavía, por lo que ninguna ruta de dominio protegida puede usarse en Live hasta conectar un provider legítimo;
- no existe aún autorización por objeto, porque todavía no hay endpoints productivos de assets;
- CORS no protege clientes no-browser;
- TLS/HSTS depende del futuro despliegue corporativo;
- `requestTimeout` no sustituye timeouts de upstream;
- `npm audit` es una señal de dependencia, no una garantía de ausencia de vulnerabilidades.

## Fuera de alcance

- Entra SSO/OIDC productivo;
- emisión o validación definitiva de tokens;
- cuentas locales/passwords;
- API keys como identidad de usuario;
- OAuth o service identity GLPI;
- Provider Mode Demo/Live;
- autorización por objeto/tenant sobre assets;
- cookie auth / CSRF;
- TLS, DNS, reverse proxy o WAF;
- secrets manager corporativo;
- despliegue productivo.

## Relación con ADR anteriores

- ADR-0001 permanece vigente: NEXUS API aísla la Web de sistemas aguas arriba.
- ADR-0011 permanece vigente: identidad y dominio NEXUS son independientes de fuentes.
- ADR-0012 permanece vigente: Fastify es el runtime y `buildApp()`/`startServer()` continúan separados.

V02-003 endurece esa frontera sin cambiar las responsabilidades definidas por esos ADR.
