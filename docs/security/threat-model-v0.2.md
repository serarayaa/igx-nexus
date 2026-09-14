# Threat Model v0.2 — NEXUS API

Estado: **baseline vivo desde V02-003, actualizado en V02-004**. Este documento describe la frontera disponible hoy y los riesgos que deben revisarse a medida que v0.2 agregue adapters, identidades y datos reales.

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
 GLPI / Intune / Entra / otras fuentes futuras
```

En V02-004 existe NEXUS API, el contrato `TechnologyProvider`, un provider Demo canónico mínimo y un placeholder Live que falla cerrado. Todavía no hay autenticación Entra, adapter GLPI, credenciales productivas ni endpoints productivos de assets.

## Activos a proteger

- identidad y permisos de usuarios/servicios;
- datos tecnológicos y de inventario que la API expondrá en tickets posteriores;
- credenciales/tokens de fuentes futuras;
- integridad del modo/provider seleccionado;
- procedencia de los datos y distinción Demo/Live;
- integridad de reglas de autorización;
- disponibilidad del runtime;
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
- no existe fuente corporativa real conectada ni secreto real versionado;
- `demo` contiene únicamente datos sintéticos;
- `live` sin adapter válido se considera indisponible y nunca reutiliza Demo como fallback.

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
| Cliente → API | exposición de detalles internos | mitigado | errores seguros, 5xx genérico, request ID | mantener pruebas al agregar adapters |
| Config → Provider | modo productivo ambiguo | mitigado | `production` exige `NEXUS_PROVIDER_MODE` explícito | deployment debe declarar el modo esperado |
| Provider Live → Demo | fallback silencioso que presenta datos sintéticos como reales | mitigado por diseño | Live placeholder queda `unavailable`; no existe fallback Live→Demo | mantener invariant al agregar GLPI y otros providers |
| Provider descriptor → cliente | fuga de secretos/config de upstream | baseline mitigado | descriptor público sólo contiene metadata declarativa | revisar cualquier campo nuevo antes de exponerlo |
| API → Provider | provider incoherente con modo configurado | mitigado | composición valida `descriptor.mode` y capabilities mínimas | ampliar validaciones según crezca el contrato |
| Provider → dominio | snapshot inválido/corrupto | parcialmente mitigado | Demo se valida con `validateTechnologySnapshot` | adapters Live deben validar y normalizar respuestas antes de exponerlas |
| Provider → procedencia | dato sin source/evidence que parezca autoritativo | parcialmente mitigado | Demo usa `SourceReference.source=demo`; contrato canónico conserva provenance | V02-005/V02-009 deben reforzar source coverage y reconciliación |
| API → logs | token/cookie/API key en logs | parcialmente mitigado | redacción; no body completo | ampliar redacción al introducir SDKs/secretos nuevos |
| API → audit log | query/body sensible | mitigado | route pattern + contexto mínimo; no raw URL/query/body | revisar si se añade SIEM/exportación |
| API → adapters | credenciales hardcodeadas | prevenido arquitectónicamente | no existen credenciales; no-secrets-in-repo | secret references/manager + mínimo privilegio |
| API → GLPI | Unsafe Consumption of API | pendiente | GLPI aún no conectado | V02-005: timeouts, schemas, status handling y validación de responses |
| API → Intune/Graph | scopes excesivos | pendiente | integración aún no existe | spike/permisos mínimos antes de consumo real |
| API → OT | scanning/acción insegura | fuera de alcance | NEXUS no realiza active scanning OT | threat model específico para cualquier integración OT |
| Runtime → red | exposición accidental a LAN | mitigado localmente | host default `127.0.0.1` | v0.3 define interfaces/firewall/reverse proxy |
| Runtime → transporte | tráfico sin TLS | riesgo aceptado sólo en local | no se declara HSTS/TLS falsamente | v0.3 debe terminar TLS |
| Dependencias → runtime | vulnerabilidad conocida | parcialmente mitigado | lockfile + `npm audit --audit-level=high` | SCA más completa en V02-028/entorno corporativo |
| OpenAPI / routes | shadow/unknown endpoints | baseline mitigado | rutas registradas + OpenAPI + guard de policy | inventario/ownership más completo en V02-028 |

## Provider Mode

### Selección

```text
NEXUS_PROVIDER_MODE=demo | live
```

En development/test, la ausencia de valor usa Demo para facilitar un entorno reproducible. En `production` el valor es obligatorio. No existe selección dinámica por request ni header de modo.

### Readiness

Liveness y readiness son deliberadamente distintas:

```text
/health  -> proceso vivo
/ready   -> proceso + provider operativo
```

Un runtime Live sin provider implementado responde 200 en `/health` y 503 en `/ready`. Esto evita que infraestructura futura considere sana una instancia incapaz de servir su origen de datos configurado.

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

No debe crecer para incluir tokens, client secrets, URLs privadas, headers, connection strings o detalles que faciliten acceso al upstream.

## Flujos de identidad

### Estado actual

```text
request
   |
   v
