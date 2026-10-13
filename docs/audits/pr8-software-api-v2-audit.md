# PR 8 — Entrega para auditoría humana

2026-10-13, America/Santiago. `serarayaa/igx-nexus`, baseline `a242d21a0b3de3774182d1fa367dfff7b730af90`; rama `feature/v03-cmdb-software-os-api-v2`. PR #147 integrado. Cambios locales sin commit/push/PR.

## Resultado

Implementada API Software/OS V2 read-only: lookup canónico, technology:read, validación contractual, OpenAPI y composición GLPI compartida. Endurecimiento autorizado: deadline monotónico total, presupuestos de llamadas/registros y concurrencia sin cola; cupos retenidos mientras queda trabajo tardío. La [documentación técnica](../integrations/software-api-v2.md) define contrato, arquitectura, métricas y límites; este informe registra evidencia de entrega.

## Cierre de auditoría — corrección literal de assetId

Auditoría humana favorable al endurecimiento y API V2. Se corrige únicamente la validación demasiado restrictiva `^\S+$`: el nuevo pattern permite contenido interior válido y rechaza vacío/whitespace en los extremos, incluso terminadores de línea finales. No se normaliza ni reconstruye el ID. `SYNTH ASSET` recibe 200 y vuelve literalmente; variantes con espacios iniciales/finales reciben 400 antes del snapshot. ID distinto por eliminación o colapso de espacios recibe 404. Se incluyen ID de un carácter, doble espacio/tab interior y límites Unicode/newline. Parámetros vacíos siguen en 400 y URI excesiva conserva 414 del router.

El punto 4 del pedido repetía visualmente el mismo ID para 200 y 400; se aplicó el rechazo a las variantes con espacios en extremos conforme al punto 2. Ningún cambio a autenticación, autorización, lookup, deadline, presupuestos, concurrencia, runtime ni adapter. Se mantienen los mismos **16 archivos** de la entrega original: sólo cinco se ajustan en el cierre (ruta, tests HTTP, documento técnico, informe y handoff); los otros once se verifican byte a byte contra la entrega anterior. Se preserva el ZIP anterior y se genera un paquete de cierre separado.

| Log de cierre | Workers | Resultado |
| --- | ---: | --- |
| 20-closure-affected-original-w1 | 1 | 179/180; timeout existente de 5000 ms en primer test Hardware, regresiones nuevas aprobadas |
| 21-closure-affected-repeat-w1 | 1 | **180/180**, repetición idéntica |
| 22-closure-api-full-w1 | 1 | **400/400**, 24 archivos, 30.40 s |
| 23-closure-types | Default Types | **229/229** |
| 24-closure-typecheck / 25-closure-build | No aplica | Aprobados, alcance completo del monorepo |
| 26-closure-diff-check | No aplica | Aprobado, exit 0 |
| 27-closure-scope-openapi | No aplica | Mismos 16 archivos; cinco ajustados y once byte a byte idénticos; pattern OpenAPI actual verificado sin I/O GLPI |

No se aumentaron timeouts ni se redujeron aserciones. Logs históricos 01–19 permanecen separados; incluyen default, dos workers y un worker en estados anteriores. La pasada actual de 400 pruebas usa un worker y no certifica estabilidad con otros números. Las mediciones operacionales sintéticas previas se conservan como evidencia del código operacional sin cambios; no se repitió el benchmark ni se consultó GLPI Live. OpenAPI actualizado, diff check y parche se verifican sobre el árbol de cierre.

## Matriz de cambios y compatibilidad

| Superficie | Cambio | Evidencia |
| --- | --- | --- |
| Software HTTP V2 | Nueva ruta, ID literal incluidos espacios interiores, auth y queries cerradas | Tests 200/400/401/403/404/503; rechazo de whitespace en extremos antes de snapshot; sin I/O previo a autorización |
| Runtime | Snapshot/Hardware/Software comparten transporte/token/instancia | Regresión OAuth único y factory anterior compatible |
| Transporte | Signal opcional; presupuestos sólo bajo contexto Software | Suites GLPI/Hardware/v1, OAuth compartido tardío |
| Snapshot 0.2 | Contrato/HTTP sin cambios; costo contado en Software | Snapshot validado/comparado; truncamiento no autoriza |
| Adapter Software | Checkpoints, presupuesto explícito, límite de página coherente con evidencia | Suite previa y nuevas regresiones operacionales |
| OpenAPI | Schemas nuevos; conversión documental type:null legado a OAS 3.0 | Documento real, null/provenance serializados |
| Types | Sin cambios | 229/229 |
| Hardware/v1 | Sin presupuestos Software en sus contextos | API completa; disponibles durante saturación Software |
| UI/Shell/RBAC/cache/persistencia | Sin cambios funcionales | Diff; CSS generado por build restaurado al baseline |
| Config | Cuatro variables opcionales acotadas | Defaults documentados y mediciones, sin credenciales nuevas |

## Resultados originales

Archivos completos de la entrega previa incluidos en ZIP, separados de los logs 20+ de cierre; ninguna pasada fallida se declara aprobada. Los recuentos 385/383/381 siguientes corresponden a estados previos y no sustituyen la pasada final actual de 400 pruebas.

