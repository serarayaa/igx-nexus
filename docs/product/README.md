# Product Design — IGX NEXUS

Este directorio contiene decisiones de **arquitectura de información, experiencia y lenguaje visual** del producto.

No reemplaza:

- los ADR técnicos de `docs/architecture/`;
- los contratos canónicos de `packages/types`;
- las definiciones métricas futuras de V02-019;
- los tickets de implementación de UI.

## V02-013 — Product IA & Visual Direction

Baseline de análisis:

`39615a759f29e2d6a4cc6766eaeb885c2193bfad`

Documentos:

- [Product Information Architecture v2](product-ia-v2.md)
- [Visual Direction v2](visual-direction-v2.md)
- [Screen Purpose Matrix](screen-purpose-matrix.md)
- [ADR-0023 — Product Information Architecture v2](../architecture/adr-0023-product-information-architecture-v2.md)

## Principios

1. Cada pantalla responde una pregunta operacional.
2. Demo y Live comparten arquitectura de producto.
3. Monitoreo y exploración/investigación son experiencias distintas.
4. Evidence before inference también debe ser visible en UI.
5. Data Quality no es Device Health.
6. Technology Map parte de foco/scope; no del universo completo.
7. Asset 360 organiza información por intención, no por cantidad de campos.
8. WCAG 2.2 AA es baseline.
9. La visualización se elige por la pregunta, no por moda ni por componente disponible.
10. V02-013 define dirección; V02-014..019 implementan y profundizan.

## Handoff

- V02-014 — Shell & Motion 2.0
- V02-015 — Technology Overview
- V02-016 — Asset Explorer 2.0
- V02-017 — Asset 360 2.0
- V02-018 — Technology Map 2.0
- V02-019 — Analytics Contract Layer

Los tickets siguientes deben tratar estos documentos como baseline de producto una vez que ADR-0023 sea aceptado mediante merge manual y CI post-merge verde.
