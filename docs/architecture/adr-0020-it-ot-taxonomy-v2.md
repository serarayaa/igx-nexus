# ADR-0020 — IT/OT Taxonomy v2

Estado: **Propuesto — V02-010 / PR #67**. Se considerará aceptado tras merge manual del PR y CI verde.

## Contexto

V02-001 creó un modelo canónico mínimo con `domain`, `assetClass` y `role`, suficiente para desacoplar NEXUS de las clases de GLPI. Sin embargo, el vocabulario inicial mezclaba varias dimensiones: `compute` y `control` actuaban como clases amplias, mientras valores como `laptop`, `server`, `plc` o `hmi` aparecían como roles aunque describen principalmente forma, subtipo o familia técnica.

V02-005 añadió además un mapping deliberadamente conservador para el primer vertical Live:

```text
GLPI Computer → IT / compute / custom:glpi-computer
```

Ese mapping permitió validar la integración real, pero no constituye una taxonomía defendible para una plataforma IT/OT multisource.

V02-009 dejó explícitamente la política taxonómica completa pendiente. V02-010 resuelve esa deuda bajo el principio:

> **IT and OT share a platform, not a taxonomy.**

## Evidencia externa que influyó en la decisión

La investigación no se utilizó para copiar un estándar o producto, sino para separar conceptos que distintas herramientas maduras mantienen independientes.

| Fuente | Observación útil | Adaptación NEXUS |
| --- | --- | --- |
| NIST SP 800-82 Rev. 3 | OT se caracteriza por interactuar/controlar el entorno físico y por requisitos particulares de seguridad, disponibilidad y confiabilidad. | OT no se modela como un subtipo genérico de endpoint IT. |
| ISA-95 | Los niveles 0–4 describen fronteras lógicas de actividad e integración, no una lista universal de clases de hardware. | Un nivel ISA-95/Purdue no pertenece a `assetClass` ni `role`; podrá representarse como contexto cuando exista evidencia. |
| ISA/IEC 62443-3-2 | Zones y conduits son conceptos de segmentación/riesgo del sistema bajo consideración. | `security_zone` es contexto; un conduit o flujo corresponde a relaciones/topología, no a clase del activo. |
| GLPI | Los `Type` de los activos son vocabulario configurable; por ejemplo, Computer Type puede ser Notebook, Server o Workstation según cada instancia. | `GLPI item type` y `GLPI Type` se preservan como evidencia de fuente y se normalizan mediante reglas explícitas; nunca se equiparan directamente a la clase NEXUS. |
| NetBox / Nautobot | Device Type representa hardware/modelo; Device Role representa función; Location/Platform son dimensiones separadas. | NEXUS separa clase, función y contexto operacional. |
| Microsoft Defender for IoT | Device Type/Subtype, Purdue Level, Site y Zone aparecen como dimensiones separadas del inventario. | Refuerza la necesidad de filtros/facetas independientes, no una mega-jerarquía única. |
| ServiceNow CMDB | Las clases de CI viven en una jerarquía extensible propia del producto y otros atributos expresan función/estado. | Se adopta la separación conceptual, no la jerarquía comercial de ServiceNow. |
| Carbon / patrones de faceted navigation | Interfaces densas necesitan filtros independientes, búsqueda en listas largas y progressive disclosure. | La taxonomía se diseña para futuras facetas Domain / Class / Role / Context / Review state. |

Fuentes primarias y referencias:

- NIST SP 800-82 Rev. 3: <https://csrc.nist.gov/pubs/sp/800/82/r3/final>
- ISA-95: <https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard>
- ISA/IEC 62443: <https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards>
- GLPI — Asset type: <https://help.glpi-project.org/documentation/tabs/common_fields/asset_type>
- NetBox device types: <https://netboxlabs.com/docs/netbox/models/dcim/devicetype/>
- Nautobot roles: <https://docs.nautobot.com/projects/core/en/stable/user-guide/core-data-model/organization/role/>
- Microsoft Defender for IoT device inventory: <https://learn.microsoft.com/azure/defender-for-iot/organizations/how-to-manage-device-inventory-for-organizations>
- Carbon Data Table: <https://carbondesignsystem.com/components/data-table/usage/>

