# Visualización de Datos — IGX Design System

## Alcance

CMDB-005 define foundations de visualización sin seleccionar todavía una librería completa de charts. El objetivo es que CMDB-006 y tickets posteriores puedan representar datos de forma consistente en Light/Dark, con semántica independiente de la marca y alternativas accesibles para información crítica.

Los tokens viven en:

- `packages/ui/tokens/data-viz/light/`
- `packages/ui/tokens/data-viz/dark/`

Ambos themes deben mantener paridad de contrato.

## Familias de tokens

El baseline contempla:

- palettes categóricas;
- palettes secuenciales;
- palettes divergentes;
- estados semánticos;
- foreground;
- axis;
- grid;
- labels;
- tooltips.

La intención es separar **qué significa el dato** de **qué color concreto se utiliza en cada theme**.

## Reglas de uso

### 1. El color no es la única señal

Información crítica debe combinar color con una o más señales adicionales:

- label textual;
- iconografía;
- valor numérico;
- patrón/textura cuando el tipo de gráfico lo permita;
- orden o posición;
- alternativa tabular.

### 2. Marca ≠ estado

Los azules/cyan de IGX identifican producto o series neutrales cuando sea apropiado. No deben utilizarse como reemplazo automático de success, warning, danger, critical, salud o frescura.

### 3. Paleta categórica

Usar para distinguir entidades sin orden inherente. No asignar un color distinto a cada categoría si la cantidad de series vuelve la visualización difícil de discriminar.

Cuando una categoría representa un estado semántico conocido, debe utilizar el token de estado correspondiente en vez de una posición arbitraria de la palette.

### 4. Paleta secuencial

Usar para magnitudes ordenadas desde menor a mayor. La progresión visual debe conservar orden perceptible tanto en Light como en Dark.

### 5. Paleta divergente

Usar cuando existe un punto de referencia significativo y valores a ambos lados de ese punto. No utilizar divergencia sólo porque el gráfico tenga valores positivos y negativos si esa diferencia no posee significado analítico.

### 6. Axis, grid y labels

Axis/grid deben quedar visualmente subordinados a los datos y conservar contraste suficiente para su función. Labels deben priorizar legibilidad sobre decoración.

### 7. Tooltips

Los tooltips complementan una visualización, pero no deben ser el único lugar donde exista un valor crítico. Información esencial debe poder comprenderse mediante labels, resumen o representación tabular.

## Alternativa textual/tabular

Toda visualización que comunique información crítica de CMDB debe prever un equivalente comprensible sin depender del gráfico.

Ejemplos futuros:

- un indicador de distribución de salud CMDB puede acompañarse de conteos por estado;
- un gráfico temporal de frescura puede acompañarse de fechas/valores clave;
- un mapa o grafo de relaciones debe permitir inspeccionar una lista de relaciones relevantes.

`DataTable` es la foundation tabular inicial para estos equivalentes cuando la información sea genuinamente tabular.

## Accesibilidad

Las futuras visualizaciones deberán considerar:

- contraste suficiente entre datos, fondo y elementos UI;
- labels legibles a zoom;
- no depender de hover como único acceso a información;
- soporte de teclado cuando existan elementos interactivos;
- accessible name/description del gráfico o región;
- resumen textual de la conclusión relevante;
- alternativa tabular para información crítica;
- evitar animaciones esenciales y respetar reduced motion.

## Librería de gráficos

CMDB-005 **no adopta una chart library**. La selección se realizará cuando CMDB-006 tenga requerimientos concretos de visualización.

Criterios mínimos para una futura selección:

1. integración limpia con React/TypeScript;
2. capacidad de consumir CSS variables/tokens;
3. soporte Light/Dark sin duplicar configuración;
4. accesibilidad razonable y posibilidad de mejorar semántica;
5. responsive;
6. bundle/costo operativo aceptable;
7. no imponer un lenguaje visual incompatible con IGX NEXUS.

## Contrato futuro recomendado

Las features no deberían importar directamente colores primitive para construir gráficos. La configuración de series debe resolverse mediante tokens data-viz o adapters compartidos, de modo que cambiar theme o ajustar contraste no requiera editar cada dashboard.
