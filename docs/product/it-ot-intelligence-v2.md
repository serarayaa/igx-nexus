# V02-022 — IT / OT Intelligence

Estado: **en implementación** · issue #109.

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

V02-022 parte sin una ruta global nueva.

Primero se estabiliza el modelo puro. Luego se decidirá si la pregunta operacional cabe mejor como:

- contexto/lente dentro de Overview;
- drill-down hacia Explorer con facetas gobernadas;
- o una superficie propia sólo si aporta una pregunta distinta y durable.

Esto evita duplicar Dashboard y Explorer.

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

## QA inicial

El contrato debe probar:

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
