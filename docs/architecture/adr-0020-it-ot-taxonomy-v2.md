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
| NIST SP 800-82 Rev. 3 | OT se caracteriza por interactuar/controlar el entorno físico y por requisitos particulares de seguridad, disponibilidad y confiabilidad. | OT no se modela como un subtipo genérico de endpoint IT y no se deduce únicamente de la forma física del equipo. |
| ISA-95 | Los niveles 0–4 describen fronteras lógicas de actividad e integración, no una lista universal de clases de hardware. | Un nivel ISA-95/Purdue no pertenece a `assetClass` ni `role`; podrá representarse como contexto cuando exista evidencia. |
| ISA/IEC 62443 | Zones y conduits describen segmentación/contexto de ciberseguridad del sistema bajo consideración. | `security_zone` es contexto; un conduit o flujo corresponde a relaciones/topología, no a clase del activo. |
| GLPI | `ComputerType`/Asset Type es vocabulario administrable por cada instancia; GLPI no entrega una taxonomía universal predefinida de Notebook/Server/etc. | `GLPI item type` y `GLPI Type` se preservan como evidencia de fuente y sólo se normalizan mediante reglas explícitas. Type ausente queda `unknown`; Type presente sin mapping queda `unclassified`. |
| NetBox / Nautobot | Device Type representa hardware/modelo; Device Role representa función; Location/Platform son dimensiones separadas. | NEXUS separa clase, función y contexto operacional. |
| Microsoft Defender for IoT | Device Type/Subtype, Purdue Level, Site y Zone aparecen como dimensiones separadas del inventario. | Refuerza filtros/facetas independientes, no una mega-jerarquía única. |
| ServiceNow OT | OT puede extender CIs basados tanto en hardware específico industrial como en hardware de clase IT —computadores, servidores y red— usado dentro de sistemas OT. | Un `Computer` o `Server` no demuestra por sí solo `domain=IT`; dominio y función requieren evidencia contextual o reglas gobernadas. |
| Carbon / patrones de faceted navigation | Interfaces densas necesitan filtros independientes, búsqueda en listas largas y progressive disclosure. | La taxonomía se diseña para futuras facetas Domain / Class / Role / Context / Review state. |

Fuentes primarias y referencias:

- NIST SP 800-82 Rev. 3: <https://csrc.nist.gov/pubs/sp/800/82/r3/final>
- ISA-95: <https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard>
- ISA/IEC 62443: <https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards>
- GLPI — Asset type: <https://help.glpi-project.org/documentation/tabs/common_fields/asset_type>
- NetBox device types: <https://netboxlabs.com/docs/netbox/models/dcim/devicetype/>
- Nautobot roles: <https://docs.nautobot.com/projects/core/en/stable/user-guide/core-data-model/organization/role/>
- Microsoft Defender for IoT device inventory: <https://learn.microsoft.com/azure/defender-for-iot/organizations/how-to-manage-device-inventory-for-organizations>
- ServiceNow OT CI extension model: documentación pública de Operational Technology Management / OT CIs.
- Carbon Data Table: <https://carbondesignsystem.com/components/data-table/usage/>

## Decisión

### 1. Domain es semántica, no estado

`TechnologyDomain` permanece cerrado a:

```text
IT | OT
```

No se agregan `shared`, `hybrid`, `unknown` ni `unclassified` por conveniencia. Esos conceptos describen ambigüedad, ausencia de evidencia o estado del proceso de clasificación, no un tercer dominio tecnológico.

Un equipo construido sobre hardware habitual de IT puede cumplir una función OT. Por ello `itemType=Computer`, fabricante, modelo, sistema operativo o apariencia física no bastan para afirmar `domain=IT`.

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

La granularidad se mantiene estable y útil para inventario. Un fabricante, modelo comercial, nivel Purdue o vocabulario específico de una fuente no se convierte automáticamente en clase canónica.

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

### 4. Assessment y scalar projection son conceptos distintos

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

