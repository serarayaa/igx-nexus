# ADR-0021 — Demo Dataset canónico v0.2

Estado: **Aceptado — V02-011 / PR #70 / merge `45b1adc4f4977732f10f707e993588ced368578a`; CI post-merge #454 verde.**

## Contexto

CMDB-012 consolidó la Demo v0.1 en `apps/web/src/demo-dataset.ts`: 240 CIs sintéticos, 11 escenarios hero, 18 relaciones, corte fijo y resultados reproducibles.

V02-004 creó después un provider Demo canónico en NEXUS API, pero sólo representaba `DEMO-0007` y `DEMO-0013`. Mantener ambos catálogos separados generaba drift entre el producto visible y la API.

V02-010 incorporó Taxonomy v2 y dejó V02-011 como punto de cierre del bridge hacia el modelo canónico completo.

## Decisión

### 1. Una fuente sintética compartida

La autoría del catálogo se mueve a:

```text
packages/demo-data
```

Frontera:

```text
packages/demo-data
      |
      |-- NEXUS API Demo -> TechnologySnapshot v0.2
      |
      `-- Web Demo -> adapter de compatibilidad v0.1
```

`apps/web` deja de ser System of Record del fixture y `services/api` deja de mantener activos Demo escritos a mano.

El módulo no pertenece a `@igx-nexus/types`: contratos y fixtures siguen siendo responsabilidades distintas.

### 2. Snapshot canónico completo

`createCanonicalDemoSnapshot()` emite exactamente 240 `TechnologyAsset` con IDs `DEMO-0001..DEMO-0240`.

NEXUS API valida:

```text
validateTechnologySnapshot()
validateTechnologySnapshotTaxonomy()
```

Cada asset conserva `source=demo`, `authority=trusted` y `demo.synthetic=true`.

### 3. Taxonomía autorada

La clasificación Demo es una decisión intencional del fixture, no una inferencia desde hardware, hostname, fabricante o modelo.

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

### 4. Contexto y trazabilidad

La ubicación sintética se conserva como atributo y se proyecta a `OperationalContextReference(kind=site)` cuando existe.

Identificadores, lifecycle, criticality y atributos históricos mantienen provenance enlazado a la misma fuente Demo.

### 5. Compatibilidad Web explícita

La Web v0.1 conserva temporalmente su `Asset` de presentación. `apps/web/src/demo-dataset.ts` es un adapter desde el snapshot canónico.

Se preservan:

- identidad y orden;
- búsqueda;
- locators QR;
- Dashboard;
- CMDB Health;
- escenarios hero;
- grafo legacy.

No existe una segunda copia autorada de los 240 registros.

### 6. Reproducibilidad

```text
cutoff = 2026-09-09T12:00:00.000Z
assets = 240
heroes = 11
relationship fixtures = 18
randomness = none
network = none
clock dependency = none
```

Snapshots inmutables y deterministas.

La proyección Web conserva el digest histórico `290589c730513eec3c04c7db008bc4ff95d03eb7b142aab7c991f89117d087f1`.

### 7. Límite con V02-012

Los 18 relationship fixtures se comparten para impedir duplicación, pero el `TechnologySnapshot` Demo mantiene `relationships=[]` en V02-011.

La migración a `TechnologyRelationship` con evidence/provenance corresponde a **V02-012 — Relationship Evidence v2**.

No se fabrica evidencia canónica para adelantar ese ticket.

### 8. Módulo fuente frente a workspace npm

`packages/demo-data` permanece como módulo compartido ESM tipado, sin `package.json` propio, porque actualmente:

- no tiene dependencias runtime propias;
- API y Web lo consumen directamente dentro del monorepo;
- no necesita ciclo de publicación/versionado independiente;
- CI valida ambas fronteras.

Puede promoverse a workspace si obtiene ciclo de build/versionado propio en el futuro.

### 9. Retiro del vocabulario canónico legacy

V02-011 elimina los aliases pre-v2 de `TechnologyAssetClass` y `TechnologyRole`.

Desde este ticket:

- `technologyAssetClasses` contiene exclusivamente el catálogo v2;
- `knownTechnologyRoles` contiene exclusivamente roles v2;
- `compute`, `laptop`, `plc`, `hmi` y equivalentes pueden aparecer como vocabulario de fuente, historia o payload adverso, pero no son valores canónicos válidos;
- validación runtime los rechaza si un payload intenta introducirlos como canon;
- el compatibility scalar projection GLPI usa sólo valores v2 (`IT / endpoint / user_endpoint`).

El retiro de aliases no elimina todavía la obligatoriedad de scalars en schema `0.2`.

## Alternativas rechazadas

### Copiar los 238 CIs faltantes a `services/api`

Crea dos fuentes de verdad y drift.

### Mantener Web como fuente e importarla desde API

Invierte dependencias y acopla backend a presentación.

### Importar los 240 CIs a GLPI

Demo no es evidencia corporativa y V02-011 no es un seed productivo.

### Migrar relaciones canónicas en V02-011

Mezcla dos responsabilidades y adelanta V02-012.

### Faker/aleatoriedad

Reduce reproducibilidad sin valor para este fixture.

## Consecuencias

### Positivas

- Demo y Live hablan el mismo modelo canónico;
- API Demo representa los 240 CIs;
- Web deja de poseer el inventario;
- taxonomy/provenance/context se prueban a escala completa;
- aliases pre-v2 salen del contrato activo;
- Demo v0.1 conserva comportamiento histórico.

### Deuda explícita

- adapter Web v0.1 temporal;
- relaciones aún fuera del snapshot canónico;
- UI muestra sólo parte de la riqueza del contrato;
- `packages/demo-data` podría promoverse a workspace más adelante.

## Seguridad

Sólo datos ficticios:

- TEST-NET-1;
- `demo-cl-*`;
- `SYNTH-SN-*`;
- responsables/sitios/fabricantes/modelos Demo;
- ninguna credencial, PII o URL corporativa.

Demo nunca se presenta como inventario real.

## Relación con ADR anteriores

- ADR-0010 conserva la historia del catálogo v0.1 y queda supersedido en ubicación arquitectónica;
- ADR-0011 define el modelo canónico;
- ADR-0014 mantiene Provider Mode Demo/Live;
- ADR-0020 gobierna Taxonomy v2 y compatibility scalar projection;
- V02-012 añadirá evidence/provenance a relaciones sin reabrir esta decisión.
