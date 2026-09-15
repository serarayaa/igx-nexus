# Threat Model v0.2 — NEXUS API

Estado: **baseline vivo desde V02-003, actualizado hasta V02-006**. Este documento describe la frontera disponible hoy y los riesgos que deben revisarse a medida que v0.2 agregue adapters, identidades y datos reales.

No certifica producción ni cumplimiento normativo. Su propósito es evitar que el proyecto confunda controles presentes con controles futuros.

## Alcance

Frontera modelada:

```text
Browser / NEXUS Web
        |
        v
    NEXUS API
        |
        v
TechnologyProvider
   |            |
 Demo          Live
                |
                v
       GLPI API v2.3
                ^
                |
     OAuth service identity
                ^
                |
      GlpiCredentialSource
```

V02-005 incorporó el primer adapter Live read-only para GLPI 11. V02-006 incorpora la identidad técnica OAuth que alimenta ese adapter, mantiene secretos fuera del dominio/API pública y documenta el perfil GLPI de mínimo privilegio. Los tests continúan utilizando exclusivamente datos y credenciales sintéticas.

## Activos a proteger

- identidad y permisos de usuarios/servicios;
- inventario tecnológico obtenido desde GLPI y futuras fuentes;
- Client Secret y password del usuario técnico GLPI;
- access tokens GLPI en memoria;
- configuración del OAuth Client y perfil/entidades asignadas;
- integridad del modo/provider seleccionado;
- procedencia de los datos y distinción Demo/Live;
- integridad de reglas de autorización;
- disponibilidad del runtime y de sus upstreams;
- trazabilidad/audit events;
- configuración de trust boundaries;
- contratos OpenAPI y surface inventory;
- logs, evitando que se conviertan en un repositorio accidental de secretos.

## Supuestos explícitos

- `main` y CI son parte del proceso de cambio, no una frontera de runtime;
- el runtime local escucha `127.0.0.1` por defecto;
- no existe TLS dentro del proceso Node;
- el despliegue corporativo futuro tendrá reverse proxy/HTTPS, pero NEXUS API no lo asume hoy;
- no existe auth basada en cookies;
- `demo` contiene únicamente datos sintéticos;
- `live` sin configuración válida se considera indisponible/falla bootstrap y nunca reutiliza Demo como fallback;
- el adapter GLPI es read-only para recursos;
- el OAuth Password Grant es una restricción soportada por GLPI 11 para scripts automatizados, no una preferencia general de NEXUS;
- GLPI 11 limita actualmente Client Credentials al scope `inventory`, por lo que no se usa para `scope=api`;
- la conexión real a GLPI corporativo no forma parte de los tests de V02-006;
- el backend de secretos por environment es un mecanismo de laboratorio/v0.2, no el secret manager corporativo definitivo.

## Fronteras y amenazas

