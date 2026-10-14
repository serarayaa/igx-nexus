# PR 9 — Auditoría de Sistema y software en Asset 360

Entrega local para auditoría humana, 2026-10-14. Baseline exacto `main@3f666abb08e585ce29bdc13ba5ad43d0b3790d1f`; rama `feature/v03-cmdb-software-os-asset360-v2`. HEAD conserva el baseline; no commit, push, PR, merge, auto-merge ni PR 10. PR #146, #147 y #148 integrados; CI posterior a #148 aprobado: [38456125206](https://github.com/serarayaa/igx-nexus/actions/runs/38456125206).

## Resultado funcional y decisiones

Nueva sección contextual **Sistema y software**, situada después de Hardware en Asset 360. Reutiliza navegación hash, restauración de historial, retorno a Explorer y foco de sección. La navegación horizontal local revela la sección activa en pantallas estrechas. No se agrega router, módulo global, dependencia ni configuración corporativa.

Dos áreas: instalaciones de OS con igual jerarquía y tabla semántica de software observado. OS expone nombre, versión, edición, arquitectura, service pack, kernel y fecha; detalles conservan identidades y evidencia. No existe OS principal arbitrario. Software muestra producto/editor/versión/arquitectura/fecha y disclosures de instalación, producto y versión. Registros duplicados legítimos permanecen independientes.

Búsqueda y filtro por editor actúan sólo sobre registros cargados; orden estable por nombre/editor/versión, sin normalización SemVer. Páginas de 25 filas mantienen 145 instalaciones sintéticas en seis páginas. Contadores distinguen cargadas, coincidencias y visibles. Ninguna interacción de presentación solicita páginas remotas ni promete exhaustividad.

La revisión previa de Asset 360/Hardware fundamentó mantener Shell 3.0, controles @igx-nexus/ui, HTML semántico, Lucide y tokens oficiales. Encabezado editorial, resumen compacto, filas densas con espaciado según densidad y evidencia expandible evitan una cuadrícula de programas. Light/dark, comfortable/compact, foco de 2 px, controles de 44 px y scroll horizontal local preservan legibilidad y navegación; reduced motion y forced colors se comprueban. No se agregan animaciones decorativas.

## Contrato, confianza y cancelación

El único recurso consultado por el reader es `/api/v2/technology/assets/${encodeURIComponent(assetId)}/software`, mediante GET, accept JSON, same-origin, no-store y AbortSignal. No hay query strings, URLs GLPI, tokens ni reconstrucción por hostname/serial/programa. `validateSoftwareInventoryV2` valida tanto HTTP como readers inyectados; assetId debe coincidir literalmente, incluidos espacios interiores. Una identidad incompatible impide mostrar datos.

El hook invalida inmediatamente el estado anterior al cambiar identidad, reader o intento. AbortController cancela al desmontar/cambiar sección/activo; respuestas tardías de readers que ignoran abort se descartan. Sólo se monta en sección activa y Live; Demo es explicativo y no consulta inventario. Reintentos controlados para red/indisponibilidad. Errores 401, 403, 404, 503, red y contrato incompatible tienen mensajes seguros; no se leen cuerpos upstream de error ni se diagnostica una causa precisa de 503 sin evidencia.

Los cinco estados canónicos se distinguen. Complete vacía difiere de partial vacía y unavailable; not_requested no representa ausencia. Gaps y pagination se muestran con desconocidos explícitos. nextOffset null no demuestra agotamiento. Cobertura no significa salud/seguridad/compliance. Null no se reemplaza por inferencias.

IDs, versiones, sourceReferences y provenance permanecen literales, con adquisición y observación separadas. Fechas date son calendario sin hora/zona inventada; timestamp se presenta en UTC/24 horas y conserva valor original. Observación desconocida no se sustituye por recopilación. Evidencia es texto escapado, sin enlaces GLPI.

## Alcance y archivos

