# IGX NEXUS Web — Technology Intelligence v0.2

La SPA Web utiliza React + TypeScript + Vite y consume `@igx-nexus/ui`. La experiencia Demo conserva 240 activos sintéticos y 18 relaciones con corte fijo, pero desde V02-011 **la Web ya no es dueña del inventario sintético**.

La fuente compartida Demo vive en `packages/demo-data`. `src/demo-dataset.ts` es un adaptador de compatibilidad explícito que proyecta el snapshot canónico v0.2 al modelo de presentación histórico. Technology Overview, Asset Explorer, Asset 360, QR/Label, Technology Map y CMDB Health mantienen los mismos IDs y escenarios funcionales.

La Demo local no requiere GLPI, credenciales, Docker ni NEXUS API. El modo Live, en cambio, consume NEXUS API y nunca habla directamente con GLPI.

Ver [guía de Demo v0.1](../../docs/demo-v0.1.md), [catálogo de datos/activos hero](../../docs/demo-dataset.md) y [ADR-0021 — Canonical Demo Dataset v0.2](../../docs/architecture/adr-0021-canonical-demo-dataset-v02.md).

## Ejecución local

Desde la raíz del repositorio, con la versión Node de `.nvmrc`:

```bash
npm ci
npm run dev
```

Abrir `http://127.0.0.1:3000`. El servidor se limita a loopback y falla si el puerto está ocupado. `npm run build` genera `apps/web/dist`; no publica la aplicación.

## Navegación

```text
/#overview                       Technology Overview
/#health                         CMDB Health
/#assets                         Asset Explorer
/#assets/DEMO-0013               Asset 360 hero OT
/#assets/DEMO-0013/label         Diseñador de etiqueta
/#assets/DEMO-0013/relations     Technology Map
/#q/<demo-locator>               Simulador interno de resolución
```

El QR exportado **no** contiene la ruta hash. En la demo contiene `https://nexus-demo.invalid/q/<locator>` para evitar simular un dominio corporativo inexistente. En producción `/q/:locator` será una ruta de servidor con autenticación/RBAC antes de Asset 360.

`navigation-model.ts` concentra el parsing y generación de rutas internas. Se mantiene el enfoque liviano de ADR-0006; no se introduce React Router sólo para la demo.

## Providers y datos

### Demo

`packages/demo-data` genera el `TechnologySnapshot` canónico sintético. `src/demo-dataset.ts` lo proyecta al `InventorySnapshot` de la UI v0.1 y preserva los 240 IDs, campos de presentación, heroes, relaciones, QR/locator y comportamiento de Health.

El adaptador existe para evitar mezclar V02-011 con el rediseño de Product Design 2.0. No debe transformarse en una segunda fuente de verdad ni volver a contener una copia de los 240 registros.

### Live

La Web Live consume NEXUS API mediante su provider dedicado. Technology Overview y Asset Explorer comparten ese provider; Asset 360 mantiene su vertical Live acotado. La Web nunca debe conectarse directamente a GLPI, MariaDB, Graph con secretos ni dispositivos OT.

Los providers asíncronos reciben `AbortSignal`. Demo y Live comparten el lenguaje canónico detrás de sus fronteras, pero no existe fallback silencioso Live → Demo.

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

`demo-dataset.test.ts` protege además la proyección de compatibilidad mediante el digest histórico del catálogo Web. `DemoV01.browser.test.tsx` continúa siendo el smoke integrado de CMDB-013. Las suites Browser específicas cubren estados, filtros, navegación, foco, axe, keyboard y reflow responsive.

## Límites actuales

- la Demo contiene datos exclusivamente sintéticos;
- el adaptador Web v0.1 todavía usa su modelo de presentación histórico;
- la cobertura Live sigue siendo parcial: Overview e inventario sólo muestran hechos soportados por NEXUS API y no simulan capacidades Demo ausentes;
- sin Intune/Entra/Defender/SNMP reales en la experiencia Web actual;
- sin autenticación productiva de usuario final;
- sin endpoint productivo `/q/:locator`;
- sin impresora/vendor adapter específico;
- sin edición, persistencia o discovery real de relaciones;
- CMDB Health evalúa registros, no hardware ni disponibilidad;
- sin Service Desk, ya que esa responsabilidad corresponde a Jira.