| Frontera | Amenaza | Estado actual | Mitigación actual | Pendiente / gate futuro |
| --- | --- | --- | --- | --- |
| Browser → API | ruta de dominio expuesta sin auth | mitigado por diseño | rutas `/api/*` requieren policy explícita; auth default deny-all | conectar IdP real antes de Live productivo |
| Browser → API | Broken Authentication | parcialmente mitigado | contrato de auth, fail-closed, sin bypass local | Entra/OIDC y validación real en ticket posterior |
| Browser → API | Broken Function Level Authorization | baseline mitigado | policies server-side y permisos efectivos | definir permisos por operación real |
| Browser → API | BOLA | **no resoluble aún** | no se afirma protección inexistente; aún no hay endpoints de objetos | cada endpoint de asset deberá validar acceso al objeto |
| Browser → API | CORS demasiado permisivo | mitigado | deny-by-default, allowlist, sin wildcard/reflection, HTTPS en prod | origins corporativas reales al desplegar |
| Browser → API | CSRF | no aplicable hoy | no hay cookie auth; `credentials=false` | reabrir si se adopta cookie/session auth |
| Cliente → API | abuso de recursos | parcialmente mitigado | rate limit, body limit, request timeout | store distribuido/reverse proxy/WAF si escala |
| Cliente → API | spoof de IP vía `X-Forwarded-*` | mitigado por defecto | `trustProxy=false`; sólo IP/CIDR explícitos | configurar únicamente proxies reales |
| Cliente → API | cache accidental | baseline mitigado | `Cache-Control: no-store` | revisar endpoint por endpoint |
| Cliente → API | exposición de detalles internos | mitigado | errores seguros, 5xx genérico, request ID | mantener pruebas al agregar endpoints |
| Config → Provider | modo productivo ambiguo | mitigado | `production` exige `NEXUS_PROVIDER_MODE` explícito | deployment debe declarar el modo esperado |
| Provider Live → Demo | fallback silencioso | mitigado por diseño | ningún error GLPI/OAuth provoca fallback a Demo | mantener invariant al agregar más providers |
| Provider descriptor → cliente | fuga de secretos/config de upstream | mitigado | descriptor público sólo contiene metadata declarativa | revisar cualquier campo nuevo antes de exponerlo |
| API → Provider | provider incoherente con modo configurado | mitigado | composición valida modo/capabilities; Live se compone en bootstrap | ampliar validaciones según crezca contrato |
| Provider → dominio | snapshot inválido/corrupto | mitigado para GLPI Computer | parser defensivo + `validateTechnologySnapshot` | ampliar schemas al sumar asset types |
| Provider → procedencia | dato sin source/evidence que parezca autoritativo | parcialmente mitigado | GLPI preserva source reference, provenance y evidence | V02-009 define coverage/conflicts/reconciliación |
| API → logs | token/cookie/API key/password en logs | parcialmente mitigado | redacción; no body completo; OAuth errors genéricos | revisar SDKs/secret manager/telemetría futura |
| API → audit log | query/body sensible | mitigado | route pattern + contexto mínimo; no raw URL/query/body | revisar si se añade SIEM/exportación |
| Config → GLPI OAuth | secretos dentro de configuración pública | mitigado | `GlpiCredentialSource`; secretos no entran a `ApiConfig` | secret manager corporativo en v0.3 |
| Environment → runtime | secretos expuestos por proceso/host | riesgo aceptado de laboratorio | environment encapsulado; no se imprime ni serializa | usar secret manager/identity backend productivo |
| Secret source → OAuth | backend de secretos filtra mensajes sensibles | mitigado | errores del source se normalizan a `GlpiAuthenticationError` | tests específicos para nuevos backends |
| NEXUS → OAuth | grant/scope incorrecto o excesivo | mitigado | `grant_type=password` y `scope=api` fijados en código | revisar si GLPI cambia capacidades OAuth |
| NEXUS → OAuth | Client Credentials usado indebidamente para API general | mitigado por diseño | no se implementa; runbook registra limitación GLPI | reabrir sólo con soporte oficial de `api` |
| NEXUS → OAuth | redirects hacia host inesperado | mitigado | `redirect: error` | egress/allowlist corporativa en deployment |
| NEXUS → OAuth | request sin límite temporal | mitigado | timeout/cancelación propios | observar latencia real |
| OAuth → NEXUS | body de error contiene secretos/contexto | mitigado | bodies no se copian a errores | mantener invariant con clientes futuros |
| OAuth → NEXUS | token response malicioso/incompatible | mitigado | exige Bearer, token no vacío, `expires_in` entero positivo | revisar schema si GLPI cambia contrato |
| Token cache | uso de token expirado por renovación tardía | mitigado | refresh anticipado; tokens cortos se renuevan a más tardar a mitad de vida | validar tiempos reales del Live Lab |
| Token cache | múltiples logins simultáneos | mitigado | adquisición en vuelo deduplicada | considerar coordinación si hay múltiples procesos |
| Token cache | robo de access token desde memoria | parcialmente mitigado | token sólo en closure/memoria y no se expone | aislamiento de host/proceso en v0.3 |
| Service user → GLPI | cuenta sobreprivilegiada | mitigado por runbook/gate | perfil dedicado `NEXUS API Read-Only`; baseline Computer Read | verificar permisos efectivos en Live Lab |
| Service user → GLPI | acceso a demasiadas entidades | mitigado por runbook/gate | autorización sólo a entidades necesarias; recursividad explícita | confirmar alcance real con Infra/GLPI admin |
| Service user → GLPI | uso humano de cuenta técnica | mitigado por política de diseño | cuenta dedicada, no compartida | controles corporativos/monitorización en v0.3 |
| OAuth Client → GLPI | grant o alcance más amplio de lo necesario | mitigado por runbook | Password Grant + `api`; IP restriction cuando sea viable | validar configuración real antes del Live Lab |
| API → GLPI | Unsafe Consumption of API | parcialmente mitigado | payload array validado, IDs tipados, errores/status seguros, snapshot validado | ampliar validación con cada campo/tipo nuevo |
| API → GLPI | request sin límite temporal | mitigado | timeout/cancelación propia del transporte | evaluar retry/backoff/circuit breaker con evidencia |
| API → GLPI | redirección a host inesperado | mitigado | `redirect: error` | revisar allowlist/egress en deployment corporativo |
| Config → GLPI | URL con credenciales o esquema inseguro | mitigado | HTTPS por defecto; no userinfo/query/hash; HTTP lab explícito y prohibido en production | endpoint corporativo autorizado en deployment |
| GLPI → NEXUS | payload malicioso o incompatible | parcialmente mitigado | parser no confía en forma/tipos; no ejecuta contenido | schemas más estrictos según crezca mapping |
| GLPI → NEXUS | identidad externa tratada como identidad canónica | mitigado inicial | externalId queda en SourceReference; ID NEXUS namespaced derivado | V02-009 define reconciliación definitiva |
| GLPI → NEXUS | strings localizadas convertidas en semántica falsa | mitigado por alcance | lifecycle/criticality quedan `unknown`; type/status se preservan | V02-010 define mappings explícitos |
| GLPI pagination | truncamiento silencioso o páginas repetidas | mitigado | maxRecords con probe final + detección de IDs duplicados | evaluar estrategia incremental si escala |
| `/ready` → GLPI | health check costoso | mitigado | probe `start=0&limit=1`, cache corto de 5 s y dedup de probes | observar frecuencia/latencia real |
| Rotación de secretos | runtime conserva credenciales antiguas | riesgo conocido v0.2 | backend environment se carga al bootstrap; runbook exige reinicio | secret manager/rotación dinámica en v0.3 |
| Revocación de token | token cacheado continúa hasta fallo/renovación | riesgo abierto | expiración/renovación acotada; no se asume revocación inmediata | validar semántica real GLPI en Live Lab |
| API → Intune/Graph | scopes excesivos | pendiente | integración aún no existe | spike/permisos mínimos antes de consumo real |
| API → OT | scanning/acción insegura | fuera de alcance | NEXUS no realiza active scanning OT | threat model específico para cualquier integración OT |
| Runtime → red | exposición accidental a LAN | mitigado localmente | host default `127.0.0.1` | v0.3 define interfaces/firewall/reverse proxy |
| Runtime → transporte | tráfico sin TLS | riesgo aceptado sólo en local | no se declara HSTS/TLS falsamente | v0.3 debe terminar TLS |
| Dependencias → runtime | vulnerabilidad conocida | parcialmente mitigado | lockfile + `npm audit --audit-level=high` | SCA más completa en V02-028/entorno corporativo |
| OpenAPI / routes | shadow/unknown endpoints | baseline mitigado | rutas registradas + OpenAPI + guard de policy | inventario/ownership más completo en V02-028 |

