# Technology Map — relaciones entre CI

La primera versión nació en CMDB-010. V02-018 la evoluciona a **Technology Map 2.0** sin reescribir el modelo ni introducir una librería gráfica nueva.

La pregunta operacional es:

> **¿Cómo está conectado este CI dentro de un alcance concreto, qué significan esas relaciones y qué puedo investigar sin confundir conectividad con impacto demostrado?**

## Ruta y state

Ruta base:

```text
/#assets/<asset-id>/relations
```

State opcional compartible:

```text
/#assets/<asset-id>/relations?depth=1&type=uses&perspective=upstream&selected=<asset-id>
```

El hash conserva focus CI y puede codificar profundidad, tipo, perspectiva y selección. Refresh y Atrás/Adelante restauran el estado esencial sin router nuevo.

## Arquitectura

| Capa | Responsabilidad |
|---|---|
| `relationship-model.ts` | semántica, validación, dirección, filtros, vecindario y layout puro |
| `demo-relationship-provider.ts` | provider de relaciones canónicas Demo |
| `navigation-model.ts` | parse/build del state compartible |
| `RelationshipGraph.tsx` | focus/scope, coverage, selección, navegación y representación semántica |
| `relationship-graph.css` | jerarquía visual, responsive y forced colors |

## Scope

Technology Map no renderiza el universo completo.

El workspace declara:

- focus CI;
- profundidad 1/2;
- tipo;
- perspectiva;
- CIs visibles;
- relaciones visibles;
- modo Demo/Live;
- coverage relacional.

El focus CI no desaparece al filtrar.

## Semántica

Tipos actuales:

| Tipo | Dirección | Lectura |
|---|---|---|
| `depends_on` | dirigida | el origen depende del destino |
| `uses` | dirigida | el origen usa el destino |
| `connected_to` | bidireccional | conexión entre pares |

Desde el focus:

- **upstream**: relaciones salientes dirigidas;
- **downstream**: relaciones entrantes dirigidas;
- **peer**: relaciones bidireccionales.

La orientación no demuestra causalidad, riesgo, blast radius ni indisponibilidad.

## Contexto seleccionado

El panel contextual muestra sólo datos ya disponibles:

- ID NEXUS;
- Domain;
- Asset Class;
- Role;
- lifecycle;
- criticality;
- taxonomy state/review/fallback;
- sources;
- última observación;
- relaciones visibles del CI.

Si un endpoint relacional no existe en el inventario, se muestra como referencia no resuelta y no se crea navegación falsa.

## Evidence y coverage

La Web presenta lo que su proyección realmente transporta:

- relationship type;
- direction;
- status;
- source;
- `observedAt`.

`observedAt=null` se muestra como fecha desconocida. No se sustituye por el corte del snapshot.

La UI no inventa authority, confidence o provenance por atributo/relación si no llegan a la proyección.

## Demo / Live

Demo consume las relaciones sintéticas canónicas de `packages/demo-data`.

Live comparte la misma arquitectura de producto, pero si NEXUS API todavía no entrega un provider relacional defendible, Technology Map muestra cobertura no disponible y **no cae a fixtures Demo**.

## Accesibilidad

- nodos HTML accionables con teclado;
- foco visible;
- línea + texto + leyenda, sin depender sólo de color;
- alternativa semántica permanente;
- mapa visual ocultable en pantallas pequeñas sin pérdida de información esencial;
- 320 CSS px;
- light/dark;
- comfortable/compact;
- forced colors;
- reduced motion.

## Límites

V02-018 no implementa:

- graph analytics;
- centrality;
- blast radius;
- impact/risk score;
- edición de relaciones;
- Service Mapping;
- discovery;
- active OT scanning;
- nuevas integraciones;
- analytics de V02-019.

Ver [plan de V02-018](product/technology-map-v2-plan.md) y [Technology Scan](product/technology-scan-v02-018.md).
