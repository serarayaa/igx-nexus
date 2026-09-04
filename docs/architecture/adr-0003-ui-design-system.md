# ADR-0003 — Sistema de Diseño de IGX NEXUS

Estado: Aceptado

## Contexto

IGX NEXUS necesita una experiencia web propia, coherente y escalable para las capacidades de CMDB, ITAM, Asset Intelligence, QR, relaciones entre CI, CMDB Health y analítica que se incorporarán en los siguientes tickets de la Demo v0.1.

El producto no debe heredar la interfaz visual de GLPI ni depender de un design system visual de terceros. GLPI permanece como motor técnico de inventario/CMDB, mientras que la experiencia utilizada por los usuarios corresponde a IGX NEXUS Web.

CMDB-005 debe establecer una base reutilizable antes de implementar las features de CMDB-006 en adelante.

## Decisión

### Biblioteca compartida

`packages/ui` será la biblioteca visual compartida y el contrato de UI consumido por `apps/web`.

Las aplicaciones no deberán depender directamente de primitives de terceros cuando exista un componente equivalente expuesto por `@igx-nexus/ui`.

### Design tokens

Los design tokens serán la fuente de verdad de foundations y themes.

Se utilizará una jerarquía de tres niveles:

1. Primitive / global tokens.
2. Semantic / alias tokens.
3. Component tokens sólo cuando un semantic token no sea suficiente.

El formato fuente seguirá el modelo de Design Tokens Community Group 2025.10 para mantener portabilidad. Los tokens runtime se expondrán principalmente mediante CSS Custom Properties.

La transformación desde el formato fuente hacia CSS será realizada mediante una capa pequeña y reemplazable. El sistema de diseño no debe quedar acoplado a una herramienta concreta de compilación de tokens.

Los componentes no deberán consumir valores hexadecimales arbitrarios cuando exista un token apropiado.

### Identidad visual

La paleta de marca será derivada desde el activo oficial:

`assets/branding/igx-nexus-logo.png`

No se inferirán colores corporativos desde sitios de terceros.

Los colores de marca y los colores semánticos tendrán responsabilidades distintas. Estados como `success`, `warning`, `danger`, `critical`, salud, criticidad, frescura y dominio IT/OT no deberán utilizar un color de marca como sustituto de su significado.

### Styling y themes

La implementación utilizará:

- CSS Modules para estilos locales de componentes;
- CSS Custom Properties como contrato runtime de tokens y themes;
- Light Theme y Dark Theme construidos desde semantic tokens;
- `forced-colors` para compatibilidad con High Contrast cuando corresponda;
- `prefers-reduced-motion` para reducir movimiento no esencial.

No se adopta un framework visual completo ni una biblioteca que imponga una identidad ajena a IGX NEXUS.

### Primitives accesibles

Se adopta React Aria Components para comportamientos complejos que requieren focus management, interacción por teclado/touch y semántica accesible.

React Aria deberá permanecer encapsulado dentro de `@igx-nexus/ui`.

Se preferirá HTML semántico nativo cuando resuelva correctamente el caso. No se agregará ARIA para reemplazar innecesariamente semántica existente.

### Accesibilidad

WCAG 2.2 AA será el baseline de accesibilidad del producto.

El sistema deberá contemplar como mínimo:

- navegación completa mediante teclado;
- focus visible y no oculto por contenido propio;
- contraste suficiente;
- labels y mensajes de error comprensibles;
- reflow y zoom;
- estados que no dependan únicamente del color;
- accessible names para controles icon-only;
- compatibilidad con reduced motion y forced colors.

Como criterio interno adicional, las acciones móviles prioritarias apuntarán a targets cercanos a 44×44 CSS px cuando el contexto lo permita, sin confundir esta regla interna con el mínimo AA de WCAG 2.2.

### Iconografía

Lucide React será la única librería general de iconos de la primera etapa.

Los iconos decorativos deberán quedar ocultos para tecnologías asistivas. Los controles que utilicen únicamente un icono deberán disponer de un accessible name.

### Densidad

El mismo set de componentes deberá soportar al menos:

- `comfortable` para formularios, vistas ejecutivas y uso general;
- `compact` para inventario, tablas y otras interfaces data-dense.