## Provider Mode y readiness

### Selección

```text
NEXUS_PROVIDER_MODE=demo | live
```

En development/test, la ausencia de valor usa Demo. En `production` el valor es obligatorio. No existe selección dinámica por request ni header de modo.

En el bootstrap real, `live` exige configuración GLPI y secret source válidos. La ausencia de configuración o secretos falla cerrada; no se inicia una instancia Live disfrazada de Demo.

### Liveness vs readiness

```text
/health  -> proceso vivo
/ready   -> proceso + provider/upstream operativo
```

El provider GLPI usa una lectura mínima read-only de `Assets/Computer?start=0&limit=1`, con cache corto y deduplicación de probes concurrentes.

Si la adquisición OAuth falla, GLPI no responde, rechaza el token o devuelve una forma incompatible, `/ready` retorna 503. `/health` permanece 200 si el proceso ya está vivo. El error de readiness no copia detalles del upstream.

### Metadata pública

`/api/v1/provider` expone únicamente:

```text
id
mode
displayName
availability
capabilities
sourceSystems
```

No incluye token, Client Secret, password, username técnico, Client ID, URL privada, headers ni connection strings.

## Frontera OAuth GLPI

### Restricción de grant

La documentación oficial actual de GLPI 11 limita Client Credentials a `scope=inventory`. Para la API general, NEXUS requiere `scope=api` y utiliza un usuario técnico mediante Password Grant.

