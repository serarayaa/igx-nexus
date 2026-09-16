# IT/OT Taxonomy v2

Taxonomy v2 define el lenguaje taxonómico operativo de IGX NEXUS v0.2. La decisión arquitectónica vive en [ADR-0020](architecture/adr-0020-it-ot-taxonomy-v2.md).

## Regla mental

Cada dimensión responde una pregunta distinta:

| Dimensión | Pregunta | Ejemplo |
| --- | --- | --- |
| `domain` | ¿En qué dominio tecnológico opera? | `IT`, `OT` |
| `assetClass` | ¿Qué clase tecnológica representa? | `endpoint`, `controller` |
| `role` | ¿Qué función cumple? | `user_endpoint`, `control` |
| `operationalContexts` | ¿En qué sistema/contexto participa? | `system`, `site`, `security_zone` |
| `taxonomy.*.state` | ¿La clasificación está resuelta? | `classified`, `unknown`, `unclassified`, `conflict` |
| `taxonomy.*.method` | ¿Cómo se obtuvo? | `observed`, `normalized`, `inferred`, `manual` |
| provenance | ¿Qué evidencia respalda el claim? | GLPI, Demo, Intune, manual |

No usar una dimensión como sustituto de otra.

## Domain

El dominio canónico es deliberadamente pequeño:

```text
IT
OT
```

`unknown`, `unclassified`, `conflict`, `hybrid` y `shared` no son domains.

Un equipo físicamente parecido a un PC, notebook, servidor o dispositivo de red IT puede participar en OT. La forma del hardware no determina el dominio.

## Asset Class

### IT

```text
endpoint
server
network_device
storage
printer
mobile_device
virtual_compute
infrastructure_appliance
peripheral
application
```

### OT

```text
controller
operator_interface
industrial_compute
industrial_network_device
field_device
protection_device
metering_device
industrial_gateway
```

La clase no contiene fabricante, modelo, planta, sistema interno ni nivel Purdue.

## Role

### IT

```text
user_endpoint
application_server
database_server
directory_service
virtualization_host
network_core
network_distribution
network_access
network_security
storage_service
print_service
infrastructure_service
```

### OT

```text
engineering_workstation
control
supervision
telemetry
historian
protection
metering
field_sensing
field_actuation
industrial_network
industrial_security
protocol_gateway
```

`custom:<name>` está permitido cuando una función legítima no cabe en el catálogo. Debe ser escape gobernado, no vía normal.

## Retiro de aliases pre-v2

V02-011 retiró del contrato canónico activo los aliases mantenidos temporalmente por V02-010.

Por tanto, valores históricos como:

```text
compute
network
mobile
laptop
desktop
server (como role)
plc
hmi
industrial_switch
```

pueden existir como vocabulario de fuente, documentación histórica o payload adverso, pero **no** son valores válidos de `TechnologyAssetClass`/`TechnologyRole`.

Los validators runtime continúan rechazándolos si aparecen como canon.

## Hardware subtype y vocabulario de fuente

Conceptos como:

```text
Notebook
Desktop
Server
PLC
RTU
HMI
IED
Switch
Firewall
```

pueden aparecer como Type/Subtype de una fuente, atributos normalizados o evidence. No deben asumirse automáticamente como `domain` o `role`.

Ejemplo:

```text
GLPI itemType = Computer
GLPI type = HMI

NEXUS domain = OT
NEXUS assetClass = operator_interface
NEXUS role = supervision
```

El dato observado continúa siendo `GLPI type = HMI`; la proyección NEXUS debe explicar ruleId, method, provenance y reviewRequired.

## Estado de clasificación

### `classified`

Existe una clasificación canónica concreta.

### `unknown`

La fuente no entregó evidencia suficiente para conocer la dimensión.

### `unclassified`

Existe información fuente, pero no una regla/catálogo gobernado suficiente para traducirla.

### `conflict`

Existen claims incompatibles que no deben resolverse silenciosamente.

Todos los estados no resueltos requieren revisión humana.

## Método de clasificación

| Método | Significado |
| --- | --- |
| `observed` | fuente entrega semántica equivalente directamente |
| `normalized` | regla determinista traduce vocabulario fuente |
| `inferred` | NEXUS deduce a partir de evidencia indirecta |
| `manual` | una persona asigna/revisa explícitamente |

Method no reemplaza authority.

## Operational Context

Contexto es ortogonal a clase y rol.

Kinds iniciales:

```text
system
service
environment
site
network_segment
security_zone
custom:*
```

Purdue/ISA-95 y zones IEC 62443 pueden aportar contexto cuando exista evidencia; no son clases de activo.

## Mapping GLPI

Código central: `services/api/src/taxonomy.ts`.

GLPI permite tipos configurables, por lo que sus nombres son evidencia de instancia y no un estándar universal.

| Source Type | Domain | Class | Role | Revisión |
| --- | --- | --- | --- | --- |
| Notebook / Laptop / Desktop / Workstation | unclassified | unclassified | unclassified | sí |
| Server / Physical Server | unclassified | unclassified | unclassified | sí |
| Engineering Workstation / Industrial Workstation | OT | industrial_compute | engineering_workstation | sí |
| HMI / Human Machine Interface / Operator Station | OT | operator_interface | supervision | sí |
| Historian / Historian Server | OT | industrial_compute | historian | sí |
| Type ausente | unknown | unknown | unknown | sí |
| Type presente sin mapping | unclassified | unclassified | unclassified | sí |

No se infiere taxonomía desde hostname, modelo o fabricante.

## Compatibility scalar projection

Schema `0.2` todavía obliga a `TechnologyAsset.domain`, `assetClass` y `role` concretos aunque el assessment pueda estar sin resolver.

Eso no significa que los aliases pre-v2 sigan vigentes.

`projectGlpiTaxonomyForLegacyScalars()` mantiene una proyección explícita:

```text
assessment resuelto
-> scalars = valores del assessment
-> compatibilityFallback = false

assessment unknown/unclassified/conflict
-> scalars = IT / endpoint / user_endpoint
-> compatibilityFallback = true
-> projectionRuleId = glpi.computer.compatibility-projection
```

**El fallback no modifica el assessment.**

Un `Notebook` sin contexto suficiente puede transportar temporalmente scalars `IT / endpoint / user_endpoint` para compatibilidad de schema y continuar taxonómicamente `unclassified`.

El adapter expone:

```text
nexus.taxonomy.version
nexus.taxonomy.<dimension>.state
nexus.taxonomy.<dimension>.ruleId
nexus.taxonomy.<dimension>.reviewRequired
nexus.taxonomy.compatibilityProjection
nexus.taxonomy.projectionRuleId
```

La futura evolución del schema puede retirar la necesidad de scalars concretos para estados no resueltos; eso no forma parte de V02-011.

## Demo canónica

Desde V02-011, `packages/demo-data` emite Taxonomy v2 para los 240 CIs sintéticos usando mapping gobernado por familia del fixture.

La Demo puede autorar explícitamente domain/clase/rol porque su semántica es diseñada; no debe copiar la lógica conservadora de GLPI como si ambas fuentes fueran equivalentes.

Ver [ADR-0021](architecture/adr-0021-canonical-demo-dataset-v02.md).

## Reconciliation

Reconciliation preserva información taxonómica:

- assessment seleccionado;
- operational contexts;
- claims/provenance alternativos;
- discrepancias no resueltas como `conflict`;
- identidad canónica estable.

Esto mantiene **Evidence before inference** después de reconciliar múltiples fuentes.
