# GLPI Software & Operating System Adapter V2

PR 7 incorpora un lector interno y aditivo en `services/api/src/glpi-software.ts`. Base obligatoria verificada: `main@ae8ae38a9b64888bee500af4d977a837e9e5f2fe`, con PR #146 integrado. No hay composición productiva nueva, endpoint público, UI, persistencia, sincronización ni permisos adicionales.

## Evidencia de rutas y schemas

Se contrastó el backup OpenAPI de GLPI 11.0.11 / High-Level API 2.3.0 usado por [V03-CMDB-01](glpi-v03-cmdb-capability-audit.md), auditoría histórica del 2026-10-07. SHA-256: `31281705e3f44d39226bff3120513efa00ae096745d9670514afc5e3653825bf`. No se versiona el backup ni rutas personales. No se realizaron consultas GLPI Live.

Todas las peticiones son GET relativos al transporte v2.3 existente:

| Ruta OpenAPI utilizada | Schema | Mapeo |
| --- | --- | --- |
| `Assets/{asset_itemtype}/{asset_id}/OSInstallation` (Computer) | OSInstallation / Item_OperatingSystem | id; operatingsystem.id/name; version.name; edition.name; architecture.name; servicepack.name; kernel_version.name; date_install |
| `Assets/Computer/{asset_id}/SoftwareInstallation` | SoftwareInstallation / Item_SoftwareVersion | id; softwareversion.id/name; date_install |
| `Assets/Software` | Software | id; name; manufacturer.name |
| `Assets/Software/{software_id}/Version` | SoftwareVersion | id; name; arch; software.id |

Las cuatro colecciones documentan los parámetros `start`, `limit`, `sort` y respuesta JSON array. Se solicita `sort=id:asc`. Se validan tipos y orden real de IDs; no se asume que el servidor obedezca el límite u orden solicitados.

La instalación sólo aporta una referencia reducida `softwareversion: { id, name }`. El OpenAPI no ofrece una ruta global SoftwareVersion por ID: la ruta de detalle `Assets/Software/{software_id}/Version/{id}` necesita conocer primero el producto. Por eso el adapter recorre productos y sus colecciones de versiones con presupuesto compartido, y resuelve exclusivamente la coincidencia de ID de versión. No inventa endpoints, filtros relacionales, expansiones ni relación producto/versión por nombre. La ruta anidada demuestra el producto padre; si `software.id` está presente debe coincidir. Un ID de versión repetido entre productos se considera ambiguo y no se vincula.

El catálogo sólo enriquece instalaciones ya observadas. Nunca crea instalaciones a partir de productos disponibles. Se comparte una única lectura de catálogos por inventario; no hay cache global ni datos entre activos/sesiones. Los fallos parciales del catálogo producen gaps incluso si algunos vínculos pudieron demostrarse.

## Identidad y evidencia

`getInventory(asset, sections?)` exige un único SourceReference GLPI Computer válido, con scope `Assets/Computer` e instancia exactamente igual a la configuración. Ancla ausente, ambigua, ajena o ID externo inválido produce `GlpiSoftwareAnchorError`, subtipo compatible de `GlpiConfigurationError`. No consulta GLPI para resolver nombres de activo y mantiene exactamente `asset.id`. El ID canónico no se reconstruye desde el ID GLPI.

Los IDs de instalación/producto/versión se generan con `sourceReferenceKey` a partir de referencias explícitas, sin heurísticas. La identidad de versión utiliza un namespace lógico `SoftwareVersion` estable, aunque su evidencia conserve la ruta real anidada del catálogo. El namespace lógico `OperatingSystem` tampoco es una ruta solicitada. Las instalaciones con IDs distintos del mismo producto/versión permanecen distintas. IDs de instalación repetidos dentro o entre páginas no se fusionan: la página inconsistente se detiene con cobertura parcial.

Cada registro conserva su referencia real de adquisición (`source: glpi`, instancia, scope, ID externo, autoridad `authoritative`, timestamp de recepción). Producto y versión resueltos conservan evidencia propia del catálogo. Una versión reducida no resuelta conserva la evidencia de la instalación y su ID explícito; producto queda `null` con gap. No se fabrica fuente de catálogo para esa versión.

`collectedAt` registra adquisición; `observedAt` original permanece `null`. No se utiliza `date_mod`, `date_creation` ni `date_install` como fecha original de observación. `provenance: []` significa evidencia directa por SourceReference, conforme al contrato existente y al patrón Hardware, sin derivaciones ni inferencias ficticias. El reloj inválido produce error operacional de configuración, no error de ancla.

`date_install` Software conserva `precision: date`, sin convertirlo en medianoche UTC. OS conserva `precision: timestamp` sólo cuando existe timezone válido. Una fecha imposible, un datetime sin zona o precisión incompatible produce descarte explícito del registro y gap; nunca se inventa una zona. Los campos opcionales ausentes/vacíos se representan como `null`. No se extrapolan licencias, vulnerabilidades, cumplimiento ni OS principal.

