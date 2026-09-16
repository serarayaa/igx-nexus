# Demo Dataset — catálogo sintético canónico

Estado actual: **V02-011 y V02-012 integrados**. V02-012 — Relationship Evidence v2 quedó incorporado mediante PR #73, merge `e174700cb5af944c622f4899d812eb9c6fb2c261`; CI post-merge #481 verde.

La decisión histórica de CMDB-012 permanece en [ADR-0010](architecture/adr-0010-demo-dataset.md). La fuente canónica compartida está gobernada por [ADR-0021](architecture/adr-0021-canonical-demo-dataset-v02.md) y la semántica relacional por [ADR-0022](architecture/adr-0022-relationship-evidence-v2.md), Accepted tras merge manual y CI post-merge verde.

## Propósito

El catálogo Demo ejercita:

- Dashboard;
- Asset Explorer;
- Asset 360;
- QR/Label;
- Technology Map;
- CMDB Health;
- contratos canónicos v0.2;
- Taxonomy v2;
- provenance/source references;
- operational contexts;
- Relationship Evidence v2.

No representa inventario, personas, cantidades ni topología real de Innergex Chile.

## Fuente única actual

La fuente autorada vive en:

```text
packages/demo-data
```

Flujo:

```text
packages/demo-data
      |
      |-- NEXUS API Demo -> TechnologySnapshot v0.2
      |
      `-- Web Demo -> adapters temporales v0.1
