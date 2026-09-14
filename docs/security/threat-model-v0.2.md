# Threat Model v0.2 — NEXUS API

Estado: **baseline vivo de V02-003**. Este documento describe la frontera disponible hoy y los riesgos que deben revisarse a medida que v0.2 agregue providers, adapters y datos reales.

No certifica producción ni cumplimiento normativo. Su propósito es evitar que el proyecto confunda controles presentes con controles futuros.

## Alcance

Frontera modelada:

```text
Browser / NEXUS Web
        |
        | HTTP(S) futuro
        v
    NEXUS API
        |
        | adapters / credentials futuros
        v
GLPI / Intune / Entra / otras fuentes
```

En V02-003 sólo NEXUS API existe como runtime real de esta cadena. No hay todavía autenticación Entra, adapter GLPI, credenciales productivas, Provider Mode Live ni endpoints de assets.

## Activos a proteger

- identidad y permisos de usuarios/servicios;
- datos tecnológicos y de inventario que la API expondrá en tickets posteriores;
- credenciales/tokens de fuentes futuras;
- integridad de reglas de autorización;
- disponibilidad del runtime;
- trazabilidad/audit events;
- configuración de trust boundaries;
- contratos OpenAPI y surface inventory;
- logs, evitando que se conviertan en un repositorio accidental de secretos.

## Supuestos explícitos

- `main` y CI son parte del proceso de cambio, no una frontera de runtime.
- el runtime local escucha `127.0.0.1` por defecto;
- no existe TLS dentro del proceso Node en V02-003;
- el despliegue corporativo futuro tendrá reverse proxy/HTTPS, pero **NEXUS API no lo asume hoy**;
- no existe auth basada en cookies;
- no existe fuente real conectada ni secreto real versionado.

## Fronteras y amenazas

| Frontera | Amenaza | Estado V02-003 | Mitigación actual | Pendiente / gate futuro |
| --- | --- | --- | --- | --- |
| Browser → API | ruta de dominio expuesta sin auth | mitigado por diseño | rutas `/api/*` requieren policy explícita; provider default deny-all | conectar IdP real antes de Live |
| Browser → API | Broken Authentication | parcialmente mitigado | contrato de provider, fail-closed, sin bypass local | Entra/OIDC, validación de issuer/audience/signature/expiry en ticket posterior |
| Browser → API | Broken Function Level Authorization | baseline mitigado | policies server-side y permisos efectivos | definir permisos por operación real a medida que aparezcan endpoints |
| Browser → API | Broken Object Level Authorization (BOLA) | **no resoluble aún** | ninguna afirmación falsa: no existen endpoints de objetos | cada endpoint de asset deberá validar acceso al objeto, no sólo permiso funcional |
| Browser → API | CORS demasiado permisivo | mitigado | deny-by-default, allowlist, sin wildcard/reflection, HTTPS obligatorio en prod | definir origins corporativas reales al desplegar Web↔API |
| Browser → API | CSRF | no aplicable hoy | no hay cookie auth; `credentials=false` | reabrir análisis si se adopta cookie/session auth |
| Cliente → API | abuso de recursos | parcialmente mitigado | rate limit, body limit, request timeout | store distribuido/reverse proxy/WAF si escala a multi-instancia |
| Cliente → API | spoof de IP vía `X-Forwarded-*` | mitigado por defecto | `trustProxy=false`; sólo IP/CIDR explícitos | configurar únicamente proxies corporativos reales |
| Cliente → API | cache accidental de respuestas sensibles | baseline mitigado | `Cache-Control: no-store` | revisar endpoint por endpoint si en el futuro existe contenido cacheable seguro |
| Cliente → API | exposición de detalles internos | mitigado | contrato de error seguro, 5xx genérico, request ID | mantener pruebas al agregar adapters/upstreams |
| API → logs | token/cookie/API key en logs | parcialmente mitigado | redacción de headers sensibles; no body completo por defecto | ampliar redacción al introducir nombres de secretos/SDKs nuevos |
| API → audit log | query/body sensible en security events | mitigado | sólo route pattern y contexto mínimo; no raw URL/query/body | revisar esquema si se añade SIEM/exportación |
| API → adapters | credenciales hardcodeadas | prevenido arquitectónicamente | no existen credenciales; política no-secrets-in-repo | secret references/secret manager + mínimo privilegio por adapter |
| API → GLPI | Unsafe Consumption of API | pendiente | GLPI aún no conectado | V02-005: timeouts, schemas, status handling, OAuth/service identity y validación de responses |
| API → Intune/Graph | scopes excesivos | pendiente | integración aún no existe | spike/permisos mínimos antes de consumo real |
| API → OT | scanning/acción insegura | fuera de alcance | NEXUS no realiza active scanning OT | cualquier integración OT futura requiere threat model específico |
| Runtime → red | exposición accidental a LAN | mitigado localmente | host default `127.0.0.1` | deployment v0.3 define interfaces/firewall/reverse proxy |
| Runtime → transporte | tráfico sin TLS | riesgo aceptado sólo en local | no se declara HSTS/TLS falsamente | v0.3 debe terminar TLS y habilitar política HSTS apropiada |
| Dependencias → runtime | vulnerabilidad conocida de paquete | parcialmente mitigado | lockfile reproducible + `npm audit --audit-level=high` en CI | actualización continua/SCA más completa en V02-028 o plataforma corporativa |
| OpenAPI / routes | shadow/unknown API endpoints | baseline mitigado | rutas registradas + OpenAPI + guard de policy para `/api/*` | inventario/ownership más completo en V02-028 |

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
   +-- permission(x) ----> provider → principal → effective permission x
