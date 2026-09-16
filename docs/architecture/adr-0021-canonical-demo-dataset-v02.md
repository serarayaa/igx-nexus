# ADR-0021 — Demo Dataset canónico v0.2

Estado: **Propuesto — V02-011 / PR #70**. Se considerará aceptado después del merge manual y CI verde.

## Contexto

CMDB-012 consolidó la Demo v0.1 en `apps/web/src/demo-dataset.ts`: 240 CIs sintéticos, 11 escenarios hero, 18 relaciones, corte temporal fijo y resultados reproducibles para Dashboard, Explorer, Asset 360, QR, Technology Map y CMDB Health.

V02-004 creó posteriormente un provider Demo canónico en NEXUS API, pero para evitar un big-bang sólo representó `DEMO-0007` y `DEMO-0013`. V02-010 añadió Taxonomy v2 y dejó explícito que V02-011 debía cerrar el puente entre el fixture Web histórico y el modelo canónico.

Mantener ambos catálogos separados generaría drift: una Demo visible de 240 CIs y una Demo API de dos CIs no representan el mismo universo de producto.

## Decisión

### 1. Una fuente sintética compartida

La autoría del catálogo se extrae de `apps/web` hacia `packages/demo-data`.

La frontera es deliberadamente pequeña y libre de UI/API:

```text
packages/demo-data
      │
      ├── NEXUS API Demo → TechnologySnapshot v0.2
      │
      └── Web Demo → adapter de compatibilidad v0.1
```

`apps/web` deja de ser System of Record del fixture y `services/api` deja de mantener activos Demo escritos a mano.

El módulo compartido no pertenece a `@igx-nexus/types`: contratos y datos sintéticos siguen siendo responsabilidades distintas.

### 2. Snapshot canónico completo

`createCanonicalDemoSnapshot()` emite exactamente 240 `TechnologyAsset` con IDs estables `DEMO-0001..DEMO-0240`.

NEXUS API ejecuta antes de publicar:

```text
validateTechnologySnapshot()
validateTechnologySnapshotTaxonomy()
```

El provider Demo conserva `source=demo`, `authority=trusted` y marca explícita `demo.synthetic=true`.

### 3. Taxonomía autorada, no inferida desde hardware

El dataset es un fixture diseñado intencionalmente. `domain` proviene de esa autoría y clase/rol se normalizan mediante reglas gobernadas por familia sintética:

| Familia | Domain | Asset Class | Role |
| --- | --- | --- | --- |
| notebook / desktop / workstation | IT | endpoint | user_endpoint |
| console | OT | operator_interface | supervision |
| switch | IT | network_device | network_access |
| industrialSwitch | OT | industrial_network_device | industrial_network |
| monitor IT | IT | peripheral | `custom:display` |
| monitor OT | OT | operator_interface | supervision |
| phone | IT | mobile_device | user_endpoint |
| printer | IT | printer | print_service |

No se usan hostname, fabricante ni modelo para inferir taxonomía.

### 4. Contexto y trazabilidad

La ubicación sintética se conserva como atributo y además se proyecta a `OperationalContextReference(kind=site)` cuando existe.

Los activos conservan identificadores, lifecycle, criticality y atributos históricos con provenance enlazado a la misma `SourceReference` Demo.

### 5. Compatibilidad Web explícita

La Web v0.1 conserva temporalmente su `Asset` de presentación para no mezclar esta migración con Product Design 2.0. `apps/web/src/demo-dataset.ts` pasa a ser un adapter desde el snapshot canónico.

La proyección debe conservar el comportamiento histórico de:

- identidad y orden;
- búsqueda;
- locators QR;
- Dashboard;
- CMDB Health;
- escenarios hero;
- grafo legacy.

No se mantiene una segunda copia autorada de los 240 registros.

### 6. Reproducibilidad

Se preservan:

```text
cutoff = 2026-09-09T12:00:00.000Z
assets = 240
heroes = 11
relationship fixtures = 18
randomness = none
network = none
clock dependency = none
```

Los snapshots producidos permanecen inmutables y deterministas.

### 7. Relaciones permanecen en frontera V02-012

V02-011 comparte los 18 fixtures existentes para impedir duplicación, pero el `TechnologySnapshot` Demo mantiene `relationships=[]` durante este ticket.

