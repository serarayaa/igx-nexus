# Network Inventory V2 — contratos Computer Network Cards

Estado: implementación local para revisión humana, 2026-10-14. Esta entrega implementa la decisión aprobada después de la [propuesta histórica](network-inventory-v2-contract-proposal.md). La propuesta y los otros documentos de investigación conservan su contenido auditado; sus referencias a ausencia de implementación describen aquel checkpoint.

## Alcance y compatibilidad

`NetworkInventoryV2` versión literal `"2"` contiene únicamente `assetId` y `networkCards`: asociaciones NetworkCardItem de un Computer. No representa interfaces completas, IP, gateways, VLAN, velocidad negociada, estado de enlace ni topología. Nuevos dominios necesitan una decisión explícita de versión o contrato complementario; no se agregarán silenciosamente campos incompatibles a esta variante cerrada.

Se exportan `networkInventoryVersion`, `NetworkInventoryV2`, `NetworkCardAttachmentV2`, `NetworkCardDefinitionV2`, `NetworkEvidenceV2`, `NetworkSectionV2` y `validateNetworkInventoryV2` desde `@igx-nexus/types`. Se reutilizan los contratos canónicos SourceReference, provenance y HardwareEvidenceV2; NetworkSectionV2 reutiliza SoftwareSectionV2, incluidos sus cinco estados y ventana de paginación. No cambian Hardware V2, Software/OS V2 ni snapshot 0.2.

## Identidad, atributos y evidencia

La asociación tiene attachmentId, definitionId, designation, macAddress, busId y definition. El catálogo opcional tiene definitionId, designation, manufacturer, model, defaultMacAddress y bandwidthLabel. Los atributos desconocidos son null explícito. Los IDs propios rechazan vacío y espacios exteriores, conservan literalmente espacios interiores y otros caracteres válidos. No hay reconstrucción, trim, normalización ni asignación de identidad.

Las MAC son cadenas observadas, sin reformateo, deduplicación ni validación de formato que elimine evidencia original. Asociaciones distintas pueden compartir MAC y catálogo. Sólo se rechaza la repetición de un attachmentId explícito dentro de la sección; múltiples IDs desconocidos son válidos. La MAC predeterminada del catálogo nunca completa macAddress. bandwidthLabel no implica unidad ni velocidad de enlace. Una definición anidada debe coincidir literalmente con definitionId de la asociación, incluidos los valores null.

Asociación y catálogo necesitan evidencia independiente: al menos una SourceReference válida o provenance válida en cada registro. Una sección recopilada, incluso vacía, necesita fuente válida. collectedAt y observedAt se validan como timestamps ISO con zona; observedAt puede ser null y no puede ser posterior a collectedAt. Se reutilizan los validadores de fuente y provenance existentes. Las claves permitidas y los fieldPath de provenance están restringidos al contrato de tarjetas; los campos de relaciones ajenos se rechazan.

## Cobertura y paginación

- complete admite una colección vacía con evidencia; no admite gaps ni continuación pendiente.
- partial requiere gaps explícitos, evidencia y una ventana coherente, aunque no haya registros.
- unavailable lleva un motivo canónico, sin datos retenidos. Una denegación de autorización usa unavailable/unauthorized; partial con motivo unauthorized se rechaza.
- not_applicable y not_requested no llevan datos ni evidencia residual.

Los contadores de paginación son enteros seguros no negativos; retrieved coincide con items.length, la ventana no supera total conocido y nextOffset avanza exactamente tras una ventana no vacía. complete comienza en cero y agota el total conocido. Se permite paginación null y total desconocido según el contrato existente.

definition:null no genera por sí mismo un gap: el enriquecimiento no solicitado no es un fallo. Si se intenta y falla, el productor debe emitir partial según la evidencia. Este validador puro no conoce el historial de I/O; no puede demostrar que se solicitó un catálogo, que una fuente dijo la verdad, que existe el Computer ni que hay permisos efectivos. Estos controles corresponden a una futura integración revisada. No se implementa adaptador, endpoint, UI ni política RBAC.

## Verificación y handoff

Los ocho escenarios de [investigación](../integrations/network-inventory-v2-synthetic-examples.json) se reproducen exactamente en fixtures sintéticos y se verifican también contra el validador público compilado. No son respuestas GLPI ni evidencia de capacidades pobladas. Las pruebas cubren duplicados legítimos, catálogo ausente, MAC desconocida, vacío completo, parcial, autorización, estados no recopilados, IDs literales y entradas inválidas sin mutación.

Resultados y limitaciones de ejecución: [informe de entrega](../audits/pr10-network-contracts-v2.md). Detención antes de commit, push y PR; cualquier integración posterior requiere autorización independiente. No GLPI Live, discovery, SNMP ni cambios de infraestructura.