Frontend, tests, configuración de stories, QA local y documentación. El manifiesto incluido en el ZIP enumera exactamente los archivos del parche y sus SHA-256. No se modifican servicios API, contratos Types, adaptador, permisos, provider 0.2, deadlines/presupuestos, base de datos ni infraestructura. La compilación global y el round-trip HTTP existente de Web comprueban compatibilidad; no se ejecuta suite API completa porque no hay cambios backend que la justifiquen. No GLPI Live ni smoke corporativo.

## Evidencia y resultados

Los comandos se ejecutan desde la raíz. Todos los logs originales están bajo `evidence/` del ZIP, con numeración y nombres únicos. Ninguna repetición sobrescribe un fallo. Las capturas previas a las repeticiones se conservan en `failures-pre-serial/` y `failures-final-nav/`.

| Ejecución | Resultado y alcance |
| --- | --- |
| 01 typecheck Web inicial | Aprobado antes de incorporar fixtures/pruebas |
| 02 afectadas original | 80/83; tres fallos: formato de hora del locale y expectativas de registro no resuelto fuera de primera página |
| 03 typecheck Web | Falló: inferencia de literal source y unión de fixture complete/partial |
| 04 typecheck corregido | Aprobado con literal y tipo Extract precisos |
| 05 afectadas corregidas | 82/83; selector ambiguo entre details anidados |
| 06 afectadas | 87/87 tras corregir selectores y agregar casos; no representa por sí sola el estado final |
| 07 Web completa original | 448/450, dos timeouts: Lifecycle browser 30 s y contract round-trip 5 s; maxWorkers=1, paralelismo de archivos predeterminado |
| 08 Web serial | 451/451, 35 archivos; maxWorkers=1 y no-file-parallelism, antes del último ajuste de navegación/espaciado |
| 09 Storybook build | Aprobado; advertencias de chunks grandes conservadas |
| 10 QA visual inicial | 12 escenarios y 13 PNG; cero llamadas API, errores de página o violaciones axe en ese estado |
| 11 Storybook | 74/74, 19 archivos, serial; siete stories nuevas más regresiones existentes |
| 12 refresh físico | 4/4; nuevo deep link Software, foco/historial/retorno y regresiones existentes |
| 13 foundations | 4/4; contraste light/dark y reduced motion/forced colors |
| 14 Types | 229/229, 11 archivos |
| 15 Web final intento | Falló: 4 aserciones axe skip-link; 384 aprobadas, 388 ejecutadas; una desconexión de navegador impidió completar la suite |
| 18 visual existente original | Falló antes de probar UI: URL.pathname genera ruta C:\\C:\\ y escapes %20 inválidos en Windows |
| 16 typecheck global | Aprobado: Types, API, UI y Web |
| 17 build global | Aprobado: Types, API, UI y Web; chunk Web 539,80 kB minificado, advertencia >500 kB |
| 19 afectadas finales | 89/89, cinco archivos; maxWorkers=1 y no-file-parallelism |
| 20 Web repetición | Timeout Lifecycle y bloqueo del navegador; detenido tras más de cuatro minutos, sin resultado global; nota separada 20-runner-stop-note.txt |
| 21 Storybook build final | Aprobado; chunks grandes y tiempos de plugins registrados |
| 22 CI baseline | Reconsulta success/completed sobre el SHA obligatorio exacto |
| 23 Web conjunta aislada | Timeouts contract round-trip y Lifecycle, seguido de bloqueo; detenido tras más de tres minutos, sin resultado global completo; nota separada |
| 24 Web model separado | 279/279, 19 archivos; proyecto model, maxWorkers=1 y no-file-parallelism, 15,75 s |
| 25 Web browser separado | 172/172, 16 archivos; proyecto dashboard, maxWorkers=1 y no-file-parallelism, 135,81 s |
| 26 diff check inicial | Aprobado; aviso de conversión LF/CRLF del handoff, sin error de whitespace |
| 27 QA visual final intento | Seis escenarios completos y siete PNG antes del fallo en zoom: axe ya estaba ejecutándose en el addon de Storybook; log y resultados parciales conservados |
| 28 QA visual existente adaptada | 65 comprobaciones y 61 PNG, cero errores de página; misma lógica/aserciones, sólo fileURLToPath y carpeta de salida temporal |
| 29 Storybook final | 74/74, 19 archivos, maxWorkers=1 y no-file-parallelism, 47,98 s |
| 30 QA visual final repetida | 12/12 escenarios, 13 PNG auténticos; cero violaciones axe bajo configuración declarada, cero llamadas API/GLPI y cero errores de página |
| 31 diff check final | Aprobado; conversión LF/CRLF informativa, sin error |

