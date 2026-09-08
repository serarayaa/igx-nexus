# Sistema de Diseño IGX NEXUS

El **IGX Design System** define el lenguaje visual, técnico y de interacción compartido por **IGX NEXUS — The Technology Map**. Su propósito es entregar contratos reutilizables a las experiencias de CMDB, ITAM y Asset Intelligence sin acoplar la interfaz web a GLPI ni adelantar funcionalidades de los tickets CMDB-006 en adelante.

## Fuente de verdad

La implementación vive principalmente en `packages/ui`:

- `packages/ui/tokens/primitive/` — valores base sin significado de producto.
- `packages/ui/tokens/semantic/` — themes, densidad y significado de interfaz/CMDB.
- `packages/ui/tokens/data-viz/` — foundations de visualización para Light y Dark.
- `packages/ui/generated/` — CSS generado desde tokens; no se edita manualmente.
- `packages/ui/src/components/` — componentes React reutilizables.
- `packages/ui/styles/components/` — estilos por componente con clases prefijadas `igx-*`.
- `packages/ui/stories/` — catálogo y pruebas de Storybook.

Los design tokens siguen el modelo adoptado de DTCG 2025.10 y se transforman mediante un adapter TypeScript pequeño y reemplazable. CSS Custom Properties constituyen el contrato runtime para themes, densidad y foundations.

## Contratos vigentes

- `@igx-nexus/ui` es la API pública del sistema de diseño.
- React Aria Components se encapsula dentro de `@igx-nexus/ui`; las aplicaciones consumidoras no deben importarlo directamente cuando exista un primitive IGX equivalente.
- Lucide React es la única librería general de iconografía.
- Se prefiere HTML semántico nativo cuando resuelve correctamente el caso.
- Light/Dark se controlan mediante semantic tokens y `data-theme`.
- Comfortable/Compact utilizan los mismos componentes y `data-density`.
- `forced-colors` y `prefers-reduced-motion` forman parte del contrato de accesibilidad.
- Los componentes no deben introducir colores hexadecimales arbitrarios cuando exista un token apropiado.
- La interfaz no accede directamente a MariaDB/GLPI; el límite de integración futuro sigue siendo NEXUS API.

## Styling

La implementación actual utiliza **CSS por componente + CSS Custom Properties**, con nombres de clase `igx-*` para evitar colisiones y mantener una API visual explícita. La evaluación inicial contempló CSS Modules, pero el baseline de CMDB-005 quedó deliberadamente en estilos compartidos por componente porque `packages/ui` es una biblioteca única, Storybook necesita consumir el mismo CSS y los tokens deben permanecer disponibles en runtime.

Esta decisión queda registrada en `docs/architecture/adr-0003-ui-design-system.md` y puede revisarse en el futuro sin cambiar el contrato de tokens.

## Baseline de componentes implementado

El paquete ya expone foundations para:

- Button e IconButton.
- Input y Search.
- Badge y StatusBadge.
- Card y Alert.
- AppShell, AppHeader y AppSidebar.
- PageHeader, ContentSection y Toolbar.
- DataTable semántico con sorting, selección y estados.
- EmptyState, LoadingState, ErrorState y Spinner.
- Pagination.

La lista no pretende ser una biblioteca universal. Nuevos primitives se agregan cuando una experiencia de IGX NEXUS demuestra una necesidad reutilizable.

## QA automatizado

El pipeline actual valida:

1. TypeScript de tokens y UI.
2. generación de tokens y build de UI.
3. build estático de Storybook.
4. tests de Storybook en Chromium.
5. axe/accessibility addon configurado para fallar ante violaciones detectadas.
6. consistencia de artefactos de tokens versionados.
7. empaquetado distribuible del workspace.

Los checks automatizados son una primera línea de QA; **no equivalen por sí solos a una certificación WCAG 2.2 AA**. Las validaciones manuales mínimas se documentan en `accessibility.md`.

## Documentación

- [Foundations](foundations.md)
- [Accesibilidad](accessibility.md)
- [Componentes](components.md)
- [Visualización de datos](data-visualization.md)
- [ADR-0003 — Sistema de Diseño](../architecture/adr-0003-ui-design-system.md)

## Estado de CMDB-005

CMDB-005 permanece **en desarrollo** hasta completar la revisión documental, QA manual mínimo y el PR final. Su trabajo no debe contarse como ticket integrado hasta que la rama sea revisada y fusionada manualmente.
