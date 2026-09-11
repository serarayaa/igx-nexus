# Asset Explorer — CMDB-007

## Uso en la demo

Desde la raíz: `npm ci`, `npm run dev` y abrir `http://127.0.0.1:3000/#assets`.
También se accede desde **Panel principal → Activos**. La página identifica los
datos como sintéticos y muestra la fecha de corte de la demostración.

1. Buscar un nombre, hostname, serial, etiqueta, responsable, modelo, fabricante,
   sitio o IP demo. Por ejemplo `SYNTH-SN-000002`, `oficina centro` o `192.0.2.2`.
   La búsqueda ignora mayúsculas, espacios redundantes y acentos.
2. Combinar dominio, tipo, estado, sitio, fabricante, criticidad y frescura.
   **Más filtros** despliega fabricante, criticidad y frescura cuando se necesitan.
   Las acciones de filtros activos permiten quitarlos individualmente o en conjunto.
3. Ordenar desde los encabezados y recorrer las páginas. El rango de resultados
   se anuncia al cambiar de página y recibe el foco para facilitar su lectura.
4. Activar **Mostrar identificación técnica** para consultar hostname, serial,
   etiqueta e IP. Las siete columnas se conservan dentro de una región desplazable.
5. Limpiar búsqueda o restablecer búsqueda/filtros si no hay coincidencias.

## Contratos y separación

| Archivo Web | Responsabilidad |
| --- | --- |
| `asset-model.ts` | Asset, proyección de métricas, snapshot y provider |
| `demo-provider.ts` | Adaptador del catálogo compartido `demo-dataset.ts`, 240 activos y corte fijo |
| `dashboard-model.ts` | Derivación de métricas existente |
| `explorer-model.ts` | Búsqueda, facetas, filtros, orden y paginación pura |
| `AssetExplorer.tsx` | Carga cancelable y estado de la consulta |
| `ExplorerFilters.tsx` | Controles y recuperación de filtros |
| `AssetTable.tsx` | Presentación tabular usando el DS |
| `NexusShell.tsx` / `App.tsx` | Shell compartido y navegación por fragmentos |

`id` conserva la identidad propia NEXUS. El Dashboard consume una proyección del
mismo dominio. No hay dataset paralelo, SDK corporativo ni consulta desde Web a
GLPI/MariaDB. Los campos de integración futura se definirán junto con NEXUS API.

## QA

Ejecutar desde la raíz:

```sh
npm run typecheck
npm run build
npm run test --workspace @igx-nexus/web
npm run storybook:build --workspace @igx-nexus/ui
npm run test:storybook --workspace @igx-nexus/ui
npm pack --dry-run --workspace @igx-nexus/ui
git diff --check
git diff --exit-code -- packages/ui/generated
```

Browser requiere `npx playwright install chromium` (Linux CI instala también
dependencias del sistema). En Windows con certificados locales, usar
`node --use-system-ca node_modules/playwright/cli.js install chromium` si la descarga
no reconoce la cadena de confianza; no desactivar la verificación TLS.

Las pruebas cubren búsquedas por campo, limpieza y foco, combinación y retiro de
filtros, cero resultados, orden real/aria-sort, páginas/rangos y reinicio por cambios,
loading, error/retry, vacío global, cancelación y respuestas fuera de orden.
Las pruebas existentes del Dashboard y Storybook conservan sus assertions.

La matriz axe del Explorer incluye 1440/768/320 px, light/dark y comfortable/compact,
con los detalles técnicos visibles. No equivale a una certificación WCAG completa.
El smoke de Narrador y Windows High Contrast con tecnología asistiva real requiere
validación humana; no se presenta como realizado por pruebas automatizadas.

## Límites actuales

- Todos los datos son sintéticos y el corte es fijo; sin sincronización corporativa.
- Búsqueda por palabras, sin fuzzy search, exportación ni persistencia de consulta.
- Consulta local apropiada para el fixture actual; la API real definirá ejecución
  en servidor y control de acceso antes de manejar datos productivos.
- Tabla con scroll horizontal en móvil; sin virtualización. Asset 360 integrado mediante CMDB-008.
- CMDB-007 integrado; catálogo vigente y casos de búsqueda en [Dataset de Demo](demo-dataset.md).

Ver [ADR-0005](architecture/adr-0005-asset-explorer.md).

## Evidencia local — 2026-09-09

- Node 24.20.0, dependencias del lockfile sin cambios.
- Web: **39/39 pruebas** (21 de modelo y 18 Browser, incluido Dashboard).
- Storybook: **44/44 pruebas**, build estático correcto.
- Typecheck y builds UI/tokens/Web correctos; paquete UI distribuible validado.
- Sin diferencias semánticas en tokens generados ni cambios al drawer del DS.
- Matriz axe completa sin violaciones: 1440/768/320 px × light/dark ×
  comfortable/compact, detalles técnicos y filtros adicionales abiertos.
- Smoke visual de Chromium: escritorio, móvil a 320 px, Dark/Compact y forced colors;
  scroll global sin desbordamiento. Reduced motion emulado y ampliación CSS al 200%
  revisados. Esta última no sustituye una prueba humana del zoom del navegador.
- Navegación mediante teclado, entrada directa, Atrás/Adelante, skip link y foco al
  cambiar de vista desde el drawer cubiertos. Sin errores de ejecución en el smoke.
- Medición orientativa en Chromium local de 100 consultas alternando búsqueda
  vacía y `demo oficina`: mediana **1 ms**, percentil 95 **2,1 ms**. Mide sólo la
  transformación del snapshot, no latencia de red ni renderizado completo.
- Falta el smoke humano de Narrador/Windows High Contrast; no se declara certificación WCAG.

La evidencia del run remoto de CI se adjunta al PR. El merge continúa siendo manual.
