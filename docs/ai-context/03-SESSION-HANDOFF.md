# IGX NEXUS — Session Handoff

## PR 8 — Software API V2: estado vigente, 2026-10-13

- Baseline verificado `main@a242d21a0b3de3774182d1fa367dfff7b730af90`, árbol inicial limpio tras materializar el repositorio vacío. **PR #146 y PR #147 ya están integrados en main.** El estado histórico PR 7 se consulta en `git show a242d21a0b3de3774182d1fa367dfff7b730af90:docs/ai-context/03-SESSION-HANDOFF.md`; su afirmación de no integrado queda supersedida.
- Rama local `feature/v03-cmdb-software-os-api-v2`; cambios sin commit, push ni PR. Auditoría humana favorable del endurecimiento y Software API V2. Corrección puntual de assetId entregada para cierre; publicación todavía no autorizada.
- Implementado GET `/api/v2/technology/assets/:assetId/software`: autenticación + technology:read, ID exacto en snapshot configurado, ancla Computer válida, Demo/Live separados, contrato validado y OpenAPI 3.0.3. Sin UI, escritura GLPI, nuevos permisos, cache de inventario ni persistencia.
- Transporte/instancia/token compartidos por snapshot, Hardware y Software. Deadline total monotónico, presupuesto agregado y gate por proceso sin cola. Cupos retenidos mientras quede trabajo tardío. OAuth ya iniciado puede terminar para v1/Hardware, sin iniciar consultas de Software vencido.
- Defaults iniciales: 5 s, 64 llamadas, 20.000 registros aceptados (+ un probe rechazado de un registro si upstream respeta limit), dos operaciones. Snapshot de 10.000 Computers supera presupuesto con pageSize=100; 503, nunca snapshot truncado exitoso. Calibración Live pendiente.
- Cierre puntual: assetId permite espacios interiores válidos y preserva ID literal; rechaza vacío/whitespace inicial/final. Regresiones `SYNTH ASSET`=200, extremos=400, variantes distintas=404. Sin cambios a auth, lookup ni límites operacionales. Alcance original de 16 archivos; sólo cinco ajustados frente a la entrega auditada.
- Validación actual de cierre: afectadas 180/180, API 400/400 con un worker, Types 229/229, typecheck/build completos aprobados. Primera afectada 179/180 por timeout Hardware; repetición idéntica aprobada. Resultados anteriores separados: API default 378/381, dos workers 383/385 y un worker 385/385. No se ampliaron timeouts ni quitaron aserciones. La pasada actual con un worker no prueba estabilidad con otros números.
- Mediciones sintéticas: 145 instalaciones/11 llamadas; 20 productos × 20 versiones/49; catálogo grande corta en 64 conservando instalaciones partial. Deadline, presupuesto de registros, rechazo del tercer lector y retención hasta drain demostrados. No son latencia productiva ni evidencia Live.
- Referencias: [documentación técnica](../integrations/software-api-v2.md), [auditoría y resultados originales](../audits/pr8-software-api-v2-audit.md), [adapter PR #147](../integrations/glpi-software-os-v2.md), [contratos PR #146](../product/software-os-contracts-v2.md).
- No GLPI Live ni revalidación de 145 instalaciones históricas. Smoke requiere autorización explícita. No suites UI/browser ni npm test global.
- Próximo checkpoint: revisión de la corrección de cierre y autorización posterior de publicación. Informe, parche y ZIP actualizados; paquete anterior y logs fallidos conservados. **No commit, push, Draft PR, merge, auto-merge ni PR 9 sin autorización posterior.**

## Arquitectura vigente y continuidad histórica

Este handoff actualiza el estado de trabajo, no sustituye decisiones de producto. Se preservan abajo las decisiones del handoff base; su evidencia Live es histórica y no autoriza nuevas consultas. El estado previo completo se consulta con `git show 713956222fc928d4787d1123faecad4eb7174c3b:docs/ai-context/03-SESSION-HANDOFF.md`. Su Next sequence correspondía a una fase anterior y no debe ejecutarse como plan actual.

Referencias normativas vigentes: [índice de arquitectura](../architecture/README.md), [límites de producto](../architecture/adr-0001-product-boundaries.md), [sistema de diseño](../architecture/adr-0003-ui-design-system.md), [routing Asset 360](../architecture/adr-0006-asset-360-routing.md), [modelo canónico](../architecture/adr-0011-canonical-technology-model.md), [Demo/Live](../architecture/adr-0014-provider-mode-contract.md), [provenance](../architecture/adr-0019-provenance-reconciliation.md) e [IA de producto](../architecture/adr-0023-product-information-architecture-v2.md). PR 7 no cambia estas decisiones.

## Product decision

El target de producto ya no se expresa como “v0.3 final”.

La versión mayor en construcción es:

**NEXUS 1.0 — IT CMDB & Asset Management**

Los tickets y docs `V03-CMDB-*` se mantienen como workstream técnico por continuidad histórica.

NEXUS 2.0 no se inicia hasta que 1.0 esté completa, probada y operando de forma estable.

## 1.0 Core

Core obligatorio:

`GLPI + GLPI Agent + NEXUS`

Debe cubrir inventario, Asset 360, software, lifecycle, relationships, CMDB Health, history y workflows de Asset Management con documentación de entrega/devolución.

## Optional enrichments

No bloquean 1.0:

- Entra ID: identity/account/org;
- Intune: endpoint management/enrollment/compliance/primary user;
- Google Workspace: sólo si aporta datos útiles no redundantes;
- Zabbix: telemetría operacional.

Toda integración debe conservar authority/provenance y justificar su permiso/scope.

## Optional Endpoint Health

Stretch goal de 1.0 o 1.x:

- battery health;
- SMART/NVMe/storage;
- media errors/wear;
- Windows Event Log relevante;
- unexpected restarts;
- hardware/storage errors.

Orden de evaluación: GLPI Agent → smartmontools → Zabbix → collector Windows acotado.

No usar Wazuh/cybersecurity como dependencia de la CMDB sólo para obtener señales básicas de health.

## V03-CMDB-01 evidence (histórica; no revalidada en PR 7)

Live Lab GLPI 11.0.11 / API 2.3.0:

- physical collections read-only;
- OS/hardware/storage/software/virtualization/antivirus/peripherals;
- 145 software installations con paginación;
- assignment embebido;
- Entity/Location;
- NetworkPort schema con gap de API directa/IP;
- EventLog no requerido para history semántico;
- no ampliar `user` ni `system_logs` por conveniencia.

## Version ladder

- 1.0 — IT CMDB & Asset Management
- 2.0 — OT CMDB & Passive Discovery
- 3.0 — Cybersecurity & Exposure Management
- 4.0 — Intelligence, Analytics & Automation
