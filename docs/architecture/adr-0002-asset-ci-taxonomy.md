# ADR-0002 — Taxonomía inicial de activos y CI

Estado: Aceptado

## Contexto

IGX NEXUS utilizará GLPI 11 como motor CMDB/ITAM. La GLPI High-Level REST API 2.3.0 expone clases nativas de activos y CI junto con tipos y modelos para varias familias. Para reducir deuda de mantenimiento, favorecer discovery/reconciliación y mantener compatibilidad con futuras actualizaciones, la taxonomía de NEXUS debe reutilizar esas clases nativas antes de crear Custom Assets.

## Decisión

La clasificación inicial de Innergex Chile será:

| Activo / CI | Clase GLPI | Clasificación recomendada |
| --- | --- | --- |
| Notebook | `Computer` | `ComputerType = Notebook` |
| Desktop | `Computer` | `ComputerType = Desktop` |
| Servidor físico | `Computer` | `ComputerType = Server` |
| Monitor | `Monitor` | `MonitorType` según tecnología/uso cuando aporte valor |
| Docking station | `Peripheral` | `PeripheralType = Docking Station` |
| Teclado, mouse, adaptador u otro accesorio inventariable | `Peripheral` | `PeripheralType` específico |
| Switch | `NetworkEquipment` | `NetworkEquipmentType = Switch` |
| Router | `NetworkEquipment` | `NetworkEquipmentType = Router` |
| Firewall | `NetworkEquipment` | `NetworkEquipmentType = Firewall` |
| Access Point | `NetworkEquipment` | `NetworkEquipmentType = Access Point` |
| UPS | `NetworkEquipment` | `NetworkEquipmentType = UPS` |
| Smartphone corporativo | `Phone` | `PhoneType = Smartphone` |
| Impresora / multifuncional | `Printer` | `PrinterType` específico |
| Rack | `Rack` | Tipo/modelo nativo cuando la API lo permita |
| PDU | `PDU` | Reservado para unidades de distribución eléctrica reales |
| Chasis / blade enclosure | `Enclosure` | Modelo nativo |
| Patch panel / infraestructura DC pasiva | `PassiveDCEquipment` | Tipo/modelo nativo |
| Cable inventariable | `Cable` | `CableType` específico |
| Software | `Software` | Clase nativa |
| Licencia | `SoftwareLicense` | Clase nativa |
| Certificado | `Certificate` | Clase nativa |
| Elemento descubierto aún no reconciliado | `Unmanaged` | Estado transitorio, no CI canónico |

`Appliance` no se utilizará como categoría genérica de hardware. En GLPI representa aplicaciones/appliances de negocio y no debe confundirse con equipos físicos especializados.

Para GLPI 11 no existe una clase nativa `UPS`. Los UPS gestionables por SNMP se normalizarán inicialmente como `NetworkEquipment` con tipo `UPS`; `PDU` se reservará exclusivamente para equipos cuya función sea distribución eléctrica. Esta decisión podrá revisarse si una versión futura de GLPI o GLPI Agent incorpora una clase nativa específica y una ruta de migración segura.

## Regla de modelado

La jerarquía de clasificación será:

1. **Clase nativa GLPI** para representar la familia técnica principal.
2. **Type** para expresar la función o subtipo operativo.
3. **Model** para identificar el modelo comercial/técnico del fabricante.
4. **Custom Asset** únicamente cuando una necesidad real no pueda representarse correctamente con clases, tipos, modelos, relaciones o atributos nativos.

No se crearán clases distintas para notebook, desktop, servidor, switch, firewall o access point cuando la diferenciación pueda resolverse mediante `Type`.

## Reconciliación

Los elementos descubiertos deberán seguir el flujo conceptual:

`DISCOVER → IDENTIFY → NORMALIZE → RECONCILE → CI canónico`

`Unmanaged` puede utilizarse como estado transitorio de discovery cuando todavía no exista evidencia suficiente para reconciliar un elemento con un CI canónico. El hostname por sí solo no será criterio suficiente para fusionar CIs.

## Consecuencias

- Menor cantidad de objetos custom y menor acoplamiento a personalizaciones de GLPI.
- Mejor compatibilidad con GLPI Agent, SNMP, Intune y otras fuentes futuras.
- Taxonomía más simple para Asset 360°, QR, CMDB Health y relaciones.
- Los modelos y tipos podrán evolucionar sin alterar la familia base del activo.
- La NEXUS API podrá exponer una taxonomía de dominio más amigable sin duplicar físicamente las clases del backend.