Esta decisión debe reabrirse si GLPI incorpora un mecanismo machine-to-machine real para `scope=api`.

### Flujo

```text
GlpiCredentialSource
        |
        v
POST /api.php/token
  grant_type=password
  scope=api
        |
        v
access token en memoria
        |
        v
Authorization: Bearer <token>
        |
        v
/api.php/v2.3/Assets/Computer
```

El token endpoint y los endpoints versionados de recursos son fronteras separadas.

### Secretos

El backend de laboratorio puede leer:

```text
NEXUS_GLPI_OAUTH_CLIENT_SECRET
NEXUS_GLPI_SERVICE_PASSWORD
```

pero esos valores no forman parte de `ApiConfig`. `GlpiCredentialSource` es la frontera que permitirá sustituir environment por un secret manager sin reescribir el adapter.

Reglas:

- no versionar secretos ni `.env` reales;
- no incluir secretos en issues/PRs/screenshots;
- no serializar `GlpiCredentialSource`;
- no copiar errores internos del backend de secretos;
- no almacenar access tokens en descriptors, provenance o evidence.

## RBAC upstream GLPI

La defensa upstream no depende únicamente del scope OAuth. El usuario técnico debe tener permisos efectivos mínimos dentro de GLPI.

Baseline de V02-006:

```text
Perfil: NEXUS API Read-Only
Assets > Computers > Read
```

No se requiere Create, Update, Delete, Purge, Administration ni Setup.

La autorización `usuario + perfil + entidad` debe limitarse a las entidades necesarias. Un 403 durante Live Lab no autoriza subir el perfil a Admin/Super-Admin: cualquier permiso adicional debe derivarse de un endpoint/objeto concreto y quedar documentado.

## Frontera GLPI de recursos

El adapter soporta únicamente API v2.3 y construye rutas desde una raíz GLPI validada.

Controles actuales:

- GET-only para recursos;
- HTTPS obligatorio salvo opt-in explícito de laboratorio;
- HTTP inseguro prohibido en `production`;
- sin credenciales embebidas en URL;
- Bearer token sólo en header Authorization;
- redirects rechazados;
- timeout por request;
- body de error descartado;
- response JSON parseada y validada antes de entrar al dominio.

El mapping inicial sólo consume `Assets/Computer`. No se infiere lifecycle, criticality o rol específico desde strings de GLPI. Campos no normalizados permanecen namespaced bajo `glpi.*`.

La evidencia generada referencia el registro de forma lógica (`glpi:v2.3:Assets/Computer/<id>`) y deliberadamente no almacena hostname del servidor, URL completa ni credencial.

## Flujos de identidad de NEXUS

```text
Caller -> NEXUS AuthenticationProvider -> SecurityPrincipal
NEXUS  -> GlpiCredentialSource          -> credenciales upstream
NEXUS  -> GlpiAccessTokenProvider       -> Bearer token upstream
NEXUS  -> TechnologyProvider            -> TechnologySnapshot
```