## Decisión

### 1. Domain es semántica, no estado

`TechnologyDomain` permanece cerrado a:

```text
IT | OT
```

No se agregan `shared`, `hybrid`, `unknown` ni `unclassified` por conveniencia. Esos conceptos describen ambigüedad, ausencia de evidencia o estado del proceso de clasificación, no un tercer dominio tecnológico.

Un activo que todavía no pueda proyectarse de forma segura conserva una `TaxonomyDecision` no resuelta antes de producir una proyección canónica.

### 2. Asset Class responde “¿qué clase de tecnología es?”

V02-010 introduce catálogos diferenciados.

IT:

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

OT:

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

La granularidad se mantiene estable y funcional para inventario. Un fabricante, modelo comercial o subtipo concreto (`PLC`, `RTU`, `Notebook`, etc.) no se convierte automáticamente en clase canónica.

### 3. Role responde “¿qué función cumple?”

Roles IT iniciales:

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

Roles OT iniciales:

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

Un role puede evolucionar mediante `custom:<name>` cuando exista una necesidad justificada y auditable. Los valores custom no habilitan clases arbitrarias.

### 4. Clasificación y proyección son conceptos distintos

`TechnologyTaxonomyAssessment` conserva una decisión para cada dimensión:

- `classified`;
- `unknown`;
- `unclassified`;
- `conflict`.

Una decisión clasificada registra además:

- valor;
- método: `observed | normalized | inferred | manual`;
- `reviewRequired`;
- `ruleId`;
- `reasonCode` cuando aporta explicación.

`unknown`, `unclassified` y `conflict` requieren revisión humana y no se convierten silenciosamente en un valor canónico.

La proyección escalar `TechnologyAsset.domain / assetClass / role` sólo es válida cuando la dimensión correspondiente está `classified` y coincide exactamente con el assessment.

### 5. Método de clasificación y autoridad son independientes

V02-009 ya modela autoridad y provenance. V02-010 añade `ProvenanceRecord.derivation` para indicar cómo se obtuvo el valor.

Ejemplo:

```text
source = GLPI (authoritative para inventario)
GLPI type = Notebook (observado)
assetClass = endpoint (normalizado por NEXUS)
role = user_endpoint (inferido, reviewRequired)
```

Que GLPI sea una fuente autoritativa no convierte una inferencia de NEXUS en un hecho observado.

### 6. System / operational context no es Asset Class

Se introduce `OperationalContextReference` con kinds iniciales:

```text
system
service
environment
site
network_segment
security_zone
custom:*
```

Esto permite referenciar contextos sin hardcodear plantas, sistemas internos o topologías dentro de la taxonomía.

V02-010 **no** convierte esos contextos en `TechnologyAsset` ni define todavía su grafo completo. Las relaciones/evidence de contexto se expandirán cuando el dominio lo necesite.

### 7. Mapping GLPI centralizado y fail-explicit

El mapping GLPI vive en una única frontera del adapter. La regla es:

```text
GLPI item type != NEXUS assetClass
GLPI Type != NEXUS role
```

El primer vertical sigue leyendo `Assets/Computer`. Cuando `Computer.type` aporta una señal conocida, una regla explícita normaliza el resultado. Ejemplos iniciales:

| GLPI item type | GLPI Type normalizado | NEXUS |
| --- | --- | --- |
| Computer | Notebook / Laptop / Desktop / Workstation | IT / endpoint / user_endpoint* |
| Computer | Server / Physical Server | IT / server / infrastructure_service* |
| Computer | Engineering Workstation / Industrial Workstation | OT / industrial_compute / engineering_workstation |
| Computer | HMI / Human Machine Interface / Operator Station | OT / operator_interface / supervision* |
| Computer | Historian / Historian Server | OT / industrial_compute / historian |

`*` indica que el role puede requerir revisión porque el nombre de un tipo de hardware no demuestra por sí solo la función real.

Un `Computer` sin Type reconocido conserva el vertical Live mediante una regla de compatibilidad explícita:

