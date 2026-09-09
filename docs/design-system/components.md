# Componentes — IGX Design System

## Objetivo

`@igx-nexus/ui` expone foundations reutilizables para que los tickets CMDB-006+ construyan experiencias consistentes sin importar directamente primitives de terceros ni repetir decisiones de accesibilidad, densidad, responsive y theming.

La biblioteca se mantiene intencionalmente acotada: se agregan componentes cuando existe una necesidad reusable demostrada.

## API pública actual

| Grupo | Componentes | Contrato principal |
| --- | --- | --- |
| Acciones | `Button`, `IconButton` | acciones primarias/secundarias, tamaños y focus accesible |
| Formularios | `Input`, `Search` | label, descripción, error, disabled, density |
| Estado | `Badge`, `StatusBadge`, `Alert` | labels y estados que no dependen sólo del color |
| Superficie | `Card` | base, muted y elevated; padding reusable |
| Feedback | `EmptyState`, `LoadingState`, `ErrorState`, `Spinner` | patrones reutilizables para ausencia, carga y error |
| Navegación de aplicación | `AppShell`, `AppHeader`, `AppSidebar` | shell responsive, landmarks, skip link y navegación móvil |
| Layout de página | `PageHeader`, `ContentSection`, `Toolbar` | estructura de títulos, acciones, secciones y herramientas |
| Datos | `DataTable` | tabla semántica, sorting, selección y estados |
| Navegación de datos | `Pagination` | cambio de página con página actual semántica |

## Button

Usar para acciones, no para navegación a una URL.

- variantes: primary / secondary;
- tamaños: sm / md / lg;
- `md` responde a densidad runtime;
- disabled utiliza el contrato del primitive accesible;
- focus visible obligatorio.

## IconButton

Usar cuando el icono sea suficiente visualmente y exista un nombre accesible inequívoco.

- `aria-label` es obligatorio por contrato;
- icono decorativo para tecnologías asistivas;
- mantiene superficie cuadrada;
- acciones prioritarias respetan target táctil interno cuando aplica.

## Input

Foundation de entrada de texto.

Debe utilizar label accesible. Description y error se exponen mediante primitives de formulario en lugar de texto visual desconectado.

## Search

Foundation especializada para búsqueda.

Incluye icono de búsqueda, botón de limpieza y label visible u oculto visualmente. La funcionalidad específica de búsqueda de activos pertenece a CMDB-007, no al componente.

## Badge y StatusBadge

`Badge` representa metadata neutral/accent sin implicar severidad.

`StatusBadge` representa estado semántico y combina texto + iconografía + color para evitar una señal exclusivamente cromática.

## Card

Superficie reusable para agrupar contenido relacionado. La elevación representa jerarquía visual y no severidad.

No debe transformarse en un componente específico de dashboard; `MetricCard` sólo se incorporará si CMDB-006 demuestra un contrato reusable distinto.

## Alert

Mensaje contextual con tonos semánticos y política de anuncio configurable.

No sustituye feedback global tipo toast ni diálogos modales.

## Feedback states

### EmptyState

Ausencia esperada de información. Puede incluir título, descripción y acción proporcionada por el consumidor.

### LoadingState

Carga de una región. Debe comunicar un mensaje además del spinner cuando el estado necesita ser percibido por tecnologías asistivas.

### ErrorState

Fallo de carga/proceso de una región. El texto debe ser accionable cuando exista recuperación posible.

### Spinner

Indicador visual. No debe ser la única comunicación de una carga significativa.

## AppShell

Responsable de la estructura persistente de la aplicación:

- navegación lateral en desktop;
- drawer de navegación en viewport menor a `lg`;
- header persistente;
- skip link al contenido;
- landmarks de navegación y main;
- Escape y restauración básica de focus para navegación móvil.

No contiene lógica funcional de Dashboard, Asset Explorer ni permisos.

## AppHeader y AppSidebar

Primitives estructurales consumidos por AppShell. El contenido de navegación sigue siendo responsabilidad de la aplicación.

## PageHeader

Encabezado semántico de una vista. Separa título/contexto/descripción de las acciones propias de la página.

No reemplaza `AppHeader`: uno pertenece a la aplicación persistente y el otro al contenido de una vista.

## ContentSection

Agrupa una sección de contenido y permite encabezado/acciones consistentes sin convertir cada bloque en Card.

## Toolbar

Agrupa búsqueda, filtros y acciones relacionadas con una colección o región. Debe conservar orden lógico y reflow en viewport pequeño.

## DataTable

Foundation de información tabular.

### Semántica

- HTML `<table>` nativo;
- caption accesible;
- encabezados de columnas con `scope="col"`;
- row headers opcionales con `scope="row"`;
- no se utiliza `role="grid"` sin necesidad demostrada.

### Sorting

Columnas sortables usan un botón nativo y `aria-sort` en el encabezado. El consumidor controla el dato ordenado mediante `sort` y `onSortChange`.

### Selección

La foundation soporta selección múltiple y selección global visible. Las labels de selección pueden personalizarse con contexto del dato.

### Estados

Loading, empty y error están disponibles dentro de la tabla y existen además como patterns independientes para otras regiones de la aplicación.

### Responsive

La tabla conserva su modelo tabular y permite scroll horizontal en viewport estrecho. No se convierten filas en cards automáticamente.

## Pagination

Foundation controlada mediante `page`, `totalPages` y `onPageChange`.

- marca la página actual con `aria-current="page"`;
- deshabilita anterior/siguiente en los extremos;
- resume `Página X de Y`;
- reduce páginas intermedias mediante ellipsis cuando corresponde.

La paginación de servidor/API pertenece a la feature consumidora.

## Themes y densidad

Los mismos componentes deben funcionar en:

- Light / Dark;
- Comfortable / Compact.

No se crean forks visuales separados. Las stories representativas incluyen combinaciones Dark + Compact para detectar regresiones.

## Qué no debe vivir en `packages/ui`

- llamadas a GLPI, MariaDB o NEXUS API;
- reglas de autorización de negocio;
- queries de inventario;
- cálculo de CMDB Health;
- lógica de QR;
- navegación específica de un ticket de producto;
- datos corporativos reales.

## Próximos primitives

No existe obligación de implementar toda la lista teórica antes de comenzar CMDB-006. Select, Checkbox, Dialog, Tooltip, Tabs, Toast y otros primitives se incorporarán cuando una pantalla real los necesite o cuando un criterio de aceptación de CMDB-005 justifique su baseline antes del cierre.
