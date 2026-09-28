# ADR-0024 — Analytics Contract Layer

Estado: **Aceptado tras V02-019 / PR #99 / issue #96**.

## Contexto

V02-015..018 introdujeron Overview, Explorer, Asset 360 y Technology Map 2.0 evitando deliberadamente consolidar KPIs, scores o analytics ambiguos.

El producto ya contiene hechos descriptivos, facet counts y un motor histórico de CMDB Health, pero esas capacidades no comparten un contrato formal de:

- población;
- numerador/denominador;
- unidad;
- temporalidad;
- coverage;
- scope/dimensiones;
- unknown/unavailable.

Sin una frontera común, V02-020..022 podrían redefinir localmente los mismos conceptos y producir resultados incompatibles.

## Decisión

NEXUS implementará un **Analytics Contract Layer en TypeScript dentro de `@igx-nexus/types`**, evaluado inicialmente sobre `TechnologySnapshot`.

La capa separa:

```text
MetricDefinition
MetricScope
MetricResult
MetricCoverage
```

Principios:

1. value y measurement coverage son conceptos independientes;
2. count no recibe un denominator artificial;
3. ratio usa unidad base `1`;
4. unknown no se convierte en zero;
5. empty population produce unavailable, no un porcentaje engañoso;
6. dimensiones Taxonomy sólo usan assessments resueltos;
7. source dimension preserva `sourceInstanceId`;
8. cada métrica gobierna qué dimensiones admite;
9. definitions son data-only;
10. evaluación es pura y no muta `TechnologySnapshot`.

## Métricas iniciales

- `nexus.inventory.assets.count`;
- `nexus.taxonomy.resolved.ratio`;
- `nexus.sources.instance_identity.ratio` — cobertura de namespace lógico de fuentes tras AUD-DATA-002;
- `nexus.lifecycle.known.ratio`.

Estas métricas prueban el contrato; no constituyen todavía CMDB Quality 2.0, Lifecycle & Investment ni IT/OT Intelligence.

## CMDB Health existente

El motor histórico de `apps/web/src/health-engine.ts` no se migra silenciosamente.

V02-020 mantiene ownership de:

- reglas;
- pesos;
- thresholds;
- findings;
- significado del score;
- integración futura con el contrato analítico.

## Tecnología

Se adoptan convenciones de OpenTelemetry y Prometheus como referencia de naming/unidades, pero no se incorporan sus runtimes.

Open Semantic Layer / MetricFlow y Cube quedan **Hold** porque NEXUS no posee hoy un warehouse/SQL semantic use case que justifique otro servicio.

## Consecuencias

### Positivas

- V02-020..022 comparten semántica;
- UI/API pueden mostrar denominadores y coverage de forma consistente;
- Demo/Live usan las mismas definiciones;
- uncertainty permanece visible;
- no se agrega infraestructura operativa.

### Costos

- las métricas existentes de Web no quedan migradas automáticamente;
- time windows distintas de snapshot requieren extensión posterior;
- dimensiones nuevas deben gobernarse explícitamente.

## Rechazado

- dashboard-first metrics;
- score compuesto genérico;
- semantic service nuevo;
- warehouse/TSDB en V02-019;
- convertir compatibility taxonomy en clasificación;
- agrupar instancias de una fuente perdiendo `sourceInstanceId`;
- migrar CMDB Health como cambio incidental.

## Relación con otros ADR

- ADR-0011: modelo canónico Technology Intelligence;
- ADR-0019: provenance/reconciliation;
- ADR-0020: Taxonomy v2;
- ADR-0022: Relationship Evidence v2;
- ADR-0023: Product Information Architecture v2.

## Documentos

- `docs/analytics/metric-contract.md`;
- `docs/product/technology-scan-v02-019.md`.