```text
IT / endpoint / user_endpoint
reviewRequired = true
method = inferred
ruleId = glpi.computer.compatibility-default
```

Esto no se presenta como verdad fuerte. Es deuda de migración visible.

Item types futuros sin regla quedan `unclassified`; no se inventa una taxonomía por semejanza.

### 8. Migración aditiva, sin big-bang

El snapshot continúa en schema `0.2` para no romper V02-008/V02-009 durante este ticket.

Por ello:

- `TechnologyAsset.taxonomy` y `operationalContexts` son opcionales en el contrato base durante el puente V02-010 → V02-011;
- providers nuevos o migrados a v2 deben emitirlos;
- `validateTechnologySnapshotTaxonomy()` actúa como gate v2 estricto;
- aliases legacy permanecen temporalmente en el tipo base, pero son rechazados dentro de un `TechnologyTaxonomyAssessment` v2.

V02-011 debe completar la migración del dataset/consumidores y permitir retirar ese puente con un cambio de schema cuando corresponda.

## Alternativas evaluadas y rechazadas

### Copiar directamente GLPI item types

**Rechazada.** Acopla el dominio al proveedor y no resuelve Type configurable ni OT.

### Usar `domain = hybrid/shared/unknown`

**Rechazada.** Mezcla estado de conocimiento con semántica tecnológica. La ambigüedad se conserva como decisión no resuelta.

### Poner PLC/HMI/Notebook en `role`

**Rechazada.** Confunde forma/subtipo con función. Un mismo tipo físico puede cumplir roles distintos.

### Modelar Purdue/ISA-95 como jerarquía de clases

**Rechazada.** Los niveles sirven como contexto lógico/operacional y no describen de forma universal la clase del activo.

### Convertir zones de IEC 62443 en clases OT

**Rechazada.** Una zona representa un agrupamiento de ciberseguridad; pertenece a contexto/topología.

### Mega-enumeración cerrada de todo hardware IT/OT

**Rechazada.** Sería frágil, difícil de gobernar y convertiría modelos/subtipos específicos en cambios de contrato.

### Strings libres para todas las dimensiones

**Rechazada.** Oculta typos/sinónimos, impide analytics consistente y vuelve imposible validar mappings.

## UX futura

La UI no debe mostrar la taxonomía como un único árbol profundo. Asset Explorer 2.0 debería tratar al menos estas dimensiones como facetas independientes:

```text
Domain | Asset Class | Role | Operational Context | Classification State | Review Required
```

Listas largas deberán soportar búsqueda. La pantalla de detalle podrá mostrar progresivamente método, regla y provenance cuando el usuario necesite explicar una clasificación, sin convertir cada fila del Explorer en una auditoría completa.

## Consecuencias positivas

- IT y OT pueden convivir sin reducir OT a endpoints IT con otra etiqueta.
- clase y función quedan separadas;
- incertidumbre y conflictos pueden permanecer visibles;
- source vocabulary no contamina el contrato canónico;
- futuras fuentes pueden aportar claims sin duplicar mappings dispersos;
- analytics y filtros futuros disponen de dimensiones estables;
- provenance puede explicar por qué una clasificación existe.

## Costos y límites

- existe un puente temporal con aliases legacy hasta V02-011;
- el mapping inicial GLPI sólo formaliza `Computer`; otros item types requieren reglas futuras antes de proyectarse;
- todavía no existe UI de revisión humana;
- operational context es referencia, no entidad/grafo completo;
- V02-010 no define persistencia durable del catálogo ni historial de decisiones taxonómicas;
- una taxonomía seria necesitará gobernanza para `custom:*` y evolución versionada.

## Relación con ADR anteriores

- ADR-0002 sigue vigente para **representación dentro de GLPI**, no como taxonomía canónica NEXUS.
- ADR-0011 queda refinado: mantiene `domain / assetClass / role`, pero V02-010 corrige la semántica y granularidad de clase/rol.
- ADR-0019 permanece vigente: evidencia, claims, conflictos y autoridad no se descartan; V02-010 añade el método de derivación taxonómica y evita transformar inferencia débil en hecho.
