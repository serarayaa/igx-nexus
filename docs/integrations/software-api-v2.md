# Software & Operating System HTTP API V2

PR 8: auditoría humana favorable; corrección puntual de assetId para cierre, sin autorización de publicación. Base `a242d21a0b3de3774182d1fa367dfff7b730af90`, PR #146 y #147 integrados. Target: NEXUS 1.0 — IT CMDB & Asset Management. Sin UI, escritura GLPI, nuevos permisos, cache de inventario ni persistencia.

## Arquitectura, identidad y autorización

`GET /api/v2/technology/assets/:assetId/software` publica `SoftwareInventoryV2`. `buildApp` registra Software después de Hardware y reutiliza sus schemas de SourceReference, provenance y cobertura. `createRuntimeTechnologyServices` compone snapshot, Hardware y Software con una instancia configurada, un GlpiApiTransport y el token provider existente. `createRuntimeTechnologyProvider` conserva firma y retorno compatibles. El tercer argumento opcional de transporte admite signal; implementaciones anteriores de dos argumentos siguen siendo compatibles.

Autenticación NEXUS y `technology:read` preceden al handler y cualquier lectura del provider. El handler valida el snapshot completo y busca igualdad exacta de ID canónico; no decodifica el ID del consumidor. El adapter exige una única referencia GLPI Computer válida, scope `Assets/Computer`, instancia idéntica a la configurada y externalId entero positivo seguro. No deriva identidad de hostname, serial, MAC, ID GLPI recibido por el cliente ni software.

El consumidor no puede elegir provider, instancia, entidad, scope, secciones ni filtros; cualquier query no vacía falla. Demo responde indisponibilidad y no fabrica Software Live. RBAC autoriza lectura global del inventario configurado: **no existe aislamiento por usuario o entidad**. La identidad técnica GLPI delimita el inventario visible; el lookup no es una política multi-tenant.

assetId se preserva literalmente, incluidos espacios interiores válidos: `SYNTH ASSET` se busca y devuelve exactamente así. Sólo se exigen límites no vacíos y sin whitespace inicial/final; no hay trim, colapso de espacios, transformación ni reconstrucción. El pattern `^\S(?:[\s\S]*\S)?(?![\s\S])` permite contenido interior y ancla el final real: también rechaza un salto de línea final que `$` podría permitir. Regresiones HTTP verifican espacio simple/doble, tab interior e ID de un carácter; variantes normalizadas distintas reciben 404. IDs vacíos, blancos o con whitespace en los extremos reciben 400 antes de leer el provider.

Inyecciones programáticas de provider/adapter son componentes confiables del servidor. Si introducen I/O externo deben usar el transporte instrumentado. La cota agregada demostrada corresponde al runtime GLPI existente, no a I/O arbitrario oculto en implementaciones inyectadas.

## Semántica HTTP

| HTTP | Condición |
| --- | --- |
| 200 | Contrato validado, assetId exacto y alguna sección complete/partial |
| 400 | Query no admitida o parámetro inválido: ID vacío/blanco o whitespace inicial/final; espacios interiores válidos se conservan |
| 401 | Sin autenticación NEXUS |
| 403 | Sin technology:read |
| 404 | ID ausente o ancla Computer ausente, ambigua, inválida o de instancia ajena |
| 503 | Provider/adapter ausente, snapshot inválido/incompleto, resultado no servible, autorización upstream, deadline o saturación |

Una URI excesiva recibe **414 del router existente antes del schema del endpoint**; se conserva ese comportamiento y no se amplió un límite global que afecta otras rutas. Fastify valida estructura antes de preHandler, conforme a las convenciones actuales: requests inválidas pueden recibir 400 antes del challenge, sin leer GLPI.

Envelope existente `{code,statusCode,message,requestId}`. `errors.ts` normaliza 5xx a `INTERNAL_ERROR` / `Internal server error`, incluida saturación. No se filtran errores upstream ni datos adquiridos. Se preservan `x-request-id` y `cache-control: no-store`; no hay cola para saturación.

## Cobertura y evidencia

Cada salida se valida con `validateSoftwareInventoryV2`. complete requiere agotamiento probado; una colección vacía adquirida conserva fuentes de colección. Un error no se representa como lista vacía exitosa. Prefijos válidos/catálogos incompletos producen partial y gaps. Producto/versión no resueltos quedan null o conservan su referencia reducida respaldada por la instalación. pagination no contigua permanece null; nextOffset=null no prueba agotamiento.

