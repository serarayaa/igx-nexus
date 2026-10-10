# Software & Operating System Contracts V2

PR 6 añade un contrato canónico independiente en `@igx-nexus/types`. No incorpora adapter, endpoints, UI, persistencia ni reconciliación. Base: `main@af53ccfa8459b12487539ed219204d4d53db215c`, con PR #145 integrado. Producto objetivo: NEXUS 1.0 — IT CMDB & Asset Management.

## Estructura

`SoftwareInventoryV2` contiene `contractVersion: "2"`, el `assetId` canónico y dos secciones: `operatingSystems` e `installations`. Todas las instalaciones pertenecen a ese activo; se permiten varios OS y varias instalaciones del mismo producto y versión, sin seleccionar un OS principal.

- `OperatingSystemInstallationV2`: identidad de instalación y OS, nombre, versión, edición, arquitectura, service pack, kernel y fecha de instalación.
- `SoftwareInstallationV2`: identidad de instalación, identidad de software, versión y fecha de instalación.
- `SoftwareIdentityV2`: identidad explícita, nombre y publisher.
- `SoftwareVersionV2`: identidad explícita, etiqueta original de versión y arquitectura.

Identidad de producto, versión e instalación son tipos separados. Producto y versión se incluyen como registros anidados con evidencia propia; no son un catálogo de software disponible. Pueden ser `null` cuando la consulta no permita resolverlos. Una versión conocida no autoriza inferir el producto.

Los identificadores son cadenas opacas de correlación dentro del inventario. No se derivan del nombre ni del modelo; las referencias externas conservan su fuente e instancia. `null` significa desconocido y no identifica un registro compartido. El validador rechaza identidades de instalación explícitas repetidas dentro de cada sección; permite repetir productos/versiones en instalaciones distintas y no fusiona registros similares. No realiza reconciliación entre inventarios o fuentes.

Las etiquetas de versión no requieren SemVer ni orden numérico. Los atributos desconocidos se declaran explícitamente como `null`; no se sustituyen por cadenas vacías ni se omiten.

## Evidencia y fechas

Se reutiliza la política de `HardwareEvidenceV2` y sus variantes de cobertura, sin modificar Hardware ni añadir atributos técnicos de hardware. `validateSoftwareInventoryV2(unknown)` reutiliza `validateSourceReference` y `validateProvenanceRecord`; devuelve issues sin mutar, normalizar o completar datos.

- `collectedAt`: fecha de adquisición obligatoria.
- `observedAt`: observación original conocida, o `null`; no puede ser posterior a la adquisición.
- `sourceReferences`: conserva íntegramente la semántica existente, incluido su `observedAt` obligatorio. No convertir `date_creation`/`date_mod` en observaciones originales.
- `provenance`: mantiene fuente, autoridad, fechas y derivación originales. Cada registro (incluidos producto y versión) requiere al menos una referencia o provenance válida. La evidencia de la sección no reemplaza la evidencia de sus registros.

Un dato manual debe declararse mediante una fuente explícita y, cuando se utilice provenance, `derivation: "manual"`. Puede mantener `observedAt: null` a nivel del registro: no se fabrica una observación original. Las fechas requeridas por las referencias/provenance deben provenir del acto documentado, conforme al contrato existente.

`installedAt` es `null` o `{ precision: "date" | "timestamp", value: string }`. Una fecha de calendario válida conserva su precisión; no se convierte en medianoche UTC. Los timestamps requieren zona horaria.

## Cobertura y paginación

Se conservan cinco estados: `complete`, `partial`, `unavailable`, `not_applicable` y `not_requested`, y las seis razones existentes de Hardware V2. `complete` significa cobertura de la colección, no conocimiento de cada atributo. Una colección completa vacía exige evidencia de adquisición y fuente válida. Ausencia confirmada no equivale a desconocimiento.

