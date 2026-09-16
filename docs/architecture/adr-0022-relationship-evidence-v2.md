# ADR-0022 — Relationship Evidence v2

Estado: **Aceptado — V02-012 / PR #73**. Merge manual `e174700cb5af944c622f4899d812eb9c6fb2c261`; CI post-merge #481 verde.

## Contexto

ADR-0011 definió `TechnologyRelationship` como un claim entre activos canónicos que requiere evidencia. V02-011 migró los 240 CIs de Demo al modelo canónico, pero preservó deliberadamente los 18 relationship fixtures fuera de `TechnologySnapshot.relationships` para no mezclar la migración de activos con la semántica de relaciones.

La Web v0.1 ya ejercita esos 18 fixtures en Technology Map y CMDB Health. Entre ellos existe un caso intencional, `DEMO-REL-013`, cuya relación es conocida dentro del fixture pero cuya fecha de observación no lo es. Sustituir esa ausencia por `snapshot.asOf` convertiría fecha de registro/corte en fecha del hecho y violaría **Evidence before inference**.

V02-012 debe hacer que Demo y NEXUS API compartan relaciones canónicas sin fabricar topología, temporalidad ni evidencia.

## Decisión

### 1. Una relación canónica es un claim respaldado por evidencia

Los 18 fixtures Demo pasan a ser `TechnologyRelationship` dentro de `packages/demo-data` y forman parte de `createCanonicalDemoSnapshot()`.

Cada relación conserva:

- ID estable;
- `sourceAssetId` y `targetAssetId` canónicos;
- tipo;
- dirección;
- estado;
- temporalidad conocida o desconocida;
- una o más evidencias.

La Web v0.1 deja de consumir una representación autorada paralela y proyecta desde el snapshot canónico mediante un adapter explícito.

### 2. Fecha de fuente y fecha de relación son conceptos distintos

`SourceReference.observedAt` conserva el instante en que la fuente/registro fue observado o incorporado al dataset.

`TechnologyRelationship.observedAt` expresa cuándo fue observada la relación representada.

Por lo tanto pueden diferir.

En Demo:

```text
source record observedAt = DEMO_AS_OF
relationship observedAt = fecha conocida de la relación | null
```

`null` significa **temporalidad desconocida**. No equivale a `snapshot.asOf`, `ingestedAt`, fecha actual ni cero.

La misma regla se aplica a `RelationshipEvidence.observedAt`.

### 3. Authority y derivation permanecen separados

`RelationshipEvidence` incorpora `derivation` usando los métodos gobernados ya presentes en el modelo:

```text
observed
normalized
inferred
manual
```

Esto no reemplaza `authority`.

Ejemplos:

- `authority=trusted`, `derivation=manual`: un registro confiable declara manualmente la relación;
- `authority=observed`, `derivation=observed`: una fuente produjo evidencia directa;
- `authority=inferred`, `derivation=inferred`: una relación futura calculada por una regla/algoritmo.

Una inferencia nunca debe publicarse como observación sólo porque su confidence sea alta.

### 4. Demo declara relaciones sintéticas, no observaciones corporativas

Las 18 relaciones Demo usan:

```text
source = demo
authority = trusted
derivation = manual
confidence = 1
kind = source_record
```

`confidence=1` significa confianza total en que **el fixture sintético declara ese claim**, no probabilidad de que exista una relación real en infraestructura de Innergex.

Cada relación referencia `demo-dataset:<relationship-id>` y queda identificada como `synthetic_relationship`.

No se inventan paquetes, flujos, puertos, protocolos, tickets, descubrimientos de red ni evidencia OT real.

### 5. Una relación canónica agrega evidencia; no se duplica por fuente

Dentro de un snapshot, dos edges con la misma semántica canónica no deben existir sólo porque provienen de fuentes distintas.

Para relaciones dirigidas, la identidad semántica considera:

```text
type + direction + sourceAssetId + targetAssetId
```

Para relaciones bidireccionales, el orden de endpoints no cambia la semántica:

```text
A connected_to B == B connected_to A
```

