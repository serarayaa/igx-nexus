# Asset 360 — CMDB-008

CMDB-008 incorpora la ficha detallada de un activo individual dentro de **IGX NEXUS — The Technology Map**.

La vista se abre desde Asset Explorer mediante un enlace semántico en el nombre del activo y utiliza una URL estable basada en la identidad NEXUS:

```text
/#assets/DEMO-0002
```

Los IDs `DEMO-xxxx`, nombres, seriales, responsables, ubicaciones e IP del escenario son exclusivamente sintéticos.

## Objetivo de la ficha

Asset 360 permite responder rápidamente:

- qué activo es;
- cuál es su identidad técnica;
- quién es responsable;
- dónde se encuentra;
- en qué estado/lifecycle está;
- qué fabricante/modelo posee;
- cuándo vence su garantía;
- qué tan reciente es la última observación;
- qué datos básicos están disponibles o ausentes;
- de qué fuente proviene el snapshot mostrado.

La ficha es una capa de experiencia de NEXUS. No intenta reproducir visualmente una ficha de GLPI.

## Navegación

Flujo principal:

```text
Panel principal → Activos → Asset 360
```

El Explorer enlaza el nombre del activo con `#assets/<nexusAssetId>`. Toda la fila no se convierte en click target.

Asset 360 incluye breadcrumb semántico:

```text
Panel principal → Activos → <nombre del activo>
```

El routing, deep link y decisión de mantener fragmentos nativos se documentan en [ADR-0006](architecture/adr-0006-asset-360-routing.md).

## Contenido

### Resumen

La cabecera presenta nombre, ID NEXUS, dominio IT/OT, lifecycle y criticidad cuando corresponde. Un resumen permite escanear responsable, ubicación, última observación y garantía sin recorrer toda la página.

### Identidad

- ID NEXUS;
- hostname;
- serial;
- asset tag;
- tipo;
- dominio IT/OT.

Los valores ausentes se muestran explícitamente. No se inventan identificadores de GLPI, Intune o Entra.

### Asignación y ubicación

Actualmente el modelo demo dispone de responsable y ubicación. Área, unidad organizacional y sitio físico no están separados todavía y la UI lo declara en vez de inferirlos.

### Hardware

- fabricante;
- modelo;
- categoría/tipo;
- IP demo cuando existe.

Las IP utilizan TEST-NET-1 y no representan redes de Innergex.

### Estado y ciclo de vida

La ficha reutiliza los estados de lifecycle del dominio compartido: asignado, en stock, en reparación y dado de baja. La criticidad se presenta de forma textual y visual, sin depender sólo del color.

### Garantía

Asset 360 reutiliza `warrantyDays` del modelo del Dashboard para evitar reglas paralelas. Presenta:

- vigente;
- próxima a vencer (0–90 días);
- vencida;
- desconocida.

El cálculo es relativo al corte fijo del snapshot demo.

### Frescura y calidad básica

La frescura reutiliza `freshnessOf` y el mismo límite de siete días que Dashboard/Explorer.

Se muestran señales individuales de completitud para responsable, ubicación, serial y hostname. **No existe un CMDB Health Score en CMDB-008**; el índice formal corresponde a CMDB-011.

### Fuente de datos

La ficha identifica explícitamente:

```text
Dataset sintético / provider demo
```

No se presentan GLPI, Intune, Entra o Defender como sincronizaciones reales.

### Relaciones

La sección de relaciones enlaza a `#assets/<asset-id>/relations`, implementado por CMDB-010. Asset 360 mantiene sólo el punto de entrada y no duplica el modelo ni el provider de relaciones.

## Estados de carga y error

La vista contempla:

- loading;
- error sin filtrar detalles internos;
- retry;
- inventario vacío;
- activo inexistente;
- cancelación mediante `AbortSignal`;
- descarte de respuestas obsoletas al cambiar rápidamente de activo.

Un ID no encontrado muestra una recuperación explícita hacia el inventario.

## Accesibilidad

Baseline: **WCAG 2.2 AA**.

La implementación cubre:

- enlaces nativos para navegación;
- breadcrumb con `<nav aria-label="Breadcrumb">`;
- headings jerárquicos;
- foco al `h1` después de navegar;
- status badges con texto e icono;
- no depender sólo del color;
- light/dark;
- comfortable/compact;
- axe-core;
- reflow hasta 320 CSS px;
- ausencia de overflow horizontal global.

## Responsive

La ficha utiliza una grilla fluida para secciones y campos. Se valida en 1440, 768 y 320 px; a viewport pequeño las columnas se reducen sin crear tablas anchas ni scroll global.

## Arquitectura de datos

CMDB-008 continúa usando el contrato compartido `Asset` y `InventoryProvider`. No se crea un segundo dataset ni un modelo paralelo para la ficha.

No fue necesario inflar `Asset` con campos especulativos: el contrato integrado por CMDB-007 ya contiene la identidad, responsable, ubicación, hardware, lifecycle, criticidad, última observación y garantía necesarios para esta versión.

La futura NEXUS API podrá reemplazar el provider demo manteniendo la UI desacoplada de GLPI/MariaDB.

## Testing

La suite agrega cobertura para:

- parser/generador de rutas;
- deep link;
- navegación Explorer ↔ Asset 360;
- Atrás/Adelante;
- activo inexistente;
- identidad, asignación, ubicación y hardware;
- loading/error/retry/vacío;
- cancelación y race condition;
- breadcrumb y foco;
- axe en themes/densidades;
- responsive a 1440, 768 y 320 px;
- regresión de Dashboard y Explorer mediante sus suites existentes.

## Fuera de alcance

- CMDB-009 — Motor QR;
- CMDB-010 — Grafo de Relaciones;
- CMDB-011 — CMDB Health formal;
- edición/asignación/transferencia/eliminación de activos;
- integraciones corporativas reales;
- NEXUS API real;
- autenticación productiva;
- Service Desk / tickets / SLA;
- despliegue productivo.
