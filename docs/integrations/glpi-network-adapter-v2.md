# GLPI Network Cards Adapter V2

PR 11, entrega local para revisión humana. Baseline `main@bfc4b19f448d2f623a7159ac47d2a68b41622a80`; PR #150 integrado y [CI posterior exitoso](https://github.com/serarayaa/igx-nexus/actions/runs/38593208120). No publicado.

## Superficie interna

`services/api/src/glpi-network.ts` exporta `createGlpiNetworkAdapter`, sus opciones/interfaz, `glpiNetworkSections` y `GlpiNetworkAnchorError`. Sigue la composición de Hardware/Software: transporte GlpiApiTransport inyectado, instancia explícita y reloj inyectable. No se registra en index, servidor, runtime, provider, endpoint ni snapshot. El consumidor interno llama `getInventory(asset, sections?)`; única sección admitida: networkCards. Una lista vacía produce not_requested después de validar identidad y ancla.

Sólo se emiten GET relativos:

- `Assets/Computer/{id}/Component/NetworkCard`, con start, limit y sort=id:asc.
- `Components/NetworkCard/{id}`, sólo si enrichCatalogue=true y existe una referencia numérica explícita.

No búsqueda global, consulta por MAC/hostname, GraphQL, API legacy ni headers de entidad/perfil suministrados por el caller. El adaptador no obtiene tokens; los errores de autenticación/autorización se reciben mediante el transporte existente. Estas rutas se respaldan en el [extracto OpenAPI auditado](glpi-network-v2-openapi-evidence.json), no en consultas nuevas.

## Identidad y mapping

Se exige exactamente una SourceReference GLPI de tipo Computer, incluso al considerar referencias de otras instancias/scopes. Debe usar Assets/Computer, la instancia configurada, evidencia válida y externalId decimal positivo seguro sin prefijos, espacios o ceros iniciales. Anclas contradictorias fallan antes de I/O. Otras fuentes no sustituyen el ancla. TechnologyAsset.id se conserva literalmente: espacios interiores válidos, rechazo de vacío/espacios exteriores, sin trim de salida ni reconstrucción.

| Origen | Salida y semántica |
| --- | --- |
| TechnologyAsset.id | assetId literal |
| NetworkCardItem.id | attachmentId = sourceReferenceKey de fuente NetworkCardItem, scope de colección del Computer e ID numérico validado |
| network_card.id | definitionId = sourceReferenceKey de fuente NetworkCard con scope Components/NetworkCard/{id}; estable con/sin enriquecimiento |
| network_card.designation | designation de asociación, sin sustituir con etiqueta de catálogo |
| NetworkCardItem.mac | macAddress observada, conservada literalmente |
| NetworkCardItem.busID | busId literal |
| NetworkCard.designation | definition.designation |
| NetworkCard.manufacturer.name / model.name | definition.manufacturer / model; sin fallback a designation |
| NetworkCard.mac_default | definition.defaultMacAddress, nunca fallback para MAC observada |
| NetworkCard.bandwidth | definition.bandwidthLabel literal, sin unidad/velocidad negociada inferida |

Los IDs GLPI se aceptan como números enteros positivos seguros; no se convierten strings upstream en IDs válidos. Referencia opcional ausente/null/id=0 representa catálogo desconocido según convenciones existentes. Atributos ausentes/null/vacíos/blancos se representan como null; otros strings conservan su contenido exacto y tipos incompatibles producen gaps. No se copian propiedades desconocidas, credenciales SNMP, direcciones, topología ni payloads crudos. itemtype e items_id se comprueban independientemente cuando existen; contradicciones invalidan esa asociación. Las asociaciones marcadas is_deleted se omiten con gap not_observed, sin declarar una colección actual completa silenciosamente. Flags presentes de tipo incorrecto se rechazan.

## Evidencia, cobertura y validación

Cada asociación tiene exclusivamente su propia fuente NetworkCardItem; cada definición resuelta tiene evidencia independiente NetworkCard. Cada página aceptada aporta una fuente de colección con la ventana de adquisición. collectedAt registra adquisición, observedAt de los registros/sección permanece null: no se inventa una observación original desde fechas upstream. SourceReference.observedAt registra la adquisición conforme a las convenciones existentes; authority authoritative y provenance vacío sin inventar claims. No se afirma existencia de catálogo resuelto sólo porque haya definitionId.