| Log | Resultado |
| --- | --- |
| 01-targeted-original | 150/158; ocho fallos: dos timeouts de arranque, tres fixtures de ancla con provenance inválida, expectativa 400 frente a 414 del router, nombres Swagger supuestos y comparación con reloj variable |
| 02-typecheck-api | Aprobado |
| 03-targeted-corrections | 157/158; type:null legado en documentación inline v1 |
| 04-build-api / 06-build-benchmark | Aprobados |
| 05-targeted-final | 161/161, antes de las últimas regresiones |
| 07-measurements-original | Aprobado; JSON original conservado |
| 08-api-full-original | 378/381; dos timeouts de arranque Hardware/v1 y deadline real en test de presupuesto bajo carga |
| 09-types-full | 229/229 |
| 10-typecheck-full | Falló por destructuring OpenAPI en tipo union Swagger; corregido con narrowing |
| 11-api-full-bounded-workers | 383/383, dos workers, antes de regresiones finales OAuth |
| 12-typecheck-full-corrected / 13-build-full | Aprobados |
| 14-api-full-final | 383/385, dos workers; timeouts de 5 s de primer caso Hardware/Software |
| 15-typecheck-final / 16-build-final | Aprobados sobre código final |
| 17-measurements-final | Aprobado, 13 escenarios, incluyendo snapshot grande y presupuesto de registros |
| 18-api-full-final-single-worker | **385/385**, 24 archivos, 31.06 s; sin ampliar timeouts ni quitar aserciones |
| 19-package-verification | Parche consolidado comprobado en reversa; índice Git real intacto; 128 referencias OpenAPI locales resueltas, sin type:null ni siblings nullable de $ref |

Fixtures corregidas contienen snapshots válidos: ausencia de Computer se modela con otra fuente válida, ambigüedad con dos referencias distintas; snapshot malformado permanece 503. Router conserva 414 para URI excesiva y se agregó parámetro inválido 400. Schemas se verifican por título/referencias, sin asumir nombres def-*. Reloj runtime fijo permite conservar comparación completa de snapshot. Tests operacionales usan fake timers para determinismo; integración HTTP conserva timers reales para medir retención/saturación.

La pasada final limita workers para reducir competencia local: **no certifica estabilidad del runner por defecto bajo alta concurrencia**. No se alteraron suites, timeouts o aserciones de Hardware/v1. Los fallos originales permanecen visibles. Se conserva warning Fastify disableRequestLogging y chunk Web >500 kB. npm ci --ignore-scripts instaló 292 paquetes y reportó una vulnerabilidad moderada; no hubo actualización de dependencias/lockfile ni npm audit fix.

## Entrega y reproducción

ZIP: archivos cambiados/nuevos, documentación, handoff, parche consolidado, matriz, logs completos, mediciones JSON originales/finales, OpenAPI y manifiesto SHA-256. Parche incluye archivos nuevos y existentes; comprobación `git apply --check --reverse` sobre árbol final sin modificarlo. Setup/preflight se conservan como notas separadas; logs de pruebas/build/mediciones incluyen stdout/stderr y fallos.

Validación final: `npm run test --workspace @igx-nexus/api -- --maxWorkers=1`, `npm run test --workspace @igx-nexus/types`, `npm run typecheck`, `npm run build`, `node scripts/measure-software-api-v2.mjs .tmp/pr8-audit`. Node 24 y lockfile existentes. No npm test global ni suites Storybook/browser/Web; no cambio funcional de UI.

## Riesgos y decisiones pendientes

- Defaults 5 s/64 llamadas/20.000 aceptados/dos operaciones son iniciales; no representan capacidad/latencia Live. Snapshot de 10.000 Computers supera presupuesto con pageSize=100. Calibrar antes de producción.
- Probe puede adquirir un registro adicional rechazado. Upstream que ignore limit y tamaño de campos/body no tiene cota de bytes antes del parseo actual. No se promete límite estricto de memoria por bytes.
- OAuth ya iniciado y credenciales/transporte no cancelables pueden continuar. Cupo retenido hasta drain; promesa que nunca termine retiene cupo indefinidamente y afecta disponibilidad, sin permitir acumulación nueva oculta.
- Gate por proceso, sin protección distribuida. Código síncrono/event loop pueden retrasar timers; checkpoint rechaza resultado vencido, sin deadline duro de pared.
- RBAC global, sin aislamiento usuario/entidad; snapshot no transaccional. I/O oculto en inyecciones programáticas queda fuera de la cota demostrada y no debe introducirse.
- No GLPI Live ni revalidación de 145 instalaciones históricas; smoke requiere autorización explícita futura. No cambios RBAC.
- Auditoría humana debe evaluar límites, compensación disponibilidad/contención, cupos retenidos y fallos de arranque locales. No se inicia PR 9.

Auditoría humana favorable registrada y corrección puntual entregada para cierre. No commit, push, Draft PR, merge ni auto-merge; no se inicia PR 9. Publicación pendiente de autorización posterior.
