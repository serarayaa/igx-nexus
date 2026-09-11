# Demo v0.1 — IGX NEXUS

## Estado

La **Demo v0.1 — Innergex Chile** está completada e integrada en `main`. CMDB-013 quedó mergeado mediante PR #37 (`58fabd8`), el issue #35 fue cerrado como completed y la CI post-merge #138 terminó verde. El roadmap v0.1 queda formalmente en **13/13 tickets — 100%**.

La demo no activa un modo de datos alternativo: Dashboard, Explorer, Asset 360, QR/Label, Technology Map y CMDB Health consumen el dataset compartido de 240 CI y 18 relaciones.

## Preparación rápida

Para la demostración Web no se necesita GLPI, credenciales corporativas ni Docker. Desde la raíz del repositorio, usando la versión de Node indicada en `.nvmrc`:

```bash
npm ci
npm run dev
```

Abrir `http://127.0.0.1:3000/#overview`.

Para preparar las pruebas Browser en una máquina nueva:

```bash
npx playwright install --with-deps chromium
```

Smoke dirigido de la demo:

```bash
npm run test:demo
```

La suite Web completa también ejecuta ese recorrido:

```bash
npm test
```

### Contexto opcional de GLPI

El stack Docker de GLPI, MariaDB y Redis puede levantarse en paralelo para explicar la arquitectura, pero **la Web demo no lee ni escribe esos servicios**.

```bash
cp .env.example .env        # sólo la primera vez; usar secretos locales y no versionar .env
docker compose config --quiet
docker compose up -d
docker compose ps
```

Un reinicio normal conserva los volúmenes:

```bash
docker compose down
docker compose up -d
```

No usar `docker compose down -v` durante una demo: es un reinicio destructivo de los volúmenes locales.

## Recorrido recomendado

### 1. Panel principal

Abrir `#overview`.

**Mostrar:** 240 activos sintéticos, filtros IT/OT, completitud básica, frescura, garantías y distribuciones.

**Mensaje:** IGX NEXUS entrega una vista ejecutiva del inventario, pero distingue las señales simples del Dashboard del índice explicable de CMDB Health.

Usar la sección **Recorrido de la demo** para pasar al inventario. Evitar presentar nombres de tickets CMDB como parte del producto.

### 2. Asset Explorer

Abrir `#assets` y buscar uno de estos valores:

- `SYNTH-SN-000013`
- `demo-cl-0013`
- `DEMO-0013`

Los tres conducen a **Consola Demo Supervisión Norte**.

**Mostrar:** búsqueda, filtros, orden, paginación, identificación técnica opcional y navegación a Asset 360.

**Mensaje:** una identidad NEXUS estable conecta todas las vistas aunque las futuras fuentes autoritativas cambien.

### 3. Asset 360 — héroe principal OT

Abrir `#assets/DEMO-0013`.

**Mostrar:** identidad, ubicación, hardware, lifecycle, criticidad, garantía, frescura, fuente, CMDB Health, QR y acceso a relaciones.

**Mensaje:** Asset 360 reúne contexto operativo sin acoplar la Web a GLPI, MariaDB, Intune, Entra o Graph.

### 4. Etiqueta y QR

Desde Asset 360 seleccionar **Diseñar etiqueta**.

**Mostrar:** perfiles físicos, 203/300 DPI, SVG, locator y payload `https://nexus-demo.invalid/q/<locator>`.

**Mensaje:** el QR contiene sólo un locator opaco; no expone serial, IP, hostname, usuario, ubicación ni credenciales. La URL `.invalid` evita fingir infraestructura productiva.

Seleccionar **Probar resolución demo** y luego **Abrir Asset 360**. Debe volver a **DEMO-0013**.

### 5. Technology Map

Desde Asset 360 seleccionar **Abrir grafo de relaciones**.

Con DEMO-0013:

- profundidad 1: **2 relaciones visibles**;
- profundidad 2: **5 relaciones visibles**.

Seleccionar **Switch Demo Celda Norte** para mostrar detalle del nodo y la acción **Enfocar este CI**.

**Mensaje:** `depends_on` y `uses` son dirigidas; las flechas apuntan desde el CI que usa o depende hacia el CI requerido. `connected_to` es bidireccional y se representa con flechas en ambos extremos. El mapa es sintético: no ejecuta discovery, SNMP ni escaneo OT.

La lista semántica bajo el mapa contiene la misma información esencial y permanece disponible en pantallas pequeñas.

### 6. CMDB Health

Abrir **CMDB Health** desde la navegación principal.

**Mostrar:** score global, cobertura, distribución por estado, dimensiones, principales señales y drilldown.

Después localizar **Estación Demo Por revisar — DEMO-0020** para explicar un registro degradado con datos antiguos y faltantes.

**Mensaje:** CMDB Health mide **calidad del registro**, no salud física, disponibilidad o criticidad del equipo. Los desconocidos reducen cobertura; lo no aplicable no se penaliza.

## Activos hero

