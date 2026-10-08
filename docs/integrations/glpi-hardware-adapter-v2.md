# GLPI Hardware Adapter V2 (V03-CMDB-02 / PR 2)

Adapter interno, aditivo y de sólo lectura para GLPI 11.0.11 / High-Level API 2.3.0. No reemplaza `TechnologyProvider`, no registra rutas HTTP y no modifica el snapshot 0.2. Se importa `createGlpiHardwareAdapter` desde `services/api/src/glpi-hardware.ts`, se inyecta el `GlpiApiTransport` existente y se llama `getInventory(asset, sections?)` con el activo canónico ya publicado.

## Evidencia de rutas y unidades

Antes de implementar las llamadas se inspeccionó el OpenAPI local del Live Lab: backup de OpenAPI generado por GLPI 11.0.11 / High-Level API 2.3.0, fechado 2026-10-07. SHA-256: `31281705e3f44d39226bff3120513efa00ae096745d9670514afc5e3653825bf`. El extracto versionado [glpi-hardware-v2-openapi-evidence.json](glpi-hardware-v2-openapi-evidence.json) conserva únicamente metadatos, operaciones GET y schemas; no contiene inventario ni credenciales.

| Ruta relativa verificada | Respuesta |
| --- | --- |
| `Assets/Computer/{id}/Component/Processor` | array de `ProcessorItem` |
| `Assets/Computer/{id}/Component/Memory` | array de `MemoryItem` |
| `Assets/Computer/{id}/Component/HardDrive` | array de `HardDriveItem` |
| `Assets/Computer/{asset_id}/Volume` | array de `Volume` |
| `Components/Processor/{id}` | objeto `Processor` |
| `Components/Memory/{id}` | objeto `Memory` |
| `Components/HardDrive/{id}` | objeto `HardDrive` |

Las colecciones admiten `start`, `limit` y `sort` (`id:asc`). El transporte existente resuelve el prefijo de API y la autenticación. El catálogo usa `Components` plural; las asociaciones usan `Component` singular.

Las unidades se comprobaron también en el código instalado del contenedor GLPI, bajo `/var/www/glpi/src/`: `Item_DeviceMemory.php` y `Item_DeviceHardDrive.php` declaran tamaño/capacidad en Mio; `Item_Disk.php` convierte `totalsize` y `freesize` multiplicando por 1024²; `Glpi/Api/HL/Controller/ComponentController.php` expone esos campos como `total_size` y `free_size`. El adapter convierte enteros MiB a bytes sin redondeo y rechaza valores negativos, fraccionarios, tipos incorrectos y desbordamientos.

## Identidad, evidencia y cobertura

El ancla debe ser una única referencia válida de `Computer` en `Assets/Computer`, de la instancia solicitada. `asset.id` se conserva literalmente. Cada asociación mantiene su ID en `SourceReference`; `componentId` permanece `null`. Compartir catálogo, modelo o capacidad nunca fusiona componentes. El ID del volumen identifica su registro lógico de fuente, no un disco físico.

Cada página adquirida, incluida la página vacía terminal, aporta evidencia de sección. Cada registro aporta la asociación y, si pudo recuperarse, el catálogo. `collectedAt` registra la adquisición; `SourceReference.observedAt` registra la consulta de ese registro de fuente conforme al contrato existente. La observación original del hardware queda en `observedAt: null`. Las fechas GLPI de creación/modificación no se convierten en observaciones originales; no se fabrican registros de provenance. Se reutilizan los validadores canónicos de fuente e inventario.

Se consulta hasta una página vacía válida, incluso después de páginas cortas. Límites por defecto: 100 registros por página, 100 páginas y 10000 registros por sección. IDs repetidos, orden inconsistente, páginas sobredimensionadas, límites y errores impiden declarar cobertura completa. Una página malformada se rechaza entera; se conservan páginas previas válidas como `partial` ante fallos no relacionados con autorización. Los enriquecimientos fallidos por 404 o errores transitorios conservan el componente y añaden brechas. Asociaciones eliminadas se excluyen del inventario actual.

401/403 y errores de autenticación en cualquier página o catálogo cierran la sección como `{ state: "unavailable", reason: "unauthorized" }`, sin elementos ni evidencia previamente recopilados y sin continuar esa sección; 405/501 producen `unsupported`; 404, payload inválido y otros errores producen `source_error`. Un 404 de catálogo conserva la asociación como parcial; un 404 de colección nunca demuestra ausencia de hardware. Sin páginas adquiridas la sección es `unavailable`; con evidencia adquirida y brechas no relacionadas con autorización es `partial`. `complete` expresa cobertura de la colección, aunque algunos atributos sean desconocidos. Secciones omitidas y periféricos quedan `not_requested`.

## Brechas de datos verificadas

- CPU: núcleos/hilos provienen de la asociación. Su `frequency` genérica no demuestra frecuencia base ni máxima; ambos campos quedan `null`.
- RAM: capacidad de la asociación, tecnología explícita del catálogo y slot (`busID`, alimentado por `numslots` en `Glpi/Inventory/Asset/Memory.php`). El importador elimina tanto `MHz` como `MT/s`; una velocidad sin unidad no permite distinguirlas. Sólo se mapea una unidad explícita retenida. Formato desconocido queda `null`.
- Discos: capacidad de la asociación e interfaz/protocolo explícitos del catálogo. `NVMe` demuestra protocolo; no demuestra por sí solo interfaz PCIe. `SATA` demuestra interfaz; no se atribuye protocolo ATA sin evidencia. El schema no expone medio HDD/SSD ni formato: ambos quedan `null`, incluso con "SSD" en una designación sintética. La comparación SATA/NVMe se prueba conservando esta limitación.
- Volúmenes: capacidad, espacio libre y filesystem explícitos. No existe asociación física en el schema verificado; `physicalDeviceIds` queda `null`.

## Validación y límite Live

Las pruebas utilizan exclusivamente fixtures sintéticos compatibles con los schemas verificados. Cubren normalización, procedencia, identidad, unidades, desconocidos, vacíos, errores, truncamiento, duplicados y compatibilidad con el provider 0.2.

No se completó un smoke autenticado contra GLPI: el entorno disponible no configura la identidad técnica requerida (`NEXUS_GLPI_INSTANCE_ID`). El usuario autorizó continuar sin smoke Live y documentar esa limitación. Las rutas y schemas están verificados mediante OpenAPI local y el código instalado; no se afirma que una lectura Live autenticada haya pasado.

Para PR 3 deben verificarse permisos read-only y respuestas reales mediante la configuración técnica existente, latencia de enriquecimientos, límites de volumen y cambios concurrentes durante paginación por offset. La detección de IDs inconsistentes reduce riesgos, pero no garantiza una instantánea transaccional de GLPI. La exposición pública, RBAC y los consumidores Web siguen pendientes de su entrega correspondiente.