RouteSecurityPolicy
   |
   +-- public ----------> handler
   |
   +-- authenticated ----> AuthenticationProvider (deny-all default)
   |
   +-- permission(x) ----> provider -> principal -> effective permission x
```

El runtime no interpreta tokens por sí mismo. Esto evita diseñar dos veces validación JWT/OIDC antes de conocer la configuración corporativa real.

### Estado futuro esperado

El provider de identidad real deberá producir un `SecurityPrincipal` sólo después de validar firma, issuer, audience, vigencia y claims requeridos. Este AuthenticationProvider es distinto del `TechnologyProvider`: identidad y origen de datos son fronteras separadas.

## Secrets

V02-004 no agrega secrets. `NEXUS_PROVIDER_MODE` y las variables `NEXUS_API_*` actuales son configuración no secreta.

Cuando existan adapters:

- secretos por frontera dedicada, nunca constantes/archivos versionados;
- preferir referencias/nombres de secret sobre valores en logs/errores;
- mínimo privilegio y rotación por identidad técnica;
- tests sólo con fixtures sintéticos.

## Proxy y red

`request.ip` alimenta rate limiting y audit events. Sin proxy confiable, `X-Forwarded-For` no determina la IP. Con proxy, sólo IP/CIDR explícito; trust-all está prohibido. El backend futuro debe quedar aislado para impedir saltarse el proxy.

## Disponibilidad

Controles actuales:

- body limit 1 MiB por defecto;
- request timeout 30 s;
- rate limit 120/60 s por IP;
- health/readiness exentos del limiter;
- shutdown ordenado;
- readiness sensible al provider seleccionado.

El limiter continúa en memoria por proceso y no representa protección distribuida.

## Datos y privacidad de logs

Regla: **eventos de seguridad describen el hecho, no copian la request**.

Permitido por defecto:

- request ID;
- método;
- route pattern;
- remote IP;
- subject estable cuando exista;
- permiso requerido.

No permitido por defecto:

- Authorization/bearer token;
- cookies;
- API keys/client secrets;
- body;
- query string cruda;
- headers completos;
- stack/message interno en la respuesta.

## Riesgos que permanecen abiertos

1. **Autenticación real**: deny-all es seguro pero no funcional para Live.
2. **BOLA**: no hay objetos API todavía.
3. **GLPI Live**: el modo existe, pero no hay adapter ni credenciales; eso es intencional hasta V02-005/V02-006.
4. **Validación de upstream**: cada adapter deberá validar schema/status/timeout y no confiar ciegamente en datos externos.
5. **Reconciliación/provenance multisource**: pendiente V02-009.
6. **TLS/HSTS/network isolation**: corresponde al Corporate Deployment.
7. **Rate limit distribuido**: pendiente si hay múltiples instancias.
8. **SIEM/retención**: persistencia/exportación de auditoría aún no existe.
9. **OT security**: cualquier conexión OT exige análisis específico y nunca habilita active scanning por defecto.

## Triggers para actualizar este threat model

Actualizar cuando ocurra cualquiera de estos cambios:

- nuevo endpoint de dominio;
- nueva capability de TechnologyProvider;
- nuevo tipo de principal o permiso;
- integración Entra/OIDC;
- incorporación de GLPI/Intune/Graph/Defender u otra fuente;
- aparición de secretos reales;
- fallback/caching/retry entre providers;
- cookie/session auth;
- reverse proxy/TLS corporativo;
- despliegue multi-instancia;
- acceso desde otra entidad/país de Innergex;
- integración OT o cambio de frontera de red.

## Referencia de riesgo

Referencia externa de diseño: **OWASP API Security Top 10 — 2023**. Se utiliza como vocabulario de amenazas, no como certificación ni checklist de cumplimiento.
