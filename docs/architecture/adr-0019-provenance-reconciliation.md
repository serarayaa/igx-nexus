# ADR-0019 — Provenance & Reconciliation

Estado: **Aceptado — V02-009 integrado mediante PR #64**.

## Contexto

V02-008 demostró el primer vertical Live completo de IGX NEXUS:

```text
endpoint autorizado → GLPI Agent → GLPI → NEXUS API → NEXUS Web
```

La siguiente frontera arquitectónica es multisource. Un mismo activo tecnológico puede aparecer en GLPI, Intune, una importación o una fuente manual con identificadores y atributos parcialmente coincidentes, ausentes o contradictorios.

Sin una política explícita, NEXUS podría caer en dos errores peligrosos:

1. fusionar registros diferentes por una señal débil como hostname;
2. sobrescribir información válida de una fuente con otra sin conservar evidencia ni explicar la selección.

V02-009 debe resolver ese problema sin convertir NEXUS en una segunda CMDB ni adelantar la integración real de Intune.

## Decisión

### 1. Reconciliation Layer explícito

Las reglas multisource se concentran en una capa de dominio identificable y testeable dentro de NEXUS API. Los adapters no deciden por sí solos qué registros se fusionan.

El flujo conceptual es:

```text
candidate discovery
→ evidence evaluation
→ matching decision
→ conflict detection
→ canonical projection
```

La implementación es pura y determinista: no usa IA, fuzzy matching, red, random ni puntuaciones opacas.

### 2. Evidence before inference

La política general favorece **no fusionar** cuando la evidencia no es suficiente.

- `serial_number`, `hardware_uuid`, `bios_uuid` e `imei` se tratan como identificadores fuertes.
- `asset_tag`, `mac_address` y `custom:*` son auxiliares y requieren corroboración para auto-match.
- `ip_address` es volátil.
- `hostname` es insuficiente por sí solo.
- una referencia lógica exacta al mismo registro fuente constituye evidencia fuerte sólo cuando incluye `sourceInstanceId`; referencias legacy sin instancia quedan como evidencia insuficiente.

La clasificación anterior describe la fuerza potencial del **tipo** de identificador. Desde AUD-DATA-001, la reconciliación aplica además un gate de calidad al **valor**: placeholders conocidos y valores degenerados se conservan en el activo como evidencia observada, pero se excluyen de supporting y contradicting identity evidence. Esto evita tanto falsos matches como falsos conflictos sin descartar el dato de origen.

La identidad lógica de una referencia fuente se define por `source + sourceInstanceId + sourceScope + entityType + externalId`. `sourceInstanceId` es opcional en el contrato 0.2 para poder leer evidencia histórica, pero los providers Live deben emitirlo. Dos instalaciones distintas que reutilicen el mismo ID local no pueden compartir `sourceReferenceKey`.

Un hostname idéntico nunca produce auto-merge en ausencia de otra evidencia fuerte.

### 3. Decisiones explícitas y auditables

La reconciliación produce contratos estructurados equivalentes a:

- `matched`;
- `not_matched`;
- `ambiguous`;
- `conflict`;
- `manual_review_required`.

Cada decisión conserva la versión de reglas, timestamp, candidatos, evaluación por candidato, evidencia clasificada y razones deterministas.

Los mensajes de explicación describen la clase de evidencia, pero no duplican valores crudos de identificadores sensibles.

### 4. Identidad canónica estable

`TechnologyAsset.id` sigue representando identidad NEXUS y no es reemplazado por hostname, serial, IDs de GLPI/Intune ni por una combinación calculada de fuentes.

V02-009 separa **matching** de **identity assignment**. Cuando un registro nuevo se reconcilia contra un activo canónico existente, la proyección preserva siempre el `id` del activo ancla.

Consecuentemente, la identidad no cambia porque:

- cambie hostname;
- cambie IP;
- se reordenen fuentes;
- llegue una fuente adicional;
- cambie un atributo no identificador.

El adapter GLPI de V02-005 conserva por compatibilidad su estrategia inicial namespaced/determinista para registros nacidos desde esa fuente. V02-009 no utiliza esa función para re-keyear activos después de reconciliarlos y no rompe el vertical V02-008.

### 5. Claims y provenance por atributo

La selección de un valor canónico no elimina claims alternativos. La reconciliación introduce contratos de `AttributeClaim`, `AttributeResolution` y `AttributeConflict` que preservan:

- field path;
- valor;
- source/source record;
- observedAt;
- ingestedAt cuando exista;
- authority;
- confidence únicamente cuando ya es evidencia explícita;
- evidence references;
- regla de selección.

La proyección fusiona además los `ProvenanceRecord` existentes para que las fuentes reconciliadas sigan visibles en el activo canónico.

### 6. Conflictos visibles

Dos claims incompatibles no se silencian.

