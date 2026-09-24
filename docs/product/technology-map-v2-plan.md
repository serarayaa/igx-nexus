# V02-018 — Technology Map 2.0

Estado: **en implementación**; issue canónico: [#92](https://github.com/serarayaa/igx-nexus/issues/92).

## Objetivo

Responder:

> **¿Cómo está conectado este CI dentro de un alcance concreto, qué significan esas relaciones y qué puedo investigar sin confundir conectividad con impacto demostrado?**

Technology Map 2.0 evoluciona el grafo existente. No reemplaza Relationship Evidence v2, no crea graph analytics y no introduce una segunda fuente de relaciones.

## Baseline verificado — 2026-09-21

- V02-017 cerrado formalmente.
- `main = eae384cf6fb7853b3bbcf29ba80a0b41072d42d6`.
- CI post-housekeeping #653: success.
- issue #89 cerrado como completed.
- rama: `feature/v02-018-technology-map-2`.

## Auditoría del mapa heredado

Fortalezas preservadas:

- focus CI;
- profundidad 1/2;
- filtros por tipo/perspectiva;
- mapa visual + alternativa semántica;
- endpoints no resueltos explícitos;
- navegación a Asset 360;
- fixtures canónicos Demo;
- routing hash existente;
- QA browser/reflow/High Contrast/reduced motion.

Brechas abordadas:

- copy histórico anclado a Demo/CMDB-010;
- scope poco explícito;
- filtros no compartibles;
- selección con contexto mínimo;
- Live excluido de la ruta;
- relación visual susceptible de confundirse con impacto;
- coverage/evidence poco visibles;
- estado del workspace no restaurable por URL.

## Decisiones de producto

### Focus y scope

El mapa siempre conserva un **focus CI** como home node.

El scope declara:

- focus;
- profundidad;
- tipo;
- perspectiva;
- nodos visibles;
- relaciones visibles;
- modo Demo/Live;
- cobertura relacional disponible.

No existe “mostrar toda la organización”.

### URL compartible

La ruta existente se extiende sin router nuevo:

```text
#assets/:id/relations
#assets/:id/relations?depth=1&type=uses&perspective=upstream&selected=:id
```

Sólo se serializan valores distintos del baseline cuando corresponde.

Refresh y Atrás/Adelante deben reconstruir el estado esencial.

### Contexto del CI seleccionado

Sin duplicar Asset 360, el panel contextual muestra sólo metadata ya disponible en la proyección:

- identidad NEXUS;
- Domain;
- Asset Class;
- Role;
- lifecycle;
- criticality;
- taxonomy state/review/fallback;
- fuentes;
- última observación;
- relaciones incidentes visibles.

### Semántica relacional

Las flechas expresan orientación del claim relacional.

No significan por sí mismas:

- causalidad;
- blast radius;
- riesgo;
- disponibilidad;
- impacto cuantificado.

Se evita presentar “impacto downstream” como hecho. Se habla de dependencias downstream o CIs que dependen del focus.

### Demo / Live

Demo:

- consume las 18 relaciones canónicas del dataset compartido;
- mantiene evidencia sintética explícita;
- no representa topología corporativa real.

Live:

- comparte la misma IA;
- puede abrir Technology Map;
- si el provider no entrega relaciones defendibles, muestra coverage no disponible;
- nunca cae a fixtures Demo;
- no infiere conexiones desde hostname, IP, fabricante, owner o site.

### Accesibilidad

La vista semántica permanece equivalente y usable sin mapa visual.

Baseline:

- teclado;
- foco visible;
- 320 CSS px;
- zoom/reflow;
- light/dark;
- density;
- forced colors;
- reduced motion;
- no depender sólo de color.

## Implementación actual

- `navigation-model.ts`: state shareable para depth/type/perspective/selected.
- `App.tsx`: Technology Map permitido en Demo y Live, con provider boundary explícito.
- `RelationshipGraph.tsx`: workspace focus/scope-first, coverage y contexto.
- `relationship-graph.css`: jerarquía/responsive/context panel.
- browser tests: URL state, Demo/Live, endpoints incompletos, fecha desconocida, axe/reflow/keyboard.
- QA production build: ruta Technology Map 2.0 y shareable scope state.

## Fuera de alcance

- graph analytics;
- centrality;
- blast radius;
- risk/impact score;
- edición CMDB;
- Service Mapping;
- nuevas integraciones;
- endpoint telemetry;
- Intune;
- AI/ML;
- active OT scanning;
- V02-019 Analytics Contract Layer.

## Aceptación

- [x] focus/scope explícitos;
- [x] estado esencial compartible por URL;
- [x] selección contextual con metadata canónica existente;
- [x] lenguaje evita causalidad no demostrada;
- [x] alternativa semántica preservada;
- [x] Live no cae a Demo;
- [x] endpoints y fechas desconocidas siguen explícitos;
- [x] no se incorpora graph library ni router nuevo;
- [ ] CI final verde;
- [ ] PR funcional abierto y merge manual;
- [ ] CI post-merge + housekeeping;
- [ ] issue #92 cerrado como completed.

No auto-merge.
