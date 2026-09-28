# ADR-0025 — CMDB Quality 2.0

Estado: **Propuesto en V02-020 / PR #103 / issue #102**. Se considera aceptado únicamente tras merge manual a `main`.

## Contexto

CMDB-011 introdujo un score explicable sobre cinco dimensiones de la proyección Web: completitud, frescura, identidad, relaciones y consistencia.

Desde V02-009 el modelo canónico posee `SourceReference`, `ProvenanceRecord` y reconciliation explícita. V02-010 agregó Taxonomy v2 con estado `conflict`. V02-019 formalizó `MetricDefinition`, `MetricResult` y measurement coverage.

Incorporar estas señales dentro del score histórico mediante pesos nuevos sería una decisión arbitraria: no existe una política corporativa que determine cuánto debe pesar provenance frente a completitud, identidad o frescura.

Además, `AttributeConflict` existe en reconciliation pero no forma parte de `TechnologySnapshot` schema 0.2, por lo que la Web no dispone de ese resultado de forma contractual.

## Decisión

1. **Conservar el score histórico de CMDB Health.** V02-020 no modifica las cinco dimensiones, pesos, thresholds ni fórmula de CMDB-011.
2. **Agregar evidencia canónica como métricas complementarias**, reutilizando el Analytics Contract Layer:
   - `nexus.sources.instance_identity.ratio`;
   - `nexus.quality.provenance.core_fields.ratio`;
   - `nexus.quality.taxonomy.conflict.ratio`.
3. **Gobernar provenance sobre seis field paths canónicos obligatorios:** `displayName`, `domain`, `assetClass`, `role`, `lifecycle` y `criticality`.
4. **Separar value de measurement coverage.**
   - source instance ausente es un resultado de calidad medible, no falta de medición;
   - provenance ausente para un field path reduce el value, porque `provenance` es parte observable del asset canónico;
   - taxonomy ausente reduce measurement coverage y no se interpreta como “sin conflicto”.
5. **Agregar findings por CI** para source instance ausente, provenance incompleto y taxonomy conflict. Estos findings explican qué revisar pero no alteran el score histórico en V02-020.
6. **No reconstruir `AttributeConflict` en la Web.** Hasta que un contrato lo transporte, se presenta como unavailable.
7. **Alinear Demo y Live.** `InventorySnapshot.canonical` conserva el snapshot canónico en ambos modos. Demo utiliza `sourceInstanceId=demo-v0.2`; Live conserva la identidad de instancia entregada por sus adapters.
8. **Mantener CMDB Quality separado de Device Operational Health.** No se usan CPU, RAM, batería, SMART, uptime, eventos Windows ni telemetría endpoint.
9. **No implementar remediación automática.** Los findings producen explicación y revisión humana, no acciones sobre GLPI, Jira o endpoints.

## Semántica de métricas

### Source instance identity

`SourceReference` ya es obligatoria en un `TechnologyAsset` válido. Por tanto, la métrica no pregunta si existe una fuente, sino si todas sus referencias poseen una identidad lógica de instancia.

### Provenance core fields

Para cada asset existen seis slots gobernados.

`value = slots con provenance / slots gobernados`

El denominator global es `6 × assets scoped`. Un asset con array de provenance vacío produce value 0 para esos slots, con measurement coverage conocida.

### Taxonomy conflict

`value = assessments con conflict / assessments disponibles`

`measurement coverage = assessments disponibles / assets elegibles`

Si ningún assessment está disponible, value es `null` y coverage es unavailable.

## Consecuencias

### Positivas

- la evidencia canónica llega a Data Quality sin reescribir el score histórico;
- value/coverage conservan la semántica de V02-019;
- gaps de evidence no se disfrazan de errores operacionales;
- taxonomy conflict sólo aparece cuando existe evidencia contractual explícita;
- Demo y Live comparten la misma frontera de datos;
- el diseño deja espacio para transportar conflictos de reconciliación en una versión posterior.

### Costos

- existen dos conceptos visibles: score histórico y métricas de evidencia canónica;
- provenance core fields es un conjunto gobernado que deberá versionarse si cambia;
- conflictos de reconciliación permanecen incompletos en la UI hasta ampliar el contrato.

## Rechazado

- añadir un peso arbitrario de provenance/source al score;
- interpretar falta de taxonomy como “sin conflictos”;
- reconstruir conflictos comparando valores en React;
- usar compatibility projection como evidencia de taxonomy resuelta;
- fallback Live → Demo;
- mezclar Data Quality con Device Health;
- ejecutar remediation automáticamente.

## Relación con otros ADR

- ADR-0009: CMDB Health histórico;
- ADR-0019: Provenance & Reconciliation;
- ADR-0020: IT/OT Taxonomy v2;
- ADR-0022: Relationship Evidence v2;
- ADR-0024: Analytics Contract Layer.

## Documentos

- `docs/cmdb-health.md`;
- `docs/analytics/metric-contract.md`;
- `docs/roadmap-v0.2.md`.
