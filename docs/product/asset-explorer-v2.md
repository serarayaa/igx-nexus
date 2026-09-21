# Asset Explorer 2.0 — V02-016

Estado: **integrado mediante V02-016 / PR #87**.

Baseline de implementación:

`main = 7d36a23e4e3773338955e038a2567b9f5d4526b3`

Integrado en `main`:

`68479fd9dd8c45be06a99b0042be83cfba9a2277`

CI post-merge V02-016: **#608 verde**.

## Pregunta operacional

Asset Explorer responde:

> **¿Qué tecnología existe, bajo qué clasificación/contexto/fuente, y cuál es el CI correcto para investigar?**

Explorer es un workspace de investigación. No es un dashboard, no calcula un risk score y no reemplaza Asset 360.

## Evolution over reinvention

V02-016 extiende la implementación existente:

- conserva `#assets`;
- conserva `InventoryProvider`;
- conserva búsqueda normalizada, sorting, paginación, estados y cancelación;
- conserva `DataTable` del Design System;
- conserva Demo/Live como source context;
- conserva Asset 360 como drill-down;
- amplía la projection Web con metadata canónica aditiva.

No se introduce router, data-grid library, query DSL ni backend search service.

## Facetas

Orden primario:

```text
Domain | Asset Class | Role | Lifecycle
```

Refinamiento secundario cuando existe cobertura:

```text
Source
Taxonomy State
Review Required
Compatibility Fallback
Operational Context
Legacy Source Type
Site
Manufacturer
Criticality
Freshness
```

Las facetas se combinan con AND entre dimensiones.

Una dimensión multi-value, como Source u Operational Context, usa membership dentro de la misma faceta: un activo puede pertenecer a más de una fuente/contexto sin reducir esos valores a un scalar falso.

## Facet counts

Los counts se calculan contra:

```text
search + todas las demás facetas activas
```

y excluyen temporalmente la faceta cuyo menú se está calculando.

Así, al filtrar Domain=IT, la faceta Role muestra counts alcanzables dentro de IT, mientras la faceta Domain continúa mostrando IT y OT disponibles dentro del resto del scope.

Los counts representan **activos**, no número de claims o referencias.

## Taxonomy v2

Explorer usa la Taxonomy v2 gobernada:

- `domain`;
- `assetClass`;
- `role`;
- estado resumido del assessment;
- review required;
- compatibility fallback.

### Taxonomy summary state

La UI resume las tres decisiones del assessment para facilitar exploración:

```text
conflict      si alguna dimensión está conflict
unclassified  si no hay conflict y alguna está unclassified
unknown       si no hay las anteriores y alguna está unknown
classified    sólo si las tres están classified
```

Este resumen no reemplaza el assessment detallado ni pierde el ownership de cada dimensión. Asset 360 2.0 podrá exponer el detalle completo en V02-017.

## Compatibility fallback

Los scalars `domain / assetClass / role` siguen siendo obligatorios en schema 0.2.

GLPI puede usar una compatibility projection cuando el assessment real está unresolved.

Explorer debe mostrar esos valores como:

> **Proyección de compatibilidad**

y nunca como clasificación resuelta.

El filtro `Compatibility Fallback` permite investigar explícitamente esos registros.

## Demo

`packages/demo-data` sigue siendo la fuente autorada.

La projection Web incorpora de forma aditiva:

- asset class;
- role;
- criticality canónica;
- taxonomy state/review;
- source systems;
- operational contexts.

El catálogo histórico no se reautora.

La regresión histórica se conserva mediante `legacyDemoDatasetProjection()`, que serializa únicamente los campos v0.1 y mantiene el digest revisado existente.

## Live

Live consume únicamente NEXUS API.

El provider Web conserva ahora:

- `assetClass`;
- `role`;
- criticality;
- source systems;
- taxonomy state/review;
- compatibility fallback.

Taxonomy state/review/fallback se obtiene desde la metadata canónica `nexus.taxonomy.*` ya emitida por GLPI.

Operational Context no se inventa. Si el contrato HTTP no lo entrega, la faceta se oculta y el workspace declara **Sin cobertura del provider**.

No existe fallback Live → Demo.

## Search

La búsqueda libre incluye, cuando existe cobertura:

- NEXUS ID;
- display name;
- hostname;
- serial;
- asset tag;
- IP;
- owner;
- site;
- manufacturer/model;
- legacy source type;
- domain;
- asset class;
- role;
- criticality;
- taxonomy state;
- source systems;
- operational contexts.

Se mantiene búsqueda por palabras AND, normalizada para espacios, case y acentos.

No se implementa AQL/DSL.

## Tabla

La tabla prioriza seis grupos conceptuales:

1. Activo / identidad NEXUS;
2. Clasificación;
3. Lifecycle / criticidad;
4. Fuente / freshness;
5. Responsable / sitio;
6. Fabricante / modelo.

Identificación técnica (hostname, serial, asset tag, IP) continúa como detalle opcional.

La tabla no intenta mostrar todas las propiedades del CI; ese detalle pertenece a Asset 360.

## Coverage

Explorer diferencia:

- dato conocido;
- valor missing dentro de una dimensión disponible;
- dimensión sin cobertura del provider;
- taxonomy unresolved;
- compatibility fallback.

“No hay coincidencias” significa **no hay coincidencias dentro del scope/cobertura actuales**, no que el CI sea inexistente en cualquier sistema corporativo.

## Accessibility

Baseline: WCAG 2.2 AA.

Se preserva:

- tabla semántica;
- sort con `aria-sort`;
- labels de filtros;
- chips removibles con accessible name;
- keyboard;
- focus restore;
- 320 CSS px;
- horizontal table scroll sin overflow del documento;
- light/dark;
- comfortable/compact;
- forced colors;
- reduced motion.

## Límites de V02-016

Fuera de alcance:

- edición/bulk actions;
- saved filters persistentes;
- export corporativo;
- Asset 360 2.0;
- Technology Map 2.0;
- Analytics Contract Layer;
- nuevo backend search;
- nueva auth/RBAC UI;
- Intune real;
- endpoint telemetry;
- AI/ML;
- active OT scanning.

## Ownership futuro

- V02-017 profundiza el CI individual;
- V02-018 investiga relaciones;
- V02-019 define contratos métricos;
- V02-020 profundiza Data Quality;
- V02-023+ amplía fuentes/telemetría.

Explorer debe poder consumir esas capacidades después sin cambiar su pregunta operacional.
