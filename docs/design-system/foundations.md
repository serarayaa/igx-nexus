# Foundations del Sistema de Diseño IGX

## Principio general

Los foundations de IGX NEXUS separan valores visuales base de su significado de producto. El contrato se organiza en tres niveles:

1. **Primitive** — valores sin semántica de negocio.
2. **Semantic** — significado visual y de interacción para themes, estados y dominio CMDB.
3. **Component** — sólo cuando un componente necesita un contrato que no puede resolverse con semantic tokens existentes.

Los archivos fuente viven en `packages/ui/tokens/` y utilizan el modelo DTCG adoptado por el proyecto. El adapter `packages/ui/scripts/build-tokens.ts` valida aliases, referencias y paridad antes de generar CSS Custom Properties.

## Estructura

| Capa | Ubicación | Responsabilidad |
| --- | --- | --- |
| Primitive | `packages/ui/tokens/primitive/` | color, spacing, sizing, radius, borders, typography, motion, shadows, breakpoints y z-index |
| Semantic | `packages/ui/tokens/semantic/` | themes, densidad, superficies, texto, acciones, focus, estados y semántica CMDB |
| Data visualization | `packages/ui/tokens/data-viz/` | palettes y elementos de gráficos para Light/Dark |
| Runtime generado | `packages/ui/generated/` | CSS Custom Properties consumidas por componentes y Storybook |

Los artefactos dentro de `packages/ui/generated/` no se editan manualmente.

## Identidad de marca

La paleta de marca se deriva exclusivamente de `assets/branding/igx-nexus-logo.png`.

Baseline utilizado por el sistema:

| Token conceptual | Valor |
| --- | --- |
| Navy Deep | `#000B2F` |
| Navy | `#001849` |
| Blue Deep | `#013374` |
| Blue | `#014790` |
| Blue Bright | `#0387F2` |
| Cyan | `#01B6F8` |
| Cyan Bright | `#02E6FB` |

Estos colores identifican la marca; no reemplazan estados como success, warning, danger, critical, salud, frescura o dominio IT/OT.

## Color semántico y themes

Light y Dark comparten el mismo contrato semántico. Los componentes consumen variables como superficie, texto, borde, acción, focus y estado en lugar de decidir colores absolutos.

El theme runtime se selecciona mediante `data-theme="light|dark"`. Light funciona también como baseline de `:root`.

Los estados relevantes definidos por el sistema incluyen, entre otros:

- neutral;
- info;
- success;
- warning;
- danger;
- critical;
- salud CMDB;
- criticidad;
- frescura;
- dominio IT/OT.

Un estado importante nunca debe depender exclusivamente del color: texto, iconografía, labels o estructura deben aportar una segunda señal cuando corresponda.

## Tipografía

El baseline utiliza una pila de fuentes del sistema para evitar dependencias de fuentes propietarias y mantener buen rendimiento inicial:

`system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

Existe además una pila monoespaciada para identificadores o contenido técnico.

Los semantic tokens definen roles reutilizables para body, body-small, caption, label, headings y métricas. Los componentes deben preferir estos roles o primitives tipográficos antes que tamaños arbitrarios.

## Spacing y sizing

La escala de spacing base es:

`0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 px`

Sizing de controles base:

- `sm`: 32 px;
- `md`: 40 px;
- `lg`: 48 px.

Iconografía base:

- xs: 12 px;
- sm: 16 px;
- md: 20 px;
- lg: 24 px;
- xl: 32 px.

El target táctil interno de referencia es 44 px para acciones móviles prioritarias cuando el contexto lo permite.

## Densidad

La densidad cambia mediante `data-density` sin duplicar componentes.

### Comfortable

- control height: 40 px;
- padding inline: 16 px;
- control gap: 8 px;
- content gap: 16 px;
- section gap: 24 px.

### Compact

- control height: 32 px;
- padding inline: 12 px;
- control gap: 4 px;
- content gap: 12 px;
- section gap: 16 px.

La variante compact está pensada para tablas e interfaces data-dense; comfortable es el baseline para formularios y uso general.

## Shape, borders y elevation

El sistema define primitives de radius, borders y shadows y luego los expone mediante semantic tokens como control, card, overlay y niveles de elevación.

La elevación indica jerarquía visual, no criticidad de negocio.

## Layers

La jerarquía semántica de capas evita z-index arbitrarios:

- content;
- sticky;
- dropdown;
- popover;
- overlay;
- modal;
- toast;
- tooltip.

Los componentes deben utilizar estas capas en lugar de números locales sin contrato.

## Motion

Las duraciones base contemplan instant, fast, normal y slow. Los semantic tokens distinguen feedback, transition y spatial motion.

`prefers-reduced-motion` debe eliminar o minimizar movimiento no esencial. Ninguna transición puede ser necesaria para entender el estado de la interfaz.

## Breakpoints y responsive

Breakpoints de referencia:

- sm: 480 px;
- md: 768 px;
- lg: 1024 px;
- xl: 1280 px;
- 2xl: 1536 px.

La grilla conceptual utiliza 4 columnas en móvil, 8 en tablet y 12 en desktop. Los breakpoints se reservan principalmente para estructura de aplicación; un componente local puede usar Container Queries cuando su comportamiento depende del espacio disponible y no del viewport completo.

Los valores de breakpoint pueden aparecer como valores literales dentro de media queries porque CSS Custom Properties no son válidas como condiciones de `@media`; la fuente conceptual sigue siendo el token correspondiente.

## Styling de componentes

El baseline actual utiliza archivos CSS por componente bajo `packages/ui/styles/components/` y clases con prefijo `igx-*`.

Reglas:

- consumir semantic tokens siempre que exista uno apropiado;
- no introducir colores arbitrarios en componentes;
- mantener estados Light/Dark equivalentes;
- respetar densidad runtime;
- contemplar forced colors y reduced motion cuando el componente lo requiera;
- evitar estilos que codifiquen features específicas de CMDB-006+.