La regla skip-link de axe interpreta el enlace hash Resumen, desplazado fuera de pantalla dentro del menú local, como enlace de salto a un ID de documento. Es una ruta del router existente. La configuración final excluye **sólo los enlaces del menú Asset 360 de esa regla**; todas las demás reglas los inspeccionan y skip-link sigue activa para el enlace real del Shell. La regla region mantiene la convención existente de pruebas. Esta adaptación y los fallos originales se declaran explícitamente; no se desactiva axe completo ni se amplían timeouts.

La validación visual existente se repite desde copia temporal con fileURLToPath y salida separada; aserciones intactas. El script original queda sin modificar. Este resultado adaptado no convierte la ejecución original en aprobada.

La QA de capturas final usa una instancia privada de axe, conservando la global del addon de Storybook. Esto evita el conflicto de ejecución concurrente observado en 27, sin cambiar UI ni reglas de validación. La repetición conserva las capturas parciales y escribe en otra carpeta.

Comandos reproducibles del cierre (cada ejecución tiene log separado):

```sh
npm run test --workspace @igx-nexus/web -- src/software-client.test.ts src/SoftwareExperience.browser.test.tsx src/HardwareExperience.browser.test.tsx src/hardware-client.test.ts src/navigation-model.test.ts --maxWorkers=1 --no-file-parallelism
npm run test --workspace @igx-nexus/web -- --maxWorkers=1 --no-file-parallelism
npm run test --workspace @igx-nexus/web -- --project model --maxWorkers=1 --no-file-parallelism
npm run test --workspace @igx-nexus/web -- --project dashboard --maxWorkers=1 --no-file-parallelism
npm run test --workspace @igx-nexus/types
npm run typecheck
npm run build
npm run storybook:build --workspace @igx-nexus/ui
npm run test:storybook --workspace @igx-nexus/ui -- --maxWorkers=1 --no-file-parallelism
npm run test:navigation-refresh --workspace @igx-nexus/web
npm run test:foundations --workspace @igx-nexus/ui
node scripts/qa-software-v2.mjs .tmp/pr9-audit/visual-final-repeat
node scripts/qa-cmdb-health.mjs
node .tmp/pr9-audit/qa-cmdb-health-windows.mjs
git diff --check
```

Los proyectos finales 24 y 25 se ejecutaron en invocaciones consecutivas, sin build ni otro proyecto simultáneo: 279 + 172 = **451/451**, 19 + 16 = **35 archivos**, cubriendo toda Web. Esto no equivale a una pasada final conjunta aprobada. La pasada conjunta 08 sí aprobó antes del último ajuste de navegación/espaciado; 15/20/23 fallaron o quedaron incompletas y no se sustituyen por una afirmación de estabilidad. No se declara validado el runner con múltiples workers ni el paralelismo de archivos. Se mantuvieron timeouts y aserciones.

El paquete contiene 21 archivos de cambio: 6 modificados y 15 nuevos. El empaquetado usa un índice Git temporal, verifica whitespace de todos los archivos (incluidos nuevos), genera diff binario consolidado y comprueba su aplicación inversa sobre el árbol de entrega. El índice real permanece sin staging y HEAD sin commit. El manifiesto enumera archivos de cambio y hashes SHA-256 del código/evidencia; el ZIP se verifica contra ese manifiesto. Se preservan logs/PNG originales y notas de detención, sin sobrescribir ejecuciones fallidas.

## Matriz de compatibilidad y regresiones

