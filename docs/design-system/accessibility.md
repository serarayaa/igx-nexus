# Accesibilidad — IGX Design System

## Baseline

IGX NEXUS adopta **WCAG 2.2 nivel AA** como baseline de diseño y desarrollo.

El objetivo de CMDB-005 no es declarar una certificación formal, sino construir una base que permita a CMDB-006+ mantener semántica, navegación por teclado, contraste, reflow y estados accesibles desde el inicio.

## Principios obligatorios

1. Preferir HTML semántico nativo antes que ARIA personalizada.
2. Todo control interactivo debe ser operable mediante teclado.
3. El focus debe ser visible y no quedar oculto por headers, drawers u overlays propios.
4. Un estado importante nunca debe depender únicamente del color.
5. Controles icon-only deben poseer accessible name.
6. Formularios deben poseer label/name accesible, descripción cuando aporte contexto y errores comprensibles.
7. Contenido debe tolerar zoom y reflow sin exigir desplazamiento bidimensional salvo casos inherentemente tabulares.
8. Acciones móviles prioritarias apuntan internamente a targets cercanos a 44×44 CSS px cuando el contexto lo permite.
9. Movimiento no esencial debe respetar `prefers-reduced-motion`.
10. High Contrast debe conservar significado básico mediante `forced-colors`.

## QA automatizado

Storybook utiliza accessibility addon / axe como primera línea de detección y está configurado para tratar las violaciones detectadas como errores de test.

El CI ejecuta, además:

- TypeScript de tokens y UI;
- build de tokens/UI;
- build estático de Storybook;
- tests de Storybook en Chromium;
- verificación de tokens generados;
- validación del paquete distribuible.

Esto ayuda a detectar regresiones, pero **axe no puede validar por sí solo toda WCAG 2.2 AA**. Keyboard flow, calidad del nombre accesible, zoom/reflow real, High Contrast y experiencia con screen reader requieren revisión manual.

## Contraste

Criterios de referencia:

- texto normal: al menos 4.5:1;
- texto grande: al menos 3:1;
- elementos UI relevantes: contraste no textual aplicable de al menos 3:1 cuando WCAG lo exige.

Los componentes deben consumir semantic tokens. Cambiar un theme o estado no puede convertir el contraste en una responsabilidad local de cada feature.

## Teclado y focus

### Reglas

- El orden de tabulación debe seguir el orden visual/lógico.
- No usar `tabIndex` positivo.
- Escape debe cerrar overlays/drawers que lo soporten.
- Al cerrar una navegación temporal, el focus debe volver al control que la abrió cuando corresponda.
- Skip links deben permitir llegar al contenido principal.
- Los estados `:focus-visible` no pueden eliminarse sin alternativa equivalente.

### AppShell

El AppShell implementa skip link, landmarks de navegación/contenido y navegación móvil modal accesible. La validación manual del 2026-09-08 confirmó que, al abrir el drawer móvil, el focus entra al control de cierre, Tab/Shift+Tab permanecen dentro de la navegación, los enlaces muestran focus visible, Escape cierra el drawer y el focus vuelve al botón que abrió la navegación. Mientras el drawer permanece abierto, el contenido de fondo queda fuera del orden de focus mediante `inert`.

## Formularios

Input y Search encapsulan labels, descripción y estados de error accesibles.

Reglas para futuros controles:

- placeholder no reemplaza label;
- `aria-label` se reserva para casos donde un label visible no sea apropiado;
- mensajes de error deben explicar el problema de forma accionable;
- disabled y invalid deben distinguirse por más de un cambio de color cuando sea necesario.

## Iconos

Lucide React es la única librería general.

- iconos decorativos: `aria-hidden="true"`;
- icon-only controls: accessible name obligatorio;
- estados importantes pueden combinar icono + texto + color.

## DataTable

La foundation utiliza `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`, `scope` y caption.

Sorting:

