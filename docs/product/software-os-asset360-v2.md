# Sistema y software V2 — Asset 360

PR 9, frontend de NEXUS 1.0 — IT CMDB & Asset Management. Baseline `3f666abb08e585ce29bdc13ba5ad43d0b3790d1f`; PR #146, #147 y #148 integrados. El CI posterior al merge #148 terminó success: [run 38456125206](https://github.com/serarayaa/igx-nexus/actions/runs/38456125206). Trabajo local en `feature/v03-cmdb-software-os-asset360-v2`, pendiente de auditoría humana antes de commit, push o PR.

## Decisiones de experiencia

La revisión previa confirmó que Asset 360 tiene navegación hash contextual, gestión de foco y reader/hook independiente para Hardware. PR 9 incorpora **Sistema y software** dentro de esa misma ficha, después de Hardware; mantiene Shell 3.0, retorno a Explorer y las otras vistas. No agrega módulo global, router, dependencias, endpoints ni infraestructura.

La presentación combina encabezado editorial, dos contadores compactos de instalaciones cargadas, listado de sistemas operativos y tabla semántica de instalaciones. Todos los OS tienen el mismo tratamiento; no se designa un sistema principal. Sus campos muestran nombre, versión, edición, arquitectura, service pack, kernel e instalación con precisión; identidades y evidencia se expanden con detalles nativos.

Software utiliza filas de observaciones con nombre, publisher, versión literal, arquitectura, fecha e identidad/evidencia expandible. Los controles Search, Button y Badge provienen de `@igx-nexus/ui`; tabla, select y details usan HTML nativo con tokens oficiales. La densidad de celdas sigue control-gap/control-padding-inline del DataTable vigente. No hay iconografía decorativa ni movimiento permanente; las flechas de ordenamiento son Lucide. La animación finita de entrada y el foco siguen las foundations de Asset 360, con reduced motion.

Cada registro permanece independiente, incluso si repite producto/versión o su installationId es null. El ordinal y la clave por posición sólo identifican una fila de presentación, no reconstruyen una identidad canónica. No se infieren licencias, vulnerabilidades, actualizaciones, compliance ni software no autorizado.

## Reader, hook y límites de confianza

`software-client.ts` consulta únicamente `GET /api/v2/technology/assets/${encodeURIComponent(assetId)}/software`, sin query strings. Usa GET, accept application/json, credentials same-origin, cache no-store y AbortSignal. No contiene URL/credenciales GLPI, configuración de instancia ni resolución por hostname, serial o nombre de programa.

El reader valida JSON con `validateSoftwareInventoryV2` y exige assetId exactamente igual al solicitado, incluidos espacios interiores válidos. El hook también valida respuestas de readers inyectados. Errores 401/403/404/503, red y respuesta incompatible tienen mensajes propios sin imprimir bodies upstream. 503 se presenta como indisponibilidad potencial por saturación/plazo; el envelope no permite diagnosticar una causa exacta. Reintentos sólo para red e indisponibilidad, conservando la ficha del activo.

`use-software.ts` reutiliza el patrón de Hardware: efecto, AbortController, limpieza, reintento y reader inyectable. El resultado lleva identidad, reader e intento; un cambio invalida el estado visible inmediatamente, antes del siguiente efecto. Se descartan respuestas tardías aunque un reader ignore abort. El componente Live está keyed por assetId y se desmonta al abandonar la sección o pasar a Demo. Sólo se monta cuando Software está activo y el modo es Live. No hay cache compartida.

Demo muestra un estado explicativo, sin consultar software corporativo ni usar fixtures. Los fixtures de `test/software-fixtures.ts` sólo se importan desde tests y Storybook. Las stories de shell completo indican prominentemente DATOS SINTÉTICOS y usan providers/readers inyectados, sin sesión GLPI ni HTTP. Esas stories no son evidencia Live.

## Cobertura, contadores y paginación

| Variante | Presentación |
| --- | --- |
| complete con registros | Registros adquiridos y cobertura completa declarada por contrato |
| complete vacía | Consulta completa sin instalaciones registradas, con evidencia de adquisición |
| partial | Advertencia de adquisición incompleta, registros disponibles y gaps expandibles |
| partial vacía | No demuestra ausencia de software; mensaje distinto del vacío completo |
| unavailable | Motivo traducido de indisponibilidad, sin lista vacía ficticia |
| not_applicable | Sección fuera del alcance declarado |
| not_requested | Sección no consultada |
| Campo null | No informado / no resuelto, sin reemplazarlo con inferencias |

