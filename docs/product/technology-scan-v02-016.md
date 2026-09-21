# Technology Scan — V02-016 Asset Explorer 2.0

Fecha de revisión: 2026-09-21.

Objetivo: extraer patrones de exploración de inventario; **no copiar interfaces ni workflows de terceros**.

## Atlassian Assets

Documentación revisada:

- https://support.atlassian.com/assets/docs/search-for-objects-and-object-types/
- https://support.atlassian.com/assets/docs/use-assets-query-language-aql/
- https://support.atlassian.com/assets/docs/how-to-use-assets-query-language-aql/

Patrones:

- búsqueda simple por atributos;
- refinamiento estructurado;
- modo avanzado AQL para queries más expresivas;
- object type/schema como scope explícito.

Decisión NEXUS:

- **Adopt:** search + facetas estructuradas;
- **Hold:** DSL/AQL propio;
- **Hold:** traversal/query de relaciones desde Explorer; Technology Map posee ese workflow.

Razón: el Live Lab actual no justifica parser, syntax UX, query API ni gobernanza de un lenguaje nuevo.

## NetBox

Documentación revisada:

- https://netbox.readthedocs.io/en/stable/models/extras/savedfilter/
- https://netbox.readthedocs.io/en/feature/models/extras/tableconfig/
- https://netbox.readthedocs.io/en/feature/reference/filtering/

Patrones:

- filtros combinables;
- filtros guardados como configuración reutilizable;
- configuración independiente de columnas/ordering;
- múltiples valores por parámetro en API según semántica del campo.

Decisión NEXUS:

- **Adopt:** separar scope/filtros de presentación de tabla;
- **Adopt:** diseño que no impida saved views futuros;
- **Hold:** saved filters/table configs persistentes hasta disponer de identidad/preference storage;
- **Adopt:** membership explícito para dimensiones multi-value.

## Microsoft Entra / Intune

Documentación revisada:

- https://learn.microsoft.com/en-us/azure/active-directory/devices/manage-device-identities
- https://learn.microsoft.com/en-us/intune/fundamentals/filters/overview
- https://learn.microsoft.com/en-us/intune/device-management/create-device-categories

Patrones:

- listas de dispositivos filtrables por atributos operacionales;
- columnas configurables;
- filtros como scope antes de operar;
- preview de dispositivos que cumplen reglas.

Decisión NEXUS:

- **Adopt:** claridad explícita entre scope y resultados;
- **Adopt:** dimensiones operacionales, no sólo identificadores;
- **Hold:** bulk actions/remediation;
- **Hold:** persistence de configuración de columnas.

## Evaluación de librerías

### Data-grid nueva

Estado: **Hold**.

El DataTable actual ya ofrece:

- semántica table;
- sorting;
- estilos NEXUS;
- integración con accessibility baseline.

V02-016 no demuestra todavía necesidad de virtualización, pinned columns, row grouping o server-side pagination.

### Router nuevo

Estado: **Hold**.

`#assets` y deep links actuales siguen siendo suficientes.

### Search backend

Estado: **Hold**.

Demo tiene 240 activos y el Live Lab actual es acotado. Filtrado client-side mantiene semántica determinista y testeable.

Debe reevaluarse cuando:

- cardinalidad real haga costoso descargar snapshot;
- exista paginación server-side;
- haya permisos row/field-level;
- múltiples providers requieran query federation.

### Saved views

Estado: **Hold / diseño compatible**.

Son útiles en productos comparables, pero requieren:

- identidad de usuario;
- persistence;
- ownership/share semantics;
- versionado de filtros/columnas;
- permission model.

No pertenecen a V02-016.

## Resultado

La implementación recomendada es una evolución del Explorer existente:

```text
Search
  ↓
Canonical facets + counts
  ↓
Explicit active scope
  ↓
Data-dense semantic table
  ↓
Asset 360 drill-down
```

Sin nueva dependencia de UI, sin DSL, sin backend query layer y sin mezclar investigación con acciones/remediation.
