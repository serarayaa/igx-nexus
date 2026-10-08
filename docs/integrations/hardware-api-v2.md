# Hardware API V2 — V03-CMDB-02 / PR 3

`GET /api/v2/technology/assets/:assetId/hardware` devuelve un `HardwareInventoryV2` validado. Es una ruta aditiva; el endpoint `/api/v1/technology/snapshot`, su contrato 0.2 y los consumidores actuales mantienen su comportamiento. No añade UI, persistencia, escrituras ni permisos.

## Identidad y alcance

El consumidor envía el `TechnologyAsset.id` ya publicado por NEXUS, codificado como segmento URL. La ruta obtiene y valida el snapshot del provider configurado y busca exactamente ese ID. No descompone el namespace, no genera una identidad ni trata el parámetro como número GLPI. El activo encontrado se entrega al adapter de PR #142, que exige una referencia Computer inequívoca de la instancia configurada. Un activo que no aparece en ese inventario recibe el mismo 404 que cualquier otro ID desconocido, sin consultas de hardware.

La resolución reutiliza el inventario autorizado del provider; no requiere un Identity Registry nuevo. La estrategia GLPI inicial es namespaced y determinista, pero también se aceptan IDs canónicos preservados cuando el snapshot los publica. Sólo las referencias del activo resuelto determinan la asociación GLPI.

El modelo de seguridad actual concede `technology:read` sobre todo el inventario del provider. No hay ACL de activo, entidad o tenant por usuario en `SecurityPrincipal`. Esta ruta conserva ese alcance global y el perfil técnico GLPI delimita el inventario upstream. Si se requieren restricciones diferentes por usuario o entidad, deben incorporarse a la autorización y resolución antes de habilitar ese uso; esta entrega no afirma aislamiento por tenant que el repositorio no implementa.

La autenticación y el permiso se comprueban antes de leer el provider. Se rechaza cualquier query string: el cliente no puede elegir instancia GLPI, entidad, provider, alcance ni secciones. La composición runtime utiliza el mismo transporte, token provider e instancia para el snapshot y el adapter. No existe acceso directo del navegador a GLPI.

## Contrato HTTP

| HTTP | Tratamiento |
| --- | --- |
| 200 | Inventario válido con al menos una de las cuatro secciones recopilada (`complete` o `partial`), incluidas colecciones vacías con evidencia |
| 400 | Parámetro inválido o query string no admitida; error normalizado de validación |
| 401 | Consumidor NEXUS sin autenticar, sin consultas al provider |
| 403 | Consumidor NEXUS sin `technology:read`, sin consultas al provider |
| 404 | ID no encontrado en el snapshot autorizado o sin ancla Computer; `ASSET_NOT_FOUND`, `Asset not found` |
| 503 | Provider/adapter no disponible, modo Demo, fallo del snapshot, autorización upstream, inventario incompatible o todas las secciones de hardware indisponibles |

Los errores usan el envelope existente `{ code, statusCode, message, requestId }`. Conforme al handler actual, los errores 503 públicos son `INTERNAL_ERROR` / `Internal server error`; la clasificación interna se limita a metadatos seguros en logs. No se publican mensajes del upstream, tokens, credenciales, URLs internas ni payloads incompatibles.

El 401/403 de GLPI representa un fallo de la identidad técnica, no un desafío de autenticación al usuario NEXUS. Si cualquier sección devuelve indisponibilidad por autorización, se descarta el inventario HTTP completo y se responde 503. Para otros fallos, la cobertura por sección permanece explícita: un 503 tardío puede conservar una sección parcial; una sección inválida puede ser indisponible mientras otras válidas se publican. No se transforman fallos en listas vacías. La API valida el contrato y la coincidencia de assetId antes de serializar.

No se usa HTTP 206: la parcialidad pertenece al contrato de cobertura, no a un rango de bytes. La respuesta 200 conserva fechas, referencias de fuente, valores null, razones de cobertura y secciones periféricas `not_requested`. Todas las respuestas mantienen `cache-control: no-store` y correlación mediante `x-request-id`.

