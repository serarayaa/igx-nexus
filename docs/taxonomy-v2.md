# IT/OT Taxonomy v2

V02-010 define el lenguaje taxonómico operativo de IGX NEXUS v0.2. La decisión arquitectónica completa vive en [ADR-0020](architecture/adr-0020-it-ot-taxonomy-v2.md) y los riesgos específicos en [Threat Model Addendum V02-010](security/threat-model-v02-010-taxonomy-addendum.md).

## Regla mental

Cada dimensión responde una pregunta distinta:

| Dimensión | Pregunta | Ejemplo |
| --- | --- | --- |
| `domain` | ¿En qué dominio tecnológico opera? | `IT`, `OT` |
| `assetClass` | ¿Qué clase tecnológica representa? | `endpoint`, `controller` |
| `role` | ¿Qué función cumple? | `user_endpoint`, `control` |
| `operationalContexts` | ¿Dentro de qué sistema/contexto participa? | `system`, `security_zone` |
| `taxonomy.*.state` | ¿La clasificación está resuelta? | `classified`, `unknown`, `unclassified`, `conflict` |
| `taxonomy.*.method` | ¿Cómo se obtuvo un valor clasificado? | `observed`, `normalized`, `inferred`, `manual` |
| provenance | ¿Qué evidencia/fuente respalda el claim? | GLPI, Intune, manual, etc. |

No usar una dimensión como sustituto de otra.

## Domain

El dominio canónico es deliberadamente pequeño:

```text
IT
OT
```

`unknown`, `unclassified`, `conflict`, `hybrid` y `shared` no son domains. Cuando NEXUS no conoce el dominio, la decisión se mantiene sin resolver en el assessment taxonómico.

Esta distinción es especialmente importante en OT: un equipo físicamente parecido a un PC, servidor o dispositivo de red IT puede participar en un sistema OT. La forma del hardware no determina por sí sola el dominio.

## Asset Class

### IT

| Clase | Intención |
| --- | --- |
| `endpoint` | dispositivo de cómputo orientado a usuario |
| `server` | cómputo servidor físico/lógico representado como activo |
| `network_device` | infraestructura de red IT |
| `storage` | infraestructura de almacenamiento |
| `printer` | impresora/MFP inventariable |
| `mobile_device` | smartphone/tablet corporativo |
| `virtual_compute` | activo de cómputo virtual |
| `infrastructure_appliance` | appliance técnico que no encaja mejor en otra clase |
| `peripheral` | periférico inventariable |
| `application` | activo lógico/aplicación cuando corresponda al modelo canónico |

### OT

| Clase | Intención |
| --- | --- |
| `controller` | controlador industrial |
| `operator_interface` | interfaz de operación/supervisión |
| `industrial_compute` | workstation/server/computación industrial |
| `industrial_network_device` | infraestructura de red industrial |
| `field_device` | dispositivo de campo genérico cuando no existe una clase más precisa |
| `protection_device` | dispositivo dedicado de protección |
| `metering_device` | dispositivo dedicado de medición/metering |
| `industrial_gateway` | gateway/proxy de protocolos industriales |

La clase no debe contener fabricante, modelo, planta, sistema interno ni nivel Purdue.

## Role

Los roles describen función, no forma física.

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

`custom:<name>` está permitido para roles cuando una función legítima no cabe aún en el catálogo. Debe ser un escape gobernado, no la vía normal.

## Hardware subtype y source vocabulary

Conceptos como:

```text
Notebook
Desktop
PLC
RTU
HMI
IED
Switch
Firewall
```

pueden aparecer como Type/Subtype de una fuente, atributos normalizados o evidencia. No deben asumirse automáticamente como `role`.

Ejemplo:

```text
GLPI itemType = Computer
GLPI type = HMI

NEXUS domain = OT                     (normalized por regla explícita)
NEXUS assetClass = operator_interface (normalized)
NEXUS role = supervision              (inferred, reviewRequired)
```

El hecho observado sigue siendo `GLPI type = HMI`; la proyección NEXUS queda explicada por provenance y `ruleId`.

## Estado de clasificación

### `classified`

Existe una clasificación canónica concreta.

```ts
{
  state: "classified",
  value: "endpoint",
  method: "normalized",
  reviewRequired: false,
  ruleId: "glpi.computer.type.it-endpoint"
}
```

### `unknown`

La dimensión existe conceptualmente, pero la fuente no entregó evidencia suficiente para conocerla. Ejemplo: un `Computer` GLPI sin `ComputerType`.

### `unclassified`

NEXUS recibió información, pero todavía no existe una regla/catálogo gobernado para traducirla. Ejemplo: un `ComputerType` configurable de GLPI que no figura en el mapping explícito.

### `conflict`

Existen claims incompatibles que no deben resolverse silenciosamente.

Los tres estados no resueltos requieren revisión humana.

## Método de clasificación

| Método | Significado |
| --- | --- |
| `observed` | la fuente entregó directamente el valor semántico equivalente |
| `normalized` | una regla determinista tradujo vocabulario de fuente al canónico |
| `inferred` | NEXUS dedujo un valor a partir de evidencia indirecta |
| `manual` | una persona asignó/revisó explícitamente la clasificación |

El método no reemplaza `authority`. Una fuente puede ser autoritativa para inventario y aun así alimentar una inferencia taxonómica.

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

Ejemplos conceptuales:

```text
Asset: HMI-01
Class: operator_interface
Role: supervision
Contexts:
  - system: SCADA
  - site: <referencia de sitio>
  - security_zone: <referencia de zona>
```