La migración a `TechnologyRelationship` con evidence/provenance pertenece a V02-012 — Relationship Evidence v2. No se fabrica evidencia canónica para adelantar ese ticket.

### 8. Módulo fuente frente a workspace adicional

La implementación inicial evaluó convertir `packages/demo-data` en un workspace npm independiente. Se mantiene por ahora como módulo compartido ESM tipado porque:

- no requiere dependencias runtime propias;
- API y Web lo consumen directamente dentro del monorepo;
- evita modificar lockfile y agregar una frontera de publicación sin necesidad funcional;
- CI valida su consumo desde API y Web;
- puede promoverse a workspace si obtiene ciclo de build/versionado independiente en el futuro.

La ausencia de `package.json` propio no convierte a Web/API en dueños del catálogo: la fuente sigue viviendo en `packages/demo-data` y no importa desde ninguna aplicación.

### 9. Retiro del vocabulario canónico legacy

V02-010 mantuvo temporalmente aliases pre-v2 dentro de los tipos base para evitar una migración big-bang. V02-011 elimina esos aliases de `TechnologyAssetClass` y `TechnologyRole` una vez migrados los consumers activos.

Desde este ticket:

- `technologyAssetClasses` contiene exclusivamente `v2TechnologyAssetClasses`;
- `knownTechnologyRoles` contiene exclusivamente `v2TechnologyRoles`;
- valores históricos como `compute`, `laptop`, `plc` o `hmi` pueden sobrevivir como vocabulario de fuente, ejemplos históricos o payloads adversos, pero no como valores canónicos válidos;
- los validators siguen rechazando defensivamente esos valores si un payload sin tipar intenta introducirlos;
- el compatibility projection de GLPI para assessments no resueltos sigue usando valores **v2** (`IT / endpoint / user_endpoint`) y no reintroduce aliases antiguos.

Esto separa el retiro del vocabulario legacy de la existencia temporal de scalars obligatorios en schema `0.2`.

## Alternativas rechazadas

### Copiar los 238 CIs faltantes a `services/api`

Rechazada: crea dos fuentes de verdad y drift inevitable.

### Mantener la Web como fuente e importarla desde API

Rechazada: invierte la dependencia y acopla backend a una aplicación de presentación.

### Importar los 240 CIs a GLPI

Rechazada: Demo no es evidencia corporativa y V02-011 no es un proceso de seed de GLPI.

### Migrar relaciones canónicas ahora

Rechazada: adelanta V02-012 y mezcla migración de assets con semántica/evidencia de relaciones.

### Generación aleatoria/Faker

Rechazada: reduce reproducibilidad sin aportar valor al fixture.

## Consecuencias

Positivas:

- Demo y Live hablan el mismo modelo canónico;
- API Demo ya puede representar el universo completo de 240 CIs;
- la Web deja de poseer el inventario sintético;
- taxonomy/provenance/context pueden probarse a escala del fixture completo;
- los aliases taxonómicos pre-v2 dejan de formar parte del contrato activo;
- se preserva la Demo v0.1 mientras Product Experience evoluciona por separado.

Costos/deuda:

- existe un adapter de presentación Web v0.1 temporal;
- las relaciones aún no forman parte del snapshot canónico Demo;
- la UI sigue mostrando sólo una parte de la riqueza del contrato canónico;
- `packages/demo-data` puede requerir promoción a workspace si en el futuro obtiene build/versionado propios.

## Seguridad

El dataset conserva únicamente datos ficticios:

- IP TEST-NET-1;
- hostnames `demo-cl-*`;
- seriales `SYNTH-SN-*`;
- responsables y sitios Demo;
- fabricantes/modelos ficticios;
- ninguna credencial, PII o URL corporativa.

Demo nunca debe presentarse como inventario real de Innergex.

## Relación con ADR anteriores

- ADR-0010 permanece como decisión histórica del catálogo v0.1; esta decisión mueve su fuente de verdad al modelo canónico.
- ADR-0011 define los contratos que ahora consume el catálogo completo.
- ADR-0014 mantiene Provider Mode Demo/Live; Demo deja de ser un subconjunto mínimo.
- ADR-0020 gobierna la taxonomía emitida por el fixture y documenta el bridge de scalars v2 para assessments no resueltos.
- V02-012 añadirá evidence/provenance a relaciones sin reabrir la decisión sobre la fuente sintética.
