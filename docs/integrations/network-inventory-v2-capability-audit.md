# PR 10 — Network Inventory V2: auditoría de capacidades

2026-10-14. **Propuesta para decisión humana; no implementación.** Baseline `main@3a1f4eef9147323103c88c2d77ad04670b733bb4`, árbol inicial limpio, PR [#149 integrado](https://github.com/serarayaa/igx-nexus/pull/149) y [CI posterior aprobado](https://github.com/serarayaa/igx-nexus/actions/runs/38558882926). Sólo documentación y evidencia estática; sin consultas autenticadas GLPI, modificaciones de RBAC, descubrimiento, SNMP, OT, contratos exportados, endpoints ni UI nueva.

## Decisión recomendada

La primera entrega defendible es **Computer Network Cards: asociaciones de tarjetas de red al Computer**, con etiqueta de catálogo, MAC observada cuando exista y busID. No debe anunciarse como inventario completo de interfaces, IP ni topología.

Hay ruta y evidencia runtime histórica de una colección de tarjetas accesible **vacía**. Hay schema de MAC/busID y rutas de catálogo, pero no muestras runtime pobladas de esos atributos. El diseño de contrato y un futuro adapter sintético pueden avanzar después de aprobar este alcance; una afirmación de integración Live requerirá smoke independiente explícitamente autorizado. La evidencia disponible no justifica un vertical completo Computer Network Interfaces.

## Evidencia y reproducibilidad

| Ref. | Fuente | Qué demuestra / límite |
| --- | --- | --- |
| E1 | Backup original OpenAPI GLPI 11.0.11 / High-Level API 2.3.0, 2026-10-07 | Accesible en WSL; SHA-256 recomputado `31281705e3f44d39226bff3120513efa00ae096745d9670514afc5e3653825bf`. 4.649.023 bytes, OpenAPI 3.0.0, 1.219 paths y 332 schemas. Es contrato histórico, no consulta nueva ni autorización efectiva actual. |
| E2 | [Auditoría V03-CMDB-01](glpi-v03-cmdb-capability-audit.md) y [service identity](glpi-service-identity.md) | Testimonio runtime versionado del 2026-10-07: Computer 1, NetworkCard 0, Printer 0, NetworkEquipment 0; 403→acceso tras mínimos derechos. No se dispone aquí de bodies/logs originales poblados de red; no se fabrican. |
| E3 | Código oficial GLPI tag 11.0.11, commit `0722f9ec6615ba5d09152e23f26438a91fd4315f` | Inspección estática de 35 archivos públicos, incluidos 21 controllers HL. Blobs contrastados con el árbol Git del tag. 538 declaraciones Route antes de expansión; no son los 1.219 paths OpenAPI. Los conjuntos de nombres de campos de los 17 schemas seleccionados coinciden con E1. No ejecución del runtime GLPI. |
| E4 | Código NEXUS del baseline: glpi.ts, glpi-hardware.ts, glpi-software.ts, software-operation.ts, software-routes.ts; contratos y ADR 0011/0014/0015/0016/0019/0022 | Transporte GET v2.3, snapshot Live actualmente Computer, identidad/fuentes, cobertura, autorización y controles existentes; no existe adapter Network. |
| E5 | Documentación oficial de [schemas HL](https://glpi-developer-documentation.readthedocs.io/en/master/devapi/hlapi/schemas.html) y [API V2](https://help.glpi-project.org/documentation/modules/configuration/general/api/restful-api-v2) | Contexto general: schema, objeto parcial y ruta son conceptos distintos. Documentación dinámica, subordinada a E1/E3 para esta versión; no prueba runtime ni justifica migrar API. |

El [extracto sanitizado](glpi-network-v2-openapi-evidence.json) conserva 22 operaciones GET seleccionadas, parámetros y 17 schemas. Excluye servidores, URLs OAuth, ejemplos, inventario, credenciales y propiedades innecesarias/sensibles. **No es un OpenAPI completo ni sustituye el respaldo original.** El respaldo bruto no se incorpora al repositorio ni al ZIP. El paquete contiene búsquedas negativas, comparación de campos, hashes, manifiesto de fuentes y modelo analítico de costo.

## Clasificación de capacidades

- **A:** ruta respaldada y consulta runtime histórica documentada; se indica si sólo demostró colección vacía.
- **B:** ruta/schema respaldados estáticamente, sin consulta runtime comprobada para esa capacidad o atributo.
- **C:** sin ruta GET respaldada o no accesible dentro de High-Level REST 2.3/scope api y transporte autorizado. No significa inexistencia en la base de datos/UI ni imposibilidad en otra versión/API.
- **D:** falta verificación de semántica, valores, permisos efectivos actuales, unidades o asociaciones; no se reemplaza por una suposición.

Las columnas schema y lectura pueden tener clases distintas: NetworkPort tiene schema B y adquisición REST C. Un permiso declarativo no convierte una ruta B en A; un 200 vacío no demuestra atributos poblados.

## Matriz ruta / schema / permiso / evidencia / limitación

Todas las rutas son relativas a `/api.php/v2.3`. Derechos indicados son READ; scope api salvo la excepción GraphQL. Frontera organizacional histórica: Chile, no recursiva. No se verificó la configuración efectiva actual.

| Capacidad | Ruta respaldada | Schema / datos | Permiso | Clase / evidencia / limitación |
| --- | --- | --- | --- | --- |
| Computer colección/detalle | GET Assets/Computer; Assets/Computer/{id} | Computer | computer | **A**, E1/E2; 1 Computer histórico; no prueba interfaces pobladas |
| Tarjetas asociadas a Computer | GET Assets/Computer/{id}/Component/NetworkCard | NetworkCardItem[] | computer + device, alcance de entidad | **A** colección, E1/E2/E3; 0 asociaciones históricas; los valores MAC/busID son **B** |
| Definiciones de tarjeta | GET Components/NetworkCard; Components/NetworkCard/{id} | NetworkCard / 11 propiedades | device | **B**, E1/E3; catálogo no demuestra instalación ni interfaz |
| Asociación individual / inversa por definición | GET Components/NetworkCard/Items/{id}; Components/NetworkCard/{id}/Items | NetworkCardItem / array | device y restricciones de objetos/entidad | **B**, E1/E3; evitar barrido global inverso para resolver un Computer |
| Asociación propietario | Misma ruta de tarjetas de Computer | id, itemtype, items_id, network_card.id/designation | computer + device | Ruta **A**, campos **B**; validar propietario explícito y referencia; no resolver por MAC/hostname |
| MAC de asociación | Misma ruta | NetworkCardItem.mac string | Igual que asociación | **B**; conservar literal; no sustituir por mac_default ni elevar a identidad física |
| busID / etiqueta | Misma ruta | busID; network_card.designation | Igual que asociación | **B**; designation no es nombre de interfaz; no usar network_card.name |
| MAC por defecto / ancho nominal | Components/NetworkCard/{id} | mac_default; bandwidth string | device | **B**; default no es MAC observada; ancho de catálogo sin unidad garantizada, semántica/unidad **D** |
| Equipo de red colección | GET Assets/NetworkEquipment | NetworkEquipment[] | networking | **A**, E2; 0 registros históricos; no prueba switches/routers poblados |
| Equipo de red detalle | GET Assets/NetworkEquipment/{id} | identidad, manufacturer/model/type, entity/location, status, sysdescr/cpu/ram | networking | **B**, E1/E3; detalle no probado sin registro; status administrativo no es disponibilidad de enlace |
| Tarjetas de NetworkEquipment | GET Assets/NetworkEquipment/{id}/Component/NetworkCard | NetworkCardItem[] | networking + device | **B**; ruta genérica expuesta no garantiza una asociación real ni soporte poblado |
| Printer colección | GET Assets/Printer | Printer[] | printer | **A**, E2; 0 registros históricos |
| Printer detalle / capacidades | GET Assets/Printer/{id} | has_wifi, has_ethernet y otros flags; network | printer | **B**; capacidad/configuración no equivale a enlace conectado, MAC, IP o equipo vecino |
| Tarjetas de Printer | GET Assets/Printer/{id}/Component/NetworkCard | NetworkCardItem[] | printer + device | **B**; no runtime comprobado |
| Puerto / interfaz de un activo | Ningún path NetworkPort en E1; no ruta específica en E3 | NetworkPort, 28 propiedades | No asumir permiso efectivo para lectura sin ruta | Schema **B**, lectura REST **C**; referencia de schema no habilita un endpoint |
| Ethernet | Ninguna ruta de datos respaldada | NetworkPortEthernet; network_port/network_card, type, speed | No determinado para una ruta inexistente | **B/C**; speed documenta Mbps, no velocidad actual negociada; sin valores runtime |
| Wi-Fi | Ninguna ruta de datos de puerto respaldada | NetworkPortWifi; network_port/network_card/wifinetwork, version/mode | Igual | **B/C**; no asociación cliente→AP demostrada |
| Virtuales y Fiberchannel | Ninguna ruta de datos de puerto respaldada | Aggregate, Alias, Local, Dialup, Fiberchannel | Igual | **B/C**; tipos declarados no prueban población; aggregate contiene lista literal, no topología física |
| MTU, duplex, velocidad y estado | Ninguna ruta de datos de puerto respaldada | if_mtu, if_speed, port_duplex, if_status/internal_status/connection_status | Igual | **B/C**; unidades/valores de if_speed y semántica efectiva **D**; contadores no son monitorización en tiempo real |
| IPv4 / IPv6 / prefijo / máscara / gateway | Ningún path IPAddress, NetworkName o IPNetwork en E1 | Esos tres schemas ausentes; tampoco esos campos en NetworkCardItem | Sin permiso nuevo propuesto | **C** en esta superficie; contenido/configuración actual **D**; el importador Agent no equivale a endpoint de lectura |
| VLAN de un puerto | Ninguna ruta/relación de membresía respaldada | NetworkPort.trunk no demuestra VLAN ID ni pertenencia; no schema Vlan en E1 | Sin permiso nuevo | **C** adquisición, **D** membresía; no inferir VLAN desde trunk ni subred |
| Catálogos de clasificación | GET Dropdowns/Network, WifiNetwork, NetworkPortType, NetworkPortFiberchannelType y sus detalles | Grupo administrativo / ESSID / tipos | Derechos específicos no validados por el baseline de red; no ampliar Setup | **B** schema/ruta, autorización runtime **D**; Network no es IPNetwork y WifiNetwork no es una observación de conexión |
| Vecinos / cable / enlaces físicos | Ninguna ruta de claim puerto↔puerto respaldada por esta evidencia | Alias/aggregate/referencia a tarjeta no identifica equipo remoto | Sin permiso nuevo | **C/D**; no producir connected_to por coincidencia MAC/IP/hostname/subred |
| GraphQL datos | POST GraphQL/ (barra final literal en E1) | Schemas utilizables potencialmente por GraphQL, no comprobados | scope graphql + autenticación | **B** existencia, **D** consulta de red; **C** dentro de GET/scope api autorizado. GET GraphQL/Schema es introspección, no inventario |
| Tóner / SNMP | Fuera de esta auditoría de lectura de red | Printer/NetworkEquipment incluyen referencia snmp_credential | No solicitar credenciales ni nuevos scopes | **D** alcance específico; ningún scanning/polling ni contrato de consumibles incorporado |

## Cinco dominios que no deben confundirse

1. **Tarjetas de Computer:** asociación de componente y definición de catálogo; incluso completa, no cubre necesariamente puertos virtuales, direcciones o todas las interfaces del OS. El importador distingue componentes y puertos y puede filtrar componentes virtuales por configuración. Vacío no demuestra que el host carezca de red.
2. **NetworkEquipment:** activos inventariados con tipo/modelo/estado administrativo; no se clasifican automáticamente como switch/router por nombre. El provider Live NEXUS del baseline sólo publica Computer; incorporar otros activos requiere otra decisión y su identidad/autorización, no sólo otro endpoint de detalle.
3. **Printer:** capacidades Wi-Fi/Ethernet y componentes cuando existan; no prueba conexión activa ni IP. Tóner y SNMP son entregas separadas, sin reutilizar credenciales de forma implícita.
4. **Direccionamiento:** varias IP por interfaz y familias IPv4/IPv6 necesitarían registros/asociaciones verificables. IP es volátil, no ID canónico; máscaras/gateway no se reconstruyen desde hostname, redes coincidentes ni defaults.
5. **Relaciones/topología:** sólo claims con extremos fuente explícitos, resolución canónica inequívoca, evidencia y temporalidad conforme a TechnologyRelationship. Una asociación tarjeta→Computer es contención local, no Computer→switch. No se generan relaciones inferidas en el primer corte.

## Diferencias con documentación histórica

- V03-CMDB-01 usa Component/NetworkCard como etiqueta de capacidad. La ruta global exacta es **Components/NetworkCard** (plural); Component singular pertenece a la ruta anidada del activo. E1 permite precisarlo sin inventar rutas por analogía.
- La conclusión histórica “inventario de red soportado” describe colecciones/catálogos upstream, no un vertical NEXUS ni atributos runtime poblados. Se acota aquí a tarjetas/activos; persiste el gap de puertos/IP.
- ADR-0016 y el documento RBAC temprano partían de computer READ; la política posterior V03-CMDB-01 y rbac-api-readonly.php añaden sólo derechos demostrados. No se reutilizan los perfiles más amplios Asset Manager/Auditor ni system_logs/user.
- El handoff previo conservaba el checkpoint PR 9 sin publicar. Git, merge #149 y CI del baseline lo superseden; no debe tratarse como bloqueo vigente. CURRENT-STATE/roadmap contienen pasos históricos; no autorizan reiniciar etapas integradas.
- No se halló documentación posterior versionada que añada GET NetworkPort/IP a v2.3. El OpenAPI original y el código fijado coinciden. Documentación web actual, APIs legacy y GraphQL no contradicen la conclusión limitada a esta superficie.

## Seguridad y controles para una implementación futura

GLPI sigue siendo System of Record. NEXUS autentica y autoriza al caller; la identidad OAuth GLPI es otra frontera. Mantener scope api, transporte GET v2.3, instancia configurada, HTTPS, redirects rechazados, timeouts y errores sanitizados. No leer .env ni credenciales para esta auditoría. No ejecutar bootstrap RBAC, SQL, cambios de entidades/perfiles, inventario Agent, SNMP ni consultas a OT.

Ancla futura: activo canónico del provider configurado, con una única referencia GLPI Computer/Assets/Computer válida de la instancia correcta. Conservar assetId literal, incluidos espacios interiores; no normalizar/reconstruir IDs ni aceptar un ID GLPI como identidad NEXUS. Validar itemtype/items_id de cada asociación si vienen; una contradicción no se ignora. No permitir al navegador rutas upstream, filtros RSQL ni headers GLPI-Entity/Profile/Recursive, aunque estén descritos en OpenAPI. No extender alcance de entidad desde entrada del caller.

Allowlist de campos de salida; excluir snmp_credential y evitar propagación de payloads crudos, contactos o configuración sensible. Una referencia SNMP de schema no autoriza leer su catálogo. 401/403 upstream deben cerrar el resultado autorizado sin elementos residuales; 404 no demuestra ausencia, vacío ni not_applicable. Verificar autorización en páginas y enriquecimientos. Mantener Demo/Live separados, sin fallback ni cache entre usuarios/activos.

## Paginación y operación: antes de diseñar una API pública

E1 documenta start/limit/sort/filter; start mínimo 0, limit default 100 y mínimo 0 sin máximo garantizado. El cliente deberá imponer un límite positivo y sort=id:asc, validar que se respeta, avanzar por registros efectivamente recibidos y exigir página vacía posterior. Página corta/nextOffset null no prueba agotamiento. Orden/IDs repetidos, propietarios inconsistentes, payloads inválidos, descartes y límites producen gaps; no completar silenciosamente. Offset no garantiza snapshot transaccional.

Enriquecer sólo IDs de definición ya observados mediante Components/NetworkCard/{id}, deduplicando consultas dentro de la operación. La etiqueta reducida **network_card.designation** ya permite un corte útil sin barrer todo el catálogo. No consultar todas las definiciones/Items globales ni buscar por MAC. Un fallo de catálogo preserva asociación/label/MAC con partial y gap, salvo autorización, que falla cerrada.

Modelo analítico ideal, con páginas llenas salvo la última: `Q(N,P)=ceil(N/P)+1`, incluida página vacía. Coste frío `Q(Computers,P)+Q(tarjetas,P)+U+1 OAuth`, U definiciones distintas consultadas. Las colecciones/catálogos son GET; el token OAuth existente añade un POST de autenticación, no una escritura CMDB. Total cuenta todas esas peticiones HTTP. Páginas cortas pueden aumentar el costo: no es cota absoluta. No son peticiones ejecutadas ni medición de latencia.

| Escenario sintético, P=100 | GET snapshot | GET tarjetas | Definiciones | OAuth | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 Computer / 0 tarjetas | 2 | 1 | 0 | 1 | 4 |
| 10 Computers / 2 tarjetas / 1 definición | 2 | 2 | 1 | 1 | 6 |
| 1 Computer / 145 tarjetas / 5 definiciones | 2 | 3 | 5 | 1 | 11 |
| 1.000 Computers / 2 tarjetas / 2 definiciones | 11 | 2 | 2 | 1 | 16 |
| 10.000 Computers / 2 tarjetas / 2 definiciones | 101 | 2 | 2 | 1 | 106 |
| 1 Computer / 100 tarjetas / 100 definiciones | 2 | 2 | 100 | 1 | 105 |

Software tiene defaults iniciales 5 s / 64 llamadas / 20.000 registros / dos operaciones por proceso, no SLA Network. Con esos números, 10.000 Computers ya exceden presupuesto antes de lookup. El guard actual se activa sólo en contexto Software: Network **no lo hereda automáticamente**. Además cuenta registros de arrays, mientras el enriquecimiento Network por detalle devuelve objetos: el futuro diseño debe contabilizarlos explícitamente. Evaluar conjuntamente snapshot de autorización, OAuth, páginas, catálogos, memoria, concurrencia, deadline absoluto, cancelación y retención de cupos hasta drain; no liberar recursos sólo porque respondió un timer. No cambiar estos controles ahora ni copiar defaults como garantía productiva.

## Propuesta y secuencia de entrega

[Propuesta canónica revisable](../product/network-inventory-v2-contract-proposal.md) y [ocho ejemplos exclusivamente sintéticos](network-inventory-v2-synthetic-examples.json). No existen types Network exportados, validador, adapter, endpoint ni consumidor nuevo.

1. **Decisión humana de alcance:** aprobar Computer Network Cards, campos mínimos y semántica de cobertura/IDs; decidir enriquecimiento opcional y requisitos de smoke. Si se exige IP/velocidad/estado, declarar que la evidencia actual no basta, sin prometer interfaces completas.
2. **Contratos:** entrega independiente types/validador/fixtures después de aprobación; reusar SourceReference, provenance y cinco estados. No modificar snapshot 0.2 ni Hardware/Software.
3. **Adapter:** rutas exactas E1, asociación→definición, propietario y catálogos explícitos; pruebas sintéticas de vacíos/nulls/MAC repetidas/múltiples asociaciones, errores, autorización, paginación y límites. Smoke sólo con autorización nueva.
4. **API:** sólo después de revisar costos y composición. Mantener lookup canónico autorizado, technology:read existente si su política se aprueba, límites globales y fail-closed; decidir ruta pública en esa entrega, no publicarla ahora.
5. **Asset 360:** sólo sobre contrato/API estables; sin diseño visual ni Network Explorer en PR 10.

Diferidos: interfaces Ethernet/Wi-Fi/virtuales de NetworkPort; IP/prefijos/gateway/VLAN; inventario canónico de NetworkEquipment/Printer; vecinos/topología; SNMP/tóner/telemetría; alternativas GraphQL/legacy/externas y cualquier cambio de permisos/infraestructura. Cada uno necesita evidencia y alcance propio.

## Verificación y riesgos residuales

Verificado offline: hash del respaldo, inventario de paths/schemas, extracción sanitizada, 17/17 conjuntos de campos iguales a fuente fijada, integridad Git de 35 archivos upstream, coherencia de ejemplos y sourceReferences, modelo aritmético, links/diff y alcance documental. No se ejecutan suites de producto, build ni smoke como si se hubiera implementado Network: no hay cambios funcionales que validar. CI del baseline sí fue consultado y está aprobado.

| Comprobación offline | Resultado |
| --- | --- |
| Respaldo original | SHA-256 exacto; 1.219 paths / 332 schemas |
| Extracto sanitizado | 22 GET / 17 schemas; 69 referencias internas resueltas |
| Matriz | 25 capacidades con clases y límites explícitos |
| Ejemplos | 8 documentos sintéticos / 5 estados; 9 SourceReference validados con política existente |
| Modelo de costo | 6 escenarios aritméticos, sin I/O GLPI ni latencia medida |
| Links locales | 19 referencias comprobadas |
| Alcance | 5 archivos documentales, 0 archivos de producto; índice real sin staging y HEAD en baseline |

Riesgos: ausencia de muestras runtime de tarjetas pobladas y detalles Printer/NetworkEquipment; permisos/entidad actuales no revalidados; semántica/unidades de velocidad/estado; configuración Agent y virtuales; IDs/relaciones ambiguas; datos sensibles en fuentes; snapshot no transaccional; costo de lookup antes de inventario; presupuestos no heredados. Los vacíos y gaps permanecen visibles. Decisión humana antes de implementar código de producto, commit, push o PR; no visuales ni Network Explorer.

Fuentes estáticas precisas: [ComponentController](https://github.com/glpi-project/glpi/blob/0722f9ec6615ba5d09152e23f26438a91fd4315f/src/Glpi/Api/HL/Controller/ComponentController.php), [AssetController](https://github.com/glpi-project/glpi/blob/0722f9ec6615ba5d09152e23f26438a91fd4315f/src/Glpi/Api/HL/Controller/AssetController.php), [GraphQLController](https://github.com/glpi-project/glpi/blob/0722f9ec6615ba5d09152e23f26438a91fd4315f/src/Glpi/Api/HL/Controller/GraphQLController.php), [importador NetworkCard](https://github.com/glpi-project/glpi/blob/0722f9ec6615ba5d09152e23f26438a91fd4315f/src/Glpi/Inventory/Asset/NetworkCard.php). El ZIP incluye URLs, líneas y hashes del resto de evidencia, sin copiar el respaldo bruto.
