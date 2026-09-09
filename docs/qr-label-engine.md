# CMDB-009 — Motor QR y Etiquetado

## Objetivo

CMDB-009 incorpora una identidad física para los CI de IGX NEXUS sin convertir el código QR en una credencial ni duplicar el inventario. El flujo queda separado en cuatro responsabilidades:

```text
Asset NEXUS
   ↓
QR Locator
   ↓
Label Template
   ↓
Render / Export
```

La implementación de la Demo v0.1 consume el mismo `Asset` e `InventoryProvider` de Dashboard, Asset Explorer y Asset 360.

## Identidad permanente

El locator QR es distinto de `Asset.id`. La etiqueta representa el mismo CI durante su vida útil aunque cambien responsable, ubicación, IP, hostname, lifecycle, estado o fuente de observación.

El modelo queda preparado para que la NEXUS API productiva pueda emitir, revocar y reemplazar locators. Un locator revocado no debe reasignarse a otro CI.

En la demo, `demoLocatorForAsset` deriva fixtures deterministas desde `Asset.id` para permitir pruebas reproducibles. Este mecanismo **no es criptográfico**, no pretende resistir ataques y no debe convertirse en el mecanismo de emisión productivo.

## Payload y seguridad

El QR no contiene datos del activo. El payload se limita a:

```text
<base HTTPS>/q/<opaque-locator>
```

No se codifican serial, MAC, IP, hostname, usuario, correo, ubicación, VLAN, modelo, datos SCADA, IDs de GLPI/Intune/Entra/Defender, API keys, tokens ni credenciales.

Conocer el locator no concede acceso. El contrato productivo esperado es:

```text
QR físico
  ↓
resolver /q/:locator
  ↓
autenticación corporativa
  ↓
autorización / RBAC
  ↓
Asset 360
```

La demo utiliza `https://nexus-demo.invalid` de forma intencional: `.invalid` deja explícito que no existe infraestructura productiva detrás del QR. El simulador interno `#q/<locator>` sólo demuestra la asociación locator → identidad NEXUS dentro de la SPA y **no** es el payload físico.

Antes de imprimir etiquetas permanentes en producción deben existir como mínimo:

- base URL corporativa estable y HTTPS;
- resolver de servidor `/q/:locator`;
- persistencia de locators y unicidad;
- emisión aleatoria/criptográficamente fuerte del locator;
- autenticación corporativa y RBAC;
- revocación/reemplazo y trazabilidad;
- protección frente a enumeración y rate limiting cuando corresponda;
- política que prohíba reutilizar un locator revocado.

## QR técnico

La Demo v0.1 implementa un encoder pequeño y sin dependencias externas para reducir superficie de supply chain:

- QR Model 2;
- Version 5 (37 × 37 módulos);
- byte mode UTF-8;
- corrección de errores M;
- máscara determinista 0;
- quiet zone de 4 módulos;
- payload máximo deliberado de 84 bytes UTF-8.

La máscara fija es válida para el perfil actual y mantiene el encoder auditable/determinista. Antes de producción se debe validar con las impresoras, materiales y cámaras reales; si cambia la longitud de la URL o las condiciones físicas, debe reevaluarse versión, máscara y nivel de corrección sin alterar el contrato locator.

## Motor de etiquetas

`label-engine.ts` separa datos visibles, dimensiones, QR y renderer. La salida física no recibe tema de la aplicación.

Perfiles disponibles:

| Perfil | 203 DPI | 300 DPI |
|---|---:|---:|
| 25 × 15 mm | soportado | soportado |
| 30 × 20 mm | soportado | soportado |
| 40 × 25 mm | soportado | soportado |
| 50 × 25 mm | soportado | soportado |
| 50 × 30 mm | soportado | soportado |
| 60 × 40 mm | soportado | soportado |

La conversión usa `px = round(mm / 25.4 × DPI)`. El tamaño del módulo QR se selecciona como un número entero de píxeles a 203/300 DPI para evitar módulos deformados por rasterización.

Contenido visible por defecto:

- branding IGX NEXUS;
- ID NEXUS;
- nombre corto truncado de forma segura;
- texto `Activo tecnológico`.

Asset Tag es opcional. Datos dinámicos o sensibles no se imprimen por defecto.

## Salida

SVG es el formato maestro real de CMDB-009. Incluye dimensiones físicas en milímetros, `viewBox`, QR monocromático, quiet zone y módulos cuadrados. El archivo puede descargarse desde el diseñador.

PNG, PDF, ZPL, EPL, Browser Print y SDK de fabricantes no se presentan como botones porque todavía no están implementados. El contrato `PrintAdapter` permite incorporarlos posteriormente sin acoplar el núcleo QR a Zebra, Brother, DYMO u otro proveedor.

## Navegación de demo

```text
/#assets/<nexusAssetId>          Asset 360
/#assets/<nexusAssetId>/label    Diseñador de etiqueta
/#q/<demoLocator>                Simulador interno del resolver
```

La ruta física futura `/q/:opaqueLocator` pertenece al servidor/NEXUS API y se mantiene separada de `#assets/:nexusAssetId`.

## QA

Las suites cubren locator determinista, validación, ausencia de datos sensibles en payload, QR 37 × 37, capacidad, perfiles físicos, 203/300 DPI, módulos enteros, quiet zone, SVG estable, escaping/truncamiento, independencia de light/dark, navegación Asset 360 → etiqueta → resolver, estados desconocidos, axe y reflow en 1440/768/390/320.

## Límites de CMDB-009

No implementa autenticación Entra productiva, NEXUS API productiva, integración real con GLPI/Graph/Defender/SNMP, discovery OT, impresión por driver/vendor, lotes masivos, Grafo de Relaciones ni CMDB Health formal.