Estas responsabilidades no deben fusionarse.

## Proxy y red

`request.ip` alimenta rate limiting y audit events. Sin proxy confiable, `X-Forwarded-For` no determina la IP. Con proxy, sólo IP/CIDR explícito; trust-all está prohibido. El backend futuro debe quedar aislado para impedir saltarse el proxy.

El endpoint GLPI corporativo y la política definitiva de egress se validarán antes del Corporate Deployment.

## Disponibilidad

Controles actuales:

- body limit 1 MiB por defecto;
- request timeout 30 s;
- rate limit 120/60 s por IP;
- health/readiness exentos del limiter;
- shutdown ordenado;
- readiness sensible al provider seleccionado y al upstream;
- timeout propio de OAuth y recursos GLPI;
- cache/dedup del access token;
- cache/dedup corto del readiness GLPI;
- paginación con máximo de registros y rechazo de truncamiento silencioso.

No existen retry, backoff ni circuit breaker. No se agregarán sólo por anticipación: deben diseñarse con evidencia de comportamiento real del upstream.

## Datos y privacidad de logs

Regla: **eventos de seguridad describen el hecho, no copian la request, credenciales ni respuesta de upstream**.

Permitido por defecto:

- request ID;
- método;
- route pattern;
- remote IP;
- subject estable cuando exista;
- permiso requerido;
- código/status normalizado cuando sea necesario.

No permitido por defecto:

- Authorization/bearer token;
- cookies;
- API keys/Client Secrets;
- password de usuario técnico;
- body OAuth o GLPI;
- query string cruda;
- headers completos;
- URL GLPI completa en errores públicos;
- stack/message interno en la respuesta HTTP.

## Riesgos que permanecen abiertos

1. **Autenticación NEXUS real**: deny-all es seguro pero no funcional para usuarios Live.
2. **Secret manager corporativo**: V02-006 define la frontera, pero environment sigue siendo backend de laboratorio.
3. **Validación real de RBAC GLPI**: el perfil mínimo debe comprobarse contra la instancia Live Lab antes de declararse suficiente.
4. **Revocación/rotación**: la semántica efectiva de revocación de access tokens y rotación sin reinicio debe validarse/evolucionar.
5. **BOLA**: no hay endpoints de objetos NEXUS todavía.
6. **Cobertura GLPI**: sólo `Computer`; otros tipos requieren contrato/mapping/test propios.
7. **Reconciliación/provenance multisource**: pendiente V02-009.
8. **Taxonomía detallada**: pendiente V02-010; no inferir desde strings localizadas.
9. **TLS/HSTS/network isolation**: corresponde al Corporate Deployment.
10. **Rate limit distribuido / SIEM / retención**: pendientes si el runtime escala.
11. **OT security**: cualquier conexión OT exige análisis específico y nunca habilita active scanning por defecto.

## Triggers para actualizar este threat model

Actualizar cuando ocurra cualquiera de estos cambios:

- nuevo endpoint de dominio;
- nueva capability de TechnologyProvider;
- nuevo tipo GLPI o campo normalizado;
- cambio de versión GLPI API;
- cambio de grant/scope OAuth GLPI;
- nuevo backend de `GlpiCredentialSource`;
- cambio de perfil/entidades de la service identity;
- nuevo tipo de principal o permiso NEXUS;
- integración Entra/OIDC;
- incorporación de Intune/Graph/Defender u otra fuente;
- aparición de secretos reales;
- fallback/caching/retry entre providers;
- cookie/session auth;
- reverse proxy/TLS corporativo;
- despliegue multi-instancia;
- acceso desde otra entidad/país de Innergex;
- integración OT o cambio de frontera de red.

## Referencia de riesgo

Referencia externa de diseño: **OWASP API Security Top 10 — 2023**. Se utiliza como vocabulario de amenazas, no como certificación ni checklist de cumplimiento.
