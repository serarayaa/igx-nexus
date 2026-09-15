# Threat Model v0.2 — NEXUS API

Estado: **baseline vivo desde V02-003, actualizado en V02-005**. Este documento describe la frontera disponible hoy y los riesgos que deben revisarse a medida que v0.2 agregue adapters, identidades y datos reales.

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
```

V02-005 incorpora el primer adapter Live read-only para GLPI 11. La identidad técnica/OAuth productiva aún no existe y pertenece a V02-006. El adapter recibe un Bearer token mediante una frontera inyectable y los tests utilizan exclusivamente datos sintéticos.

## Activos a proteger

- identidad y permisos de usuarios/servicios;
- inventario tecnológico obtenido desde GLPI y futuras fuentes;
- credenciales/tokens de GLPI y fuentes futuras;
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
- `live` sin adapter válido se considera indisponible y nunca reutiliza Demo como fallback;
- el adapter GLPI es read-only y no posee por sí mismo credenciales persistentes;
- la conexión real a GLPI corporativo no forma parte de los tests de V02-005.

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
| Provider Live → Demo | fallback silencioso | mitigado por diseño | ningún error GLPI provoca fallback a Demo | mantener invariant al agregar más providers |
| Provider descriptor → cliente | fuga de secretos/config de upstream | mitigado | descriptor público sólo contiene metadata declarativa | revisar cualquier campo nuevo antes de exponerlo |
| API → Provider | provider incoherente con modo configurado | mitigado | composición valida `descriptor.mode` y capabilities mínimas | ampliar validaciones según crezca el contrato |
| Provider → dominio | snapshot inválido/corrupto | mitigado para GLPI Computer | parser defensivo + `validateTechnologySnapshot` | ampliar schemas al sumar asset types |
| Provider → procedencia | dato sin source/evidence que parezca autoritativo | parcialmente mitigado | GLPI preserva source reference, provenance y evidence | V02-009 define coverage/conflicts/reconciliación |
| API → logs | token/cookie/API key en logs | parcialmente mitigado | redacción; no body completo | ampliar redacción al introducir SDKs/secretos nuevos |
| API → audit log | query/body sensible | mitigado | route pattern + contexto mínimo; no raw URL/query/body | revisar si se añade SIEM/exportación |
| API → adapters | credenciales hardcodeadas | mitigado por diseño | token se inyecta; ningún secreto GLPI versionado | V02-006: secret refs, rotación y mínimo privilegio |
| API → GLPI | Unsafe Consumption of API | parcialmente mitigado | payload array validado, IDs tipados, errores/status seguros, snapshot validado | ampliar validación con cada campo/tipo nuevo |
| API → GLPI | request sin límite temporal | mitigado | timeout/cancelación propia del transporte | evaluar retry/backoff/circuit breaker cuando exista evidencia |
| API → GLPI | redirección a host inesperado | mitigado | `redirect: error` | revisar allowlist/egress en deployment corporativo |
| Config → GLPI | URL con credenciales o esquema inseguro | mitigado | HTTPS por defecto; no userinfo/query/hash; HTTP sólo opt-in lab | V02-006/v0.3 definir endpoint corporativo autorizado |
| GLPI → NEXUS | payload malicioso o incompatible | parcialmente mitigado | parser no confía en forma/tipos; no ejecuta contenido | schemas más estrictos según crezca mapping |
| GLPI → NEXUS | identidad externa tratada como identidad canónica | mitigado inicial | externalId queda en SourceReference; ID NEXUS namespaced derivado | V02-009 define reconciliación definitiva |
| GLPI → NEXUS | strings localizadas convertidas en semántica falsa | mitigado por alcance | lifecycle/criticality quedan `unknown`; type/status se preservan como atributos | V02-010 define taxonomía/mappings explícitos |
| GLPI pagination | truncamiento silencioso o páginas repetidas | mitigado | maxRecords con probe final + detección de IDs duplicados | evaluar cursores/estrategia incremental si escala |
| `/ready` → GLPI | health check costoso | mitigado | probe `start=0&limit=1`, no snapshot completo | observar latencia/frecuencia en deployment real |
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

### Liveness vs readiness

```text
/health  -> proceso vivo
/ready   -> proceso + provider/upstream operativo
```

V02-005 agrega `checkAvailability()` opcional al contrato del provider. El provider GLPI usa una lectura mínima read-only de `Assets/Computer?start=0&limit=1`.

Si GLPI no responde, rechaza el token o devuelve una forma incompatible, `/ready` retorna 503. `/health` permanece 200 porque el proceso sigue vivo. El error de readiness no copia detalles del upstream.

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

No incluye token, client secret, URL privada, headers ni connection strings. `availability` en el descriptor es declarativa; `/ready` utiliza además el probe dinámico cuando existe.

## Frontera GLPI

### Transporte

El adapter soporta únicamente API v2.3 y construye rutas desde una raíz GLPI validada.

Controles actuales:

- GET-only;
- HTTPS obligatorio salvo opt-in explícito de laboratorio;
- sin credenciales embebidas en URL;
- Bearer token sólo en header Authorization;
- redirects rechazados;
- timeout por request;
- body de error descartado;
- response JSON parseada y validada antes de entrar al dominio.

### Autenticación

V02-005 **no implementa OAuth productivo**. `GlpiAccessTokenProvider` es una interfaz que entrega un token al transporte. V02-006 debe definir cómo se obtiene/renueva dicho token, con permisos mínimos y secretos fuera del repositorio.

### Datos

El mapping inicial sólo consume `Assets/Computer`. No se infiere lifecycle, criticality o rol específico desde strings de GLPI. Campos no normalizados permanecen namespaced bajo `glpi.*`.

La evidencia generada referencia el registro de forma lógica (`glpi:v2.3:Assets/Computer/<id>`) y deliberadamente no almacena hostname del servidor, URL completa ni credencial.

## Flujos de identidad de NEXUS

El `AuthenticationProvider` de NEXUS (usuarios/servicios que llaman a NEXUS API) sigue siendo distinto del `TechnologyProvider` y del futuro mecanismo OAuth que NEXUS utilizará para leer GLPI.

```text
Caller -> NEXUS AuthenticationProvider -> SecurityPrincipal
NEXUS  -> GlpiAccessTokenProvider      -> Bearer token upstream
NEXUS  -> TechnologyProvider           -> TechnologySnapshot
```

Estas tres responsabilidades no deben fusionarse.

## Secrets

V02-005 no agrega secretos versionados ni variables de entorno con tokens GLPI.

Reglas para V02-006 y posteriores:

- secretos por frontera dedicada, nunca constantes/archivos versionados;
- preferir referencias/nombres de secret sobre valores en logs/errores;
- mínimo privilegio y rotación por identidad técnica;
- tests sólo con fixtures sintéticos;
- no almacenar access/refresh tokens dentro de descriptors, provenance o evidence.

## Proxy y red

`request.ip` alimenta rate limiting y audit events. Sin proxy confiable, `X-Forwarded-For` no determina la IP. Con proxy, sólo IP/CIDR explícito; trust-all está prohibido. El backend futuro debe quedar aislado para impedir saltarse el proxy.

El endpoint GLPI real y la política de egress todavía no están definidos; eso debe quedar explícito antes de un deployment corporativo.

## Disponibilidad

Controles actuales:

- body limit 1 MiB por defecto;
- request timeout 30 s;
- rate limit 120/60 s por IP;
- health/readiness exentos del limiter;
- shutdown ordenado;
- readiness sensible al provider seleccionado y, para GLPI, al upstream;
- timeout propio del transporte GLPI;
- paginación con máximo de registros y rechazo de truncamiento silencioso.

No existen aún retry, backoff, circuit breaker ni cache. No se agregarán sólo por anticipación: deben diseñarse con evidencia de comportamiento real del upstream.

## Datos y privacidad de logs

Regla: **eventos de seguridad describen el hecho, no copian la request ni la respuesta de upstream**.

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
- API keys/client secrets;
- body de caller o GLPI;
- query string cruda;
- headers completos;
- URL GLPI completa en errores públicos;
- stack/message interno en la respuesta HTTP.

## Riesgos que permanecen abiertos

1. **Autenticación NEXUS real**: deny-all es seguro pero no funcional para usuarios Live.
2. **GLPI Service Identity**: el adapter existe, pero obtención/renovación del token y RBAC corresponden a V02-006.
3. **BOLA**: no hay endpoints de objetos NEXUS todavía.
4. **Cobertura GLPI**: sólo `Computer`; otros tipos requieren contrato/mapping/test propios.
5. **Reconciliación/provenance multisource**: pendiente V02-009.
6. **Taxonomía detallada**: pendiente V02-010; no inferir desde strings localizadas.
7. **TLS/HSTS/network isolation**: corresponde al Corporate Deployment.
8. **Rate limit distribuido**: pendiente si hay múltiples instancias.
9. **SIEM/retención**: persistencia/exportación de auditoría aún no existe.
10. **OT security**: cualquier conexión OT exige análisis específico y nunca habilita active scanning por defecto.

## Triggers para actualizar este threat model

Actualizar cuando ocurra cualquiera de estos cambios:

- nuevo endpoint de dominio;
- nueva capability de TechnologyProvider;
- nuevo tipo GLPI o campo normalizado;
- cambio de versión GLPI API;
- nuevo tipo de principal o permiso;
- integración Entra/OIDC;
- implementación OAuth/service identity GLPI;
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
