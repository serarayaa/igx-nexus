# Threat Model Addendum — V02-010 IT/OT Taxonomy v2

Estado: **V02-010 / PR #67**. Complementa `threat-model-v0.2.md`; no sustituye el baseline general.

## Alcance

Este addendum cubre riesgos introducidos al transformar evidencia de inventario/múltiples fuentes en clasificación canónica `domain / assetClass / role / operationalContexts`.

Principio rector:

> **Evidence before inference también aplica a clasificación.**

Un scalar requerido por compatibilidad no debe confundirse con un assessment resuelto.

## Amenazas y mitigaciones

| Frontera | Amenaza | Estado V02-010 | Mitigación |
| --- | --- | --- | --- |
| GLPI → Taxonomy | `Computer` tratado automáticamente como IT | mitigado | `Computer` no determina dominio; Type ausente produce `unknown`; Type no mapeado produce `unclassified`; no se usa hostname/model/fabricante para adivinar |
| GLPI Type → Taxonomy | vocabulario configurable tratado como estándar universal | mitigado | aliases centralizados/gobernados; source Type preservado como evidencia; reglas explícitas con `ruleId` y `reviewRequired` |
| Taxonomy → consumidor legacy | scalar de compatibilidad presentado como verdad clasificada | mitigado durante migración | assessment no resuelto permanece intacto; `nexus.taxonomy.compatibilityProjection=true` y `projectionRuleId` visibles; V02-011 debe retirar el bridge |
| Multi-source → canonical projection | reconciliation elimina `taxonomy` o `operationalContexts` | mitigado | `projectCanonicalAsset()` preserva/reconstruye assessment y fusiona contextos de forma determinista |
| Multi-source taxonomy | claims IT/OT incompatibles resueltos arbitrariamente | mitigado | empate taxonómico no resoluble produce `state=conflict`, `reviewRequired=true`; claims alternativos permanecen en `AttributeResolution` |
| Legacy source → v2 projection | claim seleccionado sin assessment recibe una semántica inventada | mitigado | dimensión resultante queda `unclassified` con razón explícita |
| Provenance | claims obtenidos por métodos distintos colapsan durante deduplicación | mitigado | `ProvenanceRecord.derivation` participa en la clave estable de deduplicación |
| Context → class/role | Purdue/site/security zone se codifica como clase tecnológica | mitigado por contrato | `OperationalContextReference` separa `system`, `site`, `network_segment`, `security_zone`, etc. de `assetClass` y `role` |
| Adapter futuro | mappings duplicados/dispersos en UI/provider | mitigado por arquitectura | mapping vive en frontera centralizada; providers migrados deben pasar `validateTechnologySnapshotTaxonomy()` |
| Analytics/UI | métricas mezclan classified con inferred/unknown/fallback | pendiente de consumidores futuros | assessment expone `state`, `reviewRequired`, `method` y fallback; Asset Explorer/Analytics deberán facetarlos explícitamente |
| Manual override futuro | decisión humana sin historial/provenance | pendiente | V02-010 modela `method=manual`, pero persistencia/review UI queda fuera de alcance y debe diseñarse antes de automatizar overrides |

## Trust boundaries

```text
Upstream source vocabulary
        |
        v
Adapter parser
        |
        v
Central taxonomy mapping
        |
        +--> TechnologyTaxonomyAssessment (truth / uncertainty)
        |
        `--> temporary legacy scalar projection (compatibility only)
                      |
                      v
             Provider / Reconciliation
                      |
                      v
                 NEXUS API
```

La frontera crítica es entre **assessment** y **compatibility projection**. El segundo nunca debe modificar el primero.

## Controles de salida

Providers migrados a V02-010 ejecutan dos gates:

```text
validateTechnologySnapshot(snapshot)
validateTechnologySnapshotTaxonomy(snapshot)
```

La reconciliación además valida:

```text
validateAssetTaxonomyProjection(asset)
validateOperationalContextReference(context)
```

Una decisión `classified` debe coincidir con el scalar proyectado. `unknown`, `unclassified` y `conflict` pueden coexistir temporalmente con scalars legacy únicamente durante la migración documentada V02-010 → V02-011.

## Riesgos aceptados / deuda visible

- El bridge `IT / endpoint / user_endpoint` para consumers legacy puede ser visualmente engañoso si una UI ignora `taxonomy`; se acepta sólo hasta V02-011 y se marca explícitamente como fallback.
- El mapping inicial formaliza únicamente `Computer`; otros item types requieren reglas antes de clasificarse.
- Los aliases GLPI conocidos son reglas NEXUS y deberán gobernarse contra la configuración real de cada instancia.
- No existe aún persistencia/historial de revisión manual taxonómica.
- No existe active scanning OT y este ticket no habilita ninguna acción sobre equipos OT.

## Gate de cierre

Antes de integrar V02-010:

- CI completa verde;
- tests de missing/unmapped Type, IT/OT conflict y operational context verdes;
- sin secretos/datos corporativos reales;
- ADR-0020 y documentación coherentes con este addendum;
- merge manual a `main` únicamente después de revisión humana.