Si alguna sección está unavailable/unauthorized o contiene un gap de autorización, se descarta **todo** el resultado HTTP, incluidas otras secciones adquiridas. Un deadline total también devuelve 503: no se publica una operación vencida mientras queda trabajo pendiente. Fallos operacionales independientes de autorización pueden preservar cobertura parcial con evidencia válida.

Fechas date/timestamp preservan precisión y valor, sin inventar medianoche ni timezone. SourceReference, provenance y campos null mantienen los [contratos PR #146](../product/software-os-contracts-v2.md) y el [adapter PR #147](glpi-software-os-v2.md). El límite efectivo de página figura tanto en el query como en la evidencia de adquisición: reducir una página por presupuesto no falsifica provenance.

## OpenAPI y serialización

Schemas reutilizables: SoftwareInventoryV2, OperatingSystemInstallationV2, SoftwareInstallationV2, SoftwareIdentityV2, SoftwareVersionV2, SoftwareInstallationDateV2, SoftwarePaginationV2 y variantes de sección. Las claves se comprueban contra interfaces TypeScript; reglas semánticas complejas permanecen en el validador canónico.

OpenAPI sigue en 3.0.3. Referencias nullable usan unión explícita con `{type:object,nullable:true,enum:[null]}`, sin siblings de $ref. Swagger puede asignar nombres def-* a componentes y conserva sus títulos. Se detectó type:null en documentación inline histórica de v1: `openApi30Nulls` convierte únicamente el documento generado al equivalente OAS 3.0, sin modificar contratos ni serializers HTTP v1. La regresión exige ausencia de type:null en todo el documento.

Tests HTTP comparan JSON real con inventario esperado completo, incluidos null, fechas, provenance, gaps y pagination. El OpenAPI generado se entrega en el ZIP.

## Deadline, presupuestos y concurrencia

`software-operation.ts` crea AsyncLocalStorage exclusivamente para el handler Software autorizado. El deadline usa performance.now() y tiempo restante absoluto; no se reinicia por página, sección, catálogo o token. Snapshot e inventario comparten contexto.

El wrapper contabiliza invocaciones del transporte para Computers, OS, instalaciones, productos y versiones, más nuevas peticiones OAuth iniciadas por esa operación. Reservar una llamada de datos que finalmente no sale a la red es conservador. OAuth compartido ya iniciado por otro consumidor no se cobra como petición nueva de cada waiter; su espera sí conserva cupo.

Se comprueba deadline antes de I/O, después de adquirir datos y durante recorridos de productos/versiones/instalaciones. Fetch combina timeout propio y signal del inventario. Resultados tardíos se descartan y no pueden iniciar otra página. Código síncrono no es preemptivo: un event loop ocupado retrasa timers y envío HTTP; el siguiente checkpoint rechaza el resultado vencido. No se promete deadline duro de pared o CPU.

Un cupo se libera después de terminar el handler **y todas las promesas originales del transporte**. Si vence primero el timer de adapter, HTTP devuelve 503 y el cupo sigue ocupado. Una promesa no cancelable que nunca termine retendrá cupo indefinidamente: se sacrifica disponibilidad para impedir acumulación residual oculta. Con todos los cupos ocupados, nuevas operaciones reciben 503 sin cola. Gate local al proceso, no distribuido. Rate limiting por IP permanece independiente.

OAuth ya iniciado puede completar y actualizar la cache de tokens existente para Hardware/v1 después del deadline Software; no se aborta arbitrariamente la adquisición compartida. Software vencido no inicia consulta GLPI al recibir el token. Si todavía cargaba credenciales al vencer, no inicia OAuth después. Ambas condiciones tienen regresiones deterministas.

| Variable | Default | Rango |
| --- | ---: | ---: |
| NEXUS_SOFTWARE_DEADLINE_MS | 5000 | 1–60000 |
| NEXUS_SOFTWARE_MAX_REQUESTS | 64 | 1–2000 |
| NEXUS_SOFTWARE_MAX_RECORDS | 20000 | 1–100000 |
| NEXUS_SOFTWARE_MAX_CONCURRENT | 2 | 1–16 |

Valores iniciales de laboratorio, configurables y pendientes de validación Live. Se mantienen límites por colección y de catálogos. Hardware/v1 no reciben estos presupuestos fuera del contexto Software.

MAX_RECORDS limita registros **aceptados** agregados. Páginas se reducen a capacidad restante. Para probar agotamiento exacto se permite una consulta de un registro al llegar a capacidad cero: si retorna otro registro, se rechaza y no se consulta más. Con upstream que respete limit, adquisición física máxima es MAX_RECORDS+1; prefijo aceptado no supera MAX_RECORDS. Si upstream ignora limit puede enviar más; se rechaza el resultado, pero el transporte actual no limita bytes antes de parsear body. No se promete cota estricta de memoria por bytes/strings arbitrarios.

Presupuesto agotado en Software conserva instalaciones adquiridas con partial/pagination_incomplete. Agotamiento durante snapshot devuelve 503; no autoriza identidad con snapshot truncado. Con pageSize=100 y 64 llamadas, 10.000 Computers superan el presupuesto antes de lookup. Ajustar límites requiere evaluar memoria, latencia, concurrencia y disponibilidad conjuntamente.

La política inicial admite el escenario de 49 llamadas y corta el catálogo grande en 64. Cinco segundos admiten respuestas sintéticas de 20 ms y detienen el caso de 100 ms. El techo de registros evita retener el catálogo sintético de 100.000 versiones; dos cupos admiten dos lectores y rechazan el tercero sin I/O. Esto justifica contención inicial, **no latencia ni capacidad productiva**.

## Mediciones reproducibles

`npm run build --workspace @igx-nexus/api` y `node scripts/measure-software-api-v2.mjs .tmp/pr8-audit`. Transporte/fetch sintéticos, sin cargar credenciales del entorno, sockets ni GLPI Live. Observado el 2026-10-13, Node v24.21.0 / Windows x64:

| Escenario | Llamadas | ms | Resultado |
| --- | ---: | ---: | --- |
| OS/software vacíos, un Computer | 4 | 6.95 | complete |
| Un producto/versión | 10 | 1.88 | complete |
| 145 instalaciones sintéticas paginadas | 11 | 6.72 | complete, 145 |
| 20 productos × 20 versiones | 49 | 9.78 | complete, 145 instalaciones |
| 100 productos × 10 versiones | 64 | 6.21 | partial, 145 instalaciones |
| Catálogo parcialmente disponible | 14 | 5.23 | partial, 145 instalaciones |
| Snapshot 10.000 Computers | 64 | 3.00 | presupuesto; 503 equivalente |
| Catálogo 100 × 1000, pageSize=1000 | 48 | 99.84 | partial, 20.000 aceptados + 1 rechazado |
| Demora sintética 20 ms/llamada | 49 | 1496.62 | complete |
| Demora sintética 100 ms/llamada | 46 | 5005.88 | deadline, sin inventario publicado |
| No cancelable 100 ms, deadline reducido a 20 ms | 1 | 33.25 | pendiente/cupo retenido; drain a 113.95 ms |
| Tres simultáneas, cap=2 | 10/10/0 | 313.56 total | dos completas, un rechazo |
| HTTP runtime vacío, OAuth frío | 5, incluye token | 112.67 | HTTP 200 |

Todos terminaron sin operaciones pendientes tras drain y sin nuevas consultas después de completar/vencer. El caso grande muestreó heap 55.16 MiB y RSS 138.17→179.84 MiB, incluida construcción del fixture de 100.000 versiones. JSON de entrega contiene trazas, heap/RSS inicial/final, máximos muestreados y pendientes. Son muestras de proceso compartido con ruido de GC; no máximos exactos de asignación ni garantías de memoria.

## Validación y riesgos pendientes

Tras corregir assetId: pruebas afectadas 180/180 y API completa 400/400 con un worker; Types 229/229; typecheck/build completos aprobados. La primera afectada de cierre falló 179/180 por timeout de arranque Hardware; repetición idéntica aprobada, sin ampliar timeouts ni quitar aserciones. [Informe de auditoría](../audits/pr8-software-api-v2-audit.md) conserva todas las pasadas, incluidos resultados anteriores con otros números de workers, sin presentarlos como resultados nuevos de cierre. Sin suites UI/browser ni npm test global: no hay cambio funcional de UI. Se mantienen los 16 archivos originales; sólo ruta, tests HTTP, documentación técnica, informe y handoff se ajustan en este cierre. Los controles operacionales permanecen sin cambios.

Pendientes: smoke Live autorizado, calibración de límites reales, aceptación del costo del snapshot completo, política ante cupos retenidos, presupuesto de bytes, protección multi-instancia y estabilidad de arranque de tests bajo carga local. Snapshot paginado no transaccional. Las 145 instalaciones históricas GLPI no se revalidaron; el benchmark de 145 es sintético. No se consultó GLPI Live.

Detenerse antes de commit, push, Draft PR, merge y PR 9.
