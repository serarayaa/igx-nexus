# IGX NEXUS — Analytics Metric Contract

Estado: **V02-019 / issue #96 — implementación propuesta**.

## 1. Propósito

V02-019 define cómo expresa NEXUS una métrica antes de que esa métrica aparezca en Overview, Data Quality, Lifecycle, IT/OT Intelligence u otras superficies.

Regla:

> **Una métrica no es sólo un número. Debe declarar población, numerador, denominador, temporalidad, cobertura, scope y evidencia suficiente para explicar qué significa y qué no significa.**

El contrato se evalúa inicialmente sobre `TechnologySnapshot`. No introduce un data warehouse, TSDB, SQL semantic layer ni servicio analítico separado.

## 2. Inventario previo

### Overview

`Dashboard.tsx` ya presenta hechos descriptivos como:

- activos visibles;
- freshness conocida/reciente;
- datos básicos presentes;
- garantías próximas.

Se mantienen como presentation facts. V02-019 no los migra silenciosamente porque sus definiciones históricas pertenecen a la Web y algunas usan reglas de demo.

### Asset Explorer

Los facet counts responden a interacción de búsqueda/filtro. Son counts contextuales de UI, no un catálogo analítico corporativo.

### CMDB Health

`health-engine.ts` tiene score, coverage, pesos y reglas de v0.1. Es un motor gobernado de calidad del registro, pero no debe reinterpretarse automáticamente como el nuevo Analytics Contract Layer.

V02-020 — CMDB Quality 2.0 conserva ownership de esa evolución.

### Technology Map

Su coverage actual expresa disponibilidad/evidencia relacional del workspace. No es una métrica analítica general.

## 3. Contratos

### MetricDefinition

Una definición declara:

- `id` namespaced y estable;
- `version`;
- label/description;
- category;
- `valueKind` (`count | ratio`);
- unidad;
- población;
- semántica de numerador;
- semántica de denominador cuando aplica;
- `timeBasis`;
- evidencia requerida;
- dimensiones permitidas.

Las definiciones son data-only. No contienen closures serializadas ni lógica específica de UI.

### MetricResult

Un resultado separa:

- `value`;
- `numerator`;
- `denominator`;
- `asOf`;
- scope normalizado;
- población:
  - snapshot;
  - scoped;
  - eligible;
  - excluded;
  - unknown;
- measurement coverage:
  - state;
  - known;
  - total;
  - ratio;
  - reason.

## 4. Value vs coverage

`value` responde la pregunta de la métrica.

`coverage` responde cuánto de la población elegible dispone de evidencia suficiente para calcular esa pregunta.

Ejemplo conceptual:

```text
Taxonomy resuelta
value    = 80 / 100 assessments conocidos = 0.80
coverage = 100 / 120 activos elegibles     = 0.8333
```

No son intercambiables.

### Estados de coverage

- `known`: toda la población elegible tiene evidencia requerida;
- `partial`: existe evidencia sólo para una parte;
- `unavailable`: no existe evidencia suficiente o no existe población elegible.

Una población vacía no produce automáticamente 0 %. Devuelve `ratio=null` y razón `no_eligible_population`.

## 5. Unknown, excluded y zero

Son conceptos distintos.

- **zero**: valor observado/calculado igual a cero;
- **unknown**: falta evidencia requerida para evaluar;
- **excluded**: entidad fuera de la población elegible según la definición;
- **scope-excluded**: entidad fuera del scope solicitado y por tanto ni siquiera entra a la población evaluada.

Un lifecycle canónico `unknown` es un estado observado del campo, no ausencia del campo. Por eso en `nexus.lifecycle.known.ratio` reduce el numerator, pero no la measurement coverage.

## 6. Ratios y unidades

Los ratios permanecen en rango `0..1` y usan unidad base `1`.

La presentación puede convertirlos a porcentaje:

```text
0.923 -> 92.3 %
```

El contrato no guarda `92.3` como si la unidad base fuera un porcentaje arbitrario.

## 7. Scope y dimensiones

Dimensiones iniciales:

- `domain`;
- `assetClass`;
- `role`;
- `lifecycle`;
- `taxonomyState`;
- `source`;
- `operationalContext`.

Los filtros combinan dimensiones con AND y valores de una misma dimensión con OR.

### Taxonomy

`domain`, `assetClass` y `role` sólo exponen decisiones Taxonomy v2 en estado `classified`.

Los scalars de compatibility projection de `TechnologyAsset` no se utilizan para asignar una dimensión analítica cuando el assessment está unresolved o ausente.

### Source identity

Tras AUD-DATA-002, `SourceReference.sourceInstanceId` forma parte de la identidad lógica de una fuente.

