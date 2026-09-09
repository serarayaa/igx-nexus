# ADR-0005 — Explorador de activos sobre inventario compartido

Estado: Aceptado e integrado con CMDB-007 mediante PR #19 (`2f7e61f`).

## Contexto

CMDB-006 está integrado mediante PR #17, commit `93b647402b4b5df11422e6b9347792ae614becab`.
La Web ya utiliza React 19, TypeScript, Vite y el Design System IGX. El inventario
de demostración contiene 240 activos; NEXUS API todavía no está implementada.

## Decisión

- `asset-model.ts` define `Asset`, su proyección `AssetSummary` y el snapshot de
  inventario. El Dashboard conserva su contrato de proyección mediante alias,
  sin duplicar campos ni alterar métricas. Ambos consumen `demo-provider.ts`.
- Conservar `id` como identidad NEXUS (`DEMO-xxxx` en este fixture). No renombrar
  IDs ya integrados ni inventar correspondencias GLPI/Intune/Entra. Los IDs de origen
  serán metadatos de integración futuros, nunca requisitos de presentación.
- Enriquecer determinísticamente el mismo fixture con nombre, hostname, serial,
  etiqueta, fabricante, modelo e IP de documentación TEST-NET-1. Datos ausentes
  permanecen explícitos. No introducir personas, seriales o redes corporativas reales.
- Separar consulta pura (`explorer-model.ts`), carga y presentación. Buscar por
  palabras normalizadas (mayúsculas, espacios y acentos); todas las palabras deben
  coincidir en el texto combinado del activo. Los filtros se combinan por AND.
- Ordenar antes de paginar, con comparación natural en español y desempate por ID.
  Fechas se comparan cronológicamente; valores ausentes al final en ambas direcciones.
  Páginas de 25 por defecto, con alternativas de 50 y 100. Cambiar búsqueda,
  filtros, orden o tamaño vuelve a página 1. La consulta ajusta páginas fuera de rango.
- Reutilizar Search, DataTable, Pagination, Badge, StatusBadge y FeedbackState.
  Los filtros utilizan select nativo con labels visibles y tokens; no existe Select
  ni FilterChip en el DS. Las acciones de quitar filtros reutilizan Button.
  No incorporar un primitive complejo o dependencia para siete listas simples.
- Mantener `<table>` y siete columnas agrupadas. Identificación técnica se despliega
  bajo el activo mediante un control global. Scroll horizontal limitado a la región
  tabular con foco por teclado; filtros y paginación refluyen a 320 CSS px.
- Extraer exclusivamente el shell de aplicación a `NexusShell` para compartir tema,
  densidad y navegación. La transición y lógica de foco del AppShell del DS se conservan.
- Navegación por fragmentos `#overview` y `#assets`, con enlaces nativos, apertura
  directa e historial del navegador. Anclas internas no sustituyen la vista. El título
  de documento y el foco se actualizan tras cambiar de pantalla. No se requiere
  router para dos vistas; reconsiderar al definir rutas de identidad en CMDB-008.
- Cargar mediante `InventoryProvider(AbortSignal)`. Abort al desmontar/cambiar
  proveedor; ignorar resoluciones y rechazos de operaciones canceladas. Los errores
  presentan recuperación sin detalles internos. No agregar controles QA al producto.
- No incorporar virtualización, infinite scroll, motor headless ni caché de queries:
  240 registros y 25 filas visibles no justifican esas dependencias.

## Consecuencias y límites

La búsqueda es inmediata y local al snapshot. No es fuzzy search ni búsqueda completa
de GLPI. Las facetas se obtienen del inventario completo, por lo que una combinación
puede tener cero resultados y conserva las opciones para recuperarse fácilmente.
Frescura usa el mismo corte fijo y límite de siete días que el Dashboard; fechas
nulas, inválidas o futuras son no verificables. No representa sincronización real.

La búsqueda y filtros se reinician al salir del Explorer. No se persisten ni se
codifican en la URL. Theme y density se conservan mientras el shell esté montado.
Durante CMDB-007 no se añadió un clic engañoso a una ficha todavía inexistente; esa
limitación fue resuelta posteriormente por CMDB-008 mediante un enlace semántico al
Asset 360 y una ruta estable de identidad documentada en ADR-0006.

El provider mantiene el límite de integración Web → NEXUS API → adaptadores → fuentes.
Antes de conectar inventario real, NEXUS API deberá definir validación, autorización,
errores y paginación/búsqueda de servidor; este contrato TypeScript no sustituye un
contrato de transporte aprobado ni implica descargar todo el inventario productivo.

## Validación

Pruebas puras de búsqueda, facetas, intersección, fechas, orden, paginación y fixture;
pruebas Browser de estados, recuperación, cancelación, navegación, teclado y axe en
themes/densidades/viewports. Se ejecuta además la suite del Dashboard y Storybook.
El registro de resultados y límites de QA vive en [Asset Explorer](../asset-explorer.md).

## Actualización posterior — CMDB-008

CMDB-008 consume la reconsideración prevista por este ADR y mantiene routing nativo
por fragmentos con `#assets/<nexusAssetId>`. La decisión y sus criterios de migración
futura viven en [ADR-0006](adr-0006-asset-360-routing.md). ADR-0005 se conserva como
registro histórico de las decisiones de CMDB-007.

## Fuera de alcance

Asset 360, QR, grafo, CMDB Health completo, API real, autenticación productiva,
integraciones corporativas, discovery, Service Desk y despliegues productivos eran
fuera de alcance de CMDB-007. Asset 360 se implementa en el ticket posterior CMDB-008.
