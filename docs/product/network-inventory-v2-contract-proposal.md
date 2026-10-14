# Network Inventory V2 — propuesta de contrato, no implementación

PR 10, 2026-10-14, baseline `3a1f4eef9147323103c88c2d77ad04670b733bb4`. NEXUS 1.0 — IT CMDB & Asset Management. Esta propuesta requiere decisión humana antes de crear types, validadores, adapters, endpoints o UI. La [auditoría de capacidades](../integrations/network-inventory-v2-capability-audit.md) delimita qué está respaldado y qué permanece desconocido.

## Corte recomendado: tarjetas asociadas al Computer

El primer contrato representa registros NetworkCardItem vinculados al Computer canónico, enriquecidos opcionalmente con NetworkCard. No representa interfaces completas del sistema operativo, direcciones IP, conectividad efectiva ni relaciones físicas con otro equipo.

Las declaraciones siguientes son **pseudocódigo TypeScript para revisión**, dentro de documentación. No se añaden archivos .ts, exports ni validadores Network al producto. El nombre NetworkInventoryV2 no significa que todas las capacidades de red estén cubiertas: su alcance inicial queda explícito en networkCards.

```ts
import type { HardwareEvidenceV2 } from "./hardware.js";
import type { SoftwareSectionV2 } from "./software.js";

type NetworkEvidenceV2 = HardwareEvidenceV2;
// Reutiliza adquisición, cinco variantes y paginación; no atributos de software.
type NetworkSectionV2<T> = SoftwareSectionV2<T>;

interface NetworkCardDefinitionV2 extends NetworkEvidenceV2 {
  readonly definitionId: string | null;
  readonly designation: string | null;
  readonly manufacturer: string | null;
  readonly model: string | null;
  readonly defaultMacAddress: string | null;
  // Etiqueta de catálogo literal; no velocidad de enlace ni unidad inventada.
  readonly bandwidthLabel: string | null;
}

interface NetworkCardAttachmentV2 extends NetworkEvidenceV2 {
  readonly attachmentId: string | null;
  // Puede conocerse por referencia reducida aunque no se adquiera el catálogo.
  readonly definitionId: string | null;
  // Etiqueta reducida network_card.designation; no nombre de interfaz.
  readonly designation: string | null;
  readonly macAddress: string | null;
  readonly busId: string | null;
  readonly definition: NetworkCardDefinitionV2 | null;
}

interface NetworkInventoryV2 {
  readonly contractVersion: "2";
  readonly assetId: string;
  readonly networkCards: NetworkSectionV2<NetworkCardAttachmentV2>;
}
```

Reutilizar SoftwareSectionV2 evita introducir otra semántica de adquisición/paginación. Si el nombre importado resulta inadecuado para gobernanza del dominio, decidir una abstracción compartida en la futura entrega de contratos; no refactorizar Hardware/Software ahora. NetworkEvidenceV2 es política de fuentes, no herencia de componentes físicos ni prueba de su identidad.

## Mapeo permitido y límites

| Campo propuesto | Evidencia upstream | Regla |
| --- | --- | --- |
| assetId | TechnologyAsset.id del provider configurado | Preservar literalmente; no derivar de GLPI id, IP, MAC, hostname o serial |
| attachmentId | NetworkCardItem.id y namespace fuente/instancia/asociación | Identidad del registro de asociación dentro del inventario, no identidad física de por vida |
| definitionId | network_card.id explícito | ID lógico de definición de catálogo; no prueba consulta GET del catálogo |
| designation en asociación | network_card.designation | Conservar etiqueta reducida; el schema no dice network_card.name |
| macAddress | NetworkCardItem.mac | Literal o null; no usar mac_default como fallback, no deduplicar por MAC |
| busId | NetworkCardItem.busID | Literal o null; no inferir tipo Ethernet/Wi-Fi/virtual desde un nombre o dirección de bus |
| definition | GET Components/NetworkCard/{id} realmente adquirido | Nullable; conserva evidencia propia del catálogo; no inventar respuesta enriquecida |
| Campos de definición | designation, manufacturer.name, model.name, mac_default, bandwidth | Etiquetas literales; no requests de catálogo global ni unidad/velocidad negociada inventada |

El adapter futuro podrá entregar una asociación útil con designation/MAC/busID y definition null. Debe distinguir sección explícitamente sin enriquecimiento solicitado de enriquecimiento intentado pero fallido; para el primero no afirmar un fallo de fuente, para el segundo partial con gap. Acordar esta política antes de implementación para que complete no prometa catálogo exhaustivo. No añadir un campo runtime “estado up/down” desde NetworkCardItem.status: es estado administrativo, no estado de enlace.

## Identidad y evidencia

Usar el namespace existente de SourceReference/sourceReferenceKey: source + sourceInstanceId + sourceScope + entityType + externalId. El adapter exige instancia configurada y ancla Computer única válida. Los IDs externos se validan, no se resuelven por etiqueta. El scope de adquisición conserva la colección real; el namespace lógico de definición se mantiene estable y no finge una consulta a un catálogo aún no adquirido. Especificar esos namespaces en los tests futuros antes de congelar el contrato.

La identidad de asociación permanece estable mientras conserve su registro/alcance fuente; no garantiza identidad física tras borrado/recreación o traslado entre activos. null conserva observaciones no correlacionables; no es una identidad compartida. El futuro lector GLPI deberá rechazar IDs fuente inválidos en vez de inventarlos. Dos asociaciones con la misma definición o MAC permanecen separadas. Cambiar MAC/label no cambia el ID de un registro fuente existente. No re-keyear el activo canónico.