La dimensión analítica conserva esta diferencia:

```text
glpi@glpi-primary
glpi@glpi-secondary
```

Una referencia histórica sin `sourceInstanceId` conserva sólo su source system y no se inventa una instancia.

### Operational Context

Los valores usan:

```text
<kind>:<id>
```

Ejemplo:

```text
site:SCL-01
security_zone:OT-DMZ
```

No usa displayName como identidad.

## 8. Dimensiones gobernadas

No todas las métricas admiten todas las dimensiones.

Ejemplos deliberados:

- `nexus.sources.instance_identity.ratio` no admite `source`, porque filtrar por una fuente antes de preguntar si existe una fuente vuelve la métrica tautológica;
- `nexus.lifecycle.known.ratio` no admite `lifecycle`;
- `nexus.taxonomy.resolved.ratio` no admite `taxonomyState`.

Un scope inválido se devuelve como `invalid_scope`; no se corrige silenciosamente.

## 9. Métricas de referencia

### nexus.inventory.assets.count

Pregunta:

> ¿Cuántos activos canónicos existen en este scope?

- kind: count;
- denominator: no aplica;
- evidence: asset;
- coverage: conocida para todos los activos scoped.

### nexus.taxonomy.resolved.ratio

Pregunta:

> Entre los assets con assessment Taxonomy v2 conocido, ¿qué proporción tiene domain, asset class y role resueltos?

- numerator: assessments completamente classified;
- denominator: assets con assessment presente;
- coverage: assets con assessment / población elegible.

### nexus.sources.instance_identity.ratio

Pregunta:

> ¿Qué proporción de activos identifica explícitamente la instancia lógica de todas sus fuentes?

- numerator: activos donde todas las SourceReference declaran `sourceInstanceId`;
- denominator: activos elegibles dentro del scope;
- measurement coverage: conocida para toda la población evaluada.

`SourceReference` ya es obligatoria en un `TechnologyAsset` canónico válido, por lo que medir sólo su presencia sería tautológico. En cambio, `sourceInstanceId` sigue siendo opcional para evidencia histórica de schema 0.2 y su cobertura es relevante tras AUD-DATA-002. Una referencia legacy sin instancia reduce el value, pero no la measurement coverage porque la ausencia es observable.

### nexus.lifecycle.known.ratio

Pregunta:

> ¿Qué proporción tiene lifecycle distinto de unknown?

El valor `unknown` es una respuesta canónica conocida, por lo que no reduce measurement coverage.

## 10. Demo / Live

La definición de la métrica es la misma.

Demo puede evaluar el snapshot sintético canónico.

Live evalúa exclusivamente la evidencia recibida por NEXUS API. No:

- completa gaps con Demo;
- transforma compatibility fallback en clasificación resuelta;
- deduce source/lifecycle/taxonomy desde hostname, vendor o forma física;
- interpreta falta de evidencia como buen estado.

## 11. API

V02-019 no agrega un endpoint ornamental.

Primero se estabilizan:

```text
TechnologySnapshot
        ↓
MetricDefinition + MetricScope
        ↓
pure evaluation
        ↓
MetricResult
```

Un endpoint futuro sólo se agrega cuando exista un consumidor que justifique transportar resultados, preservando contract integrity y validación HTTP.

## 12. CMDB Health

V02-019 no modifica el significado de:

- score;
- pesos;
- findings;
- coverage histórica de CMDB Health.

V02-020 debe decidir qué reglas se conservan, cuáles cambian y cómo se proyectan sobre el nuevo contrato sin llamar Device Health a calidad de CMDB.

## 13. Invariantes probadas

La suite de `analytics.test.ts` cubre:

- IDs únicos y definiciones data-only;
- count sin denominator artificial;
- value separado de coverage;
- lifecycle unknown como valor conocido;
- source missing como resultado medible;
- compatibility taxonomy fuera de dimensiones analíticas;
- source instance identity;
- dimensiones no permitidas;
- población vacía;
- normalización determinista;
- no mutación del snapshot.

## 14. Handoff

### V02-020 — CMDB Quality 2.0

Puede reutilizar:

- MetricDefinition;
- MetricResult;
- scope/dimensiones;
- measurement coverage.

No debe reutilizar automáticamente los pesos de v0.1 sin decisión explícita.

### V02-021 — Lifecycle & Investment

Debe definir ventanas 3/6/12/24 meses sobre contratos temporales explícitos. V02-019 sólo soporta `timeBasis=snapshot`; window semantics deberán agregarse de forma deliberada.

### V02-022 — IT / OT Intelligence

Puede reutilizar dimensiones gobernadas y ratios sin redefinir qué significa unknown o coverage.
