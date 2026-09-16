# ADR-0020 — IT/OT Taxonomy v2

Estado: **Propuesto — V02-010 / PR #67**. Se considerará aceptado tras merge manual del PR y CI verde.

## Contexto

V02-001 creó un modelo canónico mínimo con `domain`, `assetClass` y `role`, suficiente para desacoplar NEXUS de GLPI, pero el vocabulario inicial mezclaba forma física y función (`compute`, `control`, `laptop`, `server`, `plc`, `hmi`). V02-005 añadió un mapping provisional para habilitar el primer vertical Live:

```text
GLPI Computer → IT / compute / custom:glpi-computer
```

Ese mapping cumplió su propósito de integración, pero no es una taxonomía defendible para un Intelligence Layer multisource IT/OT. V02-009 dejó además pendiente cómo preservar taxonomía y contexto durante reconciliation.

V02-010 resuelve ambas deudas bajo dos principios:

> **IT and OT share a platform, not a taxonomy.**
>
> **Evidence before inference.**

## Evidencia externa

La investigación contrastó fuentes primarias y patrones de productos maduros:

| Fuente | Hallazgo relevante | Adaptación NEXUS |
| --- | --- | --- |
| NIST SP 800-82 Rev. 3 | OT se define por interacción/control del entorno físico y requisitos operacionales, no por apariencia del hardware. | No inferir IT/OT sólo desde `Computer`, modelo o fabricante. |
| ISA-95 | Los niveles describen fronteras lógicas/funcionales. | Purdue/ISA-95 es contexto, no `assetClass`. |
| ISA/IEC 62443 | Zones/conduits representan segmentación y comunicación del sistema bajo consideración. | `security_zone` pertenece a contexto; conduits/flows pertenecen a relaciones. |
| GLPI | Asset Type / ComputerType es vocabulario configurable por instancia; no existe un catálogo universal predefinido. | Preservar Type como evidencia y mapear sólo mediante reglas explícitas. |
| NetBox / Nautobot | Device Type/modelo físico y Device Role/función son dimensiones separadas. | Separar clase, rol y contexto. |
| Microsoft Defender for IoT | Type/Subtype, Purdue Level, Site y Zone son dimensiones distintas. | Futuras facetas independientes, no mega-jerarquía. |
| ServiceNow OT | CIs OT pueden estar montados sobre hardware típico de IT: computadores, servidores y red. | `Notebook`, `Server` o `NetworkEquipment` no prueban `domain=IT`. |

Referencias principales:

- NIST SP 800-82 Rev. 3: <https://csrc.nist.gov/pubs/sp/800/82/r3/final>
- ISA-95: <https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard>
- ISA/IEC 62443: <https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards>
- GLPI Asset Type: <https://help.glpi-project.org/documentation/tabs/common_fields/asset_type>
- NetBox Device Type: <https://netboxlabs.com/docs/netbox/models/dcim/devicetype/>
- Nautobot Role: <https://docs.nautobot.com/projects/core/en/stable/user-guide/core-data-model/organization/role/>
- Microsoft Defender for IoT inventory: <https://learn.microsoft.com/azure/defender-for-iot/organizations/how-to-manage-device-inventory-for-organizations>

## Decisión

### 1. `domain` es semántica, no estado de conocimiento

`TechnologyDomain` permanece cerrado a:

```text
IT | OT
```

`unknown`, `unclassified`, `conflict`, `hybrid` y `shared` no son domains. La incertidumbre vive en `TechnologyTaxonomyAssessment`.

### 2. `assetClass` describe clase tecnológica

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

La clase no contiene fabricante, modelo, planta, sistema, nivel Purdue ni zone.

### 3. `role` describe función

IT:

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

OT:

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

`custom:<name>` queda disponible como escape gobernado para funciones legítimas no cubiertas por el catálogo.

### 4. Assessment explícito

Cada dimensión tiene una `TaxonomyDecision`:

```text
classified
unknown
unclassified
conflict
```

