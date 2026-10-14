# PR 11 — GLPI Network Cards Adapter V2: informe técnico

Entrega local, 2026-10-14. Rama `feature/v03-cmdb-network-glpi-adapter-v2`; HEAD/baseline `bfc4b19f448d2f623a7159ac47d2a68b41622a80`. **Sin commit, push ni PR.** Auditoría humana pendiente.

## Preflight

PR #150 integrado en el baseline requerido. [CI posterior al merge](https://github.com/serarayaa/igx-nexus/actions/runs/38593208120): completed/success, evento push sobre ese SHA. Se actualizó main por fast-forward y se creó la rama propuesta desde el baseline, con árbol inicial limpio y sin cambios ajenos.

No había subagentes ni otros chats activos modificando este worktree. El chat de skills estaba inactivo y su última ejecución era de sólo lectura. `.agents/` y `skills-lock.json` no están versionados ni presentes en este checkout; existen como archivos locales en `C:/Proyectos/igx-nexus`, fuera de este árbol. No se incorporan, eliminan ni modifican. No se ejecutaron instrucciones/scripts de skills ni se mezclaron optimizaciones.

Leídos AI Context, contratos/validador/fixtures Network, auditoría/extracto OpenAPI y convenciones de transporte/adaptadores Hardware/Software. Se actualiza handoff reconociendo #150 integrado; PR 11 no se presenta como publicado.

## Implementación y alcance

Cinco archivos: `services/api/src/glpi-network.ts`, `services/api/src/glpi-network.test.ts`, `docs/integrations/glpi-network-adapter-v2.md`, este informe y `docs/ai-context/03-SESSION-HANDOFF.md`.

createGlpiNetworkAdapter obtiene únicamente asociaciones NetworkCardItem de un Computer, con ancla GLPI única de la instancia correcta y propietario explícito validado. Conserva assetId literalmente, IDs derivados de referencias válidas y asociaciones distintas con MAC/catálogo compartidos. Catálogo opcional por referencias explícitas, sin barridos ni inferencias. MAC observada y default permanecen distintas. Evidencia de colección, asociación y catálogo independiente; no se inventa fecha de observación original. Cada inventario retornado pasa el validador Network canónico.

401/403 y errores de autenticación producen unavailable/unauthorized sin datos residuales. Otros fallos no se convierten en vacío exitoso. Catálogo fallido conserva asociaciones válidas con partial/gaps; no solicitarlo no genera error artificial. Controles configurables de páginas, registros, detalles y duración por petición. [] explícito demuestra agotamiento; páginas cortas, solapadas o límites sin prueba de agotamiento no producen complete. [Mapeos, defaults y semántica detallada](../integrations/glpi-network-adapter-v2.md).

Sin endpoint, registro runtime/productivo, provider nuevo, UI, cambios de transporte existente o contratos aprobados. No GLPI Live autenticado, smoke, RBAC, discovery, SNMP, scanning, escrituras GLPI ni infraestructura. No interfaces/IP/puertos/VLAN/conectividad/topología. Hardware V2, Software/OS V2 y snapshot 0.2 sin cambios. Los cinco documentos de investigación PR 10 siguen versionados; no se alteran las cuatro fuentes históricas, sólo el handoff vigente.

## Pruebas y ejecuciones reales

| Log | Resultado |
| --- | --- |
| 01-network-tests.log | Fallo inicial: 97/105, ocho casos parametrizados pasaban el primer elemento del array en vez de la página completa |
| 02-network-tests-repeat.log | 105/105 después de corregir el arnés de parametrización, sin debilitar las expectativas |
| 03-api-typecheck.log | Typecheck API aprobado |
| 04-affected.log | 263/263, cinco archivos: Network, Hardware, Software, transporte y hardening; incluye 110 pruebas Network finales |
| 05-api-full.log | 509/510: timeout de 5 s en prueba Software HTTP existente “returns 401 before snapshot or any GLPI call” |
| 05b-api-full-repeat.log | 510/510, 25 archivos, misma configuración --maxWorkers=1 y sin modificar código/timeouts entre ejecuciones |
| 06-types-full.log | 319/319, 12 archivos |
| 07-typecheck.log | Typecheck global aprobado |
| 08-build.log | Build global aprobado |
| 09-verification.log | Ocho escenarios del adaptador compilado, outputs contractuales y cantidades de requests verificados; fuentes/adaptadores/runtime existentes sin cambios |
| 10-diff-check.log | Alcance exacto, diff check y parche consolidado reversible verificados |

