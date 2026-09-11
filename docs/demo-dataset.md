# CMDB-012 — Dataset de Demo

Estado: integrado en `main` mediante PR #32, merge commit `9afb26dcf3519f7b274740138f64f62e3071bfc4`. Issue #31 cerrado como completed. CI post-merge #128 verde. Avance formal: 12/13 (~92,3%). CMDB-013 NO ha sido iniciado y es el siguiente y último ticket.

## Propósito y límites

Dataset de producto que ejercita Dashboard, Explorer, Asset 360, etiquetas/QR, Technology Map y CMDB Health. No representa el inventario, las cantidades, las personas ni la topología real de Innergex Chile. Las plantas, puestos, fabricantes y modelos son ficticios y llevan la marca Demo.

La Web sigue desacoplada de GLPI. Este dataset **no se importa a GLPI** ni modifica el bootstrap de CMDB-004: ese bootstrap configura entidades, tipos, ubicaciones y permisos; aún no existe un contrato aprobado para importar estos CI. GLPI conserva su papel de motor CMDB/ITAM y las futuras fuentes pasarán por NEXUS API. Sin discovery, sensores, telemetría, reconciliación multifuente, edición, Service Desk ni credenciales. Jira conserva soporte/tickets.

## Arquitectura y reproducibilidad

`apps/web/src/demo-dataset.ts` es la fuente lógica única:

- versión `1.0.0`, corte fijo `2026-09-09T12:00:00.000Z`;
- 24 registros explícitos para escenarios y 216 registros en cohortes tipadas;
- catálogo de nueve familias de producto sobre las cinco clases ya soportadas;
- 18 relaciones declaradas con la misma fecha de corte;
- `createDemoDataset()` devuelve nuevos snapshots inmutables, sin reloj real, red o números aleatorios;
- `demoDataset` es la instancia compartida; ambos providers existentes sólo la exponen y respetan `AbortSignal`;
- `demoHeroes` describe el propósito de 11 registros. Sus etiquetas no intervienen en el cálculo de Health.

No se agrega dependencia ni motor de generación genérico. Los snapshots y cada registro están congelados también en runtime para evitar que un consumidor contamine a los demás. Decisión: [ADR-0010](architecture/adr-0010-demo-dataset.md).

Se conservan exactamente los IDs `DEMO-0001` a `DEMO-0240` y la derivación de locator CMDB-009. Algunos atributos/clases cambian intencionalmente al consolidar el fixture preliminar: es una nueva versión sintética, no una migración de inventario productivo. Los links y QR previamente generados siguen resolviendo al mismo ID demo.

Las cohortes tienen rangos explícitos. No reordenar rangos ni reciclar IDs. El índice de calidad `(number * 7) % 20` separa las señales del patrón de lifecycle: 14 posiciones recientes, cuatro antiguas, una muy antigua con faltantes y una sin observación. Las cohortes parciales y los escenarios explícitos hacen que la distribución total difiera de esas proporciones. Es una convención demo, no una probabilidad ni política corporativa.

## Volumen y distribuciones verificadas

Se mantienen 240 CI para conservar paginación y carga comparable. Se aumenta conectividad de seis a 18 relaciones sin crear un grafo gigante.

| Tipo | CI |
|---|---:|
| Computer | 100 |
| Monitor | 49 |
| NetworkEquipment | 37 |
| Phone | 31 |
| Printer | 23 |
| **Total** | **240** |

| Dominio | CI |
|---|---:|
| IT | 199 |
| OT | 41 |

OT se limita a consolas, pantallas y equipos de red sintéticos que caben en el modelo actual. No se inventan PLC, protocolos, controladores de proceso ni clases nuevas.

| Lifecycle | CI |
|---|---:|
| Asignados | 196 |
| Stock | 26 |
| Reparación | 9 |
| Baja | 9 |

| Ubicación | CI |
|---|---:|
| Oficina Demo Centro | 126 |
| Planta Demo Norte | 48 |
| Bodega Demo | 44 |
| Planta Demo Sur | 21 |
| Sin ubicación | 1 |

## Catálogo de activos hero

Referencias para preparar CMDB-013 posteriormente; no constituyen un guion de presentación.