Una decisión `classified` contiene:

- `value`;
- `method = observed | normalized | inferred | manual`;
- `reviewRequired`;
- `ruleId`;
- `reasonCode` cuando aporta contexto.

Los estados no resueltos requieren revisión humana y no contienen un valor fingido.

### 5. Método y autoridad son independientes

V02-009 ya modela authority/provenance. V02-010 agrega `ProvenanceRecord.derivation` para registrar **cómo** se obtuvo un claim sin confundir eso con la autoridad de la fuente.

Ejemplo válido:

```text
source authority = authoritative
source Type = HMI
assetClass derivation = normalized
role derivation = inferred
reviewRequired = true
```

### 6. Operational Context es ortogonal

`OperationalContextReference` introduce:

```text
system
service
environment
site
network_segment
security_zone
custom:*
```

Purdue/ISA-95, site y IEC 62443 zones pueden expresarse como contexto cuando exista evidencia. No se incorporan a `assetClass` ni `role`.

### 7. Mapping GLPI: hardware genérico no determina IT

El mapping vive centralizado en `services/api/src/taxonomy.ts`.

Reglas base:

```text
GLPI item type != NEXUS assetClass
GLPI Type != NEXUS role
hardware shape != NEXUS domain
```

Como `ComputerType` es configurable, NEXUS no trata sus nombres como estándar universal.

| GLPI Type | Assessment NEXUS |
| --- | --- |
| Notebook / Laptop / Desktop / Workstation | `unclassified / unclassified / unclassified` |
| Server / Physical Server | `unclassified / unclassified / unclassified` |
| Engineering Workstation / Industrial Workstation | `OT / industrial_compute / engineering_workstation` + reviewRequired |
| HMI / Human Machine Interface / Operator Station | `OT / operator_interface / supervision` + reviewRequired |
| Historian / Historian Server | `OT / industrial_compute / historian` + reviewRequired |
| Type ausente | `unknown / unknown / unknown` |
| Type presente sin regla | `unclassified / unclassified / unclassified` |
| item type futuro sin regla | `unclassified / unclassified / unclassified` |

Los tipos puramente físicos permanecen no resueltos porque el mismo hardware puede pertenecer a IT u OT según sistema/función. Los aliases con semántica operacional explícita se normalizan, pero siguen marcados para revisión porque el vocabulario upstream es configurable.

No se usan hostname, modelo, fabricante ni coincidencias parciales para adivinar la clasificación.

### 8. Bridge legacy visible y temporal

El contrato base `0.2` y V02-008 todavía requieren scalars concretos `domain/assetClass/role`. Para evitar un big-bang:

```text
assessment completamente classified
→ scalars = valores del assessment
→ compatibilityFallback = false

assessment unknown/unclassified/conflict
→ scalars temporales = IT / endpoint / user_endpoint
→ compatibilityFallback = true
→ projectionRuleId = glpi.computer.compatibility-projection
```

El bridge **no modifica el assessment**. El adapter publica:

```text
nexus.taxonomy.<dimension>.state
nexus.taxonomy.<dimension>.ruleId
nexus.taxonomy.<dimension>.reviewRequired
nexus.taxonomy.compatibilityProjection
nexus.taxonomy.projectionRuleId
```

V02-011 debe retirar este bridge al migrar consumers/dataset legacy.

### 9. Reconciliation es taxonomy-aware

V02-009 se integró antes de que existieran `taxonomy` y `operationalContexts`; su canonical projection original no podía preservarlos. V02-010 extiende `projectCanonicalAsset()` para:

- conservar/reconstruir `TechnologyTaxonomyAssessment`;
- fusionar `operationalContexts` de forma determinista;
- conservar el assessment asociado al claim ganador cuando la política resuelve una discrepancia;
- producir `state=conflict`, `reviewRequired=true` cuando una discrepancia taxonómica queda empatada/no resoluble;
- producir `unclassified` si el claim elegido proviene de un registro legacy sin assessment v2;
- mantener claims alternativos y conflictos en el envelope V02-009;
- incluir `derivation` en la deduplicación de provenance.