- Si una política explícita tiene un ganador inequívoco, el conflicto queda `resolved`, pero el claim perdedor se conserva.
- Si la política empata, el conflicto queda `unresolved` y se preserva el valor canónico preexistente en vez de decidir por orden de entrada.

En identidad, evidencia fuerte coincidente junto con evidencia fuerte contradictoria produce `conflict`, no auto-merge.

### 7. Políticas centralizadas por atributo

No existe un árbol disperso de `if source === ...`.

Las políticas se centralizan por familias de atributo:

- **management**: prioridad de fuente definida, luego autoridad y recencia;
- **technical**: prioridad de fuente técnica, luego autoridad y recencia;
- **taxonomy**: autoridad sin adelantar V02-010;
- **default**: autoridad y luego recencia.

`authoritative` no gana necesariamente todos los atributos, y una observación más nueva tampoco gana automáticamente todo.

### 8. Ambigüedad permanece ambigua

Dos candidatos con evidencia fuerte suficiente no se resuelven arbitrariamente: el resultado es `ambiguous`.

Dos candidatos plausibles sólo por señales débiles también permanecen `ambiguous`.

La UI de revisión humana no pertenece a este ticket, pero los contratos dejan el caso listo para una futura decisión manual sin perder evidencia.

### 9. Seguridad de evidencia

Los errores del motor usan mensajes genéricos y códigos de validación. No contienen valores de serial, UUID, MAC, IMEI, hostname o IP.

Los tests utilizan únicamente fixtures sintéticos. No se reutiliza inventario real del Live Lab.

## Alternativas evaluadas

### Fusionar por hostname

**Rechazada.** Hostname puede cambiar, reutilizarse, duplicarse o representar convenciones operativas; no es identidad suficiente.

### Score de confianza opaco

**Rechazado.** Una puntuación agregada escondería qué evidencia provocó la unión. V02-009 usa reglas discretas y explicables.

### Fuzzy matching / IA

**Rechazado.** Introduce no determinismo, falsos positivos difíciles de auditar y una dependencia innecesaria para identidad CMDB.

### “Última fuente gana”

**Rechazada.** Recencia no equivale a autoridad semántica y puede degradar ownership, lifecycle u otros campos de gestión.

### “GLPI siempre gana”

**Rechazada.** GLPI es System of Record de CMDB/ITAM, pero otras fuentes futuras pueden ser mejor evidencia para estado técnico específico. La autoridad se modela por atributo.

### Convertir directamente el ID fuente en ID NEXUS

**Rechazada.** Acoplaría la identidad pública al proveedor y dificultaría reconciliar múltiples sistemas.

### Rediseñar `TechnologyAsset` y V02-008 por completo

**Rechazado.** V02-009 es aditivo; preserva el snapshot y vertical Live existente y encapsula la información adicional en contratos de reconciliación.

## Consecuencias positivas

- matching determinista y reproducible;
- hostname no puede provocar falsos merges automáticamente;
- conflictos quedan visibles;
- provenance por atributo es auditable;
- autoridad/recencia se vuelven políticas explícitas;
- el id canónico existente permanece estable;
- queda una base segura para Intune y otras fuentes futuras;
- la futura revisión manual puede construirse sobre decisiones estructuradas.

## Costos y límites

- V02-009 no persiste aún un historial durable de decisiones; el `CanonicalProjectionResult` define el artefacto que una capa futura deberá almacenar.
- La lista de identificadores fuertes es conservadora y deberá revisarse por tipo de activo al crecer IT/OT; no se asume que toda señal tiene igual confiabilidad en todas las taxonomías.
- La lista de placeholders es deliberadamente conservadora y versionada con las reglas de reconciliación; ampliarla requiere casos reproducibles para no descartar identificadores reales por heurística excesiva.
- La política de fuentes prepara Intune, Windows, Defender y Dell conceptualmente sin integrar esos sistemas.
- El adapter GLPI conserva la asignación inicial de identidad implementada en V02-005 por compatibilidad; una futura capa de persistencia podrá formalizar la creación de nuevos IDs canónicos sin re-keyear activos existentes.
- No existe todavía UI de revisión manual ni API pública de reconciliación.
- La taxonomía IT/OT completa queda en V02-010.

## Reversibilidad

La decisión evita colapsar evidencia destructivamente. Claims alternativos, conflictos, source references y provenance se conservan, por lo que una futura decisión humana puede corregir una resolución sin depender de reconstruir la historia desde logs.

## Validación

V02-009 incorpora tests contractuales y unitarios para matching fuerte/débil, contradicciones, ambigüedad, orden de entrada, políticas de atributo, recencia, autoridad, provenance, estabilidad del id, validación y no exposición de identificadores sensibles.

V02-009 quedó integrado mediante PR #64 en el merge `209c400f88f556975e525f99b9977cd00e8957be`; la CI post-merge #361 quedó verde. Con esos gates satisfechos, este ADR queda formalmente **Aceptado**.
