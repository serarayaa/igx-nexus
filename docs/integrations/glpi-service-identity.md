# GLPI Service Identity — Runbook v0.2

Este runbook define cómo preparar la identidad técnica **read-only** que utilizará NEXUS API para consultar GLPI 11 High-Level REST API durante el Live Lab de v0.2.

No contiene credenciales reales y no autoriza cambios sobre una instancia corporativa sin el proceso interno correspondiente.

## Principio

La identidad que NEXUS utiliza **contra GLPI** es distinta de la identidad de las personas o servicios que llaman a NEXUS API.

```text
Caller -> NEXUS AuthenticationProvider -> SecurityPrincipal
NEXUS  -> GLPI OAuth service identity   -> Bearer token
NEXUS  -> TechnologyProvider            -> TechnologySnapshot
```

## Restricción actual de GLPI 11

La documentación oficial de GLPI 11 indica:

- Password Grant: soportado para API y recomendado actualmente para scripts automatizados;
- Authorization Code: recomendado para aplicaciones con interacción de usuario;
- Client Credentials: soportado únicamente para el scope `inventory`;
- scope `api`: necesario para los endpoints generales de High-Level API.

Por lo tanto, V02-006 **no utiliza Client Credentials para leer `Assets/Computer`**. Se usa un usuario técnico dedicado autenticado mediante Password Grant.

Esta decisión debe revisarse si una versión futura de GLPI incorpora una identidad machine-to-machine real para `scope=api`.

## 1. Crear un perfil de mínimo privilegio

Nombre sugerido:

```text
NEXUS API Read-Only
```

Configurar inicialmente sólo lo necesario para el vertical V02-005:

| Área | Objeto | Permiso |
| --- | --- | --- |
| Assets | Computers | Read |

No habilitar por defecto:

- Create;
- Update;
- Delete;
- Purge;
- permisos de Administration;
- permisos de Setup;
- gestión de OAuth Clients;
- tickets/helpdesk;
- otros tipos de activos.

Si durante el Live Lab un endpoint documentado requiere lectura adicional de un objeto relacionado, agregar **sólo ese permiso** y registrar la evidencia. No sustituir el perfil por Super-Admin, Admin u Observer sólo para evitar un 403.

## 2. Crear o asignar el usuario técnico

Nombre sugerido:

```text
svc-nexus-api
```

Requisitos:

- dedicado a NEXUS, sin uso humano cotidiano;
- autenticación compatible con Password Grant;
- contraseña fuerte y aleatoria;
- contraseña almacenada fuera de Git;
- sin privilegios administrativos;
- sin pertenencia a perfiles adicionales que amplíen los permisos efectivos salvo justificación explícita.

Para laboratorio puede utilizarse un usuario interno dedicado si la política local lo permite. El mecanismo definitivo de gestión de identidad/secretos corporativos pertenece a v0.3.

## 3. Autorizar sólo las entidades necesarias

En GLPI una autorización es la combinación:

```text
usuario + perfil + entidad
```

Asignar `NEXUS API Read-Only` únicamente a la entidad o entidades que NEXUS deba observar.

- no usar Root Entity por comodidad si una entidad más acotada es suficiente;
- no marcar autorización recursiva salvo que NEXUS deba leer explícitamente las entidades hijas;
- documentar cualquier ampliación de alcance.

## 4. Crear el OAuth Client

En **Setup > OAuth Clients** crear un cliente dedicado para NEXUS.

Nombre sugerido:

```text
IGX NEXUS API
```

Configuración esperada:

```text
Grant: Password
Scope: api
```

No habilitar Client Credentials para este consumo de API general: GLPI 11 lo limita actualmente a `inventory`.

Si el origen de NEXUS tiene una IP estable, aplicar también la restricción de IP del OAuth Client.

El `Client ID` puede formar parte de configuración no secreta. El `Client Secret` debe tratarse como secreto y copiarse a almacenamiento seguro cuando GLPI lo muestre.