| ID | Caso | Qué demuestra | Búsqueda / ruta útil |
|---|---|---|---|
| `DEMO-0001` | Cobertura insuficiente | Serial, ubicación, responsable, observación y garantía sin evidencia suficiente | `DEMO-0001` |
| `DEMO-0002` | Registro completo + garantía vencida | Health 100; QR y grafo de oficina; garantía vencida no degrada calidad | `SYNTH-SN-000002` |
| `DEMO-0003` | Relaciones de oficina | Nodo central, dependencias entrantes y conectividad bidireccional | `#assets/DEMO-0003/relations` |
| `DEMO-0004` | Garantía próxima | Vence 20 días después del corte fijo | `DEMO-0004` |
| `DEMO-0007` | Confiable sin relaciones | Health 100 y ausencia legítima de relaciones | `DEMO-0007` |
| `DEMO-0013` | Héroe OT principal | Explorer, Asset 360, QR, resolver y Technology Map de planta | `demo-cl-0013` / `SYNTH-SN-000013` |
| `DEMO-0020` | Degradado | Health 51/100; observación de 60 días y faltantes de identidad/responsable | `DEMO-0020` |
| `DEMO-0021` | Atención | Health 85/100; observación de 20 días | `DEMO-0021` |
| `DEMO-0022` | Baja documentada | Lifecycle retirado y garantía vencida con Health 100 | `DEMO-0022` |
| `DEMO-0023` | Stock | Responsable no aplicable; Health 100 | `DEMO-0023` |
| `DEMO-0024` | Reparación | Registro confiable sin inferir salud física | `DEMO-0024` |

## Mensajes clave

- **Una sola fuente demo:** 240 CI y 18 relaciones alimentan todas las vistas; no existe un inventario paralelo por pantalla.
- **Arquitectura desacoplada:** `NEXUS Web → futura NEXUS API → adapters/integraciones → fuentes`. La Web no accede directamente a MariaDB ni GLPI.
- **GLPI permanece como motor CMDB/ITAM:** la experiencia IGX NEXUS no reemplaza su núcleo ni escribe sus tablas directamente.
- **Jira permanece como Service Desk:** tickets y soporte están fuera de alcance de IGX NEXUS.
- **Seguridad por diseño:** datos, personas, seriales, hostnames, direcciones y relaciones de esta demo son sintéticos. Las IP usan TEST-NET-1 y los QR no contienen información sensible.
- **Technology Map no es discovery:** visualiza relaciones registradas; no escanea redes ni dispositivos OT.
- **CMDB Health no es device health:** explica calidad, completitud, frescura y cobertura de evidencia del registro.

## Checklist antes de presentar

- [ ] `main` está sincronizado con el commit que se quiere presentar.
- [ ] `npm ci` completó sin cambios inesperados al lockfile.
- [ ] `npm run dev` abre la Web en `127.0.0.1:3000`.
- [ ] Dashboard carga 240 CI y filtros IT/OT.
- [ ] Explorer encuentra DEMO-0013 por serial y hostname.
- [ ] Asset 360 muestra Health, QR y relaciones.
- [ ] Label → resolver → Asset 360 vuelve al mismo CI.
- [ ] Graph DEMO-0013 muestra 2 relaciones a profundidad 1 y 5 a profundidad 2.
- [ ] Health permite abrir DEMO-0020 y explicar sus causas.
- [ ] Light/dark y comfortable/compact funcionan durante el recorrido.
- [ ] 1440, 768, 390 y 320 px no presentan overflow global en las vistas cubiertas por QA.
- [ ] Texto al 200%, `forced-colors` y `prefers-reduced-motion` mantienen contenido usable en los QA existentes.
- [ ] Navegación por teclado y foco visible funcionan; los cambios de ruta enfocan el encabezado principal.
- [ ] No se muestran ni agregan datos corporativos reales, secretos o credenciales.
- [ ] No se presenta la URL `.invalid`, el resolver hash ni la impresión SVG como infraestructura productiva.

## QA de CMDB-013

La implementación final quedó validada por CI de rama #136, CI del PR #137 y CI post-merge #138 en `main`, todas verdes.

Validación completa desde la raíz:

```bash
npm run typecheck
npm run build
npm test
npm run test:demo
npm run storybook:build --workspace @igx-nexus/ui
node scripts/qa-cmdb-health.mjs
git diff --check
git diff --exit-code -- packages/ui/generated
```

`DemoV01.browser.test.tsx` agrega un smoke integrado del recorrido principal. No se crea un `scripts/qa-demo-v0.1.mjs` separado porque repetiría el mismo flujo Browser y el mismo runtime sin aportar una clase de evidencia distinta. Los QA especializados existentes siguen cubriendo axe, reflow, temas, teclado, High Contrast, reduced motion, Graph y Health.

El objetivo de accesibilidad es **WCAG 2.2 AA** mediante pruebas automatizadas y revisión funcional; esto no constituye una certificación formal ni reemplaza una auditoría con tecnologías de asistencia reales.

## Límites de la v0.1

La demo no implementa Intune/Graph/Entra/Defender reales, SSO productivo, SNMP, discovery, escaneo OT, reconciliación productiva, servidor corporativo, DNS/HTTPS corporativo, actas digitales, DATRYA, impresión física ni Service Desk.

Antes de utilizar datos reales o emitir QR permanentes se requieren, entre otros, HTTPS estable, autenticación/Entra ID, RBAC, secretos gestionados, backup/restore, monitoreo, auditoría, resolver `/q/:locator` de servidor y pruebas físicas de impresión/lectura.
