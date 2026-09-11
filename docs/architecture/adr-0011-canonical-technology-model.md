# ADR-0011 — Modelo canónico de Technology Intelligence

Estado: Propuesto en V02-001 (issue #40). Se considerará aceptado únicamente tras merge manual del PR correspondiente.

## Contexto

IGX NEXUS v0.1 demostró Dashboard, Asset Explorer, Asset 360, QR/Label, Technology Map y CMDB Health sobre un dataset sintético. Ese hito utilizó deliberadamente un contrato pequeño dentro de `apps/web`: cinco tipos de activo, dominio `IT | OT`, identidad demo y providers locales.

Ese modelo fue correcto para probar la idea, pero no es suficiente como contrato de integración de v0.2. Technology Intelligence debe combinar información proveniente de GLPI, Intune, Entra ID, Windows/Dell y futuras fuentes IT/OT sin convertir la taxonomía ni las claves internas de una fuente en la identidad del producto.

ADR-0002 continúa definiendo cómo representar familias técnicas mediante capacidades nativas de GLPI cuando corresponda. V02-001 introduce una frontera adicional: **la representación soportada por GLPI es responsabilidad del adapter; no es el dominio canónico de NEXUS**.

## Decisión

### 1. La identidad NEXUS es canónica

`TechnologyAsset.id` es la identidad estable emitida/gestionada por NEXUS.

Un activo puede relacionarse con múltiples `SourceReference`:

```text
NEXUS-IT-0001
├─ GLPI    Computer/412
├─ Intune  managedDevice/...
├─ Entra   device/...
└─ otros identificadores/evidencias
```

Ningún ID externo, hostname, serial, MAC, IP o identificador equivalente reemplaza automáticamente `TechnologyAsset.id`.

Hostname, serial y otros identificadores pueden ser señales relevantes para una futura reconciliación, pero el matching y la fusión de identidades quedan fuera de V02-001.

### 2. Las fuentes se conservan como evidencia

`SourceReference` identifica el registro de una fuente aguas arriba e incorpora:

- `source`;
- `externalId` opaco;
- `entityType` opcional;
- `sourceScope` opcional;
- `observedAt`;
- nivel de autoridad.

`ProvenanceRecord` permite asociar un claim normalizado con la fuente que lo sostuvo, su instante de observación/ingesta, autoridad, confianza opcional y referencias de evidencia.

La procedencia forma parte del contrato y no es metadata descartable del pipeline de ingestión.

### 3. IT y OT comparten plataforma, no taxonomía

La clasificación canónica separa tres conceptos:

1. `domain`: `IT | OT`;
2. `assetClass`: familia funcional amplia;
3. `role`: papel técnico concreto.

Ejemplos:

```text
IT / endpoint / laptop
IT / compute / server
OT / control / plc
OT / monitoring / hmi
OT / industrial_network / industrial_switch
OT / energy_plant / inverter
```

Esto evita modelar OT como `Peripheral`, `Computer` u otra clase elegida sólo porque existe en GLPI.

Los adapters posteriores podrán mapear el modelo canónico hacia clases/tipos/modelos de GLPI sin contaminar la semántica del producto.

Las listas conocidas de roles son una base inicial. Extensiones justificadas utilizan `custom:<nombre>` para mantener extensibilidad explícita y auditable en lugar de aceptar strings arbitrarios silenciosamente.

### 4. Inventario y observaciones temporales son conceptos distintos

`TechnologyAsset` describe el CI canónico y sus atributos normalizados.

`Observation` representa señales temporales como:

- capacidad de batería;
- crash/hang;
- reinicio inesperado;
- duración de arranque;
- error hardware/storage/WHEA;
- estado observado;
- futuras métricas/eventos normalizados.

Una `Observation` siempre mantiene `assetId`, fuente y `observedAt`.

Una observación NO es:

- CMDB Health;
- un Device Health score;
- un atributo permanente del activo;
- una conclusión causal.

La agregación, tendencias, findings y scoring corresponden a tickets posteriores.

### 5. Las relaciones son claims con evidencia

`TechnologyRelationship` utiliza IDs canónicos NEXUS y mantiene:

- source/target;
- tipo;
- dirección;
- estado;
- `observedAt`;
- una o más evidencias de relación.

Los tipos iniciales incluyen dependencia, uso, conectividad, comunicación, hosting, control, monitoreo y ubicación. Los tipos custom siguen la misma regla `custom:<nombre>`.

Para tipos con semántica conocida se validan invariantes de dirección; por ejemplo `connected_to` y `communicates_with` son bidireccionales, mientras `depends_on`, `uses`, `hosts`, `controls`, `monitors` y `located_in` son dirigidas.

### 6. Evidencia no reconciliada no se oculta

`TechnologySnapshot` agrupa activos, relaciones y observaciones bajo un `asOf` común.

Los validadores reportan referencias de relaciones/observaciones cuyo activo no aparece todavía en el snapshot como **warning**, no como borrado automático de información.

Esto permite diferenciar:

- dato inválido;
- dato aún no reconciliado;
- dato desconocido;
- ausencia real.

La futura NEXUS API decidirá cómo transportar y presentar esos estados.

### 7. Validación pura antes de reconciliación

`@igx-nexus/types` incorpora validadores sin IO para:

- timestamps ISO-8601 con timezone;
- source references;
- fuentes duplicadas;
- identificadores duplicados;
- procedencia no vinculada;
- observations;
- confianza fuera de rango;
- relaciones consigo mismas;
- dirección incompatible;
- IDs duplicados de snapshot;
- referencias no resueltas.

Estos validadores son invariantes de contrato. No constituyen un motor general de reglas ni reemplazan CMDB Health.

## Paquete compartido

`packages/types` se convierte en el workspace `@igx-nexus/types`.

Su propósito es servir progresivamente a:

```text
NEXUS Web
NEXUS API
adapters/integrations
analytics/rules
```

Los contratos dejan de pertenecer conceptualmente a `apps/web`.

## Compatibilidad y migración

V02-001 es aditivo.

No se reemplazan todavía:

- `apps/web/src/asset-model.ts`;
- `apps/web/src/relationship-model.ts`;
- Health Engine;
- dataset demo v0.1;
- Dashboard / Explorer / Asset 360 / QR / Technology Map.

La secuencia prevista es:

```text
V02-001 canonical model
        ↓
NEXUS API + provider contracts
        ↓
GLPI adapter / Live Lab
        ↓
reconciliation + provenance real
        ↓
migración progresiva de consumidores Web
```

No se realizará un big-bang migration del frontend.

## Consecuencias positivas

- NEXUS puede integrar varias fuentes sin acoplar identidad a ninguna de ellas.
- La procedencia queda disponible para explicar datos y futuros findings.
- IT/OT puede evolucionar con semántica correcta sin crear clases ficticias en GLPI.
- Las señales endpoint tienen un contrato temporal antes de diseñar Device Health.
- El grafo futuro puede distinguir relación canónica de evidencia que la respalda.
- Demo y Live podrán converger en contratos comunes en tickets posteriores.

## Costos y riesgos

- Existe temporalmente duplicación entre contratos v0.1 en Web y contratos v0.2 compartidos.
- La taxonomía conocida deberá evolucionar a medida que aparezcan fuentes y casos reales.
- Procedencia aumenta volumen y complejidad, pero omitirla haría difícil explicar reconciliación y analytics.
- `custom:*` evita bloquear extensiones, pero requerirá gobernanza para impedir proliferación de valores equivalentes.
- El modelo canónico no resuelve por sí solo dónde persistir histórico/telemetría; esa decisión queda fuera de este ADR.

## Fuera de alcance

- implementación de NEXUS API;
- elección de runtime/backend;
- OAuth/RBAC productivo;
- conexión GLPI/Intune/Entra;
- reconciliación funcional;
- reglas de matching;
- discovery;
- scanning OT;
- Device Health;
- anomaly detection / ML;
- rediseño UI;
- despliegue corporativo.

## Relación con decisiones anteriores

- ADR-0001 permanece vigente: GLPI es motor CMDB/ITAM y Web no accede directamente a su base.
- ADR-0002 permanece vigente como estrategia de representación GLPI, pero **no define la taxonomía canónica v0.2**.
- ADR-0009 permanece vigente: CMDB Health evalúa calidad del registro y no salud operacional.
- ADR-0010 permanece vigente para el dataset v0.1 hasta su migración explícita en un ticket posterior.
