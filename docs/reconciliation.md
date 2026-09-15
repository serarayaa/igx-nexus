# Provenance & Reconciliation — V02-009

## Propósito

V02-009 formaliza la capa de reconciliación multisource de IGX NEXUS. Su objetivo no es convertir NEXUS en otra CMDB, sino permitir que el Intelligence Layer evalúe evidencia proveniente de múltiples sistemas y explique de forma determinista por qué dos registros se consideran el mismo activo, activos distintos, un caso ambiguo o un conflicto.

El principio rector es:

> **Evidence before inference.**

Ante evidencia insuficiente, NEXUS prefiere no fusionar automáticamente. Un falso negativo puede revisarse posteriormente; un falso positivo puede contaminar identidad, relaciones, analítica y decisiones operacionales posteriores.

## Límites de arquitectura

```text
NEXUS Web
   ↓
NEXUS API
   ↓
TechnologyProvider / Reconciliation Layer
   ↓
Adapters / Integrations
   ↓
GLPI / futuras fuentes
```

- GLPI continúa como System of Record CMDB/ITAM.
- NEXUS continúa como Intelligence Layer.
- Los adapters traducen fuentes; no contienen reglas propias de matching multisource.
- La Web no conoce GLPI ni reglas de reconciliación.
- V02-009 no integra Intune real ni añade endpoints HTTP sólo para demostrar el dominio.

## Flujo de reconciliación

La implementación se concentra en `services/api/src/reconciliation.ts` y sigue cinco pasos conceptuales:

1. **Candidate discovery**: identifica candidatos únicamente cuando existe alguna señal comparable exacta.
2. **Evidence evaluation**: clasifica y evalúa evidencia sin usar fuzzy matching ni puntuaciones opacas.
3. **Matching decision**: produce una decisión explícita y versionada.
4. **Conflict detection**: conserva contradicciones tanto de identidad como de atributos.
5. **Canonical projection**: sólo ante un match automático único, proyecta los claims sobre el activo canónico existente sin cambiar su `id`.

Los contratos compartidos y sus validadores viven en `packages/types/src/reconciliation.ts`.

## Clasificación de identificadores

La clasificación V02-009 es explícita y conservadora:

| Clasificación | Identificadores | Comportamiento |
| --- | --- | --- |
| Fuerte | `serial_number`, `hardware_uuid`, `bios_uuid`, `imei` | Un match exacto puede sostener auto-match si no existe contradicción fuerte. |
| Auxiliar | `asset_tag`, `mac_address`, `custom:*` | Sirve para candidate discovery, pero por sí solo requiere revisión manual. |
| Volátil | `ip_address` | Nunca auto-fusiona; sólo aporta contexto/candidato. |
| Insuficiente por sí solo | `hostname` | Nunca auto-fusiona; igualdad exacta requiere evidencia adicional. |
| Referencia fuente exacta | mismo `SourceReference` lógico | Se considera evidencia fuerte de que dos representaciones refieren al mismo registro upstream. |

Los valores se comparan de manera exacta después de normalizar espacios y casing. No se utiliza similitud fonética, distancia Levenshtein, IA ni heurísticas probabilísticas.

## Reglas de identidad

Para un par incoming/candidate:

- evidencia fuerte coincidente y **sin** contradicción fuerte → `matched`;
- evidencia fuerte coincidente **y** contradicción fuerte → `conflict`;
- contradicción fuerte sin evidencia fuerte coincidente → `not_matched`;
- sólo evidencia auxiliar/volátil/hostname → `manual_review_required`;
- sin evidencia comparable → no se descubre candidato y la ejecución termina `not_matched`;
- más de un candidato con match fuerte → `ambiguous`;
- más de un candidato débil plausible → `ambiguous`.

### Caso deliberadamente prohibido

```text
hostname A == hostname B
→ automatic merge
```

Ese comportamiento no existe en V02-009. `hostname` sólo puede producir una señal insuficiente y, como máximo, llevar el caso a revisión manual.

## Explicabilidad

`ReconciliationDecision` conserva:

- tipo de decisión;
- activo incoming;
- candidatos evaluados;
- candidato matched cuando corresponde;
- versión de reglas;
- timestamp de evaluación;
- evidencia por candidato;
- razones textuales deterministas.

La evidencia explica el **tipo** de señal, no copia el valor sensible del identificador dentro de razones o errores. Por ejemplo:

```text
Decision: MATCHED
Reasons:
- exact strong evidence identifies one canonical candidate
Evidence:
- exact serial_number match
- exact hardware_uuid match
```

Los valores reales permanecen en los objetos de dominio protegidos que ya los contienen; no se duplican innecesariamente en mensajes de diagnóstico.

## Determinismo

La misma entrada lógica debe producir la misma decisión. Para ello:

- candidatos se ordenan por `TechnologyAsset.id` antes de serializar la salida;
- evidencia se ordena mediante claves estables;
- source references e identificadores de una proyección se ordenan/deduplican de forma determinista;
- el orden del array de candidatos no actúa como tie-breaker;
- no existe random, fuzzy matching ni llamada externa durante el matching.

## Identidad canónica

`TechnologyAsset.id` no es un identificador observable y no se reemplaza por hostname, serial, GLPI id, Intune id ni por el orden de las fuentes.

V02-009 separa dos conceptos:

- **matching**: decidir si un registro nuevo corresponde a un activo canónico ya existente;
- **identity assignment**: cómo se creó inicialmente el id canónico.