Cada registro se comprueba con el validador canónico antes de retenerlo; cada inventario retornado pasa validateNetworkInventoryV2, incluidos not_requested/unavailable. MAC o catálogo repetidos no deduplican asociaciones; sólo se cachean detalles por referencia explícita dentro de una llamada. Éxitos y fallos ordinarios se cachean para evitar reintentos implícitos; no hay cache entre llamadas/usuarios/activos.

complete sólo significa agotamiento verificado de asociaciones del alcance, nunca todas las interfaces del Computer. Requiere página vacía posterior y ausencia de gaps. Vacío completo requiere una respuesta [] exitosa con evidencia. 404, transporte fallido, payload incompatible o fuente no soportada nunca se transforman en ausencia exitosa/not_applicable. Sin páginas válidas: unavailable; con evidencia previa: partial con gaps. Payload array incompatible por IDs/orden/solapamiento aporta un gap y se descarta esa página; no se incorporan duplicados. Campos incompatibles/propietarios contradictorios descartan el registro con gap.

401/403 o GlpiAuthenticationError en cualquier página/detalle devuelven únicamente unavailable/unauthorized, sin items, evidencia ni catálogo residual. Errores 405/501 se clasifican unsupported; demás fallos ordinarios, incluido 404 y timeout, source_error. Fallos de configuración/reloj se propagan como GlpiConfigurationError. La clasificación reutiliza las convenciones existentes sin modificar sus clases.

El catálogo es opcional y desactivado por defecto. No solicitarlo o no tener referencia explícita no genera un fallo artificial. Si se intenta y falla, asociaciones válidas permanecen con definition:null y partial/gaps, salvo autorización. Presupuesto de detalle agotado se informa pagination_incomplete. MAC desconocida no se completa desde defaultMacAddress.

## Límites configurables

| Opción | Default | Rango |
| --- | --- | --- |
| pageSize | 100 | 1–1000 |
| maxPages | 100 | 1–10000, incluye prueba vacía terminal |
| maxRecords | 10000 | 1–100000, asociaciones consumidas incluidas descartadas |
| maxCatalogueRequests | 500 | 0–2000, peticiones reales de detalle, también las fallidas |
| requestTimeoutMs | 10000 | 1–60000 por petición |
| enrichCatalogue | false | boolean |

Sólo enteros seguros en límites numéricos. El límite de registros acota registros retenidos/procesados normales; en el borde exacto permite una última petición limit=1 para demostrar agotamiento. Si devuelve un registro adicional, se descarta sin enriquecer y se devuelve partial; esa fila de prueba puede ser recibida en memoria, pero no incorporada al inventario. La prueba consume una página y respeta maxPages. Alcanzar maxPages sin [] siempre es partial. Las páginas cortas avanzan por registros recibidos, no por limit solicitado. No se conoce total upstream: sólo se fija total al agotar. Si hay descartes/solapamiento se usa pagination:null para no inventar una ventana contigua; los gaps y fuentes explican la incompletitud.

Los detalles devuelven objetos: maxCatalogueRequests los contabiliza explícitamente, sin depender del contador de arrays del guard Software. Requests secuenciales por inventario, sin fan-out. Cada petición recibe AbortSignal y una carrera de timeout; al expirar se solicita cancelación y no se inicia más I/O en ese inventario. Un transporte personalizado puede ignorar abort y terminar tarde; su resultado no muta el inventario retornado. No hay garantía de drain, límite global de operaciones, deadline total ni SLA productivo. Esos controles y el lookup autorizado deberán aprobarse al diseñar una futura API. El guard Software no se declara heredado.

## Handoff y verificación

110 pruebas Network exclusivamente sintéticas, más regresiones existentes de Hardware/Software/transporte y snapshot. [Informe técnico](../audits/pr11-glpi-network-adapter-v2.md) y logs de auditoría documentan comandos, fallos y resultados. No hay smoke GLPI Live ni muestras runtime nuevas de tarjetas pobladas. Offset/orden no constituyen snapshot transaccional; la configuración Agent puede excluir componentes virtuales. No inferir interfaces completas, IP, gateways, VLAN, estado de enlace ni topología.

Revisión humana antes de commit/push/PR. No iniciar API Network V2 ni runtime productivo.