| ID | Nombre / caso | Qué permite comprobar |
|---|---|---|
| DEMO-0001 | Notebook Demo 0001 | Cobertura insuficiente: serial, ubicación y responsable faltantes; observación y garantía desconocidas |
| DEMO-0002 | Desktop Demo 0002 | Health 100, garantía vencida, serial `SYNTH-SN-000002`, QR y primer grafo |
| DEMO-0003 | Switch Demo 0003 | Nodo de oficina con dependencias entrantes y conectividad bidireccional |
| DEMO-0004 | Teléfono Demo Recepción | Garantía vence en 20 días desde el corte |
| DEMO-0007 | Notebook Demo Ingeniería | Health 100, sin relaciones legítimamente |
| DEMO-0013 | Consola Demo Supervisión Norte | OT, búsqueda por `demo-cl-0013` o `SYNTH-SN-000013`, QR y grafo de planta |
| DEMO-0020 | Estación Demo Por revisar | Health 51/100; datos de hace 60 días, serial/asset tag/responsable faltantes |
| DEMO-0021 | Notebook Demo Observación antigua | Health 85/100; sólo frescura de hace 20 días requiere revisión |
| DEMO-0022 | Monitor Demo Baja documentada | Baja y garantía vencida con Health 100 |
| DEMO-0023 | Teléfono Demo Reserva | Stock; responsable no aplicable; Health 100 |
| DEMO-0024 | Impresora Demo Taller | Reparación con registro correcto; Health 100 |

Rutas: `#assets/<ID>`, `#assets/<ID>/label`, `#assets/<ID>/relations`. El diseñador ofrece «Probar resolución demo» y el resolver vuelve al mismo Asset 360. Buscar por ID siempre funciona; los seriales deliberadamente ausentes no tienen un reemplazo inventado.

## Relaciones y semántica

Tres componentes, como máximo siete nodos cada uno:

1. Oficina: 0002/0003/0005/0006/0008/0011/0012, seis relaciones. Conserva las aristas e IDs originales; se retira el estado `degraded` ambiguo de REL-006, que no acreditaba ningún defecto de datos.
2. Planta Norte: 0013–0019, siete relaciones. Dos consolas usan monitores, dependen de switches y éstos se conectan entre sí. REL-013 carece de fecha de observación: finding explícito sin referencia inventada.
3. Puestos: 0025/0026/0117/0118/0161/0221, cinco relaciones. REL-016 fue observada hace 20 días: revisar la vigencia del registro.

`depends_on`: Computer → NetworkEquipment. `uses`: Computer → Monitor. `connected_to`: conexión entre pares. No hay aristas entre dominios o sitios diferentes, endpoints ausentes, autorrelaciones, duplicados semánticos ni relaciones activas de equipos en stock/reparación/baja. Son convenciones de este catálogo, no nuevas restricciones corporativas del motor.

Desde 0013, profundidad 1 devuelve REL-007/008; profundidad 2 añade REL-009/010/013. El provider incluye las aristas entre todos los nodos alcanzados, no solamente las aristas del árbol de recorrido. El ciclo entre switches es conectividad bidireccional, no dependencia circular.

## Métricas derivadas

Dashboard conserva sus reglas y filtra bajas en los KPI correspondientes:

| Métrica, alcance todos | Resultado |
|---|---:|
| Registrados / vigentes | 240 / 231 |
| Vigentes con información reciente | 162 |
| Vigentes con responsable y ubicación | 194 |
| Garantías por vencer ≤90 días | 43 |
| Garantías vencidas | 21 |
| Garantías sin fecha | 13 |
| Críticos vigentes / sin información reciente | 12 / 4 |

La señal básica del Dashboard exige responsable incluso en stock; es su definición histórica, no la completitud por aplicabilidad de Health. No se cambió esa fórmula para mejorar artificialmente el resultado.

Health usa el motor de CMDB-011 sin cambiar pesos, bandas ni reglas:

| Estado | CI |
|---|---:|
| Confiable | 182 |
| Atención | 45 |
| Degradado | 12 |
| Cobertura insuficiente | 1 |
| Sin evaluación | 0 |

Score global bruto **94,62012320328543**, cobertura **96,93035426731078%**; UI **94/100 y 96%** (truncamiento existente). 240/240 evaluados. El agregado usa pesos efectivos, no el promedio de scores redondeados.

Causas por CI: 45 observaciones antiguas, 21 garantías sin fecha, 13 con campos faltantes, 12 observaciones desconocidas, 12 muy antiguas, dos afectados por observación de relación antigua y dos por observación de relación desconocida. No sumar causas para contar CI únicos. Dos endpoints reciben el finding de una misma relación.

`unknown` sigue probado en tests del motor; no se fuerza en el catálogo porque todos los CI tienen identidad mínima y lifecycle evaluable. Garantía vencida, lifecycle legítimo y cero relaciones no degradan Health por sí solos. Los defectos estructurales (endpoints inexistentes, fechas imposibles, duplicados) se reservan para tests adversos del motor; no pertenecen al catálogo demostrativo íntegro.

## Seguridad