## 5. Configuración runtime de NEXUS

### No secreta

```text
NEXUS_PROVIDER_MODE=live
NEXUS_GLPI_BASE_URL=https://glpi.example/
NEXUS_GLPI_OAUTH_CLIENT_ID=<client-id>
NEXUS_GLPI_SERVICE_USERNAME=svc-nexus-api
```

Opcionales:

```text
NEXUS_GLPI_REQUEST_TIMEOUT_MS=10000
NEXUS_GLPI_TOKEN_REFRESH_SKEW_SECONDS=60
NEXUS_GLPI_PAGE_SIZE=100
NEXUS_GLPI_MAX_RECORDS=10000
```

`NEXUS_GLPI_ALLOW_INSECURE_HTTP=true` existe exclusivamente para laboratorio no productivo. En `production` se rechaza.

### Secreta

Backend de laboratorio actual:

```text
NEXUS_GLPI_OAUTH_CLIENT_SECRET=<secret>
NEXUS_GLPI_SERVICE_PASSWORD=<password>
```

Estas variables **no deben**:

- versionarse en `.env` dentro del repositorio;
- incluirse en issues/PRs;
- copiarse a logs;
- aparecer en screenshots o documentación;
- formar parte de `ApiConfig`, provider descriptor, provenance o evidence.

La implementación usa `GlpiCredentialSource` para que el backend de secretos pueda reemplazarse en v0.3 sin modificar el adapter GLPI.

## 6. Flujo OAuth esperado

```text
NEXUS
  |
  | POST /api.php/token
  | grant_type=password
  | scope=api
  v
GLPI OAuth
  |
  | access_token + expires_in
  v
cache en memoria de NEXUS
  |
  | Authorization: Bearer <token>
  v
/api.php/v2.3/Assets/Computer
```

El token se renueva antes de llegar a `expires_in`; las adquisiciones concurrentes se deduplican para evitar múltiples logins simultáneos.

No se utiliza refresh token en este flujo: al renovar, NEXUS solicita un nuevo access token mediante Password Grant.

## 7. Validación del Live Lab

Con el runtime levantado en modo Live:

1. `GET /health` debe seguir expresando liveness del proceso.
2. `GET /ready` debe responder 200 sólo si OAuth + GLPI + payload mínimo están disponibles.
3. El probe de readiness debe ejecutar únicamente una lectura `Assets/Computer?start=0&limit=1`.
4. La respuesta pública no debe incluir token, usuario técnico, Client ID, URL GLPI ni detalle de autenticación.
5. Un fallo OAuth o RBAC debe dejar `/ready` en 503 sin caer a Demo.

Diagnóstico conceptual:

```text
401 / token no obtenido -> revisar OAuth client, usuario y secretos
403 / acceso denegado   -> revisar perfil, entidad y permisos efectivos
503 en /ready           -> revisar upstream/auth/payload sin exponer secretos al cliente
```

Los códigos exactos del upstream deben verificarse en el Live Lab y no convertirse en mensajes públicos detallados.

## 8. Rotación y revocación

Para el backend de secretos por environment de v0.2:

- rotar `Client Secret` y contraseña de servicio fuera del repositorio;
- actualizar el mecanismo de inyección de secretos;
- reiniciar el runtime para cargar los nuevos valores;
- confirmar `/ready` y una lectura mínima antes de retirar las credenciales anteriores cuando el procedimiento corporativo lo permita.

La semántica exacta de revocación de access tokens debe probarse contra la versión GLPI real antes de asumir revocación inmediata.

## 9. Gate antes de ampliar permisos

No ampliar permisos de la service identity hasta tener evidencia de una necesidad funcional concreta.

Especialmente prohibido como solución rápida:

- Super-Admin;
- Admin;
- permisos Create/Update/Delete/Purge;
- acceso global recursivo sin justificación;
- desactivar controles TLS;
- compartir una cuenta humana existente.

El principio es **least privilege by evidence**.
