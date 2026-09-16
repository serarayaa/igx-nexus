# Demo Dataset — catálogo sintético canónico

Estado actual: **V02-011 integrado mediante PR #70**, merge `45b1adc4f4977732f10f707e993588ced368578a`; CI post-merge #454 verde.

La decisión histórica de CMDB-012 permanece documentada en [ADR-0010](architecture/adr-0010-demo-dataset.md). La arquitectura vigente está gobernada por [ADR-0021](architecture/adr-0021-canonical-demo-dataset-v02.md).

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
- operational contexts.

No representa inventario, personas, cantidades ni topología real de Innergex Chile.

## Fuente única actual

Desde V02-011 la fuente autorada vive en:

```text
packages/demo-data
```

Flujo:

```text
packages/demo-data
      |
      |-- NEXUS API Demo -> TechnologySnapshot v0.2
      |
      `-- Web Demo -> adapter temporal v0.1
```

`apps/web/src/demo-dataset.ts` ya no autoriza los 240 registros; proyecta desde el snapshot canónico para preservar la experiencia v0.1.

No existe una segunda copia manual en `services/api`.

## Reproducibilidad

Baseline preservado:

```text
dataset version = 1.0.0
cutoff = 2026-09-09T12:00:00.000Z
assets = 240
heroes = 11
relationship fixtures = 18
randomness = none
network dependency = none
clock dependency = none
```

Los IDs permanecen estables:

```text
DEMO-0001 .. DEMO-0240
```

No reordenar rangos ni reciclar IDs.

La proyección Web conserva el digest histórico:

```text
290589c730513eec3c04c7db008bc4ff95d03eb7b142aab7c991f89117d087f1
```

El snapshot canónico completo tiene además su propio digest de regresión definido por V02-011.

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

## Relaciones

Los 18 relationship fixtures permanecen compartidos para preservar la Web v0.1.

V02-011 **no** los convierte todavía a `TechnologyRelationship` con evidence/provenance. Esa migración pertenece a **V02-012 — Relationship Evidence v2**.

Por ello el snapshot canónico Demo mantiene actualmente:

```text
relationships = []
```

Esto es un límite explícito, no pérdida accidental de datos.

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
- sin emails, credenciales o URLs corporativas;
- QR Demo usa `.invalid` y locator opaco.

Demo nunca debe presentarse como inventario real.

## Mantenimiento

Para agregar o cambiar casos:

1. preservar IDs existentes;
2. no reciclar rangos;
3. usar Taxonomy v2;
4. no inferir desde hostname/fabricante/modelo;
5. mantener datos sintéticos y TEST-NET;
6. revisar cambios de métricas conscientemente;
7. actualizar digest sólo tras comprender el cambio;
8. ejecutar regresión completa.

Validación:

```bash
npm run typecheck
npm run build
npm test
npm run test:demo
npm run storybook:build --workspace @igx-nexus/ui
```

CI post-merge V02-011: **#454 verde**.

## Límites actuales

- la UI v0.1 todavía usa un adapter de presentación;
- la UI muestra sólo una parte de la riqueza canónica disponible;
- relaciones canónicas con evidence esperan V02-012;
- Demo no se importa a GLPI;
- no existe discovery/telemetría real dentro del fixture.
