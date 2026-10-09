# V03-CMDB-02 / PR 4 — Asset 360 Hardware Experience V2

## Estado de auditoría visual

La evaluación funcional preliminar es favorable; la composición visual todavía NO está aprobada. Las alternativas de cabecera, navegación y panorama se entregan como artefactos conceptuales externos al producto. No implementar un rediseño adicional hasta aprobación humana. Las capturas existentes y su JSON se entregan en un ZIP independiente de esas propuestas.

La única corrección de producto posterior a esta revisión omite la etiqueta de instancia de fuente y su separador cuando `sourceInstanceId` opcional está ausente/vacío, conservando autoridad, referencias y fechas. Dos regresiones verifican evidencia con y sin instancia; la validación incremental pasó 50/50 pruebas específicas con el wrapper browser externo y typecheck Web. Los resultados generales de la entrega anterior se conservan como históricos, no se declaran resueltos.

## Executive Summary

Asset 360 incorpora una sección Hardware sobre la API V2 existente. Presenta CPU, módulos RAM, discos físicos y volúmenes lógicos con cobertura, datos desconocidos y evidencia. La implementación queda pendiente de auditoría humana: sin commit, push, PR, merge ni consultas GLPI Live autenticadas.

## Baseline y alcance

- Rama: `feature/v03-cmdb-02-pr4-asset360-hardware-ui`.
- HEAD inicial: `2213aea35a3738f888f7e730ce6c8ca4a9d11411`; árbol inicial limpio.
- La base incorpora PR #143, cuyo commit `6e2a66e70e4af1789e80c933cbfab51119539a6d` es ancestro de HEAD, y los contratos/provider anteriores.
- No cambia API v1/V2, permisos, contratos 0.2/V2, GLPI adapter, persistencia, reconciliación ni integraciones.

## Auditoría visual inicial

La ficha existente ya resolvía identidad, contexto, enlaces hash, retorno a investigación y foco de sección. Se preservan esos mecanismos. Las secciones tenían bloques de peso similar; faltaba una lectura específica de hardware y una distinción visual entre componente físico, capacidad y espacio lógico. La captura baseline se obtuvo de la aplicación real en Demo, antes de editar.

## Identidad corporativa verificada

