# V02-014 — Technology Scan: Shell & Motion 2.0

Fecha de revisión: 2026-09-17.

## Objetivo

Evaluar si Shell & Motion 2.0 requiere una dependencia adicional para navegación, transiciones o motion, o si el Design System actual cubre el problema con menor complejidad.

El criterio no es “qué librería tiene más estrellas”, sino:

- encaje con el problema real;
- accesibilidad y `prefers-reduced-motion`;
- licencia;
- actividad/madurez;
- coste de bundle y dependencia;
- necesidad de gestures/layout orchestration;
- capacidad de degradar sin romper navegación o foco.

## Baseline NEXUS

Antes de V02-014 el proyecto ya posee:

- `AppShell` con skip link;
- drawer móvil con `inert` para background;
- focus trap;
- cierre con Escape;
- restauración de foco al trigger;
- bloqueo de scroll del body mientras el drawer está abierto;
- navegación por anchors/hash con foco programático al heading de destino;
- motion tokens semánticos;
- `prefers-reduced-motion` que reduce feedback/transition/spatial motion a `0ms`;
- high contrast / forced colors;
- light/dark mode y densidad comfortable/compact.

Por tanto, V02-014 necesita **refinar** el shell existente, no reemplazarlo.

---

## Radar

| Tecnología | Estado | Decisión V02-014 |
| --- | --- | --- |
| CSS + Design System NEXUS | **Adopt** | Base de implementación |
| Motion for React (`motion`) | **Hold para V02-014 / Assess futuro** | No agregar dependencia |
| View Transitions API | **Assess** | No convertir en requisito todavía |
| Router adicional | **Hold para V02-014** | Mantener hash routing mientras sea suficiente |

---

## CSS + Design System NEXUS — Adopt

### Motivo

Las interacciones de V02-014 son deliberadamente simples:

- drawer entra/sale;
- scrim aparece/desaparece;
- selección de navegación cambia;
- controles entregan feedback breve;
- el usuario conserva orientación entre workspaces.

No existe en este ticket:

- drag complejo;
- layout animation entre árboles distintos;
- physics/springs;
- shared-element orchestration;
- timeline de animaciones;
- gestures avanzados.

El Design System ya tiene primitives suficientes. Agregar una dependencia sería complejidad sin valor proporcional.

### Decisión de timing

`visual-direction-v2.md` propone **120–200ms** como baseline para transiciones pequeñas.

No se cambia globalmente `semantic.motion.spatial` de 320ms porque ese token tiene otros consumidores. Shell 2.0 limita localmente el drawer al token `semantic.motion.transition` de 200ms. Así V02-014 no altera accidentalmente componentes ajenos al shell.

---

## Motion for React — Hold / Assess

Proyecto:

- https://github.com/motiondivision/motion
- https://motion.dev/docs/react-accessibility
- https://motion.dev/motion/motion-config/

### Fortalezas observadas

- proyecto maduro y ampliamente adoptado;
- licencia MIT;
- primitives de layout/gestures/exit animations;
- soporte explícito de reducción de motion mediante `MotionConfig` y preferencias del usuario;
- útil cuando la relación espacial entre componentes deja de ser trivial.

### Por qué NO se adopta ahora

V02-014 no necesita sus capacidades diferenciadoras. Introducirlo hoy:

- aumenta superficie de dependencia;
- añade otra abstracción sobre tokens que ya funcionan;
- no mejora por sí solo foco, semántica ni navegación;
- puede incentivar motion decorativo que contradice Visual Direction v2.

### Cuándo reevaluar

Volver a evaluar si V02-017/V02-018 o v0.4 requieren:

- paneles coordinados con layout transitions;
- shared-element transitions defendibles;
- gestures con alternativa accesible;
- animaciones de topology/workspaces difíciles de expresar y mantener con CSS.

La adopción futura debe seguir respetando `prefers-reduced-motion` y nunca convertir una animación en requisito para entender el estado.

---

## View Transitions API — Assess

Fuentes:

- https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition
- https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using

### Valor potencial

La API nativa puede aportar continuidad visual entre estados/vistas sin una dependencia React específica.

Puede ser interesante cuando NEXUS tenga rutas más estables y superficies 2.0 completas.

### Riesgos relevantes

La documentación de MDN advierte que una transición SPA implementada ingenuamente puede interferir con:

- foco;
- posición de lectura;
- anuncios de lectores de pantalla;
- expectativas normales de navegación.

NEXUS ya mueve foco al `h1` de la vista tras navegar. Ese comportamiento accesible no debe degradarse por una transición visual.

### Decisión

No adoptarla en V02-014. Mantenerla como **Assess** para una PoC posterior con:

- foco programático;
- back/forward;
- reduced motion;
- deep links;
- screen readers;
- navegadores sin soporte.

---

## Router adicional — Hold para V02-014

V02-013 dejó explícitamente abierta la implementación técnica de rutas.

El hash router actual tiene limitaciones, pero V02-014 no necesita reemplazarlo para:

- corregir la IA del shell;
- separar navegación global/contextual;
- persistir preferencias;
- mejorar responsive/motion.

Cambiar router aquí ampliaría el blast radius sin resolver la pregunta principal del ticket.

Reevaluar cuando deep links complejos de Technology Map, filtros persistentes y history state excedan claramente el modelo actual.

---

## Resultado

V02-014 adopta una estrategia **native/CSS-first**:

```text
Product IA v2
      ↓
NexusShell
      ↓
@igx-nexus/ui AppShell
      ↓
semantic motion tokens + CSS
      ↓
prefers-reduced-motion / forced colors / responsive
```

No se incorpora una dependencia nueva.

Esto no declara que Motion o View Transitions “no sirvan”; sólo evita pagar su complejidad antes de tener un problema que las justifique.