El scalar preservado por estabilidad durante un conflicto no significa que el conflicto se considere resuelto.

### 10. Gate v2 aditivo

Para no romper el schema `0.2` durante la migración:

- `TechnologyAsset.taxonomy` y `operationalContexts` son opcionales en el contrato base;
- providers migrados deben emitirlos y pasar `validateTechnologySnapshotTaxonomy()`;
- `validateTechnologySnapshot()` sigue cubriendo el contrato base;
- el gate taxonómico valida catálogo v2, invariantes Domain/Class/Role, scalar projection cuando la decisión está `classified`, context kind/source y existencia de assessment;
- aliases legacy permanecen temporalmente en el tipo base, pero son inválidos dentro del assessment v2.

Demo y GLPI Live ejecutan ambos gates.

## Alternativas rechazadas

### `Computer = IT`

Rechazada. Hardware de clase PC/server/network puede formar parte de OT.

### `Notebook/Server = IT` por Type

Rechazada. Sigue siendo forma física/configurable y no prueba el sistema o función donde opera.

### Copiar item types GLPI

Rechazada. Acopla NEXUS al proveedor y a vocabulario configurable.

### `domain = hybrid/shared/unknown`

Rechazada. Mezcla estado de conocimiento con semántica tecnológica.

### PLC/HMI/Notebook como `role`

Rechazada. Mezcla subtipo físico/familia con función.

### Purdue/ISA-95 como jerarquía de clases

Rechazada. Describe contexto lógico/operacional.

### IEC 62443 zone como clase OT

Rechazada. Es contexto de ciberseguridad/topología.

### Strings libres para todas las dimensiones

Rechazada. Impiden validación, analytics consistente y gobernanza.

### Descartar taxonomy/context durante reconciliation

Rechazada. Rompe provenance y explicabilidad multisource.

## Consecuencias

Positivas:

- IT y OT comparten plataforma sin colapsar su semántica;
- hardware, clase, función y contexto quedan separados;
- incertidumbre/conflictos permanecen visibles;
- source vocabulary no se convierte en contrato canónico sin reglas;
- futuras fuentes pueden aportar evidencia sin mappings dispersos;
- analytics futuros podrán filtrar por classification state/reviewRequired;
- reconciliation ya no pierde taxonomy/context.

Costos/deuda visible:

- existe un bridge de scalars/aliases legacy hasta V02-011;
- el mapping inicial formaliza únicamente `Computer`;
- aliases de Type deberán gobernarse contra la configuración real de la instancia;
- todavía no existe UI/persistencia de revisión manual;
- Operational Context es referencia, no grafo completo;
- V02-010 no implementa active scanning OT ni cambios de configuración en equipos.

## UX futura

Asset Explorer 2.0 debería tratar como facetas independientes:

```text
Domain | Asset Class | Role | Operational Context | Classification State | Review Required
```

Una UI futura debe diferenciar visualmente `classified`, `inferred/review required`, `unknown`, `unclassified`, `conflict` y `compatibility fallback`.

## Relación con ADR anteriores

- ADR-0002 sigue vigente para representación/configuración dentro de GLPI, no como taxonomía canónica NEXUS.
- ADR-0011 mantiene la estructura `domain / assetClass / role`, refinada semánticamente por este ADR.
- ADR-0015 conserva transporte, identidad inicial y mapping histórico V02-005; este ADR reemplaza su semántica taxonómica provisional para código nuevo.
- ADR-0019 conserva Evidence before inference, claims, conflictos y canonical identity; este ADR añade assessment taxonómico, derivation y preservación de context durante reconciliation.

Ver también [IT/OT Taxonomy v2](../taxonomy-v2.md) y [Threat Model Addendum V02-010](../security/threat-model-v02-010-taxonomy-addendum.md).