| Área | Evidencia |
| --- | --- |
| Identidad y HTTP reader | ID SYNTH ASSET exacto, caracteres codificados, contrato/assetId inválido, cada error HTTP, aborto antes/después del cuerpo |
| Hook y modos | Respuesta tardía, lector no cooperativo, cambio de activo cargado, desmontaje, inactive y Demo sin consultas, retry exitoso |
| Contrato visual | Cinco estados, complete/partial vacías, catálogo parcial, nulls, gaps, pagination y evidencia completa |
| Instalaciones | Dos OS sin principal; producto/versión repetidos con IDs distintos; editor/versión desconocidos; fechas date/timestamp |
| 145 registros | Búsqueda, editor, orden literal por teclado, paginación sin refetch, contadores y sin coincidencias |
| Navegación | Hash con ID literal, Atrás/Adelante, Explorer, foco, refresh físico; suites Hardware y Shell existentes |
| Desktop | Chromium 1440 px light/comfortable y dark/compact, capturas auténticas |
| Tablet | Chromium 768 px, compact y partial, captura auténtica |
| Mobile | Chromium 320/390 px, light/dark, ambas densidades; tabla con scroll local, sin overflow global |
| Accesibilidad | Axe con excepciones documentadas, orden/disclosures por teclado, foco visible, contraste foundations, forced colors + reduced motion |
| Zoom | CSS zoom 200% a viewport 1280 px, sin overflow global; no equivale a zoom nativo/OS |
| Storybook | Complete, partial, unknown, empty, loading, error/retry y retry recovered en Shell completo, lectores sintéticos |

## Revisión visual y mediciones sintéticas

Las capturas definitivas están en `evidence/visual-final-repeat/` del ZIP; `visual/` conserva la primera QA y `visual-final/` el intento parcial fallido. Revisión directa de desktop light, desktop dark, tablet y móvil: jerarquía OS equivalente, controles separados de la tabla, navegación contextual visible y evidencia progresiva. El foco del encabezado se limita a su contenido. La tabla conserva desplazamiento local en pantallas estrechas; no hay overflow horizontal global en los doce escenarios. Las capturas completas incluyen las 25 filas de presentación, sin sustituirlas por imágenes diseñadas externamente.

| Medición | Resultado sintético final |
| --- | --- |
| Instalaciones software / OS | 145 / 2 |
| Filas por página / páginas | 25 / 6 |
| Desktop 1440 | Documento 1440; tabla viewport/contenido 1086/1086 px |
| Tablet 768 | Documento 768; tabla 728/896 px, scroll local |
| Mobile 320 / 390 | Documento 320 / 390; tabla 286/896 y 356/896 px |
| CSS zoom 200% | Documento 1280; tabla 294/896 CSS px, scroll local |
| Forced colors + reduced motion | Animation none, geometría sin overflow global |
| Red y errores | 0 solicitudes API/GLPI, 0 errores de página en los doce escenarios |

Son medidas de geometría e interacción con fixtures; no son benchmarks de endpoint, tiempos productivos ni prueba de completitud del inventario real. Versiones de Node/npm/Git y configuración Vitest quedan en evidence/toolchain.txt y web-vitest-config.txt. Storybook y browser usan Chromium headless en Windows.

## Riesgos residuales y siguientes checkpoints

Las mediciones son sintéticas, sin latencia productiva ni revalidación del laboratorio histórico. No hubo GLPI Live. Hace falta smoke autorizado en integración real, lectores de pantalla, dispositivos y zoom nativo; axe y capturas no certifican WCAG AA. Strings de otras fuentes, idiomas y colecciones mucho mayores requieren evaluación futura. El filtro/orden actúa sólo sobre adquisición actual; paginación remota queda fuera de alcance. El endpoint conserva sus límites operacionales existentes.

Se conservan advertencias de Fastify/deprecación y chunks de build. Los timeouts y la desconexión evidencian fragilidad del entorno/runner, sin atribuirla automáticamente a producto ni afirmar estabilidad universal por una pasada serial. No se cambia configuración global ni se ocultan fallos. Auditoría humana antes de publicar; no iniciar PR 10.

Referencias: [decisiones funcionales/UI](../product/software-os-asset360-v2.md), [handoff vigente](../ai-context/03-SESSION-HANDOFF.md), [Software API V2](../integrations/software-api-v2.md).