No se crearán variantes duplicadas de componentes sólo para cambiar densidad.

### Responsive

El sistema se diseñará para desktop, notebook, tablet y smartphone.

Los breakpoints se utilizarán principalmente para estructuras de aplicación. Los componentes reutilizables podrán utilizar Container Queries cuando su comportamiento dependa más del contenedor que del viewport.

La arquitectura deberá permanecer compatible con una futura PWA sin implementar una aplicación móvil nativa en este ticket.

### DataTable

La foundation inicial de DataTable utilizará HTML `<table>` semántico cuando la información sea tabular.

El sorting accesible deberá exponer `aria-sort` y controles operables mediante teclado. La tabla deberá prever selección, paginación, filtros y estados loading/empty/error.

No se adopta por anticipado `role="grid"`, virtualización ni un headless table engine. Esas decisiones se reevaluarán sólo si CMDB-007 demuestra una necesidad real.

### Visualización de datos

CMDB-005 definirá tokens para palettes categóricas, secuenciales, divergentes y estados, además de axis, grid, labels y tooltips.

Las futuras visualizaciones no deberán depender únicamente del color y deberán permitir labels, iconos, patrones o una alternativa textual/tabular cuando la información sea crítica.

No se seleccionará todavía una librería completa de gráficos.

### Catálogo y testing

Storybook será el catálogo vivo del sistema de diseño.

La estrategia inicial de QA utilizará:

- Storybook para documentación y estados;
- accessibility addon / axe-core como primera línea automatizada;
- Vitest en browser mode para component tests críticos;
- validaciones manuales de teclado, focus, zoom, reduced motion, High Contrast y smoke tests de screen reader cuando sea posible.

Playwright E2E completo y visual regression se incorporarán posteriormente cuando exista una aplicación funcional que justifique ese costo.

## Consecuencias

### Positivas

- Los tickets CMDB-006 a CMDB-013 podrán compartir contratos visuales y de interacción.
- La identidad visual de IGX NEXUS permanece independiente de GLPI y de design systems externos.
- Light/Dark themes fuerzan una separación temprana entre valores visuales y significado semántico.
- La accesibilidad se construye como requisito estructural y no como corrección posterior.
- El sistema queda preparado para interfaces data-dense, móvil y futuros activos IT/OT.

### Costos y límites

- CMDB-005 tendrá más trabajo inicial que una implementación basada directamente en componentes visuales prefabricados.
- React Aria, Storybook y el pipeline de tokens agregan dependencias que deberán mantenerse controladas.
- El objetivo no es implementar todos los componentes posibles, sino establecer foundations y primitives reutilizables suficientes para la Demo v0.1.

## Alternativas consideradas

### Radix Primitives

Fue considerado como alternativa accesible y unstyled. Se descartó para esta etapa para evitar instalar dos bibliotecas de primitives y porque React Aria ofrece mejor cobertura esperada para formularios, colecciones, touch e internacionalización futura.

### Design system visual de terceros

Fluent, Carbon, Spectrum y otros sistemas se utilizan como referencia de buenas prácticas, no como identidad visual de IGX NEXUS. Adoptarlos directamente reduciría el control sobre marca, densidad y evolución del producto.

### Tailwind CSS

No se adopta inicialmente. CSS Modules + CSS Custom Properties ofrece suficiente encapsulación y theming sin introducir una capa adicional de utilities en el contrato del sistema de diseño.

### Headless table engine desde CMDB-005

No se adopta anticipadamente. La DataTable comenzará con semántica HTML y APIs propias simples; CMDB-007 determinará si se requiere un motor adicional.

## Fuera de alcance de esta decisión

- implementación funcional del Dashboard;
- Asset Explorer funcional;
- Asset 360 funcional;
- QR engine o scanner;
- grafo CI;
- cálculos de CMDB Health;
- integración GLPI real desde frontend;
- selección de librería completa de gráficos;
- aplicación móvil nativa.

## Referencias internas

- Issue #11 — CMDB-005 — Sistema de Diseño IGX.
- `assets/branding/README.md`.
- `docs/architecture/adr-0001-product-boundaries.md`.
- `docs/architecture/adr-0002-asset-ci-taxonomy.md`.