`GlpiHardwareAnchorError` es un subtipo compatible de `GlpiConfigurationError` que identifica exclusivamente un ancla Computer ausente, ambigua, inválida o ajena a la instancia configurada. Sólo ese subtipo produce 404. Un `GlpiConfigurationError` general, un reloj de recopilación inválido u otro fallo operacional producen 503 sin detalles internos.

## Schemas Hardware V2

OpenAPI describe mediante referencias reutilizables el inventario, seis secciones tipadas, componentes CPU/RAM/discos/periféricos, volúmenes, conexiones, adquisición, evidencia, medidas y brechas. Cada sección declara `oneOf` de complete, partial, unavailable, not_applicable y not_requested. Las variantes recopiladas requieren timestamps y fuentes; partial requiere gaps no vacíos; los estados no recopilados no admiten items ni metadatos de adquisición.

Los enums se importan de los contratos canónicos. Fuente, provenance e identificadores reutilizan los schemas del contrato HTTP existente, sin copiar sus reglas. La cobertura de campos se comprueba en TypeScript mediante los tipos canónicos. No se duplican reglas complejas: evidencia válida mínima por registro, comparación de timestamps/capacidades/frecuencias, combinaciones de transporte, duplicados y referencias cruzadas siguen siendo responsabilidad de `validateHardwareInventoryV2`, ejecutado antes de serializar.

La aplicación publica OpenAPI 3.0.3, que no acepta `type: null`. Además, el conversor instalado de `@fastify/swagger` descarta propiedades hermanas de `$ref`, por lo que `$ref` junto a `nullable` perdería la nulabilidad. Los schemas nuevos usan `nullable: true` en tipos directos (incluyendo null en enums cuando corresponde); las medidas referenciadas usan `anyOf` con una rama null exclusiva (`type: object`, `nullable: true`, `enum: [null]`). Esta forma funciona con el serializador/Ajv actuales y conserva un documento 3.0 sin type:null en los componentes nuevos. Algunos generadores de clientes pueden representar la rama null como una unión; deben verificarla contra las respuestas y conservar null como desconocido. No se cambió el schema ni el comportamiento HTTP v1.

Los schemas estructurales documentan y serializan; no reemplazan al validador canónico de semántica. Las regresiones comprueban campos, enums, estados, referencias de schemas y serialización íntegra de medidas conocidas, fuentes, provenance e identificadores.

## Modos y composición

- Live configurado: sólo se usan el provider y adapter GLPI seleccionados por el servidor.
- Demo: 503; no se fabrica inventario ni se usa el provider de demostración como fallback de hardware.
- Aplicación Live sin provider/adapter inyectado: 503 sin éxito simulado.
- El proceso standalone mantiene su preflight previo: configuración Live o credenciales ausentes impiden arrancar. No se cambió ese comportamiento de seguridad para forzar un listener parcialmente configurado.

`buildApp` permite inyectar `hardwareAdapter` junto al provider para pruebas/backend. `createRuntimeTechnologyServices` compone ambos sobre el transporte existente; `createRuntimeTechnologyProvider` conserva su firma y comportamiento como wrapper compatible. Las dependencias inyectadas son configuración confiable del servidor, nunca parámetros del consumidor.

## Validación y siguientes pasos

Las pruebas usan fixtures y transporte sintéticos. Cubren lookup canónico exacto y ancla preservada, IDs numéricos y de otra instancia rechazados, autorización antes de I/O, query strings, modos, fallos GLPI, catálogo no autorizado, inventario parcial/vacío/incompatible, filtración de errores, composición runtime y compatibilidad v1.

No se ejecutó smoke GLPI Live autenticado ni se afirma éxito Live. Antes de habilitarlo deben autorizarse el smoke y el perfil técnico existente. Cada lectura resuelve el activo mediante un snapshot completo del provider, con los límites y errores de paginación actuales: puede ser costosa y no constituye una instantánea transaccional. No se añade caché ni persistencia en esta entrega.

Asset 360 UI debe enviar únicamente el ID canónico publicado, distinguir 401/403 de 503 y 404, mostrar las razones de cobertura y representar null como desconocido. Una colección vacía completa no equivale a una sección indisponible. Debe mostrar recopilación y observación original por separado y conservar el endpoint v1 para sus consumidores actuales. Cualquier autorización futura por entidad/usuario requiere un diseño explícito previo, no filtros de cliente.
