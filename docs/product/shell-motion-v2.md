# IGX NEXUS — Shell & Motion 2.0

Estado: **V02-014 en implementación / issue #79**.

## 1. Propósito

Shell 2.0 materializa la Product IA v2 sin redefinir las superficies que pertenecen a V02-015..018.

Su responsabilidad es:

- mantener orientación entre workspaces;
- separar navegación global de navegación contextual;
- comunicar el origen de datos sin convertir Demo/Live en productos distintos;
- preservar preferencias visuales del usuario;
- sostener responsive, foco y reduced motion;
- proporcionar una base estable para las siguientes vistas 2.0.

No es responsable de inventar nuevos KPIs, completar Asset 360, rediseñar Technology Map ni agregar módulos futuros como placeholders.

---

## 2. Navegación global

Regla:

> La navegación global responde “¿a qué espacio de trabajo implementado puedo ir?”

En el baseline actual sólo se muestran destinos que tienen una experiencia funcional:

### Demo

- Panel principal;
- Activos;
- CMDB Health.

### Live

- Activos.

La diferencia no representa dos arquitecturas de producto. Refleja **capabilities disponibles con evidencia real en este momento**.

Cuando Overview, Data Quality, Sources, Lifecycle o Technology Map tengan una superficie Live defendible, pueden incorporarse sin cambiar la arquitectura mental definida por ADR-0023.

### Lo que se eliminó del global nav

Se retiran del sidebar principal los anchors del Dashboard:

- Calidad y frescura;
- Garantías y lifecycle;
- Recorrido de la demo.

Esos son contextos internos de una pantalla, no workspaces.

QR y Label siguen siendo acciones contextuales de un activo.

---

## 3. Header

El header tiene tres responsabilidades:

1. comunicar la view/workspace actual;
2. mantener el contexto de producto (`IGX NEXUS · Innergex Chile`);
3. alojar controles globales de presentación y source mode visible.

El título del header cambia con la vista (`Panel principal`, `Activos`, `Asset 360`, `Technology Map`, etc.).

No reemplaza el `h1` de contenido. El `h1` sigue siendo el destino de foco programático después de navegar.

---

## 4. Demo / Live

Demo/Live se presentan como **contexto de fuente**.

### Demo

- badge `DEMO`;
- footer `Dataset Demo`;
- texto explícito de que usa información sintética y no fuentes corporativas.

### Live

- badge `LIVE LAB`;
- footer `Provider Live`;
- texto explícito de que los datos provienen de NEXUS API;
- declaración de que el shell no sustituye silenciosamente una ausencia Live por Demo.

Regla:

> Menos cobertura no autoriza a inventar una experiencia falsa.

---

## 5. Tema y densidad

Se conservan:

```text
theme   = light | dark
density = comfortable | compact
```

### Inicio

Tema:

1. preferencia explícita previamente guardada;
2. si no existe, `prefers-color-scheme` del sistema;
3. fallback seguro a `light`.

Densidad:

1. preferencia explícita guardada;
2. fallback `comfortable`.

### Persistencia

Las elecciones explícitas se almacenan en:

```text
igx-nexus:theme
igx-nexus:density
```

La aplicación degrada de forma segura cuando storage está bloqueado o falla.

No se usan estas preferencias como parte de la URL ni del estado de dominio.

### Accesibilidad

Compact no puede convertir controles interactivos en targets inseguros. El Design System mantiene targets de coarse pointer y los links globales del shell conservan una altura mínima de 44px.

---

## 6. Motion contract

Principio:

> Motion explica orientación o feedback; nunca simula inteligencia.

### Timings

- feedback corto: `120ms`;
- transitions de shell: `200ms`;
- el token spatial global de `320ms` se conserva para no cambiar otros componentes fuera del scope;
- el drawer NEXUS limita localmente su duración espacial al transition token de `200ms`.

### Usos válidos

- drawer móvil;
- scrim;
- hover/selección de navegación;
- feedback corto de controles.

### Usos excluidos

- números animados;
- cards flotando;
- glows;
- motion ornamental al cambiar de página;
- efectos que oculten o retrasen contenido funcional.

---

## 7. Reduced motion

`@igx-nexus/ui` mantiene un override global mediante `prefers-reduced-motion`.

Cuando el usuario solicita reducción de motion:

- feedback duration → `0ms`;
- transition duration → `0ms`;
- spatial duration → `0ms`.

El override local del drawer referencia el transition token, por lo que también se resuelve a `0ms`.

El estado final y el feedback semántico siguen disponibles: sólo se elimina la animación no esencial.

---

## 8. Mobile / responsive

### Drawer

Se preserva la implementación existente de `AppShell`:

- background `inert`;
- body scroll lock;
- focus trap;
- Escape;
- restauración al botón “Abrir navegación”;
- scrim;
- cierre al seleccionar destino;
- cierre automático al volver a breakpoint desktop.

Se agrega `overscroll-behavior: contain` para reducir scroll chaining del drawer.

### Header pequeño

Bajo 30rem:

- se prioriza el título actual;
- se oculta sólo la línea secundaria de contexto;
- se reducen gaps/padding;
- las acciones siguen accesibles por nombre;
- no se oculta el título de view.

---

## 9. Focus y routing

V02-014 no reemplaza el hash router.

`App.tsx` continúa:

- resolviendo rutas actuales;
- sincronizando hash/history;
- actualizando `document.title`;
- enfocando el `h1` principal después de navegación.

Cambiar de router queda reservado para cuando deep links/filters/map state demuestren una necesidad superior al modelo actual.

---

## 10. High contrast / forced colors

Se preservan los contratos existentes:

- nav seleccionado mantiene indicador no dependiente sólo del color;
- focus ring sigue visible;
- scrim tiene comportamiento específico en forced colors;
- el logo mantiene una superficie legible en dark mode.

---

## 11. Testing

V02-014 agrega cobertura específica para:

- separación global/contextual;
- source context Demo/Live;
- ausencia de fallback silencioso Demo en Live;
- lectura y persistencia segura de theme/density;
- drawer móvil, Escape y restore focus;
- axe sobre el shell;
- helpers de preferences bajo storage fallido.

CI existente sigue validando:

- Web typecheck/build;
- Storybook;
- reflow;
- high contrast;
- reduced motion;
- QA visual;
- Demo v0.1.

---

## 12. Handoff

### V02-015 — Technology Overview

Puede asumir que:

- el shell global ya está estable;
- Overview no necesita contener navegación interna en el sidebar;
- source mode y preferencias ya son globales.

### V02-016 — Asset Explorer 2.0

Puede aprovechar density compact sin redefinir el shell.

### V02-017 — Asset 360 2.0

Puede concentrarse en tabs/secciones contextuales; el global nav no debe absorberlas.

### V02-018 — Technology Map 2.0

Puede diseñar navegación contextual, focus/scope y deep links sin convertir sus controles en navegación global.

---

## 13. Tecnología evaluada

Ver [`technology-scan-v02-014.md`](technology-scan-v02-014.md).

Decisión de V02-014: **CSS / Design System primero**. Motion for React y View Transitions API permanecen en radar, sin dependencia nueva en este ticket.
