# IGX NEXUS Web — Panel principal, Asset Explorer y Asset 360

La SPA Web utiliza React + TypeScript + Vite y consume `@igx-nexus/ui`.
El escenario actual usa exclusivamente 240 activos sintéticos con corte fijo. No requiere GLPI, credenciales ni Docker para la demostración Web.

CMDB-007 incorpora navegación a `/#assets`, búsqueda, filtros combinables, tabla ordenable y paginación usando el mismo inventario del Dashboard. `asset-model.ts` contiene el contrato compartido y `InventoryProvider` permite reemplazar la fuente sintética.

CMDB-008 agrega Asset 360 mediante una ruta de identidad estable:

```text
/#assets/DEMO-0002
```

La ficha muestra identidad NEXUS, responsable/ubicación, hardware, lifecycle, garantía, frescura/calidad básica y fuente del snapshot. No implementa QR, grafo de relaciones ni CMDB Health formal.

Ver [Asset Explorer](../../docs/asset-explorer.md), [Asset 360](../../docs/asset-360.md), [ADR-0005](../../docs/architecture/adr-0005-asset-explorer.md) y [ADR-0006](../../docs/architecture/adr-0006-asset-360-routing.md).

## Ejecución local

Desde la raíz del repositorio, con la versión Node de `.nvmrc`:

```bash
npm ci
npm run dev
```

Abrir `http://127.0.0.1:3000`. El servidor se limita a loopback y falla si el puerto está ocupado. `npm run build` genera `apps/web/dist`; no publica la aplicación.

## Navegación

```text
/#overview              Panel principal
/#assets                Asset Explorer
/#assets/DEMO-0002      Asset 360
```

Las rutas de producto utilizan fragmentos nativos. `navigation-model.ts` concentra el parsing y generación de `#assets/<nexusAssetId>`. Las anclas internas del Dashboard y el skip link mantienen su comportamiento previo. La decisión de no incorporar React Router todavía se documenta en ADR-0006.

El nombre del activo en la tabla del Explorer es un link nativo a Asset 360. Toda la fila no se convierte en un click target.

## Providers y datos

Dashboard, Explorer y Asset 360 utilizan el mismo dominio `Asset`/`AssetSummary` y el mismo fixture determinista de `demo-provider.ts`.

Los providers asíncronos reciben un `AbortSignal`. Las vistas cancelan solicitudes al desmontar/cambiar provider o activo e ignoran respuestas obsoletas. Los tests inyectan providers de carga, error y vacío sin agregar controles QA al producto.

La futura NEXUS API reemplazará el provider; nunca se debe conectar el navegador directamente a GLPI o MariaDB.

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

Las suites Browser cubren Dashboard, Explorer y Asset 360, incluyendo navegación, estados, cancelación, race conditions, foco, axe y reflow responsive.

## Límites actuales

- datos exclusivamente sintéticos;
- sin NEXUS API real;
- sin GLPI/Intune/Entra/Defender reales;
- sin autenticación productiva;
- sin QR en CMDB-008;
- sin Relationship Graph en CMDB-008;
- sin CMDB Health Score en CMDB-008;
- sin Service Desk, ya que esa responsabilidad corresponde a Jira.
