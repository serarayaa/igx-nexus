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

## V02-014 — Shell & Motion 2.0

Baseline de implementación:

`02e297c15d367894ad7c4380333a9f2fe9780bbe`

Documentos:

- [Shell & Motion 2.0](shell-motion-v2.md)
- [Technology Scan V02-014](technology-scan-v02-014.md)

V02-014 materializa la IA global, source context, preferencias visuales, responsive y motion accesible sin adelantar Overview/Explorer/Asset 360/Technology Map 2.0.

## V02-015 — Technology Overview

Baseline de implementación:

`ccebc18d7440d338f59e0263cc38c5d42bd1afe4`

Documento:

- [Technology Overview](technology-overview-v2.md)

V02-015 transforma la home histórica en una superficie de triage que responde **¿Qué requiere atención ahora y por qué?**, comparte arquitectura Demo/Live y evita adelantar el contrato analítico de V02-019.

## V02-016 — Asset Explorer 2.0

Baseline de implementación:

`7d36a23e4e3773338955e038a2567b9f5d4526b3`

Documentos:

- [Asset Explorer 2.0](asset-explorer-v2.md)
- [Technology Scan V02-016](technology-scan-v02-016.md)

V02-016 evoluciona `#assets` hacia un workspace data-dense y multisource con facetas canónicas, counts contextuales y coverage explícita, sin adelantar Asset 360 2.0 ni Analytics Contract Layer.

## V02-017 — Asset 360 2.0

Baseline de implementación:

`229e1f57cf6a15c1d369af23a2bdc0db797b072f`

Documentos:

- [Asset 360 2.0 — plan y decisiones](asset-360-v2-plan.md)
- [Technology Scan V02-017](technology-scan-v02-017.md)

V02-017 reorganiza el detalle del CI por intención: **Resumen / Inventario / Evidencia y fuentes / Relaciones**. Mantiene Demo/Live con la misma IA, hace explícito taxonomy fallback y coverage, y separa calidad CMDB, freshness, lifecycle y futura salud técnica.

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

- V02-014 — Shell & Motion 2.0 — integrado
- V02-015 — Technology Overview — integrado
- V02-016 — Asset Explorer 2.0 — integrado
- V02-017 — Asset 360 2.0 — integrado
- V02-018 — Technology Map 2.0 — siguiente trabajo
- V02-019 — Analytics Contract Layer

ADR-0023 permanece como baseline normativo de Product IA. Cada ticket de implementación debe mantener sus límites de scope y preservar los principios de producto ya aceptados.