La cobertura es calidad/completitud de adquisición, no salud o seguridad. Los badges se mantienen neutrales. Los contadores dicen **cargadas**, **coincidencias** y **visibles**; no infieren un total corporativo. Un resultado partial puede omitir instalaciones o referencias de catálogo. Los gaps conservan fieldPath y motivo; pagination conserva offset, retrieved, total y nextOffset, incluidos null. La ausencia de continuación no prueba agotamiento.

Búsqueda local sobre nombre, publisher, versión, arquitectura e IDs; filtro por publisher literal o editor desconocido; orden por nombre/editor/versión con localeCompare sin interpretación SemVer y desconocidos al final. Buscar transforma sólo el texto de consulta, nunca campos ni IDs. Las filas se ordenan en una copia estable y no se fusionan. Paginación de presentación de 25 filas; búsqueda/filtro/orden reinician la página, sin nuevas consultas HTTP. 145 instalaciones sintéticas generan seis páginas y mantienen dos instalaciones legítimas con el mismo nombre/versión.

## Identidad, fechas y evidencia

Los IDs installationId, operatingSystemId, softwareId y versionId permanecen literales en detalles. Las versiones no se normalizan. Una fecha date se muestra como YYYY-MM-DD y día calendario sin hora. Un timestamp se presenta en UTC/24 horas, indicando ese criterio, y se conserva además su valor literal con zona original en evidencia. Observación desconocida permanece desconocida y nunca se sustituye por recopilación.

SoftwareEvidence conserva adquisición y todos los campos de SourceReference: fuente, instancia opcional, scope, entityType, externalId, autoridad y observedAt. Provenance muestra fieldPath, source completo, observedAt, ingestedAt, authority, derivation, confidence y referencias de evidencia con kind/reference/label/observedAt. No genera enlaces GLPI. Las referencias sólo se muestran como texto escapado por React.

## Navegación y accesibilidad

Ruta existente `#assets/<ID codificado>?section=software`, con return contextual. Se agrega software al enum central y restauración de history.state de App. El foco usa el encabezado data-asset-section-heading, como Hardware. En deep links estrechos, la sección nueva se hace visible desplazando sólo la navegación horizontal local; no se desplaza verticalmente la página ni cambia el contrato de Hardware.

Tabla con caption, encabezados scope=col/row y aria-sort; orden y disclosures utilizables por teclado; conteo anunciado con aria-live. Select etiquetado y Search del sistema de diseño. Foco visible y targets de 44 px. Themes light/dark, densidades comfortable/compact, forced colors y reduced motion. A 320 px la tabla conserva scroll horizontal **local**, sin overflow global; navegación contextual también tiene su propio scroll. Las fuentes y metadatos extensos se ajustan con overflow-wrap.

La QA ejercita un zoom CSS del 200% en Chromium; no sustituye una matriz de zoom nativo/OS/dispositivos reales. Axe, teclado programático y revisión de capturas auténticas aportan evidencia, no certifican por sí solos WCAG AA ni reemplazan validación manual con lectores de pantalla. Se conserva la excepción region de las pruebas existentes. La regla skip-link excluye sólo enlaces del router en el menú contextual, que axe confunde con saltos a IDs cuando quedan fuera de pantalla por scroll horizontal; las demás reglas los inspeccionan y el enlace de salto real del Shell sigue cubierto.

## Pruebas, evidencia y restricciones

[Informe de auditoría](../audits/pr9-software-os-asset360-v2.md) registra comandos, resultados originales, fallos, repeticiones, revisión visual y matriz de compatibilidad. Se incluyen tests unitarios/HTTP reader, hooks, browser, stories y refresh físico. El script `scripts/qa-software-v2.mjs` revisa Storybook estático con red restringida a localhost, aborta cualquier /api y verifica cero consultas; genera capturas reales, resultados axe y geometría.

No se modifican servicios API, Types, provider 0.2, adaptador GLPI, RBAC, presupuestos/deadlines backend, base de datos ni integraciones. La suite API completa no se requiere por cambios backend; las regresiones HTTP round-trip de Web y compilación del monorepo sí comprueban la frontera existente. No se consulta GLPI Live ni se presenta la evidencia histórica de 145 como actual.

Pendientes: smoke autorizado con inventario real, evaluación con lectores de pantalla y dispositivos reales, variantes de strings extensos/lenguajes y calibración UI con colecciones mucho mayores. No se implementan filtros remotos ni administración de software. Detenerse para auditoría humana, sin commit/push/PR, merge/auto-merge ni PR 10.