- el encabezado sortable expone `aria-sort`;
- la acción de ordenar se realiza mediante un botón nativo;
- el icono de dirección es complementario y no sustituye el atributo semántico.

Selección:

- cada checkbox posee nombre accesible;
- la selección global comunica su propósito;
- el estado indeterminado se refleja en el control nativo.

Viewport pequeño:

La tabla se mantiene semánticamente tabular y utiliza un contenedor con scroll horizontal accesible. No se transforma cada fila en tarjetas porque eso destruiría relaciones de filas/columnas para datos que siguen siendo genuinamente tabulares.

## Loading, empty y error

- `LoadingState` usa una región de estado apropiada para feedback no crítico.
- `ErrorState` utiliza anuncio de error cuando corresponde.
- `EmptyState` explica ausencia de contenido sin tratarla automáticamente como error.
- Spinner es decorativo cuando el mensaje de estado ya comunica la carga.

## Reduced motion

Animaciones de feedback, drawers, spinners y transiciones deben responder a `prefers-reduced-motion`.

La reducción de movimiento no debe ocultar cambios de estado; debe conservar la transición lógica aunque la animación desaparezca.

## Forced colors / High Contrast

La capa `forced-colors.css` remapea superficies, estados y controles relevantes a colores del sistema. Los componentes no deben desactivar forced colors globalmente.

La validación manual mínima se realiza en Windows High Contrast cuando sea posible.

## Checklist manual para cerrar CMDB-005

> Esta tabla es evidencia de QA pendiente/realizada. No marcar un ítem como validado sólo porque axe esté verde.

| Prueba | Evidencia esperada | Estado |
| --- | --- | --- |
| Navegación teclado | Recorrer stories representativas sólo con Tab/Shift+Tab/Enter/Space/Escape | **Validado 2026-09-08** — PageLayout y AppShell móvil; focus trap y Escape correctos |
| Focus visible | Confirmar focus perceptible y no oculto por AppShell/navigation | **Validado 2026-09-08** — Button, Search, Toolbar y enlaces de navegación con focus perceptible |
| Zoom 200% | Storybook usable sin pérdida de contenido/acciones | **Validado 2026-09-08** — AppShell mantiene navegación, header, contenido y acciones sin solapamiento ni pérdida visible |
| Reflow 320 CSS px | Layout representativo usable; tablas pueden usar scroll horizontal | **Validado 2026-09-08** — AppShell probado a 306 CSS px, más estrecho que el objetivo; contenido refluye sin solapamientos ni scroll horizontal global |
| Dark + Compact | Contraste y jerarquía conservados | **Validado 2026-09-08** — AppShell conserva jerarquía visual, legibilidad y separación de superficies en tema Dark con densidad Compact; sin defectos visuales bloqueantes observados |
| Reduced Motion | Movimiento no esencial eliminado/reducido | **Validado 2026-09-08** — `prefers-reduced-motion: reduce` reduce la transición del drawer a un cambio prácticamente instantáneo, manteniendo el cambio de estado |
| Windows High Contrast | Controles y estados siguen siendo distinguibles | **Validado 2026-09-08** — `forced-colors: active` conserva texto, iconos, controles y bordes; el enlace actual se distingue además mediante subrayado y señal no dependiente del color |
| Screen reader smoke | Headings, landmarks, botones, inputs y tabla anunciados de forma razonable | Pendiente |
| Touch targets | Acciones móviles prioritarias cercanas a 44×44 cuando corresponda | **Validado 2026-09-08** — IconButton aplica target táctil mínimo de 44×44 CSS px en punteros coarse; hamburguesa, notificaciones y cierre del drawer cumplen el baseline |

## Criterio de cierre

CMDB-005 puede cerrar con smoke tests manuales documentados y sin defectos bloqueantes conocidos. Una auditoría WCAG completa de la aplicación funcional corresponde a una etapa posterior, cuando `apps/web` disponga de flujos reales suficientes para evaluarla de extremo a extremo.