Cada registro requiere sourceReferences o provenance válidos; la evidencia de sección no sustituye la del registro. CollectedAt es adquisición; observedAt original queda null si no está respaldado. SourceReference.observedAt registra recepción/documentación de la referencia conforme a la política vigente. Date_creation, date_mod, last_inventory_update y hora de consulta no se convierten automáticamente en observación original de la tarjeta o enlace. Timestamps deben tener zona válida; nunca asignar UTC a una fecha ambigua.

Provenance preserva fieldPath relativo al registro, fuente, autoridad, derivation, observedAt/ingestedAt y evidencia. Si sólo hay evidencia directa, provenance: [] es válido con SourceReference. No inventar confidence ni inferencias. Un namespace/ID conocido desde una referencia embebida no permite fabricar evidencia de adquisición del objeto de catálogo. Conservar discrepancias entre etiqueta embebida y catálogo, no sobrescribirlas silenciosamente.

## Cobertura y paginación

| Variante | Significado acotado al corte de tarjetas |
| --- | --- |
| complete | Colección de asociaciones adquirida y agotamiento demostrado; no demuestra todas las interfaces del OS ni todos los atributos conocidos |
| partial | Prefijo o registros adquiridos con gaps explícitos; puede tener cero elementos y catálogo no resuelto |
| unavailable | Fallo sin adquisición servible / falta de autorización / capacidad no soportada; sólo razón, sin items ni datos residuales |
| not_applicable | Sólo alcance explícitamente ajeno al contrato; no usar por 404 o por cero filas. El lector inicial Computer no debe emitirlo por heurística |
| not_requested | La sección no fue consultada; permite Demo o solicitud omitida sin leer GLPI |

Reusar seis razones canónicas: not_observed, unsupported, unauthorized, not_implemented, source_error, pagination_incomplete. Gaps con fieldPath estable, sin índice de array como identidad. Null significa atributo desconocido; no implica por sí solo una colección parcial. Una ausencia de atributo no obliga a inventar un gap si el contrato lo permite, pero debe declararse la cobertura de capacidades diferidas en documentación.

Pagination conserva offset/retrieved/total/nextOffset de una ventana canónica contigua. Retrieved cuenta asociaciones entregadas, no definiciones ni todas las tarjetas corporativas. Total puede ser desconocido; nextOffset null no demuestra agotamiento. Complete requiere ventana desde cero y coherencia con total conocido. Tras descartes/filtrado que rompen contigüidad, pagination null y gaps; no fabricar contadores. Una página vacía válida prueba únicamente ausencia de asociaciones en esa colección/entidad al adquirirla.

Si falla autorización en cualquier adquisición relevante, descartar el resultado accesible y no conservar páginas anteriores como partial; las reglas HTTP futuras deberán decidir el error NEXUS seguro, sin reenviar bodies. No publicar resultados vencidos ni snapshots truncados usados para autorizar lookup.

## Extensiones futuras, fuera del primer contrato

| Dominio futuro | Forma mínima a considerar después de obtener evidencia | Dependencia bloqueante actual |
| --- | --- | --- |
| NetworkInterfaceV2 | ID de puerto fuente, nombre literal, tipo explícito, MAC, referencia opcional a asociación de tarjeta, evidencia | No GET NetworkPort respaldado; una tarjeta puede tener varios puertos y un puerto virtual puede no tener tarjeta |
| Velocidad/estado | Valor con unidad y semántica nominal/configurada/reportada; estado fuente literal, fechas propias | if_speed sin unidad garantizada; Ethernet.speed declara Mbps pero no demuestra negociación/frescura |
| NetworkAddressAssignmentV2 | ID de registro/asociación, interfaceId nullable, dirección literal, familia/prefijo/máscara/gateway sólo observados, evidencia por claim | Sin schemas/rutas IPAddress/NetworkName/IPNetwork en este backup; múltiples IP por interfaz, sin identidad por dirección |
| VLAN/membresía | ID de relación fuente, VLAN ID explícito y puerto/activo verificables | Trunk no prueba VLAN; no ruta de membresía respaldada |
| NetworkEquipment/Printer | TechnologyAsset existente con identidad canónica y tipos respaldados; inventario de red compañero sólo después | Provider Live actual Computer; ampliar inventario requiere entrega propia, no duplicar activos dentro de este contrato |
| Relaciones | TechnologyRelationship/RelationshipEvidence existentes, con extremos canónicos y tipo/dirección/observación verificables | No claim puerto↔puerto/vecino disponible; misma subred/MAC/hostname no prueba conexión física |

Estas filas no son interfaces TypeScript exportadas ni compromisos de API. No añadir secciones permanentemente vacías que parezcan adquisiciones completas. No incorporar telemetría, counters de salud, tóner, SNMP, inferencias, herramientas externas ni un Network Explorer para completar artificialmente el contrato.

## Ejemplos y criterios para la siguiente decisión

[Ejemplos JSON](../integrations/network-inventory-v2-synthetic-examples.json): ocho casos explícitamente sintéticos, source demo e instancia SYNTH-NETWORK-AUDIT. Cubren cinco estados, vacío completo/parcial, autorización sin residuos, catálogo no resuelto, MAC desconocida y dos asociaciones legítimas con la misma MAC/definición. La MAC de catálogo distinta no reemplaza la observada. No son fixtures conectados al provider productivo ni evidencia de GLPI.

Antes de implementar: aprobar nombre/alcance card-only, namespaces de IDs, política de enriquecimiento opcional, casos de cobertura y límites. Después: types/validador → adapter → API con revisión de costos → Asset 360. Gate futuro: IDs literales incluidos espacios, URL segura, propietario/instancia exactos, MAC repetidas, nulls, páginas cortas/duplicadas/desordenadas, overflow, 401/403/404/errores y límites, cancelación/drain, ausencia de fallback y de inferencia de topología. No ejecutar esas entregas automáticamente desde esta propuesta.