Los nombres reales de plantas/sistemas no se hardcodean en el contrato. Purdue/ISA-95 y zones IEC 62443 pueden aportar contexto cuando exista evidencia, pero no son clases de activo.

## Mapping GLPI

Código central: `services/api/src/taxonomy.ts`.

GLPI permite que los tipos de activos sean administrados por cada instancia; no existe un catálogo universal de `ComputerType` que NEXUS pueda tratar como estándar. Por ello los aliases reconocidos son reglas de normalización NEXUS, no semántica nativa universal de GLPI.

Reglas actuales para `Computer`:

| Source Type | Assessment Domain | Class | Role | Revisión |
| --- | --- | --- | --- | --- |
| Notebook / Laptop / Desktop / Workstation | IT inferido | endpoint | user_endpoint | domain/role: sí |
| Server / Physical Server | IT inferido | server | infrastructure_service | domain/role: sí |
| Engineering Workstation / Industrial Workstation | OT | industrial_compute | engineering_workstation | no |
| HMI / Human Machine Interface / Operator Station | OT | operator_interface | supervision | role: sí |
| Historian / Historian Server | OT | industrial_compute | historian | no |
| Type ausente | **unknown** | **unknown** | **unknown** | sí |
| Type presente sin mapping | **unclassified** | **unclassified** | **unclassified** | sí |

Un item type diferente de `Computer` queda `unclassified` hasta que exista una regla explícita. Esto es intencional.

### Bridge temporal de scalars legacy

V02-008 y algunos consumidores heredados todavía requieren que `TechnologyAsset.domain`, `assetClass` y `role` tengan un valor concreto. Hasta que V02-011 migre esos consumidores, `projectGlpiTaxonomyForLegacyScalars()` mantiene un bridge explícito:

```text
assessment resuelto
→ scalars = valores del assessment
→ compatibilityFallback = false

assessment unknown/unclassified/conflict
→ scalars temporales = IT / endpoint / user_endpoint
→ compatibilityFallback = true
→ projectionRuleId = glpi.computer.compatibility-projection
```

**El fallback no modifica el assessment.** Por lo tanto un `Computer` sin Type sigue siendo taxonómicamente `unknown`, aunque una pantalla legacy necesite temporalmente el scalar IT para no romper el vertical Live.

El adapter publica además atributos `nexus.taxonomy.*.state`, `reviewRequired`, `ruleId` y `nexus.taxonomy.compatibilityProjection` para que el bridge sea observable y auditable.

## Reconciliation

V02-010 extiende la proyección de V02-009 para no perder información taxonómica:

- `taxonomy` se conserva durante `projectCanonicalAsset()`;
- `operationalContexts` se fusionan por referencia estable;
- una discrepancia taxonómica que la política de claims no puede resolver produce `state=conflict` + `reviewRequired=true`;
- un claim legacy seleccionado sin assessment v2 produce `unclassified`, no una inferencia inventada;
- el envelope de reconciliación continúa conservando claims y conflictos alternativos.

Esto mantiene `Evidence before inference` también después de la reconciliación multisource.

## Gate v2

Hay dos niveles de validación durante la migración:

1. `validateTechnologySnapshot()` mantiene el contrato base `0.2` y soporta consumidores legacy.
2. `validateTechnologySnapshotTaxonomy()` exige assessment v2 estructuralmente válido y contextos válidos.

Cuando una dimensión está `classified`, su valor **debe coincidir** con el scalar proyectado. Cuando está `unknown`, `unclassified` o `conflict`, el gate permite temporalmente un scalar legacy porque ese valor no representa una clasificación resuelta.

Todo provider nuevo/migrado a v2 debe superar ambos gates. Demo y GLPI Live ya lo hacen.

## Compatibilidad legacy

Para no convertir V02-010 en una migración big-bang, el tipo base conserva temporalmente aliases previos como `compute`, `control`, `laptop`, `plc`, etc.

Esos aliases:

- pueden existir en fixtures/consumidores heredados durante la transición;
- **no son válidos** dentro de `TechnologyTaxonomyAssessment` v2;
- no deben usarse en código nuevo;
- deben eliminarse al completar la migración de V02-011 y consumidores relacionados.

## Guía para adapters futuros

Un adapter nuevo debe seguir este orden conceptual:

```text
parse source
→ preserve raw/source vocabulary
→ build source evidence
→ apply centralized mapping rule
→ produce TechnologyTaxonomyAssessment
→ keep uncertainty explicit when evidence/rules are insufficient
→ use a compatibility projection only when a documented migration requires it
→ attach provenance/derivation
→ validate base snapshot
→ validate taxonomy v2 gate
```

No crear mappings dispersos en UI, providers o componentes.

## Implicaciones para UI/Analytics

Las facetas recomendadas para Asset Explorer 2.0 son independientes:

```text
Domain
Asset Class
Role
Operational Context
Classification State
Review Required
```

Analytics debe poder distinguir, por ejemplo, “100 scalars endpoint mostrados por compatibilidad” de “87 endpoints clasificados con evidencia suficiente + 13 assessments pendientes de revisión”. La incertidumbre es información útil y no debe esconderse para obtener un gráfico más limpio.

## Qué queda para después

V02-010 no implementa:

- editor UI de clasificación;
- persistencia/historial de revisión manual;
- mappings completos de todos los item types GLPI;
- integración Intune;
- modelado completo de ISA-95/Purdue;
- grafo de zones/conduits;
- migración total del dataset Demo y consumidores legacy (V02-011);
- Relationship Evidence v2 (V02-012).
