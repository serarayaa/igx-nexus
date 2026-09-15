# ADR-0016 — GLPI Service Identity & RBAC

Estado: **Aceptado en V02-006 (PR #56 / issue #55)**. Integrado manualmente a `main` mediante el merge `1ea04772fd4fa57e956f7797b2cb298730bad5bc`; CI post-merge #275 verde.

## Contexto

V02-005 incorporó el adapter read-only de GLPI 11 High-Level REST API y dejó la obtención del Bearer token detrás de `GlpiAccessTokenProvider`.

V02-006 debe resolver cómo NEXUS obtiene y renueva dicho token sin:

- versionar secretos;
- acoplar OAuth al mapping de activos;
- confundir la autenticación upstream con los callers de NEXUS;
- otorgar privilegios de escritura innecesarios.

La documentación oficial actual de GLPI 11 establece que el grant Client Credentials sólo está soportado para el scope `inventory`. El acceso general a High-Level API mediante scope `api` requiere un usuario autenticado. Para scripts automatizados GLPI documenta Password Grant como método soportado.

## Decisión

### 1. Usuario técnico real, no una service account ficticia

NEXUS utilizará un usuario técnico dedicado reconocido por GLPI.

No se implementará Client Credentials para `scope=api` mientras GLPI no lo soporte. Hacerlo produciría una arquitectura que no corresponde al comportamiento real del upstream.

### 2. Password Grant limitado a `scope=api`

El token se obtiene mediante:

```text
POST <glpi-root>/api.php/token
Content-Type: application/x-www-form-urlencoded

grant_type=password
client_id=<client-id>
client_secret=<secret>
username=<service-user>
password=<service-password>
scope=api
```

El endpoint de token no se versiona junto con los recursos. El consumo de activos continúa en:

```text
<glpi-root>/api.php/v2.3/Assets/Computer
```

### 3. Separación de fronteras

```text
Caller -> NEXUS AuthenticationProvider -> SecurityPrincipal
NEXUS  -> GlpiCredentialSource          -> credenciales upstream
NEXUS  -> GlpiAccessTokenProvider       -> Bearer token
NEXUS  -> GlpiApiTransport              -> GLPI v2.3
NEXUS  -> TechnologyProvider            -> TechnologySnapshot
```

La identidad de GLPI no autentica callers de NEXUS y el `TechnologyProvider` no administra secretos.

### 4. Secretos fuera de `ApiConfig`

`ApiConfig` mantiene únicamente configuración del runtime NEXUS y no contiene `client_secret` ni contraseña de servicio.

V02-006 introduce `GlpiCredentialSource` como frontera reemplazable. El backend inicial de laboratorio puede leer:

```text
NEXUS_GLPI_OAUTH_CLIENT_SECRET
NEXUS_GLPI_SERVICE_PASSWORD
```

pero esos valores quedan encapsulados fuera de `ApiConfig` y no se publican mediante endpoints, descriptors, evidence, provenance o logs.

Un secret manager corporativo podrá implementar la misma frontera en v0.3.

### 5. Configuración no secreta de Live

La composición Live utiliza:

```text
NEXUS_GLPI_BASE_URL
NEXUS_GLPI_OAUTH_CLIENT_ID
NEXUS_GLPI_SERVICE_USERNAME
NEXUS_GLPI_REQUEST_TIMEOUT_MS
NEXUS_GLPI_TOKEN_REFRESH_SKEW_SECONDS
NEXUS_GLPI_PAGE_SIZE
NEXUS_GLPI_MAX_RECORDS
NEXUS_GLPI_ALLOW_INSECURE_HTTP
```

`NEXUS_GLPI_ALLOW_INSECURE_HTTP=true` es sólo una excepción de laboratorio y se rechaza en `production`.

### 6. Cache y renovación

El access token se mantiene sólo en memoria.

El provider OAuth:

- respeta `expires_in`;
- renueva antes de expiración usando un skew configurable;
- deduplica adquisiciones concurrentes;
- no persiste refresh tokens;
- vuelve a ejecutar Password Grant cuando necesita un token nuevo.

Un fallo de adquisición se normaliza como error de autenticación y no copia body de upstream, credenciales ni token.

### 7. Least privilege en GLPI

Perfil sugerido:

```text
NEXUS API Read-Only
```

Baseline inicial:

```text
Assets > Computers > Read
```

No se requiere Create, Update, Delete ni Purge. Tampoco se otorgan permisos de Administration o Setup.

La autorización del usuario técnico debe restringirse a las entidades necesarias. La recursividad hacia entidades hijas sólo se habilita cuando el alcance funcional la requiera explícitamente.

Permisos adicionales sólo pueden agregarse a partir de evidencia del Live Lab; un 403 no justifica cambiar el usuario a Admin/Super-Admin.

### 8. Composition root real

`buildApp()` permanece independiente de secretos y continúa permitiendo inyección de providers en tests.

`startServer()` compone el provider Live cuando `NEXUS_PROVIDER_MODE=live`:

```text
GlpiCredentialSource
        |
        v
Password Grant Token Provider
        |
        v
GlpiFetchTransport
        |
        v
GlpiLiveTechnologyProvider
```

Configuración Live incompleta falla cerrada durante bootstrap; no existe fallback a Demo.

## Seguridad

- Password Grant es una restricción del upstream actual, no una preferencia arquitectónica de NEXUS;
- la cuenta técnica debe ser dedicada y de mínimo privilegio;
- `client_secret` y password jamás se versionan;
- token endpoint exige HTTPS salvo laboratorio explícito;
- redirects automáticos se rechazan;
- token response se valida defensivamente;
- bodies de error OAuth se descartan;
- access token sólo se usa en `Authorization: Bearer`;
- acquisition cache e in-flight state viven sólo en memoria;
- secrets no se copian a errores, provider descriptors o evidencia;
- el scope OAuth queda fijado en `api`;
- no se habilita escritura sobre GLPI.

## Consecuencias positivas

- NEXUS Live puede arrancar con una identidad GLPI real sin contaminar el adapter;
- la estrategia de secrets puede cambiar sin reescribir GLPI mapping/transporte;
- el runtime queda preparado para Live Lab V02-007;
- RBAC se vuelve explícito y auditable;
- los permisos efectivos de GLPI siguen siendo la defensa upstream incluso si NEXUS contiene un bug.

## Costos y riesgos aceptados

- Password Grant obliga a custodiar una contraseña de usuario técnico además del Client Secret;
- el backend environment de v0.2 requiere reinicio para recoger una rotación de secretos;
- no existe aún secret manager corporativo;
- un access token revocado anticipadamente puede fallar hasta una nueva adquisición; la semántica real de revocación debe validarse en Live Lab;
- el perfil exacto puede requerir lecturas adicionales si GLPI exige permisos sobre objetos relacionados, que deben agregarse uno por uno con evidencia;
- esta decisión debe revisarse si GLPI habilita Client Credentials para `scope=api`.

## Fuera de alcance

- Entra/OIDC para callers de NEXUS;
- secret manager productivo;
- escritura a GLPI;
- GLPI Agent;
- otros tipos de activos;
- reconciliación multisource;
- TLS/reverse proxy corporativo;
- despliegue productivo.

## Relación con ADR anteriores

- ADR-0013: logging/configuración continúan fail-closed y minimizados.
- ADR-0014: Live sigue detrás de `TechnologyProvider`.
- ADR-0015: la identidad implementa la frontera `GlpiAccessTokenProvider` definida por el adapter sin cambiar su mapping.

## Referencias

- GLPI Help Center — RESTful API (V2): `https://help.glpi-project.org/documentation/modules/configuration/general/api/restful-api-v2`
- GLPI Help Center — OAuth Clients: `https://help.glpi-project.org/documentation/modules/configuration/oauth-clients`
- GLPI Help Center — User profiles: `https://help.glpi-project.org/documentation/modules/administration/profiles/profiles`
