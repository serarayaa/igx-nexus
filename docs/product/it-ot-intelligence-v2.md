# V02-022 — IT / OT Intelligence

Estado: **integrado** · PR #110 · issue #109 · merge `4ffef6d` · CI post-merge #866 verde.

## Pregunta operacional

> **¿Qué composición tecnológica y qué cobertura de evidencia existen en IT y OT, y qué diferencias descriptivas pueden observarse sin mezclar poblaciones incompatibles ni convertir unknown en una clasificación?**

V02-022 no crea una taxonomía nueva. Consume Taxonomy v2, Operational Context y Analytics Contract Layer.

## Regla de cohorte

Un CI pertenece analíticamente a IT u OT sólo cuando:

```text
asset.taxonomy.domain.state = classified
```

La asignación usa `taxonomy.domain.value`.

No se utiliza como evidencia de cohorte:

- el scalar de compatibilidad `TechnologyAsset.domain` cuando el assessment no está resuelto;
- fabricante/modelo;
- forma física;
- hostname;
- source system;
- asset type upstream.

Los estados `unknown`, `unclassified`, `conflict` y assessment ausente permanecen fuera de las cohortes y reducen **domain classification coverage**.

## Comparación compatible

IT y OT pueden mostrarse lado a lado, pero cada lectura conserva su población y denominador.

No existe:

- winner IT vs OT;
- maturity score;
- health score;
- risk score;
- ponderación corporativa inventada.

La superficie describe composición y cobertura.

## Dimensiones

Dentro de cada cohorte clasificada se pueden resumir:

- Asset Class;
- Role;
- Lifecycle mediante métricas gobernadas;
- source instance identity mediante métrica gobernada;
- Operational Context cuando la colección está disponible.

Asset Class y Role conservan coverage propio. Un domain conocido no vuelve automáticamente conocida la clase o el rol.

## Operational Context

`operationalContexts === undefined` representa ausencia de cobertura histórica para esta lectura.

`operationalContexts = []` representa una colección conocida sin memberships.

Los conteos de context son memberships de assets, deduplicados por `kind + id` dentro de cada asset.

No se inventan Purdue level, site, network segment o security zone.

## Producto

V02-022 no agrega una ruta global nueva.

La primera integración de producto utiliza una **lente IT/OT dentro de Technology Overview** y conserva Explorer como workspace de investigación:

- Overview muestra domain classification coverage y cohortes IT/OT;
- al seleccionar IT u OT, el scope usa IDs de la cohorte canónica cuando existe TechnologySnapshot;
- compatibility projection no asigna activos a la cohorte;
- cada cohorte muestra denominadores propios para Taxonomy completa, lifecycle, source identity y Operational Context;
- composición Asset Class / Role conserva coverage independiente;
- Explorer continúa como drill-down, sin duplicar su tabla/facetas.

Si el provider no entrega snapshot canónico, la lente se presenta como no disponible y no fabrica cohortes desde scalars legacy.

## Demo / Live

**Demo**

- usa exclusivamente el snapshot canónico;
- las cohortes son reproducibles;
- no se precomputan resultados manuales.

**Live**

- usa exclusivamente Taxonomy v2 recibida desde NEXUS API;
- unresolved permanece unresolved;
- partial/unavailable coverage queda visible;
- no existe fallback a Demo.

## Fuera de alcance

- V02-023 Intune Analytics;
- endpoint telemetry;
- Device Health;
- Findings Engine;
- graph impact/blast radius;
- active OT scanning;
- AI/ML;
- nueva taxonomía;
- scoring comparativo IT/OT.

## QA

La implementación integrada prueba:

- classified IT;
- classified OT;
- assessment ausente;
- unknown;
- unclassified;
- conflict;
- scalar compatibility que no asigna cohorte;
- coverage independiente de class/role;
- Operational Context unavailable vs array vacío;
- reutilización de métricas gobernadas;
- población vacía;
- determinismo y no mutación.