Comandos reproducibles:

```powershell
npm run test --workspace @igx-nexus/api -- src/glpi-network.test.ts src/glpi-hardware.test.ts src/glpi-software.test.ts src/glpi.test.ts src/glpi-hardening.test.ts --maxWorkers=1
npm run test --workspace @igx-nexus/api -- --maxWorkers=1
npm run test --workspace @igx-nexus/types
npm run typecheck
npm run build
node .tmp/pr11-adapter/verify.mjs
git diff --check
```

Logs originales y repeticiones separados; no se sobrescriben fallos. No se probó ni declara validado el runner API con múltiples workers. El timeout histórico en Software HTTP permanece como limitación de reproducibilidad, aunque la repetición completa pasó. Fastify informa deprecación de disableRequestLogging y Vite conserva advertencia de chunk >500 kB; no se refactorizan. Los cuatro CSS generados por build se restauraron al baseline, fuera del diff final.

Las pruebas usan transporte y fixtures sintéticos exclusivamente. Cubren IDs literales/invalidación, anclas ambiguas/mala instancia/scope, propietario, colección vacía completa, MAC desconocida/duplicada, catálogo opcional/resuelto/fallido, cache por inventario, límites exactos, paginación corta/solapada/incompatible, agotamiento de presupuestos, 401/403 iniciales/tardíos, errores operacionales, abort/timeout y ausencia de mutación tardía. Regresión directa Hardware/Software/snapshot y sus suites existentes.

## Evidencia sintética reproducible

El paquete incluye synthetic-evidence.json generado mediante el adaptador compilado y comprobado con validateNetworkInventoryV2: ocho escenarios, payloads y llamadas sanitizadas de origen exclusivamente sintético. No son mediciones Live ni pruebas de permisos efectivos.

| Escenario | Requests sintéticos | Resultado |
| --- | --- | --- |
| Colección vacía | 1 colección | complete vacío con evidencia |
| Dos asociaciones, misma MAC y catálogo | 2 colección + 1 detalle | complete, dos asociaciones preservadas |
| MAC desconocida con catálogo default | 2 colección + 1 detalle | complete, macAddress:null |
| 145 asociaciones sin enriquecer | 100 + 45 + []: 3 colección | complete 145 |
| maxRecords=2, dos registros | 2 + [] con limit=1: 2 colección | complete en límite exacto |
| maxRecords=2, tres registros | 2 + prueba adicional: 2 colección | partial, sólo dos retenidos |
| Detalle 404 compartido | 2 colección + 1 detalle fallido | partial, dos asociaciones y gaps |
| Detalle 403 | 2 colección + 1 detalle fallido | unavailable/unauthorized, sin datos |

## Límites pendientes para integración

NetworkCards.complete sólo acredita agotamiento de asociaciones incluidas; no inventario completo de interfaces. No existe smoke poblado nuevo. Paginación offset no es snapshot transaccional, ni ancla local prueba autorización HTTP del caller. El productor futuro debe componer lookup/autorización, deadline total, presupuestos globales, concurrencia y drain. Esta entrega acota peticiones individuales y detiene más I/O en el inventario tras timeout; un transporte que ignora abort puede continuar pendiente y no hay garantía de cancelación física. Los detalles de catálogo se cuentan explícitamente en su presupuesto, separado del límite de asociaciones; una prueba terminal puede recibir una fila adicional sin retenerla.

No ampliar capacidades ni iniciar API Network V2. Entregar parche y ZIP con hashes, evidencia y fallos preservados; detenerse antes de commit/push/PR para revisión humana.
