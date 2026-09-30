# ADR-0026 — Lifecycle Evidence & Planning

Estado: **Propuesto en V02-021 / issue #105**.

## Contexto

`TechnologyAsset.lifecycle` ya expresa el estado actual del CI. Usar ese campo para representar compra, garantía, EOL, EOS, edad o reemplazo mezclaría estado con temporalidad.

El modelo canónico dispone de atributos extensibles y `ProvenanceRecord`, por lo que puede transportar hitos temporales sin ampliar `TechnologySnapshot schema 0.2`.

El dataset Demo histórico posee `demo.warrantyEnds`, mientras que el provider GLPI Live actual no ofrece suficiente evidencia contractual para EOL/EOS/reemplazo. Inferir esas fechas a partir de fabricante/modelo introduciría afirmaciones no defendibles.

Tampoco existe una política corporativa de vida útil, precios o presupuesto que permita convertir estos hitos en una cifra de inversión.

## Decisión

1. **Mantener `TechnologyAsset.lifecycle` como estado actual.**
2. **Representar hitos temporales como atributos canónicos gobernados** bajo `nexus.lifecycle.*`.
3. **Exigir provenance exacto para considerar un hito conocido.** Una fecha válida sin provenance es `unverified`, no `known`.
4. **Separar disponibilidad/calidad de evidencia de posición temporal.** Missing, invalid y unverified no equivalen a fuera de ventana.
5. **Usar 3/6/12/24 meses calendario desde `snapshot.asOf`.** No aproximar con cantidades fijas de días.
6. **Calcular edad sólo desde commissioned o purchase conocidos**, prefiriendo commissioned.
7. **Autorizar hitos sintéticos en Demo** con provenance explícito para ejercitar la experiencia de producto.
8. **No fabricar hitos en Live.** El provider puede mostrar cobertura parcial o unavailable sin fallback a Demo.
9. **Interpretar Investment como planning boundary en V02-021.** No producir CAPEX, precios, presupuesto ni recomendación de gasto sin fuentes corporativas.
10. **Mantener Lifecycle separado de CMDB Quality y Device Health.**
11. **No adelantar V02-022.** Las vistas especializadas IT/OT quedan fuera de esta decisión.

## Attribute keys gobernadas

- `nexus.lifecycle.purchaseAt`;
- `nexus.lifecycle.commissionedAt`;
- `nexus.lifecycle.warrantyEndAt`;
- `nexus.lifecycle.eolAt`;
- `nexus.lifecycle.eosAt`;
- `nexus.lifecycle.replacementTargetAt`.

## Semántica de evidence state

- `known`: ISO válido + provenance;
- `unavailable`: valor ausente;
- `invalid`: valor presente pero timestamp inválido;
- `unverified`: timestamp válido sin provenance.

## Consecuencias

### Positivas

- la planificación puede explicar exactamente qué sabe y qué no sabe NEXUS;
- Demo y Live comparten contrato sin falsear cobertura;
- los hitos pueden provenir de GLPI, Intune, manual/import u otra fuente futura sin reescribir la UI;
- edad no depende de reglas tácitas;
- una futura capa financiera podrá apoyarse en evidencia lifecycle sin confundirse con ella.

### Costos

- muchas fuentes Live pueden comenzar con cobertura baja;
- mantener provenance por hito agrega disciplina de ingestión;
- EOL/EOS reales requerirán una fuente defendible antes de ser útiles a escala.

## Rechazado

- reutilizar `TechnologyAsset.lifecycle` como fecha;
- inferir EOL/EOS por fabricante/modelo;
- asumir vida útil estándar;
- convertir falta de fecha en “fuera de riesgo”;
- usar 90/180/365/730 días como equivalentes de 3/6/12/24 meses;
- fallback Live → Demo;
- construir un presupuesto sintético;
- adelantar V02-022.

## Relación con otros ADR

- ADR-0011: Canonical Technology Model;
- ADR-0014: Provider Mode Contract;
- ADR-0019: Provenance & Reconciliation;
- ADR-0024: Analytics Contract Layer;
- ADR-0025: CMDB Quality 2.0.

## Documentos

- `docs/product/lifecycle-investment-v2.md`;
- `docs/roadmap-v0.2.md`.
