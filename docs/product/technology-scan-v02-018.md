# Technology Scan — V02-018 Technology Map 2.0

Consulta: **2026-09-21**.

Este scan busca patrones de producto y operación. No autoriza copiar interfaces ni importar dependencias.

## ServiceNow Unified Map

Fuentes oficiales:

- https://www.servicenow.com/docs/r/servicenow-platform/unified-map/cmdb-workspace-unified-map.html
- https://www.servicenow.com/docs/r/servicenow-platform/unified-map/unified-map-appearance.html
- https://www.servicenow.com/docs/r/servicenow-platform/unified-map/unified-map-configure-filters.html

Patrones observados:

- home node explícito;
- niveles configurables;
- filtros por relación/clase/source/location/ownership;
- selección de CI con panel contextual;
- selección de relaciones con atributos;
- home node no se filtra;
- límites de elementos para evitar mapas inmanejables.

Decisión NEXUS:

- **Adopt:** focus/home node, depth, filters, contexto seleccionado.
- **Adopt:** scope explícito y controlado.
- **Hold:** edición de relaciones.
- **Hold:** timeline/related ITSM items.
- **Reject para V02-018:** convertir conectividad en impacto demostrado sin contrato.

## NetBox Visual Explorer

Fuente oficial:

- https://netboxlabs.com/docs/visual-explorer/

Patrones observados:

- cada vista parte de un scope concreto;
- site/location/rack reducen el universo;
- la organización completa no se renderiza como un único “hairball”;
- selección abre details panel;
- estado de la vista queda en URL y puede compartirse;
- la visualización refleja el System of Record, no la red viva.

Decisión NEXUS:

- **Adopt:** scope-first.
- **Adopt:** contextual details.
- **Adopt:** shareable URL state.
- **Adopt:** declarar que una visualización de CMDB no equivale a observabilidad live.
- **Reject:** mapa global.

## Atlassian Assets references

Fuente oficial:

- https://support.atlassian.com/assets/docs/what-is-a-reference/

Patrones observados:

- outbound reference: desde el objeto actual hacia otro;
- inbound reference: desde otro objeto hacia el actual;
- reference type describe la semántica de la conexión.

Decisión NEXUS:

- **Adopt:** dirección relativa al focus CI;
- **Adopt:** tipo explícito;
- **Reject:** inferir causalidad sólo desde una referencia.

## Resultado tecnológico

| Opción | Decisión | Motivo |
| --- | --- | --- |
| RelationshipGraph actual | Evolve | ya resuelve el vecindario acotado |
| relationship-model actual | Evolve | semántica y profundidad ya están separadas del layout |
| hash routing actual | Evolve | puede serializar el state requerido |
| Relationship Evidence v2 | Adopt | fuente normativa de semántica/evidencia |
| nueva graph library | Hold | no existe limitación demostrada en el scope 1/2 |
| router nuevo | Hold | hash routing sigue cubriendo deep links |
| graph analytics | Hold | pertenece a una capacidad posterior |
| impact/risk score | Reject | V02-018 no posee contrato defendible |
| global hairball | Reject | contradice Product IA v2 y reduce utilidad |

## Guardrail

Technology Map 2.0 es un **workspace de investigación de relaciones registradas**.

No es:

- observabilidad;
- Service Mapping;
- dependency discovery;
- causa raíz;
- predicción de fallas;
- motor de impacto.