`partial` requiere gaps explícitos (`fieldPath`, `reason`) y puede contener cero elementos. Los gaps también pueden indicar enriquecimiento no resuelto. `unavailable` sólo incluye razón; no admite elementos ni evidencia residual accesible. Los estados no recopilados no contienen colecciones.

Las secciones recopiladas declaran `pagination`, nullable cuando no se dispone de metadatos. Su ventana agregada contigua contiene `offset`, `retrieved`, `total` y `nextOffset`. `retrieved` coincide con las instalaciones entregadas, no con entradas de catálogo. Los contadores son enteros seguros no negativos; total y continuación pueden ser desconocidos. La continuación, cuando existe, avanza al final de una ventana no vacía y permanece dentro del total conocido.

Con paginación conocida, `complete` exige inicio cero, ausencia de continuación y coincidencia con el total conocido. `partial` permite una ventana posterior o incompleta. `nextOffset: null` no demuestra agotamiento por sí solo; el futuro adapter deberá justificar cobertura y gaps. No se inventan contadores cuando la fuente no los proporciona. Un futuro fallo de autorización debe representar indisponibilidad sin exponer páginas previas; el contrato rechaza elementos en esa variante, pero no implementa transporte.

## Evidencia histórica de GLPI

La auditoría versionada [V03-CMDB-01](../integrations/glpi-v03-cmdb-capability-audit.md), de 2026-10-07, documenta GLPI 11.0.11 / High-Level API 2.3.0 y 145 instalaciones de software obtenidas en páginas 100 + 45. Es evidencia histórica, no el estado actual del laboratorio. No se realizaron consultas Live para PR 6.

El backup local OpenAPI coincide con el SHA-256 registrado: `31281705e3f44d39226bff3120513efa00ae096745d9670514afc5e3653825bf`. No se versiona el backup ni su ruta personal.

| Schema de fuente | Campos respaldados utilizados |
| --- | --- |
| OSInstallation / Item_OperatingSystem | id, operatingsystem, version, edition, architecture, servicepack, kernel_version, date_install (date-time) |
| Software | id, name, manufacturer |
| SoftwareVersion | id, name, arch, software |
| SoftwareInstallation / Item_SoftwareVersion | id, softwareversion, date_install (date) |

El mapeo/enriquecimiento real queda para el adapter futuro. No se incluyen números de licencia, vulnerabilidades, cumplimiento ni inferencias de disponibilidad de catálogo.

## Matriz de compatibilidad

| Superficie | Resultado |
| --- | --- |
| TechnologySnapshot / contratos 0.2 | Sin cambios; inventario compañero, no embebido |
| HardwareInventoryV2 y sus validadores | Sin cambios; regresiones ejecutadas |
| SourceReference / ProvenanceRecord | Sin cambios; validadores existentes reutilizados |
| Exportaciones del paquete types | Aditivas: tipos Software/OS y validador |
| Providers legacy y GLPI | Sin cambios; no consumidor nuevo |
| API v1 / Hardware API V2 | Sin cambios de rutas o respuestas |
| Frontend / Shell 3.0 | Sin cambios |
| Dependencias | Ninguna nueva |

## Validación y límites

Fixtures inequívocamente sintéticos (`source: "demo"`, identificadores `SYNTH-*`, fechas fijas) acompañan las pruebas; no se exportan desde el índice público ni se conectan a modos productivos. Las pruebas cubren desconocimiento, cobertura, evidencia, versiones, fechas, duplicados, ventanas de paginación y compatibilidad 0.2/Hardware.

El contrato no verifica que la fuente diga la verdad ni resuelve conflictos de etiquetas para la misma identidad. La paginación sólo valida coherencia estructural de la ventana declarada. La semántica de correlación y los gaps de enriquecimiento deberán verificarse en el adapter futuro con evidencia autorizada. El smoke GLPI Live sigue pendiente; PR 6 no lo ejecuta. No se avanza automáticamente a PR 7.
