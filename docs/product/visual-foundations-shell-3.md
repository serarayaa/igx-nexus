# PR 5 — Visual Foundations & Shell 3.0

Estado: implementación para auditoría humana, sin commit, push ni PR. Base exacta `713956222fc928d4787d1123faecad4eb7174c3b` (merge PR #144). Rama `feature/v03-visual-foundations-shell-3`; árbol inicial limpio. Dirección: **Connected Infrastructure**. Se conserva ADR-0003 y la separación de fuentes de ADR-0014.

## Composición e identidad

La navegación es un plano navy persistente, con workspace y header basados en superficies semánticas. El header orienta mediante contexto y título de vista; no reemplaza el H1. Se conservan los contenidos de Overview, Explorer, Asset 360, Map y Lifecycle. No se añaden módulos, indicadores operacionales ni nuevos destinos.

Mark B mantiene el recorrido N y sus cuatro terminales. `assets/branding/refinements/shell-3/mark-b.svg` reduce los nodos de 3 a 2.25 unidades y redondea los extremos para reducir masa a 16 px, conservando coherencia a 24/32 px. El mismo SVG local se inserta inline para heredar currentColor; no incorpora entradas de usuario, scripts, bitmap, fuentes ni recursos remotos. El enlace tiene nombre accesible y el dibujo es decorativo. Endorsement textual: «by Innergex». Conceptos históricos intactos. **Refinamiento pendiente de aprobación humana; no es una recreación de la marca corporativa ni aprobación final de branding.**

No se investigan ni reutilizan nuevos assets corporativos. Navy/cyan provienen de la paleta existente del repositorio; su aplicación es una propuesta original del producto. No se importa tipografía de licencia desconocida.

## Contratos y preferencias

- AppShell añade `navigationPresentation?: "expanded" | "rail"`, con default expanded. El prop describe presentación desktop, sin alterar estado de apertura del drawer.
- NexusShell posee y persiste `igx-nexus:navigation`. Valores desconocidos o storage bloqueado resuelven expanded. Tema/densidad conservan sus claves y reglas previas. No se persiste estado de dominio en esta preferencia.
- Desde 64rem, rail de 5.5rem y navegación expandida de 17.5rem. Bajo ese breakpoint siempre se muestra el drawer completo, incluso con rail guardado. Los labels del rail se ocultan sólo visualmente; los enlaces mantienen nombres, títulos, href y aria-current.
- Se conserva cierre por navegación, scrim, Escape y breakpoint; focus trap, skip link, inert, scroll lock y restore. Al cerrar por breakpoint desktop se enfoca el primer enlace visible en vez de un trigger móvil oculto. El recorrido de foco excluye elementos sin geometría visible o con visibility:hidden.
- Source mode visible en header y navegación. Storybook Hardware conserva su aviso sintético y la ocultación exclusiva de indicadores Live de sesión ya aprobada en PR 4. No existe fallback ni consulta Live introducida por este trabajo.

Los seis aliases `semantic.color.navigation.*` por tema distinguen background, foreground, muted, hover, selected e indicator, usando primitives existentes. No se cambia paleta primitive ni semántica de datos. No se crean dependencias. Se retiran tres overrides del Shell alojados en asset-360.css: ahora el nav global tiene un único tratamiento; el resto de la composición Hardware permanece intacta.

## Movimiento y accesibilidad

Micro 120 ms para feedback, component/panel 200 ms para indicador, aparición de labels y drawer, workspace 320 ms para un trazado SVG finito al interactuar con el enlace de marca. Sin loops, timers de navegación, datos animados, cálculos por frame ni remount por presentación. Las transiciones internas de PR 4 se conservan.

El cambio de tema es inmediato: una transición sólo del fondo del header produjo contraste transitorio inválido y fue retirada tras detectarlo con axe. Los labels no se desvanecen para no reducir su contraste. Reduced motion desactiva movimiento no esencial y no anuncia ninguna reproducción. Forced colors conserva selección con underline/outline/indicador, bordes y marca monocroma.

Targets globales de al menos 44px, navegación de 14–15px y endorsement/contexto de 14px; compact no reduce texto. Header pequeño distribuye título y controles en dos filas para conservarlos a 320px. El documento mantiene scroll propio para tablas anchas y drawer.

La nueva historia de Overview expuso regiones repetidas de findings con el mismo nombre. ContentSection añade `ariaLabel?: string` opcional para distinguir esas regiones mediante título + ID de activo, conservando los headings y contenido visible originales. Es una corrección semántica puntual, sin rediseñar Overview ni alterar findings. Storybook ejecuta axe sin desactivar la regla.

## Evidencia y validación

Storybook `Web/Shell 3.0`: Overview, Explorer, Lifecycle, Loading, Empty, Unavailable y Mark B Review. Son componentes reales con providers sintéticos explícitos sin HTTP. La historia Hardware existente cubre inventario completo, parcial, desconocido, carga y recuperación.

La entrega de auditoría incluye ZIP con before/after, manifest de tamaños/tema/densidad y hashes, logs originales y alternativos, patch consolidado y lista de archivos. Before se sirve desde git archive del SHA base con UI de esa copia; after desde el árbol de trabajo. Los wrappers de puertos y ejecución serial son externos, sin debilitar aserciones ni ampliar timeouts. Las capturas JPEG nativas no se retocan. El viewport del navegador se comprueba antes de capturar; la barra de scroll puede restar 15px al ancho de imagen.

No se declara npm test global verde ni certificación WCAG por pasar axe. Reduced motion/forced colors se validan en Chromium emulado, no como auditoría manual OS/lector de pantalla. La matriz de reflow no certifica zoom nativo de todos los navegadores. El smoke GLPI Live autenticado permanece pendiente y fuera de autorización. Revisar branding y composición humana antes de commit.


## Resultados de primera pasada (2026-10-09; históricos)

| Gate | Resultado |
|---|---|
| Específicas Shell/Hardware/Overview/preferencias/navegación | 79/79; ocho pruebas nuevas respecto de baseline Web |
| Web completa serial, versión corregida | **407/408; exit 1**, un timeout Lifecycle a 30 s. Rerun de ese archivo 6/6. No equivale a suite completa verde |
| Storybook Chromium + axe | 67/67, siete historias nuevas; build estático aprobado |
| Shell/Hardware con reduced motion + forced colors reales del contexto Chromium | 36/36; emulación, no inspección manual del sistema operativo |
| Foundations / refresh físico | 4/4 y 3/3 |
| API serial | 258/258 |
| Typecheck / build globales | Aprobados |
| npm test original | **exit 1**: types 149/149, API 250/258 y ocho timeouts; siguientes etapas no ejecutadas |
| npm audit --audit-level=high | exit 0; permanece un advisory moderate de Fastify, fuera de alcance |
| git diff --check | Sin errores |

Se conservan también logs intermedios fallidos: tipado de stories, nombre accesible de un enlace en drawer cerrado, regiones repetidas de findings, y la transición de tema que falló contraste en cinco pruebas. Se corrigieron las causas sin retirar reglas axe, debilitar aserciones existentes ni ampliar límites. No se reprodujo EACCES en este trabajo. El timeout final de Lifecycle tiene antecedentes documentados en PR 3/4 y se conserva como limitación, sin atribuirle una aprobación global por el rerun aislado.

## Dependencias y rendimiento

Sin nuevas librerías, cambios de package.json/lockfile, fuentes remotas, WebGL ni motor de motion. SVG propio vectorial y stack existente React/React Aria/Lucide. El estado de rail no crea ciclos de requestAnimationFrame, timers ni desmontaje del workspace.

Comparación Vite 8.2.2: baseline aislado del SHA indicado con UI de esa copia frente a build actual. Mismos módulos funcionales de producto, salvo la etiqueta accesible de findings mencionada arriba. Son tamaños del entry de la aplicación, no un perfil CPU por componente:

| Artefacto | Base | Shell 3.0 | Delta |
|---|---:|---:|---:|
| JavaScript minificado | 514.69 kB | 516.88 kB | +2.19 kB |
| JavaScript gzip | 151.57 kB | 152.19 kB | +0.62 kB |
| CSS minificado | 145.39 kB | 152.36 kB | +6.97 kB |
| CSS gzip | 18.57 kB | 19.68 kB | +1.11 kB |

El raster de 8.69 kB ya no se importa desde NexusShell; el SVG se incluye inline en el entry. El asset original sigue preservado en Git. Tokens generan 606 variables CSS (12 aliases de navegación añadidos), con paridad por tema. La advertencia existente de chunk >500 kB permanece. No se afirma una mejora de LCP, CPU ni rendimiento de GLPI: no se midieron aquí y no cambió la integración de datos.

## Segunda pasada limitada — Header y navegación

La cabecera distingue tres niveles: firma vectorial NEXUS, contexto Technology Intelligence · Chile, y workspace actual. El nombre de vista es texto de orientación, sin añadir heading ni reemplazar el H1 del contenido. Una línea navy conecta la cabecera con el plano de navegación. En móvil se conserva la firma NEXUS y se omite sólo el contexto secundario; se corrigió una regla heredada de AppShell que ocultaba todo el contexto a 320 px. Theme, density y fuente siguen visibles. No se anima el cambio de tema.

El control de contracción ocupa una columna de 44 px junto al lockup, sin la fila independiente ni el borde de botón permanente. En rail queda centrado bajo la marca. Se ajustan espaciado y tamaño del lockup, radios del estado seleccionado y su icono cyan; nombres accesibles, title, aria-current, rutas, storage y drawer permanecen. El refinamiento Mark B no cambia en esta pasada.

### Transición entre workspaces y compromiso

La inspección de App confirma que cambia de componente de contenido según la ruta, sin transición de salida/entrada entre vistas. No se añade un crossfade del main: ocultaría temporalmente evidencia operacional y podría interferir con el foco que App/Asset 360 ya gestionan. La alternativa implementada es una llegada visual de 320 ms en la línea decorativa del contexto de cabecera, mediante transform scaleX. Se reinicia únicamente ese span al cambiar view (y al montar el Shell), no al ajustar filtros, tema o densidad dentro de la misma vista. No representa carga, progreso ni estado de datos; tiene aria-hidden y no anuncia reproducción.

No hay nuevos efectos, timers, esperas de navegación, View Transitions API, claves del main ni wrappers del contenido. La transición no toma control del foco, scroll, historial o estado. Reduced motion la desactiva y conserva la línea estática. La regresión comprueba identidad DOM del main/input, edición local, foco, scroll, hash/history y ausencia de animaciones en el contenido, además de que un rerender de la misma vista no recrea la señal. Las pruebas de Explorer conservan la navegación real y restauración existentes.

### Handoff y continuidad

03-SESSION-HANDOFF conserva las decisiones originales de NEXUS 1.0, core, enriquecimientos opcionales, Endpoint Health y escalera 1.0/2.0/3.0/4.0. Referencia ADR vigentes y el handoff completo de la base por SHA. La evidencia GLPI previa se identifica como histórica; no se revalida ni autoriza Live. La antigua Next sequence se referencia como histórica para evitar ejecutar pasos ya superados.

### Timeouts frente a baseline

El log original de PR 4 registra 396/398 Web: timeouts en contract round-trip y Lifecycle/axe-reflow de 30 s. Su cierre serial posterior fue 400/400; esos resultados describen ejecuciones distintas. La primera pasada PR 5 terminó 407/408 con ese mismo caso Lifecycle; no se declara verde por un rerun aislado.

En esta segunda pasada, la primera ejecución afectada terminó 61/62, de nuevo por Lifecycle/axe-reflow. El filtro inicial nombraba Hardware.browser.test.tsx, archivo inexistente; no cubrió Hardware y no se cuenta como su validación. Se corrigió a HardwareExperience.browser.test.tsx en la ejecución de 95/95. La comparación aislada sobre git archive del SHA base pasó 6/6 y la actual pasó 6/6, sin ampliar el timeout ni desactivar axe. Son datos compatibles con la intermitencia conocida; no prueban su causa ni equivalen a una suite completa verde. No se reprodujo EACCES. npm test global no se repite en esta pasada limitada y conserva su fallo previo de ocho timeouts API.

### Evidencia adicional y coste

Veinte capturas nuevas de React real: ocho before y ocho after a viewport verificado 1280×720 (light/dark × cómoda/compacta × expandido/rail), más cuatro after a 320×844 con cabecera Lifecycle larga y drawer light/dark. Before corresponde al árbol PR 5 auditado antes de esta segunda pasada, no a Shell 2.0; se conservan las comparativas originales contra la base por separado. JPEG nativo sin retoque, con dimensiones efectivas y SHA-256 en el manifest. Datos explícitamente Demo; sin GLPI Live.

Build final de segunda pasada: JS 517.44 kB (gzip 152.28), CSS 154.31 kB (gzip 19.93). Frente a primera pasada: +0.56/+0.09 kB JS y +1.95/+0.25 kB CSS; frente a base: +2.75/+0.71 kB JS y +8.92/+1.36 kB CSS. Medición del entry completo con la misma herramienta; no se atribuye a CPU/LCP. Sin dependencias ni cambios de package/lockfile.

### Validación de segunda pasada (2026-10-09)

| Ejecución | Resultado |
|---|---|
| Primera afectada (sin Hardware por filtro incorrecto) | 61/62; exit 1, timeout Lifecycle/axe-reflow |
| Afectadas con filtro corregido: Shell, Overview, Hardware, Explorer, preferencias y navegación | 95/95; exit 0 |
| Shell tras corregir visibilidad móvil | 14/14; exit 0, dos pruebas nuevas en esta pasada |
| Shell/Hardware reduced motion + forced colors, versión final | 38/38; exit 0 |
| Storybook completo con axe | 67/67; exit 0 |
| Refresh físico de navegación | 3/3; exit 0 |
| Lifecycle aislado en base exacta / árbol actual | 6/6 y 6/6; exit 0 en ambos |
| Typecheck / build globales finales | exit 0 en ambos |
| Diff y parche consolidado | git diff --check y git apply --reverse --check sin errores |

No se reejecutan npm test global, API completa, Web completa ni foundations en esta pasada limitada: se conservan sus resultados previos, incluidas las ejecuciones fallidas, sin presentarlos como verificación de la revisión final. No se debilitan aserciones, reglas axe ni límites. El paquete adicional incluye logs, configuraciones externas y comparativas con hashes, además del diff incremental desde la primera entrega y el consolidado completo de PR 5.
