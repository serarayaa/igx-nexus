# ADR-0006 — Asset 360 con rutas hash por identidad NEXUS

Estado: Propuesto para integración con CMDB-008 (issue #20).

## Contexto

CMDB-007 quedó integrado mediante PR #19 y `main` apunta a `2f7e61fd9d2fd439b62b7391ccdf6cdc50954ae3`. La aplicación Web ya dispone de Panel principal y Asset Explorer, utiliza fragmentos nativos para la navegación (`#overview`, `#assets` y anclas internas del Dashboard) y conserva tema/densidad dentro del shell compartido.

CMDB-008 introduce una ruta de identidad estable para un activo individual. Esta URL será además una dependencia natural del futuro CMDB-009 — Motor QR, por lo que la decisión debe soportar apertura directa, recarga, Atrás/Adelante, foco accesible y un estado explícito de activo inexistente.

La NEXUS API todavía no existe y la Web continúa trabajando con `InventoryProvider` y datos sintéticos. La identidad visible sigue siendo la identidad propia de NEXUS; no se simulan IDs de GLPI, Intune o Entra.

## Decisión

- Mantener navegación por fragmentos nativos y extender el contrato con una ruta de identidad `#assets/<nexusAssetId>`.
- Centralizar el parsing y generación de rutas en `navigation-model.ts` mediante un `AppRoute` discriminado y la función `assetHash`.
- Codificar el ID con `encodeURIComponent` y decodificarlo de forma defensiva. Rutas vacías, anidadas o mal codificadas no se interpretan como Asset 360.
- Tratar `#assets` como Asset Explorer y `#assets/<id>` como Asset 360. Un ID sintácticamente válido pero ausente del snapshot muestra “Activo no encontrado” con retorno claro al inventario.
- Mantener enlaces HTML nativos. Desde el Explorer, el nombre del activo es el enlace semántico a su ficha; no se convierte toda la fila en un target ambiguo.
- Mantener el comportamiento de las anclas internas del Dashboard y del skip link. Un hash que no representa una ruta NEXUS no debe destruir la vista ya activa.
- Actualizar título de documento y foco al encabezado principal después de cada cambio de vista para conservar el patrón accesible ya adoptado por CMDB-006/007.
- Asset 360 consume `InventoryProvider(AbortSignal)`, cancela cargas al desmontar o cambiar de activo y descarta respuestas obsoletas.
- No incorporar React Router ni otra dependencia de routing en CMDB-008.

## Por qué no se agrega un router todavía

La aplicación tiene tres vistas de producto y una sola ruta parametrizada. Un parser pequeño, puro y cubierto por tests resuelve la necesidad actual sin introducir una dependencia adicional.

`HashRouter` competiría con el mismo fragmento que hoy se usa para las anclas internas del Dashboard, obligando a rediseñar esa navegación. `BrowserRouter` permitiría URLs sin `#`, pero exigiría configurar rewrites/fallback del servidor para aperturas directas; ese contrato de despliegue todavía no existe en la demo local.

La decisión no prohíbe un router futuro. Debe reconsiderarse cuando aparezca una necesidad demostrable, por ejemplo múltiples rutas anidadas, parámetros de navegación complejos, layouts diferenciados, carga por ruta o requisitos de servidor que justifiquen URLs con path real.

## Identidad y QR futuro

La ruta utiliza `Asset.id` como identidad NEXUS. En el fixture actual toma la forma `DEMO-xxxx`; estos valores son exclusivamente sintéticos.

CMDB-009 podrá representar una URL estable que abra esta ficha, pero CMDB-008 no genera códigos QR ni incorpora librerías de QR. Si en una fase productiva se adopta routing de servidor, la estrategia de URL deberá revisarse antes de emitir identificadores físicos permanentes.

## Consecuencias

- Panel principal → Activos → Asset 360 funciona con links nativos y con historial del navegador.
- Las fichas pueden abrirse directamente y recargarse porque Vite sirve la misma raíz y el fragmento se resuelve en cliente.
- Tema y densidad permanecen en el `NexusShell` mientras se navega entre las tres vistas.
- Se preserva el límite Web → futura NEXUS API → adaptadores; el routing no crea acoplamiento a GLPI ni a sus tablas.
- Un estado “Activo no encontrado” es parte normal del contrato y no filtra errores internos.
- La búsqueda y filtros del Explorer continúan siendo estado local de esa vista; CMDB-008 no los serializa en URL.

## Validación

CMDB-008 cubre mediante tests:

- parsing y generación de rutas;
- deep link;
- Explorer → Asset 360 → Explorer;
- Atrás/Adelante;
- activo inexistente;
- loading, error/retry, inventario vacío, cancelación y respuesta obsoleta;
- foco, breadcrumb y navegación por teclado;
- axe en light/dark y comfortable/compact;
- reflow sin overflow global a 1440, 768 y 320 px;
- regresión de Dashboard y Asset Explorer.

## Fuera de alcance

Motor QR, grafo de relaciones, CMDB Health formal, router de servidor, NEXUS API real, autenticación productiva, integraciones corporativas, Service Desk y despliegue productivo.