La proyección `projectCanonicalAsset(anchor, matchedRecords)` conserva **siempre** `anchor.id`. Por lo tanto, incorporar una nueva fuente, cambiar hostname/IP o cambiar atributos no identificadores no re-keyea el activo.

El adapter GLPI heredado de V02-005 conserva su estrategia de identidad inicial namespaced para no romper V02-008. V02-009 no reutiliza ese mecanismo para recalcular la identidad después de reconciliar nuevas fuentes.

## Claims y provenance por atributo

Un valor canónico no borra silenciosamente claims alternativos. `AttributeResolution` conserva:

- `fieldPath`;
- todos los `AttributeClaim` considerados;
- valor y claim seleccionados;
- regla de selección;
- conflicto, cuando existe.

Cada `AttributeClaim` puede conservar:

- valor;
- fuente y registro fuente;
- `observedAt`;
- `ingestedAt` si existe;
- autoridad;
- confidence si ya existe evidencia explícita para ella;
- evidence references.

La proyección canónica además fusiona los `ProvenanceRecord` y source references de las representaciones reconciliadas. El envelope `CanonicalProjectionResult` es la evidencia auditable de la decisión de atributo y debe preservarse cuando V02-009 se conecte a una futura persistencia/historial.

## Políticas de atributo

La autoridad no significa que una fuente gane todos los campos. Las políticas están centralizadas en el motor:

### Management

Aplicada a campos como `displayName`, lifecycle, criticality, owner, location y atributos `management.*`.

Prioridad de dimensión:

1. fuente según política de management;
2. autoridad;
3. recencia.

La política deja preparado el caso en que GLPI sea mejor autoridad de asset management sin convertir ese supuesto en un `if source === "glpi"` disperso.

### Technical

Aplicada a manufacturer/model y atributos `hardware.*`, `os.*`, `technical.*`, `health.*` y compliance.

Prioridad de dimensión:

1. fuente técnica según política central;
2. autoridad;
3. recencia.

Esto permite que una fuente técnica futura pueda superar una observación CMDB en atributos técnicos concretos sin alterar políticas de ownership o lifecycle.

### Taxonomy

`domain`, `assetClass` y `role` usan autoridad sin incorporar todavía una prioridad entre GLPI/Intune. La taxonomía IT/OT completa pertenece a V02-010 y no se adelanta en este ticket.

### Default

Para atributos no clasificados: autoridad y luego recencia.

## Conflictos de atributos

Cuando dos claims válidos tienen valores incompatibles:

- si la política produce un ganador inequívoco, el conflicto queda `resolved`, se selecciona el claim preferido y se conserva el alternativo;
- si la política empata entre valores incompatibles, el conflicto queda `unresolved` y se preserva el valor del activo canónico existente en vez de escoger arbitrariamente según el orden de entrada.

La contradicción nunca se elimina silenciosamente.

## Autoridad y recencia

`AuthorityLevel` continúa usando:

```text
authoritative > trusted > observed > inferred > unknown
```

pero **sólo cuando la política del atributo utiliza esa dimensión**.

La recencia actúa después de las dimensiones anteriores. Una observación nueva no gana automáticamente un atributo si la política considera antes una fuente o nivel de autoridad más apropiado.

## Seguridad y privacidad

- fixtures V02-009 son sintéticos y se identifican mediante `SYNTH-*`;
- no se copió inventario real del Live Lab;
- razones de matching no contienen valores crudos de serial/UUID/MAC/IMEI/hostname/IP;
- errores del motor entregan un mensaje genérico + códigos de validación, no payloads ni identificadores;
- el motor no escribe logs;
- no se añadieron secretos ni credenciales;
- no se introdujeron dependencias nuevas.

El addendum de amenazas específico está en `docs/security/threat-model-v02-009-reconciliation-addendum.md`.

## Reversibilidad y revisión manual futura

V02-009 no implementa una UI de revisión manual, pero evita bloquearla:

- las decisiones son estructuras explícitas y versionadas;
- el motor distingue `manual_review_required`, `ambiguous` y `conflict`;
- claims y evidencia alternativa no se pierden;
- la proyección sólo ocurre automáticamente para un match fuerte único;
- el `TechnologyAsset.id` existente se conserva.

Una implementación futura podrá persistir el historial de decisiones y aplicar una decisión humana sin necesitar reconstruir evidencia desde logs.

## Tests contractuales

La matriz automatizada cubre, entre otros:

- serial/UUID fuertes coincidentes;
- hostname igual con serial distinto;
- hostname-only;
- identificadores auxiliares parciales;
- contradicción fuerte;
- dos candidatos fuertes y dos candidatos débiles;
- falta de identificadores;
- duplicate source references;
- exact source-reference matching;
- IP como señal volátil;
- orden de entrada determinista;
- claims iguales/diferentes multisource;
- autoridad, recencia e inferred vs observed;
- conflicto resuelto y no resuelto;
- no pérdida de provenance;
- estabilidad de canonical id;
- rechazo de contratos inválidos;
- no exposición de valores sensibles en decisiones/errores.

`@igx-nexus/types` ejecuta ahora todos los `src/*.test.ts`, de modo que los contract tests V02-009 forman parte efectiva de CI.

## Fuera de alcance

V02-009 no incorpora:

- Intune real;
- persistencia completa de historial de reconciliación;
- UI de revisión manual;
- Asset Explorer 2.0 / Asset 360 2.0;
- Dashboard / Technology Map 2.0;
- Device Health;
- taxonomy IT/OT v2;
- deployment corporativo.