`unknown`, `unclassified` y `conflict` requieren revisión humana. No contienen un valor canónico fingido.

Cuando una dimensión está `classified`, `TechnologyAsset.domain / assetClass / role` debe coincidir con ese valor. Durante el puente V02-010 → V02-011, una decisión no resuelta puede convivir con un scalar de compatibilidad requerido por consumidores legacy. Ese scalar **no cambia ni resuelve el assessment** y debe quedar marcado como fallback.

### 5. Método de clasificación y autoridad son independientes

V02-009 ya modela autoridad y provenance. V02-010 añade `ProvenanceRecord.derivation` para indicar cómo se obtuvo el valor.

Ejemplo:

```text
source = GLPI (authoritative para inventario)
GLPI type = Notebook (observado)
assetClass = endpoint (normalizado por NEXUS)
domain = IT (inferido desde un Type configurable, reviewRequired)
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

### 7. Mapping GLPI centralizado, gobernado y fail-explicit

El mapping GLPI vive en `services/api/src/taxonomy.ts`.

La regla base es:

```text
GLPI item type != NEXUS assetClass
GLPI Type != NEXUS role
hardware shape != NEXUS domain
```

El primer vertical sigue leyendo `Assets/Computer`. Como `ComputerType` es configurable en GLPI, los aliases reconocidos son una política NEXUS explícita, no un supuesto sobre todas las instalaciones GLPI.

| GLPI item type | GLPI Type normalizado | Assessment NEXUS |
| --- | --- | --- |
| Computer | Notebook / Laptop / Desktop / Workstation | IT inferido / endpoint / user_endpoint* |
| Computer | Server / Physical Server | IT inferido / server / infrastructure_service* |
| Computer | Engineering Workstation / Industrial Workstation | OT / industrial_compute / engineering_workstation |
| Computer | HMI / Human Machine Interface / Operator Station | OT / operator_interface / supervision* |
| Computer | Historian / Historian Server | OT / industrial_compute / historian |
| Computer | Type ausente | `unknown / unknown / unknown` |
| Computer | Type presente sin regla | `unclassified / unclassified / unclassified` |
| otro item type sin regla | cualquier Type | `unclassified / unclassified / unclassified` |

`*` indica una dimensión inferida que requiere revisión porque el nombre configurable del Type no demuestra por sí solo el contexto/función real.

No se usan heurísticas ocultas basadas en hostname, modelo, fabricante o strings parciales para “adivinar” IT/OT.

### 8. Bridge de compatibilidad visible

V02-008 y consumidores heredados todavía esperan scalars concretos. Para no convertir V02-010 en un big-bang, `projectGlpiTaxonomyForLegacyScalars()` aplica:

```text
assessment completamente classified
→ usar sus valores
→ compatibilityFallback = false

