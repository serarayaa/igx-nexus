# ADR-0015 — GLPI API v2 Adapter

Estado: **Aceptado en V02-005 / issue #52 / PR #53**. Integrado a `main` mediante merge manual `10acf2533877b19a261d8f5291e90269df2014e8`; CI post-merge #247 verde.

## Contexto

V02-004 estableció `TechnologyProvider` como frontera común entre Demo y Live. El siguiente paso es conectar una fuente real sin romper esa abstracción ni convertir GLPI en el contrato de producto.

IGX NEXUS mantiene a GLPI como **System of Record CMDB/ITAM** y a NEXUS como capa de integración, contexto e inteligencia. Por lo tanto, la Web no accede directamente a GLPI y NEXUS API nunca consulta tablas internas de MariaDB.

La High-Level REST API de GLPI 11 es versionada. Para evitar cambios contractuales implícitos, V02-005 fija explícitamente la línea **v2.3** en vez de consumir `/v2` flotante. La identidad/autorización productiva de GLPI se mantiene separada y pertenece a V02-006.

## Decisión

### 1. High-Level REST API, read-only

V02-005 utiliza:

```text
<glpi-root>/api.php/v2.3/Assets/Computer
```

El transporte expuesto por el adapter sólo implementa `GET`. No existen POST, PATCH, PUT ni DELETE en este ticket.

No se usa `apirest.php` legacy ni acceso directo a MariaDB.

### 2. Autenticación inyectable

El transporte recibe un `GlpiAccessTokenProvider`:

```text
() -> Promise<string>
```

El adapter sabe adjuntar un Bearer token pero **no sabe cómo obtenerlo**. V02-006 definirá OAuth/service identity, scopes, rotación y RBAC.

Esto evita versionar client secrets, passwords, refresh tokens o credenciales temporales dentro del adapter.

### 3. HTTPS por defecto

`baseUrl` debe usar HTTPS. HTTP sólo puede habilitarse mediante `allowInsecureHttp=true` para un laboratorio explícito.

La URL base:

- debe apuntar a la raíz de GLPI, no a `api.php`;
- no puede contener usuario/password embebidos;
- no puede contener query string ni fragmento.

El transporte usa redirects en modo `error`, timeout/cancelación y respuestas de error que no copian bodies del upstream.

### 4. Versión API explícita

La versión soportada en V02-005 es:

```text
v2.3
```

No se permite seleccionar una versión arbitraria. Ampliar versiones compatibles requiere cambio explícito, tests y revisión del mapping.

### 5. Primer vertical: `Assets/Computer`

V02-005 limita el adapter al tipo `Computer`. No incorpora todavía NetworkEquipment, Printer, Monitor, Phone ni otros tipos.

Las colecciones se recorren mediante `start` y `limit`, con:

- page size acotado;
- máximo total configurable;
- detección de IDs duplicados entre páginas;
- error si alcanzar el máximo implicaría truncar silenciosamente el snapshot.

### 6. Mapping conservador

Un `Computer` de GLPI se normaliza inicialmente como:

```text
domain       = IT
assetClass   = compute
role         = custom:glpi-computer
lifecycle    = unknown
criticality  = unknown
```

No se deduce laptop/server/desktop desde nombres, modelos o strings localizadas. Tampoco se traduce un status GLPI automáticamente a lifecycle NEXUS en este ticket. La taxonomía detallada se resolverá en V02-010 con reglas explícitas y evidencia.

Campos observados de GLPI se conservan bajo atributos namespaced `glpi.*`.

### 7. Identidad y procedencia

El ID de GLPI nunca se convierte directamente en identidad pública NEXUS.

V02-005 deriva una identidad NEXUS determinista a partir de:

```text
source=glpi + sourceScope=Assets/Computer + externalId
```

mediante un hash namespaced. Esto mantiene estabilidad para el mismo registro GLPI sin exponer su ID como identidad canónica.

La reconciliación con otras fuentes y la eventual política definitiva de identidad corresponden a V02-009.