Se consultó el [sitio oficial Innergex en español](https://www.innergex.com/es) el 8 de octubre de 2026 y se inspeccionaron estilos calculados del sitio real. Se observaron jerarquía editorial amplia, azul oscuro en títulos/enlaces, superficies neutras y transiciones breves. La muestra del título principal reportó General Sans, 60 px y `rgb(0, 56, 101)`; algunos enlaces usaban neutros cálidos y las transiciones muestreadas eran de 0,1/0,5 segundos.

Estos valores son observaciones del sitio, **no un manual de marca**. La implementación utiliza el logo NEXUS ya aprobado en `assets/branding`, tipografía de sistema, colores semánticos, spacing, formas y motion ya versionados. No copia imágenes, fuentes, CSS ni activos del sitio corporativo. La investigación de branding no autoriza inventar una paleta oficial ni implica aprobación corporativa de esta pantalla.

## Decisiones de diseño

- Panorama de cobertura y cantidades informadas; RAM destaca capacidad conocida, con advertencia cuando no existe un total verificable.
- CPU: lectura de núcleos/hilos y frecuencias; valores desconocidos tienen tipografía de texto, sin cifras ficticias.
- RAM: una tarjeta por registro, tecnología DDR visible, capacidad y slot sólo cuando están informados. No se representa un layout de motherboard ni slots libres.
- Discos físicos: capacidad, medio, protocolo, interfaz y formato independientes; M.2 no implica NVMe.
- Volúmenes: capacidad, disponible y utilizado calculado independientes del disco físico. La asociación sólo muestra referencias del contrato.
- Evidencia mediante disclosures nativos. Las tarjetas informativas no simulan acciones ni hover interactivo.

## Arquitectura

`HardwareExperience` conserva identidad y navegación del Asset 360 mientras carga únicamente hardware. `useHardware` controla petición, validación, error y reintento. `hardware-client` conserva las convenciones HTTP existentes. `HardwareCollection` representa las variantes canónicas; tarjetas específicas evitan una cuadrícula de campos indiferenciada. `HardwareEvidence` separa fechas y fuentes. `hardware-format` concentra cálculos pequeños y verificables.

La inyección opcional `hardwareReader` permite tests y Storybook sin HTTP; App no la configura. Los fixtures y su CSS de revisión se importan exclusivamente desde tests/Storybook. Las colecciones muestran inicialmente hasta 12 registros, ampliables de 12 en 12, sin fusionar identidades desconocidas. Los índices de render y las etiquetas ordinales son posiciones de presentación, nunca IDs del dominio.

## HTTP e identidad

La única petición nueva es `GET /api/v2/technology/assets/${encodeURIComponent(assetId)}/hardware`. `assetId` proviene exactamente del activo NEXUS resuelto. Se usan `accept: application/json`, `credentials: same-origin`, `cache: no-store` y `AbortSignal`, siguiendo el reader existente. No hay URLs, credenciales ni IDs GLPI construidos en el navegador.

Cada respuesta pasa por `validateHardwareInventoryV2` y debe coincidir con el ID solicitado. Datos inválidos o de otro activo no se muestran. El reader sólo se monta cuando Hardware está activo en Live. Salir de la pestaña, desmontar o cambiar de activo cancela el intento; la guarda del signal ignora respuestas tardías, incluso si un reader ignora la cancelación. Cambiar el ID remonta el controlador para impedir mostrar inventario anterior.

401 requiere autenticación; 403 muestra falta de permiso; 404 expresa activo fuera del alcance/inexistente sin distinción adicional; 503 y fallos de red permiten reintento. Los mensajes son locales y genéricos; no se muestra el cuerpo de errores internos. Se conserva la autorización del backend `technology:read` y su alcance global actual: este PR no implementa autorización por activo/tenant.

## Cobertura, procedencia y cálculos

Se diferencian `complete`, `partial`, `unavailable`, `not_applicable` y `not_requested`. `complete/items: []` declara consulta completa sin registros y conserva evidencia de sección. `partial/items: []` declara falta de cobertura, no ausencia de componentes. Las brechas muestran reason y fieldPath del contrato. Un fallo en una sección no invalida visualmente otras secciones válidas de una respuesta canónica.

Se muestran recopilación NEXUS, observación original y fecha de referencia de fuente con etiquetas distintas, en UTC. Observación original nula permanece desconocida. Las referencias conservan sistema, instancia, externalId y autoridad; la provenance mantiene fieldPath, derivation/authority y fecha existente. No se crean observaciones, fechas, identidades ni inferencias adicionales.

Capacidades usan unidades binarias explícitas (GiB/TiB) y conservan bytes exactos en `title`. `null` y cero se distinguen. La suma RAM sólo se declara total con sección completa, todas las capacidades conocidas y suma segura; una suma parcial se identifica como capacidad conocida. La precisión por encima de `Number.MAX_SAFE_INTEGER` no produce un total engañoso. El utilizado de volumen sólo se calcula como capacidad menos disponible si ambos son conocidos, consistentes y la capacidad es positiva. Sin esos datos no hay porcentaje ni meter. Esto es inventario recopilado, no telemetría en tiempo real.

## Estados, navegación y movimiento

### Correcciones de cierre aprobadas

El heading Hardware conserva foco programático con contorno de 2 px, color del token focus-ring, offset de 4 px y ancho ajustado al texto. Confluencia escucha la preferencia reduced motion y sus cambios: en reducción se presenta como firma estática con botón deshabilitado, sin anunciar reproducción ni icono de replay. Storybook muestra explícitamente DATOS SINTÉTICOS, sin sesión GLPI Live ni HTTP; sus indicadores Live del shell se ocultan sólo en la historia, mientras la nota explica que se ejercita la rama Live mediante inyección de fixtures. Los modos productivos no cambian.

La auditoría técnica y visual cerró el alcance y autorizó commit/push/PR tras validación final; no merge ni auto-merge. Las mejoras transversales de Shell y navegación global quedan para NEXUS Visual Foundations & Shell 3.0.

Loading usa un skeleton local y un status textual; la identidad del activo permanece montada. Error conserva la ficha y ofrece reintento sólo según la clasificación. Demo explica que hardware requiere Live autorizado y nunca consulta esa API ni fabrica inventario.

La sección está codificada como `?section=hardware`; parser y restauración de history state la reconocen. Los enlaces mantienen `return`, las secciones anteriores y el foco del heading. Se verifican refresh físico y back/forward.

Entradas de panel y bloques listos usan desplazamiento vertical de 4 px con el token de panel (200 ms). La navegación local conserva links y añade un indicador compartido con transform/ancho y token de componente; ResizeObserver mantiene su alineación. El índice de hardware mueve foco al heading y desplaza el contenido sin cambiar hash, ID canónico, return ni volver a consultar HTTP. No se repiten entradas en rerenders ordinarios ni se retrasa contenido/foco. No se interpola color de texto/superficies durante el cambio de tema para evitar contraste intermedio insuficiente.

La dirección Connected Infrastructure, aprobada como base, se integra mediante panorama asimétrico, superficies semánticas, contexto del activo sin divisores por campo, CPU con detalles nativos expandibles y un índice de componentes. Texto operativo de hardware y contexto del shell: mínimo 14 px; cuerpo 16 px; títulos y capacidades 20–36 px según tokens existentes. No cambia la paleta global, el logotipo ni la lógica de AppShell/NexusShell. La superficie RAM utiliza una mezcla del 8 % del token de enlace con la superficie panel; tiene fallback semántico.

Confluencia es un único SVG abstracto propio con profundidad CSS y trazado finito (3 × token workspace). Hover/foco endereza sutilmente el plano; Enter/Espacio reproduce sólo la firma, sin consultas ni cambios de inventario. No representa topología ni telemetría. No hay WebGL, motor nuevo ni RAF permanente. Loading conserva status y skeleton con entrada finita. El meter nativo mantiene su valor accesible; Chromium anima una vez el relleno al montar. Otros motores conservan el meter nativo. `prefers-reduced-motion` elimina entradas, dibujo, inclinación, indicador y relleno animado; forced colors conserva información HTML y contraste del SVG.

## Accesibilidad y responsive

Se reutilizan botones/badges/feedback del design system. Navegación con links y `aria-current`, headings jerárquicos, disclosures nativos operables por teclado, iconos decorativos ocultos y meter con nombre accesible. El color no es la única señal de cobertura. Las tarjetas pasan a una columna en móvil; el panorama a una columna hasta 900 px para que las etiquetas no desborden. Se verifican 320 px, móvil 390 px, tablet 768 px, escritorio, light/dark y forced colors.

El audit autónomo ejecuta todas las reglas axe sobre Hardware y conserva también resultados completos del shell. Hardware no presenta violaciones en los diez escenarios. El shell existente reporta el hallazgo de buenas prácticas `region` en su skip link exterior a landmarks; se registra expresamente y no se desactiva la regla. Se rechaza cualquier otro hallazgo de shell. La automatización verifica teclado, reflow, reduced motion, cero peticiones API y cero excepciones de browser; las capturas se inspeccionan además visualmente.

## Cambios compartidos

Se añade un único glob exacto a `packages/ui/.storybook/main.ts` para probar la experiencia Web en el Storybook ya instalado. No se crea otro catálogo ni design system, no se añade dependencia y no se altera la configuración de tests versionada. El CSS del canvas completo es exclusivo de esa historia. `asset-360.css` incorpora movimiento/foco existente, acotado a los paneles y navegación de la ficha; se ejecutan las regresiones de las secciones anteriores.

## Reproducción sin Live

Desde la raíz del repositorio:

```powershell
npm run build --workspace @igx-nexus/ui
npm run storybook --workspace @igx-nexus/ui -- --port 6008 --host 127.0.0.1 --no-open --ci
```

En otro terminal:

```powershell
node apps/web/tests/hardware-visual-review.mjs http://127.0.0.1:6008 qa-artifacts/hardware-v2
```

Storybook: `Web/Asset 360/Hardware V2`, historias Complete, Partial, Unknown, Loading, Error Retry y Retry Recovered. El script sólo acepta localhost/127.0.0.1; los escenarios son sintéticos y sus readers no hacen HTTP. La captura en el script no constituye autorización para GLPI Live. Para Demo real: `#assets/DEMO-0002?section=hardware`; muestra sólo la explicación de disponibilidad. Para integración Live futura, utilizar la configuración autorizada existente; no habilitarla como parte de esta revisión.

## Validación, límites y recomendaciones

Integración Connected Infrastructure: específicas 51/51; web completa alternativa serial 399/399; API serial 258/258; Storybook 60/60 y repetición final de las seis historias Hardware 6/6; browser Hardware con reduced motion real 23/23; refresh 3/3 y foundations 4/4; typecheck y build globales aprobados. En esta revisión `npm test` original falló por ocho timeouts API (250/258), y web original por dos timeouts (396/398), antes de añadir el cuarto caso nuevo. No se reprodujo EACCES y no se declara global verde. Las capturas nuevas corresponden a los componentes React reales en Storybook con fixtures sin HTTP y a la app Vite Demo; no al prototipo aislado. La implementación visual espera auditoría humana, sin commit/push/PR ni GLPI Live.

El informe de entrega adjunto contiene comandos, logs, resultados originales y alternativos, lista exacta de archivos y capturas. `npm test` original no se declara verde. Se observó inicialmente `EACCES` en el puerto browser `::1:63315` de Windows; más tarde las suites originales arrancaron y Vitest resolvió automáticamente una colisión de puerto en Storybook. Las ejecuciones con wrappers temporales externos al repositorio se conservan separadas, sin cambiar aserciones ni timeouts.

Resultados de la entrega funcional anterior (históricos): typecheck y build globales aprobados; Storybook original 60/60, foundations 4/4, refresh físico 3/3 y gate black-box Demo aprobado. La suite Web original quedó 392/393 por timeout de Lifecycle; ese caso ya fallaba en la validación de PR 3 y pasó aquí 6/6 en aislamiento. La suite Web alternativa quedó 391/393, con un timeout adicional en contract round-trip que después pasó 2/2. Los cinco archivos específicos de Hardware/navegación/Asset 360 pasaron 58/58 con wrapper de puerto. API pasó 258/258 en una ejecución original independiente y 258/258 en la alternativa serial final; `npm test` global tuvo 8 timeouts API (250/258) y no avanzó a sus siguientes etapas. No se equiparan estas ejecuciones a una aprobación global.

El smoke GLPI Live autenticado sigue pendiente. La revisión visual se realizó en Chromium y no sustituye una revisión humana ni prueba de lector de pantalla. Los fixtures ejercitan variantes de datos, no certifican compatibilidad física de un equipo real. La build advierte un chunk principal superior a 500 kB; considerar carga diferida con manejo explícito del foco en una entrega posterior. Antes de integrar, revisar CI en un entorno sin la reserva de puerto y los flujos autorizados de sesión. No ampliar permisos ni reutilizar fixtures como fallback.

Validación definitiva de cierre PR 4 (2026-10-09): Hardware/cliente/formato/navegación 52/52; Web completa serial 400/400; API serial 258/258; Hardware en Chromium con reduced motion real 24/24; Storybook 60/60; refresh de navegación 3/3. Typecheck y build globales aprobados; git diff --check sin errores. npm test global falló (exit 1): types 149/149 y API 250/258, con ocho timeouts; no ejecutó las etapas siguientes. Los resultados seriales usan configuraciones temporales externas, sin modificar aserciones ni timeouts del repositorio, y no sustituyen el resultado global fallido. No se reprodujo EACCES en este cierre. Persiste la advertencia de chunk >500 kB y el smoke GLPI Live autenticado pendiente; no se realizaron consultas Live.

Auditoría técnica y visual aprobada por el usuario. Alcance congelado: foco Hardware con token de diseño, Confluencia estática y sin control de reproducción bajo reduced motion, y aviso inequívoco de fixtures sintéticos exclusivo de Storybook. Se autoriza commit/push/PR hacia main, sin merge ni auto-merge. Backend, contratos Hardware V2, API v1/0.2, permisos y modos productivos conservados. Las mejoras globales se reservan para NEXUS Visual Foundations & Shell 3.0.