assessment con unknown/unclassified/conflict
→ scalar temporal IT / endpoint / user_endpoint
→ compatibilityFallback = true
→ ruleId = glpi.computer.compatibility-projection
```

El adapter registra `nexus.taxonomy.*.state`, `ruleId`, `reviewRequired`, `compatibilityProjection` y `projectionRuleId`. Así una pantalla legacy puede seguir funcionando sin que analytics o una futura UI confundan el fallback con una clasificación resuelta.

V02-011 debe retirar este bridge al migrar dataset y consumidores al assessment v2.

### 9. Reconciliation es taxonomy-aware

V02-009 ya conservaba claims, conflictos y provenance, pero su `projectCanonicalAsset()` original no preservaba `taxonomy` ni `operationalContexts` porque esos campos no existían entonces.

V02-010 extiende la proyección:

- fusiona `operationalContexts` de forma determinista;
- conserva la decisión taxonómica asociada al claim seleccionado;
- si la política resuelve una discrepancia, conserva el assessment del claim ganador y los claims alternativos permanecen en el envelope;
- si existe empate taxonómico no resoluble, el assessment resultante usa `state=conflict`, `reviewRequired=true` y razón explícita;
- si gana un claim legacy sin assessment v2, la dimensión queda `unclassified` en lugar de inventar método/valor;
- `derivation` participa en la deduplicación de provenance para no colapsar evidencia obtenida de forma distinta.

Esto evita que reconciliar fuentes degrade la explicabilidad introducida por V02-010.

### 10. Migración aditiva, sin big-bang

El snapshot continúa en schema `0.2` para no romper V02-008/V02-009 durante este ticket.

Por ello:

- `TechnologyAsset.taxonomy` y `operationalContexts` son opcionales en el contrato base durante el puente V02-010 → V02-011;
- providers migrados a v2 deben emitir assessment/context y pasar el gate v2;
- `validateTechnologySnapshotTaxonomy()` valida estructura, invariantes y contextos;
- aliases legacy permanecen temporalmente en el tipo base, pero son rechazados dentro de un `TechnologyTaxonomyAssessment` v2;
- un assessment no resuelto puede coexistir temporalmente con scalar legacy, pero nunca se considera `classified` por ello.

Demo y GLPI Live ejecutan tanto `validateTechnologySnapshot()` como `validateTechnologySnapshotTaxonomy()`.

## Alternativas evaluadas y rechazadas

### Copiar directamente GLPI item types

**Rechazada.** Acopla el dominio al proveedor y no resuelve Type configurable ni OT.

### Asumir `Computer = IT`

**Rechazada.** Hardware de clase PC/server/network puede participar en sistemas OT. Sin evidencia/contexto suficiente, NEXUS debe conservar `unknown` o `unclassified`.

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

### Descartar taxonomía durante reconciliation

**Rechazada.** Rompe provenance y puede convertir una proyección escalar en verdad no explicable después de unir fuentes.

## UX futura

La UI no debe mostrar la taxonomía como un único árbol profundo. Asset Explorer 2.0 debería tratar al menos estas dimensiones como facetas independientes:

```text
Domain | Asset Class | Role | Operational Context | Classification State | Review Required
```

Listas largas deberán soportar búsqueda. La pantalla de detalle podrá mostrar progresivamente método, regla, fallback y provenance cuando el usuario necesite explicar una clasificación, sin convertir cada fila del Explorer en una auditoría completa.

Una UI futura debe diferenciar visualmente:

```text
classified
inferred/review required
unknown
unclassified
conflict
compatibility fallback
```

## Consecuencias positivas

- IT y OT pueden convivir sin reducir OT a endpoints IT con otra etiqueta;
- clase y función quedan separadas;
- incertidumbre y conflictos permanecen visibles;
- source vocabulary no contamina el contrato canónico;
- futuras fuentes pueden aportar claims sin duplicar mappings dispersos;
- analytics y filtros futuros disponen de dimensiones estables;
- provenance puede explicar por qué una clasificación existe;
- reconciliation ya no elimina taxonomy/context.

## Costos y límites

- existe un bridge temporal de scalars/aliases legacy hasta V02-011;
- el mapping inicial GLPI sólo formaliza `Computer`; otros item types requieren reglas futuras antes de proyectarse;
- los aliases de Type son gobernados por NEXUS y deberán revisarse contra la configuración real de cada instancia;
- todavía no existe UI de revisión humana;
- operational context es referencia, no entidad/grafo completo;
- V02-010 no define persistencia durable del catálogo ni historial de decisiones taxonómicas;
- una taxonomía seria necesitará gobernanza para `custom:*`, reglas manuales y evolución versionada.

## Relación con ADR anteriores

- ADR-0002 sigue vigente para **representación dentro de GLPI**, no como taxonomía canónica NEXUS.
- ADR-0011 queda refinado: mantiene `domain / assetClass / role`, pero V02-010 corrige la semántica y granularidad de clase/rol.
- ADR-0019 permanece vigente: evidencia, claims, conflictos y autoridad no se descartan; V02-010 añade método de derivación, assessment taxonómico y preservación de taxonomy/context durante canonical projection.