Los validadores reportan `snapshot.relationship_semantic_duplicate` y la futura reconciliación debe combinar evidencia sobre un único edge canónico cuando corresponda.

Esto no afirma que todo edge con endpoints iguales sea siempre equivalente: el `type` forma parte de la identidad semántica.

### 6. Endpoints no reconciliados siguen siendo visibles

Se conserva la decisión de ADR-0011: una relación cuyo endpoint no aparece en un snapshot importado genera warning y no se descarta silenciosamente.

Para el dataset Demo íntegro de V02-012, los 18 edges deben referenciar assets existentes, por lo que el snapshot esperado no contiene esos warnings.

### 7. Invariantes runtime

Además de los checks existentes, los validadores verifican explícitamente:

- status soportado;
- direction soportada;
- invariantes de dirección según tipo;
- self-reference;
- evidence no vacía;
- confidence en rango;
- derivation soportada;
- timestamps ISO cuando existen;
- `null` como única representación de temporalidad desconocida;
- IDs duplicados;
- duplicados semánticos;
- endpoints faltantes como warning.

### 8. Compatibilidad Web v0.1 es una frontera explícita

`apps/web/src/demo-dataset.ts` proyecta el snapshot canónico al modelo histórico de Web.

El adapter sólo acepta actualmente:

```text
depends_on
uses
connected_to
```

y estados soportados por Web v0.1.

Si el contrato canónico incorpora otra semántica, el adapter falla explícitamente en lugar de hacer cast silencioso.

El rediseño visual/funcional de Technology Map permanece en V02-018.

## Alternativas rechazadas

### Rellenar `observedAt=null` con `snapshot.asOf`

Rechazada: fabrica temporalidad y confunde fecha de corte con fecha de observación.

### Mantener relaciones sólo en Web

Rechazada: crea una segunda verdad y deja a NEXUS API sin el mismo grafo Demo.

### Crear una Observation separada por cada edge

Rechazada: `TechnologyRelationship` ya es el contrato del claim relacional y posee evidencia propia. Duplicarlo como `Observation` mezclaría conceptos.

### Inferir topología Demo desde hostname/site/clase

Rechazada: una coincidencia contextual no demuestra dependencia, uso ni conectividad.

### Introducir graph database / NetworkX ahora

Rechazada para V02-012: primero se necesita un contrato relacional defendible. Analytics de grafo pertenece a versiones/tickets posteriores.

## Consecuencias

Positivas:

- Demo API contiene 240 assets + 18 relaciones canónicas;
- Technology Map v0.1 consume la misma verdad de relaciones;
- evidencia, authority, derivation y temporalidad quedan separadas;
- la ausencia de fecha puede representarse honestamente;
- futuros sources pueden aportar evidencia al mismo edge sin duplicarlo;
- se prepara la base para Asset 360, Technology Map 2.0 y graph intelligence futuros.

Costos/deuda:

- schema `0.2` evoluciona aditivamente para permitir `observedAt=null` en relaciones;
- Web mantiene temporalmente un modelo de presentación v0.1;
- GLPI Live continúa sin relaciones hasta disponer de una fuente real y defendible;
- no existe aún reconciliation multisource específica de edges;
- no existe histórico/event sourcing de cambios topológicos.

## Seguridad y OT

V02-012 no habilita discovery ni scanning.

No se consulta red, puertos, SNMP, protocolos industriales ni dispositivos OT. El hecho de que el contrato pueda representar `connected_to` no autoriza a descubrirlo activamente.

Cualquier futura topología OT deberá respetar controles específicos y distinguir observación pasiva, declaración manual e inferencia.

## Relación con otros ADR

- ADR-0011 define relaciones como claims canónicos con evidencia; ADR-0022 refina su temporalidad y provenance.
- ADR-0019 gobierna Evidence before inference y reconciliación de identidad/atributos; un motor equivalente para edges será trabajo posterior si aparecen múltiples fuentes reales.
- ADR-0021 gobierna la fuente sintética compartida; V02-012 incorpora las relaciones a esa misma fuente.
- V02-018 podrá rediseñar Technology Map sin redefinir la verdad del grafo.