```

`apps/web/src/demo-dataset.ts` no autoriza los activos ni las relaciones. Proyecta desde el snapshot canónico para preservar la experiencia Web v0.1.

No existe una segunda copia manual en `services/api`.

## Reproducibilidad

Baseline actual:

```text
canonical dataset version = 2.1.0
legacy Web dataset version = 1.0.0
cutoff = 2026-09-09T12:00:00.000Z
assets = 240
heroes = 11
canonical relationships = 18
randomness = none
network dependency = none
clock dependency = none
```

Los IDs permanecen estables:

```text
DEMO-0001 .. DEMO-0240
DEMO-REL-001 .. DEMO-REL-018
```

No reordenar rangos ni reciclar IDs.

La proyección Web conserva el digest histórico:

```text
290589c730513eec3c04c7db008bc4ff95d03eb7b142aab7c991f89117d087f1
```

El snapshot canónico V02-012 queda protegido por:

```text
b97fb701d94332e2726e5f0c4673a1ed20e0cfbfb4a83c95c30bb89e0819943d
```

Actualizar un digest sólo después de revisar y comprender el cambio semántico.

## Datos preservados

Por activo se preservan, cuando aplican:

- display name;
- hostname;
- serial;
- asset tag;
- IP TEST-NET;
- fabricante/modelo ficticios;
- ubicación ficticia;
- responsable ficticio;
- lifecycle;
- criticality;
- lastSeen;
- warrantyEnds;
- familia/tipo sintético;
- dataset version;
- marca `demo.synthetic=true`;
- source/provenance.

Las ubicaciones se proyectan además a `OperationalContextReference(kind=site)` cuando existen.

## Distribuciones históricas preservadas

### Tipo de presentación Web

| Tipo | CI |
| --- | ---: |
| Computer | 100 |
| Monitor | 49 |
| NetworkEquipment | 37 |
| Phone | 31 |
| Printer | 23 |
| **Total** | **240** |

### Dominio

| Dominio | CI |
| --- | ---: |
| IT | 199 |
| OT | 41 |

### Lifecycle Web v0.1

| Estado | CI |
| --- | ---: |
| Asignados | 196 |
| Stock | 26 |
| Reparación | 9 |
| Baja | 9 |

Mapping canónico mínimo:

```text
assigned -> active
stock    -> in_stock
repair   -> repair
retired  -> retired
```

### Ubicación

| Ubicación | CI |
| --- | ---: |
| Oficina Demo Centro | 126 |
| Planta Demo Norte | 48 |
| Bodega Demo | 44 |
| Planta Demo Sur | 21 |
| Sin ubicación | 1 |

## Taxonomy v2 del fixture

La taxonomía Demo es una decisión gobernada del fixture, no una inferencia desde hostname/modelo/fabricante.

| Familia sintética | Domain | Asset Class | Role |
| --- | --- | --- | --- |
| notebook / desktop / workstation | IT | endpoint | user_endpoint |
| console | OT | operator_interface | supervision |
| switch | IT | network_device | network_access |
| industrialSwitch | OT | industrial_network_device | industrial_network |
| monitor IT | IT | peripheral | `custom:display` |
| monitor OT | OT | operator_interface | supervision |
| phone | IT | mobile_device | user_endpoint |
| printer | IT | printer | print_service |

Los 240 activos deben pasar:

```text
validateTechnologySnapshot()
validateTechnologySnapshotTaxonomy()
```

V02-011 retiró los aliases canónicos pre-v2. Valores como `compute`, `laptop`, `plc` o `hmi` ya no son válidos como `TechnologyAssetClass`/`TechnologyRole`.

## Activos hero

| ID | Caso | Qué permite comprobar |
| --- | --- | --- |
| DEMO-0001 | registro parcial | cobertura insuficiente |
| DEMO-0002 | garantía vencida | identidad completa, QR y grafo |
| DEMO-0003 | nodo central | relaciones de oficina |
| DEMO-0004 | garantía próxima | vencimiento a 20 días del corte |
| DEMO-0007 | endpoint sano | registro completo sin relaciones |
| DEMO-0013 | OT supervisión | búsqueda, QR y grafo OT |
| DEMO-0020 | datos degradados | antigüedad + faltantes |
| DEMO-0021 | observación antigua | atención por frescura |
| DEMO-0022 | baja documentada | lifecycle retirado confiable |
| DEMO-0023 | stock | owner no aplicable |
| DEMO-0024 | reparación | registro confiable en repair |

## Relaciones canónicas

V02-012 migró los 18 fixtures a `TechnologyRelationship`. El snapshot Demo contiene:

```text
relationships.length = 18
```

Se preservan los tres componentes históricos:

1. Oficina;
2. Planta Norte;
3. Puestos.

Los tipos actuales del fixture son:

```text
depends_on
uses
connected_to
```

`depends_on` y `uses` son dirigidos. `connected_to` es bidireccional.

Cada edge Demo posee `RelationshipEvidence` explícita:

```text
source = demo
authority = trusted
derivation = manual
confidence = 1
kind = source_record
```

Esto significa confianza total en que el **fixture sintético declara el claim**, no evidencia sobre infraestructura real.

### Temporalidad

La fecha de la fuente y la fecha de la relación no se mezclan.

`SourceReference.observedAt` usa el corte del dataset porque representa el registro sintético disponible en la fuente.

`TechnologyRelationship.observedAt` representa la fecha del claim cuando se conoce.

Caso intencional:

```text
DEMO-REL-013.observedAt = null
```

`null` significa fecha desconocida. No se sustituye por `DEMO_AS_OF`, hora de ingestión ni fecha actual.

`DEMO-REL-016` conserva una observación de 20 días antes del corte para ejercitar freshness.

### Duplicados semánticos

Un edge canónico no debe duplicarse sólo porque exista más de una evidencia.

Para bidireccionales:

```text
A connected_to B == B connected_to A
```

El validador reporta duplicados semánticos para que futuras fuentes agreguen evidence al claim en vez de inflar el grafo.

### Compatibilidad Web

La Web v0.1 proyecta las relaciones desde `TechnologySnapshot.relationships`. El adapter acepta explícitamente los tipos/estados soportados por la experiencia actual y falla si recibe una semántica canónica que aún no sabe representar.

Technology Map 2.0 sigue reservado para V02-018.

## Métricas históricas Web v0.1

Dashboard:

| Métrica | Resultado |
| --- | ---: |
| Registrados / vigentes | 240 / 231 |
| Vigentes con información reciente | 162 |
| Vigentes con responsable y ubicación | 194 |
| Garantías por vencer ≤90 días | 43 |
| Garantías vencidas | 21 |
| Garantías sin fecha | 13 |
| Críticos vigentes / sin información reciente | 12 / 4 |

CMDB Health:

| Estado | CI |
| --- | ---: |
| Confiable | 182 |
| Atención | 45 |
| Degradado | 12 |
| Cobertura insuficiente | 1 |
| Sin evaluación | 0 |

Score global bruto histórico: **94,62012320328543**. Cobertura: **96,93035426731078%**.

Estos valores se preservan para regresión; no representan objetivos corporativos.

## Seguridad

- IP únicamente TEST-NET-1 `192.0.2.0/24`;
- hostnames `demo-cl-*`;
- seriales `SYNTH-SN-*`;
- asset tags `DEMO-TAG-*`;
- responsables numerados/ficticios;
- sitios, fabricantes y modelos ficticios;
- relaciones `synthetic_relationship` y evidencia `demo-dataset:*`;
- sin emails, credenciales o URLs corporativas;
- QR Demo usa `.invalid` y locator opaco.

Demo nunca debe presentarse como inventario o topología real.

## Mantenimiento

Para agregar o cambiar casos:

1. preservar IDs existentes;
2. no reciclar rangos;
3. usar Taxonomy v2;
4. no inferir assets/relaciones desde hostname, fabricante, modelo o ubicación;
5. mantener datos sintéticos y TEST-NET;
6. no fabricar temporalidad ausente;
7. revisar cambios de métricas conscientemente;
8. actualizar digest sólo tras comprender el cambio;
9. ejecutar regresión completa.

Validación:

```bash
npm run typecheck
npm run build
npm test
npm run test:demo
npm run storybook:build --workspace @igx-nexus/ui
```

CI post-merge V02-012: **#481 verde**.

## Límites actuales

- la UI v0.1 todavía usa adapters de presentación;
- la UI muestra sólo una parte de la riqueza canónica disponible;
- GLPI Live todavía no emite relaciones porque no existe fuente real gobernada para hacerlo;
- reconciliation multisource de edges aún no está implementada;
- Technology Map 2.0 y graph intelligence son trabajo posterior;
- Demo no se importa a GLPI;
- no existe discovery/telemetría real dentro del fixture;
- no se realiza active scanning OT.