- IP únicamente TEST-NET-1 `192.0.2.1–240`, sin conexiones a esas direcciones.
- Hostnames `demo-cl-NNNN`, seriales `SYNTH-SN-NNNNNN`, asset tags `DEMO-TAG-NNNN`.
- Responsables numerados y ficticios; sin nombres personales ni emails.
- Sin URLs de infraestructura ni campos de credenciales.
- QR conserva `https://nexus-demo.invalid/q/<locator>`; contiene únicamente locator, nunca serial, IP, propietario o identidad NEXUS.
- El locator determinista de demo no es criptografía ni autorización; no usar para etiquetas productivas.
- Los tests de formato y palabras sensibles son guardas de regresión, no garantía universal de detección de secretos; revisar cada cambio al catálogo.

## Validar y mantener

Desde la raíz, con Node de `.nvmrc` y dependencias instaladas:

```sh
npm run test --workspace @igx-nexus/web -- --project model
npm run typecheck
npm run build
npm test
npm run storybook:build --workspace @igx-nexus/ui
node scripts/qa-cmdb-health.mjs
git diff --check
git diff --exit-code -- packages/ui/generated
```

`demo-dataset.test.ts` comprueba unicidad de ID/hostname/serial/tag/IP conocidos, fechas, endpoints/tipos/direcciones, componentes pequeños, seguridad, todos los locators, snapshots inmutables, determinismo, héroes, Dashboard/Health y un SHA-256 del catálogo. Una ausencia intencional se excluye de unicidad; no se convierte en un identificador vacío repetido.

`DemoDataset.browser.test.tsx` recorre los 11 héroes, Explorer → Asset 360 → etiqueta → resolver → Asset 360, Health degradado → causas y grafo OT con axe/reflow. Las suites previas mantienen loading/error/abort, teclado, focus, historial, filtros, dark y densidad. El QA de build genera capturas por vista a 1440/768/390/320, light/dark, además de forced-colors/reduced-motion de Health y grafo OT, selección de nodo con teclado y texto al 200% de Health.

Para agregar casos:

1. Usar una clase/familia existente; si no cabe, revisar el modelo antes de inventarla.
2. Reservar ID estable; no insertar/reordenar rangos actuales ni superar el rango IP aprobado sin definir otra subred TEST-NET.
3. Declarar intención y atributos, nunca score esperado dentro del dato.
4. Mantener relaciones coherentes y catálogo hero si corresponde.
5. Revisar el cambio en métricas y actualizar las expectativas exactas y el digest sólo tras entenderlo; nunca regenerar para silenciar un fallo.
6. Documentar cambio de versión, ejecutar regresión completa y revisar CI.

No se generan archivos de datos ni se guardan snapshots derivados: regenerar consiste en invocar la función pura o recargar Web. No hay seed externo ni paso de importación oculto.

## QA y performance

CI de implementación #123 verde ([run](https://github.com/serarayaa/igx-nexus/actions/runs/34602156418)): 210 tests Web (144 de modelo + 66 browser) y 44 Storybook, 254 en total. Typecheck, builds, axe, paridad de tokens, paquete UI y QA del build correctos. El QA ampliado de contraste alto/teclado del grafo OT también pasó. PR #32 fue mergeado en `main`; la CI post-merge #128 también quedó verde.

Chromium no pudo descargarse localmente por restricciones de red; `npm test` local se detuvo por ejecutable ausente. Las suites completas sí se ejecutaron en GitHub Actions. Las capturas están en el artefacto temporal `cmdb-health-qa`; la descarga al entorno de trabajo respondió HTTP 403, por lo que no se declara inspección visual manual de esas imágenes. Los controles automatizados de overflow/axe pasaron. No se declara prueba manual de lector de pantalla, Windows High Contrast real ni impresión física.

Medición orientativa local Node 24.19: 100 iteraciones tras 20 de calentamiento, cálculo Health + consulta Explorer, mediana **2,53 ms**, p95 **3,46 ms**. JSON sin formato: **105.551 caracteres**. No mide descarga, red, render ni representa un SLA. El volumen permanece constante y no se agregan optimizaciones complejas.

## Revisión crítica de CMDB-012

- Se conservó el volumen para evitar complejidad/performance innecesaria y se acotaron componentes del grafo a siete nodos.
- Se separó el patrón de quality del lifecycle para no asociar reparación/baja con datos malos; se prueba explícitamente.
- Se mantuvo la semántica por dimensión de CMDB-011 y se documentó la diferencia con las señales básicas del Dashboard.
- Se verificaron fechas, referencias, identidad, payloads, familias y ausencia de información corporativa. Los defectos simulados son ausencias/antigüedad explicables.
- La CI #121 detectó un conteo heredado de seis relaciones y una carrera del test con el foco del diseñador; se corrigieron las expectativas y se esperó el foco de la vista antes de continuar. CI #122: todos los tests verdes, sin aumentar timeouts ni omitir pruebas.
- Se actualizaron las guías que describían el fixture antiguo. Tras el merge de PR #32, el estado integrado queda en 12/13 (~92,3%) y CMDB-013 permanece fuera del alcance de CMDB-012.