```

El runtime **no interpreta tokens por sí mismo** en V02-003. Esto evita diseñar dos veces validación JWT/OIDC antes de conocer la configuración corporativa real.

### Estado futuro esperado

El provider real deberá producir un `SecurityPrincipal` sólo después de validar al menos los atributos relevantes del mecanismo elegido: firma, issuer, audience, vigencia y claims requeridos. El mapper de identidad transforma claims/roles corporativos a permisos NEXUS; los handlers sólo consumen el principal y permisos resultantes.

El detalle exacto pertenece a la integración de identidad, no a este baseline.

## Secrets

V02-003 no agrega secrets. Las variables `NEXUS_API_*` actuales son configuración no secreta.

Cuando existan adapters:

- los secretos deben entrar por una frontera dedicada, no por constantes ni archivos versionados;
- el código debe preferir referencias/nombres de secret sobre valores en logs o errores;
- cada identidad técnica tendrá privilegio mínimo y rotación definida;
- los tests públicos del repo utilizarán fixtures sintéticos, nunca tokens corporativos reales.

## Proxy y red

`request.ip` tiene implicancias de seguridad porque alimenta rate limiting y audit events. Por eso:

1. sin proxy confiable → `X-Forwarded-For` se ignora para determinar IP;
2. con proxy → se configura IP/CIDR explícito;
3. trust-all está prohibido;
4. el despliegue debe garantizar que clientes externos no puedan alcanzar directamente el backend saltándose el proxy esperado.

La última condición no puede resolverse desde Fastify: requiere networking/firewall de v0.3.

## Disponibilidad

Controles actuales:

- body limit 1 MiB por defecto;
- request timeout 30 s por defecto;
- rate limit 120/60 s por IP, configurable;
- health/readiness exentos del limiter;
- shutdown ordenado heredado de V02-002.

Limitación consciente: el limiter usa memoria local. Dos instancias tendrían contadores independientes. No declarar protección distribuida hasta introducir infraestructura adecuada.

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
- stack/message interno en la respuesta al cliente.

## Riesgos que permanecen abiertos

1. **Autenticación real**: deny-all es seguro pero no funcional para Live. Entra/OIDC deberá conectarse antes de exponer operaciones reales.
2. **BOLA**: no hay objetos API todavía; cada recurso futuro debe definir ownership/scope/autorización por objeto.
3. **Credenciales upstream**: todavía no existen; deben modelarse antes de V02-005/V02-006 Live.
4. **TLS/HSTS/network isolation**: corresponde al Corporate Deployment.
5. **Rate limit distribuido**: pendiente si la arquitectura pasa a múltiples instancias.
6. **SIEM/retención de auditoría**: eventos existen, pero persistencia/exportación/retención aún no.
7. **OT security**: cualquier conexión a sistemas OT exige un análisis específico y nunca habilita active scanning por defecto.

## Triggers para actualizar este threat model

Actualizar este documento cuando ocurra cualquiera de estos cambios:

- nuevo endpoint de dominio;
- nuevo tipo de principal o permiso;
- integración Entra/OIDC;
- incorporación de GLPI/Intune/Graph/Defender u otra fuente;
- aparición de secretos reales;
- cookie/session auth;
- reverse proxy/TLS corporativo;
- despliegue multi-instancia;
- acceso desde otra entidad/país de Innergex;
- integración OT o cambio de frontera de red.

## Referencia de riesgo

Referencia externa de diseño: **OWASP API Security Top 10 — 2023**. Se utiliza como vocabulario de amenazas, no como certificación ni checklist de cumplimiento.