## Cobertura y paginación

OS y software se recuperan independientemente. Los estados del contrato se mantienen:

| Estado | Uso en el adapter |
| --- | --- |
| complete | Consulta adquirida y agotamiento probado por página vacía posterior, sin gaps |
| partial | Prefijo adquirido, límite, catálogo incompleto, inconsistencia o descarte con gaps explícitos |
| unavailable | No hubo adquisición interpretable o la sección falló por autorización; sin items residuales |
| not_requested | Sección omitida explícitamente; no consulta su colección |
| not_applicable | Reservado por contrato; este lector exige Computer y no tiene evidencia para emitirlo. No se usa como sustituto de vacío, 404 o desconocimiento |

Los atributos desconocidos no implican por sí solos colección incompleta. Una colección vacía sólo es completa tras recibir un array vacío válido con evidencia de adquisición. Un 404 no prueba ausencia: es `source_error`. Ni una página corta ni `nextOffset: null` demuestran agotamiento. La regresión histórica se simula como 100 + 45 + página vacía en start=145; no representa el estado actual del laboratorio.

Cada página requiere IDs enteros positivos estrictamente crecientes, sin duplicados dentro de la página ni respecto a páginas anteriores. Se rechazan arrays mayores al límite, payload no array, IDs inválidos y páginas repetidas/solapadas. No se reintenta indefinidamente. Los IDs del catálogo se validan del mismo modo.

`pagination` representa únicamente el rango canónico íntegro. En un prefijo válido sin descartes: offset=0, retrieved=items.length; total se conoce sólo tras agotamiento; nextOffset=null porque la API array no entrega continuación probada. Un límite/fallo mantiene state=partial aunque nextOffset sea null. Si hay filtrados (`is_deleted`), registros semánticamente inválidos, duplicados u orden inconsistente, pagination=null: no se finge un rango contiguo después de descartarlos.

## Límites y seguridad

| Opción | Default | Rango permitido |
| --- | ---: | ---: |
| pageSize | 100 | 1–1000 |
| maxPages por colección | 100 | 1–10000 |
| maxRecords por colección | 10000 | 1–100000 |
| maxCatalogueRequests por inventario | 500 | 1–2000 |
| requestTimeoutMs | 10000 | 1–60000 |

Los límites exigen enteros seguros; alcanzar un límite sin página vacía conserva cobertura parcial. El presupuesto compartido incluye todas las páginas de productos/versiones. Consumir exactamente el presupuesto tras agotar la última colección necesaria no añade gaps; si queda otra página o colección de versiones pendiente, `collect()` registra `pagination_incomplete` en su ruta sin emitir peticiones fuera del presupuesto. Las regresiones cubren un producto/versión con presupuesto 4 (complete), presupuesto 3 (partial) y otro producto pendiente (partial), conservando todas las instalaciones y sólo vínculos probados. Se evita multiplicar gaps idénticos por cada instalación.

Sólo se usa `GlpiApiTransport.get`, que conserva autenticación técnica, HTTPS, timeout, redirects prohibidos y errores sanitizados. El adapter añade un deadline para transportes que entreguen respuestas tarde; no acepta ni muta salida tras vencerlo. La interfaz de transporte no ofrece cancelación: el deadline ignora el resultado tardío; el transporte fetch existente cancela su petición por su propio timeout. No hay fetch directo, SQL, administración, bootstrap RBAC, nuevos scopes o fallback Demo.

401/403 o credenciales no disponibles en colección o catálogo hacen fail-closed de la sección afectada, sin exponer páginas previas, fuentes residuales ni mensajes del upstream. La otra sección puede continuar. 405/501 se clasifican `unsupported`; 404, red, deadline, 503 y payload incompatible como `source_error`, conservando el prefijo válido cuando corresponde. La autorización de cualquier catálogo consultado hace indisponible software, incluso si el catálogo afectado no hubiera enriquecido una instalación final; decisión conservadora deliberada.

Cada salida exitosa pasa `validateSoftwareInventoryV2`. Los tests simulan transporte y datos inequívocamente sintéticos; no incluyen secretos ni datos corporativos. No se han modificado contratos, provider 0.2, Hardware V2, endpoints ni consumidores.

## Riesgos pendientes

- El recorrido de catálogos tiene costo proporcional a productos/versiones visibles; puede alcanzar el presupuesto con resultados parciales. No amplía permisos para completar datos.
- La API paginada no garantiza un snapshot transaccional. Orden/duplicados detectan algunas mutaciones concurrentes, pero no prueban que no se haya eliminado/insertado un registro entre consultas. No se promete atomicidad.
- OS con fechas sin timezone quedan parciales; se requiere evidencia adicional antes de convertir una zona horaria.
- La exactitud estructural del OpenAPI y fixtures no sustituye smoke autenticado. El smoke GLPI Live sigue pendiente y requiere autorización explícita.
- No se inicia API/UI Software ni PR 8. La entrega queda pendiente de auditoría humana antes de commit, push o PR.
