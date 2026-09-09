# IGX NEXUS Web — Panel principal

CMDB-006 incorpora una SPA React + TypeScript + Vite que consume `@igx-nexus/ui`.
El panel usa exclusivamente 240 activos sintéticos con corte fijo. No requiere GLPI,
credenciales ni Docker para esta demostración.

Desde la raíz del repositorio, con la versión Node de `.nvmrc`:

```bash
npm ci
npm run dev
```

Abrir `http://127.0.0.1:3000`. El servidor se limita a loopback y falla si el puerto
está ocupado. `npm run build` genera `apps/web/dist`; no publica la aplicación.

```bash
npm run typecheck
npm run build
npx playwright install --with-deps chromium
npm test
npm run storybook:build --workspace @igx-nexus/ui
```

Para ejecutar sólo los tests de métricas, sin navegador:

```bash
npm exec --workspace @igx-nexus/web -- vitest run --project=model
```

El proveedor asíncrono `DashboardProvider` recibe un `AbortSignal`. El panel cancela
solicitudes al desmontar/cambiar proveedor e ignora respuestas antiguas. Los tests
inyectan proveedores de carga, error y vacío sin añadir controles de QA al producto.
La futura implementación de NEXUS API reemplazará el proveedor; nunca se debe conectar
el navegador directamente a GLPI o MariaDB.

Ver [contrato y métricas del panel](../../docs/dashboard.md) y
[ADR-0004](../../docs/architecture/adr-0004-dashboard-demo.md).
