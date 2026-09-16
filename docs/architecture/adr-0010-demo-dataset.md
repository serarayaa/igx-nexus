# ADR-0010 — Catálogo sintético único y escenarios de demo

Estado: **Aceptado históricamente en CMDB-012; supersedido arquitectónicamente por ADR-0021 desde V02-011.**

Integración original: PR #32 (`9afb26d`).

## Contexto histórico

CMDB-006 a CMDB-011 compartían inventario, pero el fixture preliminar mezclaba ciclos uniformes y relaciones con cortes separados. CMDB-012 necesitaba escenarios intencionales, identidad estable entre vistas y pruebas de integridad sin crear integración GLPI prematura.

## Decisión original

Concentrar inventario y relaciones en `apps/web/src/demo-dataset.ts`, combinando 24 activos declarativos con 216 activos de cohortes tipadas y rangos de ID explícitos.

La decisión estableció:

- 240 IDs estables;
- corte fijo;
- snapshots reproducibles;
- cero aleatoriedad;
- 11 escenarios hero;
- componentes pequeños de relaciones;
- Health calculado desde datos, no scores prefijados;
- tests de integridad y digest.

## Alternativas rechazadas en v0.1

- JSON completo de 240 registros;
- generación uniforme sin héroes;
- Faker/aleatoriedad;
- importar el fixture a GLPI antes de contar con contratos/integración aprobada.

## Consecuencias históricas

La Web v0.1 obtuvo una única fuente de inventario, identidad estable y escenarios reproducibles. Los valores permanecieron sintéticos y nunca representaron distribución real de Innergex.

## Evolución en V02-011

La premisa de “fuente única” se mantiene, pero **la ubicación arquitectónica cambia**.

V02-011 detectó que mantener el catálogo autorado dentro de la Web y, paralelamente, un Demo Provider API distinto produciría drift. ADR-0021 migra la fuente a:

```text
packages/demo-data
```

Desde V02-011:

- `packages/demo-data` es la fuente autorada;
- NEXUS API Demo consume los 240 CIs canónicos;
- `apps/web/src/demo-dataset.ts` es un adapter temporal de presentación;
- API y Web comparten la misma fuente;
- los IDs, QR, métricas y escenarios v0.1 se preservan;
- las relaciones permanecen como fixtures compartidos hasta V02-012.

Esta ADR no se elimina porque explica por qué existen los rangos, héroes, digest y reglas de reproducibilidad originales.

Decisión vigente: [ADR-0021 — Demo Dataset canónico v0.2](adr-0021-canonical-demo-dataset-v02.md).

Detalles actuales: [Dataset de Demo](../demo-dataset.md).
