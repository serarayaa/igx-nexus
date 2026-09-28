# Technology Scan — V02-019 Analytics Contract Layer

Fecha de revisión: 2026-09-24.

## Objetivo

Evaluar si V02-019 necesita incorporar una tecnología OSS de semantic/metrics layer o si los contratos existentes de NEXUS pueden evolucionar de forma suficiente.

## Baseline

- React + Fastify + TypeScript monorepo;
- `@igx-nexus/types` ya contiene contratos canónicos y lógica pura de taxonomy/reconciliation;
- NEXUS API sirve `TechnologySnapshot`;
- no existe warehouse/OLAP/TSDB como requisito;
- v0.2 debe evitar infraestructura que complique traslado corporativo futuro.

## OpenTelemetry Semantic Conventions

Patrones útiles:

- naming consistente;
- namespacing;
- unidades explícitas;
- significado estable;
- evitar cambiar semántica de una misma métrica según consumer.

### Decisión

**Reference.**

No adoptar collector, OTLP ni OTel Metrics como backend de Technology Intelligence en este ticket.

## Prometheus naming/data model

Patrones útiles:

- una métrica debe representar una cantidad coherente;
- usar unidades base;
- labels/dimensiones controladas;
- evitar cardinalidad sin límites;
- ratio y count no deben compartir semántica.

### Decisión

**Reference.**

No introducir Prometheus, PromQL ni TSDB.

## Open Semantic Layer / MetricFlow

Patrones relevantes:

- metrics-as-code;
- definición central;
- dimensiones gobernadas;
- reutilización entre consumers.

Costo para NEXUS hoy:

- orientado a SQL/warehouse;
- añade planner/runtime que NEXUS no necesita;
- el input real de v0.2 es `TechnologySnapshot`, no tablas analíticas corporativas.

### Decisión

**Hold.**

Reevaluar sólo si una versión futura adopta warehouse/lakehouse y múltiples consumers SQL.

## Cube

Patrones útiles:

- semantic layer central;
- métricas reutilizables;
- dimensiones y pre-aggregations.

Costo actual:

- nuevo runtime/servicio;
- persistencia/caching/SQL assumptions;
- duplicaría una frontera que puede ser representada como TypeScript puro.

### Decisión

**Hold.**

## Implementación elegida

```text
@igx-nexus/types
├─ canonical model
├─ validation
├─ reconciliation
├─ taxonomy
└─ analytics   ← V02-019
```

El evaluador:

- es puro;
- no hace I/O;
- no necesita DB;
- no conoce React;
- no conoce Fastify;
- no muta snapshots;
- conserva uncertainty/coverage.

## OSS decision record

| Tecnología | Decisión | Motivo |
| --- | --- | --- |
| TypeScript contracts NEXUS | Adopt / Evolve | Ya es la frontera canónica compartida |
| OpenTelemetry conventions | Reference | Naming/unidades/semántica |
| Prometheus conventions | Reference | Ratio/count/labels y cardinalidad |
| Open Semantic Layer / MetricFlow | Hold | Requiere contexto SQL/warehouse no existente |
| Cube | Hold | Runtime semantic service no justificado |
| Prometheus / TSDB | Hold | No existe requisito de timeseries backend |
| Nueva chart library | Out | V02-019 no implementa visualizaciones |

## Gate futuro

Adoptar una semantic layer externa sólo si aparecen simultáneamente necesidades como:

- warehouse corporativo real;
- múltiples herramientas BI consumiendo las mismas métricas;
- SQL como interfaz analítica principal;
- gobernanza central fuera del runtime NEXUS;
- volumen que haga inviable evaluación snapshot in-memory.

Ninguna está demostrada en V02-019.
