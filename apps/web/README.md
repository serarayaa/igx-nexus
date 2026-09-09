# IGX NEXUS Web — Dashboard, Explorer, Asset 360, QR y Relaciones

La SPA Web utiliza React + TypeScript + Vite y consume `@igx-nexus/ui`. El escenario actual usa exclusivamente 240 activos sintéticos con corte fijo. No requiere GLPI, credenciales ni Docker para la demostración Web.

CMDB-007 incorpora Asset Explorer, CMDB-008 agrega Asset 360, CMDB-009 añade el motor QR y CMDB-010 incorpora un Technology Map visual y accesible sin duplicar el inventario.

Ver [Asset Explorer](../../docs/asset-explorer.md), [Asset 360](../../docs/asset-360.md), [Motor QR y Etiquetado](../../docs/qr-label-engine.md), [Grafo de Relaciones](../../docs/relationship-graph.md) y [ADR-0008](../../docs/architecture/adr-0008-relationship-graph.md).

## Ejecución local

Desde la raíz del repositorio, con la versión Node de `.nvmrc`:

```bash
npm ci
npm run dev
```

Abrir `http://127.0.0.1:3000`. El servidor se limita a loopback y falla si el puerto está ocupado. `npm run build` genera `apps/web/dist`; no publica la aplicación.

## Navegación

```text
/#overview                       Panel principal
/#assets                         Asset Explorer
/#assets/DEMO-0002               Asset 360
/#assets/DEMO-0002/label         Diseñador de etiqueta
/#assets/DEMO-0002/relations     Grafo de Relaciones
/#q/<demo-locator>               Simulador interno de resolución
```

El QR exportado **no** contiene la ruta hash. En la demo contiene `https://nexus-demo.invalid/q/<locator>` para evitar simular un dominio corporativo inexistente. En producción `/q/:locator` será una ruta de servidor con autenticación/RBAC antes de Asset 360.

`navigation-model.ts` concentra el parsing y generación de rutas internas. Se mantiene el enfoque liviano de ADR-0006; CMDB-009 no introduce React Router.

## Providers y datos

Dashboard, Explorer, Asset 360, diseñador, resolver y Grafo utilizan el mismo dominio `Asset`/`AssetSummary`. Las relaciones viven en un dominio y provider demo separados para que futuras fuentes no acoplen la UI.

Los providers asíncronos reciben `AbortSignal`. La futura NEXUS API reemplazará el provider; nunca se debe conectar el navegador directamente a GLPI, MariaDB, Graph con secretos o dispositivos OT.

El locator demo es determinista sólo para tests y demostración. No debe utilizarse como generador productivo.

## QR y etiquetas

- QR Model 2 Version 5 / ECC M / byte mode.
- 4 módulos de quiet zone.
- perfiles 25×15, 30×20, 40×25, 50×25, 50×30 y 60×40 mm.
- 203 y 300 DPI.
- módulos QR con escala raster entera.
- SVG vectorial como salida maestra y descargable.
- salida física monocromática independiente de light/dark.
- `PrintAdapter` reservado para ZPL/EPL/browser/vendor futuros; sin botones muertos.

## Validación

```bash
npm run typecheck
npm run build
npx playwright install --with-deps chromium
npm test
npm run storybook:build --workspace @igx-nexus/ui
```

Para ejecutar sólo los tests de modelo, sin navegador:

```bash
npm exec --workspace @igx-nexus/web -- vitest run --project=model
```

Las suites Browser cubren Dashboard, Explorer, Asset 360 y diseñador QR/etiquetas, incluyendo navegación, estados, foco, axe y reflow responsive.

## Límites actuales

- datos exclusivamente sintéticos;
- sin NEXUS API real;
- sin GLPI/Intune/Entra/Defender/SNMP reales;
- sin autenticación productiva;
- sin endpoint productivo `/q/:locator`;
- sin impresora/vendor adapter específico;
- sin edición, persistencia o discovery real de relaciones;
- sin CMDB Health Score (CMDB-011);
- sin Service Desk, ya que esa responsabilidad corresponde a Jira.
