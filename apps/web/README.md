# IGX NEXUS Web — Demo v0.1

La SPA Web utiliza React + TypeScript + Vite y consume `@igx-nexus/ui`. El escenario actual usa exclusivamente 240 activos sintéticos y 18 relaciones con corte fijo, desde `src/demo-dataset.ts`. No requiere GLPI, credenciales ni Docker para la demostración Web.

Dashboard, Asset Explorer, Asset 360, QR/Label, Technology Map y CMDB Health trabajan sobre el mismo dataset. Ver [guía de Demo v0.1](../../docs/demo-v0.1.md) y [catálogo de datos/activos hero](../../docs/demo-dataset.md).

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
/#health                         CMDB Health
/#assets                         Asset Explorer
/#assets/DEMO-0013               Asset 360 hero OT
/#assets/DEMO-0013/label         Diseñador de etiqueta
/#assets/DEMO-0013/relations     Technology Map
/#q/<demo-locator>               Simulador interno de resolución
```

El QR exportado **no** contiene la ruta hash. En la demo contiene `https://nexus-demo.invalid/q/<locator>` para evitar simular un dominio corporativo inexistente. En producción `/q/:locator` será una ruta de servidor con autenticación/RBAC antes de Asset 360.

`navigation-model.ts` concentra el parsing y generación de rutas internas. Se mantiene el enfoque liviano de ADR-0006; no se introduce React Router para la demo.

## Providers y datos

Dashboard, Explorer, Asset 360, diseñador y resolver comparten `Asset`/`AssetSummary`. Technology Map consume el mismo inventario y un provider de relaciones separado. CMDB Health evalúa ambos snapshots con el mismo corte.

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
npm run test:demo
npm run storybook:build --workspace @igx-nexus/ui
node scripts/qa-cmdb-health.mjs
```

Para ejecutar sólo los tests de modelo, sin navegador:

```bash
npm exec --workspace @igx-nexus/web -- vitest run --project=model
```

`DemoV01.browser.test.tsx` es el smoke integrado de CMDB-013. Las suites Browser específicas continúan cubriendo estados, filtros, navegación, foco, axe, keyboard y reflow responsive. No se duplica ese flujo en un script Node separado.

## Límites actuales

- datos exclusivamente sintéticos;
- sin NEXUS API real;
- sin GLPI/Intune/Entra/Defender/SNMP reales;
- sin autenticación productiva;
- sin endpoint productivo `/q/:locator`;
- sin impresora/vendor adapter específico;
- sin edición, persistencia o discovery real de relaciones;
- CMDB Health evalúa registros, no hardware ni disponibilidad;
- sin Service Desk, ya que esa responsabilidad corresponde a Jira.