Cada asset conserva:

- `SourceReference.source = glpi`;
- `externalId` opaco;
- `entityType = Computer`;
- `sourceScope = Assets/Computer`;
- timestamp de observación;
- authority `authoritative` para campos provenientes del registro;
- evidencia `api_response` sin URL, host, token ni datos sensibles.

Identificadores explícitos se conservan cuando existen:

- `serial` → `serial_number`;
- `otherserial` → `asset_tag`;
- `uuid` → `hardware_uuid`.

### 8. Payloads se consideran no confiables

El adapter valida que la colección sea un array y que cada Computer incluya un `id` entero no negativo. Valores opcionales se aceptan sólo con tipos esperados.

Un payload incompatible falla cerrado con `GlpiPayloadError`; NEXUS no sustituye la falla por datos Demo.

El `TechnologySnapshot` final vuelve a validarse mediante `@igx-nexus/types` antes de salir del provider.

### 9. Readiness real y liveness independiente

El descriptor del provider expresa que el adapter está configurado para operar, pero un upstream real puede fallar después del bootstrap.

Por ello `TechnologyProvider` admite un `checkAvailability()` opcional. El provider GLPI ejecuta un probe read-only mínimo:

```text
GET Assets/Computer?start=0&limit=1
```

El probe valida conectividad/auth y forma básica del payload sin descargar el inventario completo. Para evitar que `/ready` martille el upstream, el resultado usa un cache corto y las solicitudes concurrentes comparten un mismo probe en vuelo.

Consecuencia:

```text
/health -> proceso vivo
/ready  -> proceso + provider/upstream disponible
```

Una falla del probe devuelve 503 en `/ready` y no propaga detalles del upstream al cliente.

## Seguridad

- ningún secreto se almacena en el descriptor público;
- bearer token sólo viaja en header Authorization;
- el token nunca forma parte de URL/evidence/error;
- HTTP no exitoso no copia el body de GLPI;
- redirects automáticos se rechazan;
- timeout evita esperas ilimitadas;
- payloads se validan antes de entrar al dominio;
- provider Live no cae jamás a Demo;
- sólo GET está disponible en el transporte de V02-005.

## Consecuencias positivas

- GLPI entra detrás del contrato ya definido por V02-004;
- la Web sigue siendo independiente de GLPI;
- V02-006 puede cambiar la estrategia OAuth sin reescribir mapping/paginación;
- V02-008 podrá construir el primer vertical Live sobre una fuente canónica;
- errores y payloads del upstream no se convierten automáticamente en dominio confiable;
- readiness empieza a reflejar dependencias reales.

## Costos y riesgos aceptados

- el primer adapter sólo cubre Computer;
- lifecycle/criticality/taxonomía específica permanecen desconocidos por diseño;
- sólo existe cache corto para readiness; no existe todavía cache general de respuestas, retry/backoff ni circuit breaker;
- el snapshot completo es una lectura paginada en memoria, suficiente para el laboratorio inicial pero no una decisión definitiva de escala;
- la identidad derivada por fuente será revisada al implementar reconciliación multisource;
- la obtención/renovación del token todavía debe ser resuelta por V02-006.

## Fuera de alcance

- OAuth Client y service identity productiva;
- credenciales/secret manager;
- GLPI Agent;
- escritura a GLPI;
- acceso directo a DB;
- UI Live;
- reconciliación multisource;
- taxonomía IT/OT definitiva;
- otros asset types;
- sincronización incremental/webhooks;
- caching distribuido.

## Relación con ADR anteriores

- ADR-0001: NEXUS API continúa aislando la Web de fuentes aguas arriba.
- ADR-0011: GLPI se normaliza al modelo canónico y no redefine identidad NEXUS.
- ADR-0012: `buildApp()` sigue siendo el punto de composición.
- ADR-0013: errores/logging/configuración permanecen fail-closed y minimizados.
- ADR-0014: GLPI implementa la rama Live del `TechnologyProvider` sin introducir condicionales de modo en el producto.
