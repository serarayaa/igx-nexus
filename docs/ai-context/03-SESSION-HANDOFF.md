# IGX NEXUS — Session Handoff

## PR 9 — Sistema y software en Asset 360: estado vigente, 2026-10-14

- Baseline verificado main@3f666abb08e585ce29bdc13ba5ad43d0b3790d1f y árbol inicial limpio. **PR #146, #147 y #148 están integrados.** CI posterior al merge #148: success, [run 38456125206](https://github.com/serarayaa/igx-nexus/actions/runs/38456125206). El estado PR 8 pendiente de publicación queda supersedido por su integración.
- Rama local feature/v03-cmdb-software-os-asset360-v2; HEAD conserva el baseline. Implementación local pendiente de auditoría humana; sin commit, push ni PR.
- Nueva sección contextual Sistema y software después de Hardware, sobre el modelo hash vigente. OS múltiples sin principal; tabla semántica de instalaciones, búsqueda/editor/orden local y páginas de 25. Contadores de registros cargados y visibles; cinco estados de cobertura, nulls, gaps y paginación de adquisición explícitos.
- Reader same-origin/no-store con AbortSignal, validación SoftwareInventoryV2 y assetId exacto, incluidos espacios interiores. Hook aborta al cambiar activo/sección y descarta respuestas tardías; estado anterior nunca se presenta como perteneciente al activo nuevo. Demo explicativo sin consultas. Fixtures exclusivamente en tests/Storybook.
- Identidades, versiones, SourceReference, provenance, observación y recopilación literales preservadas. Fechas date sin hora/zona inventada; timestamps presentados en UTC explícito y valor original accesible. No inferencias de salud, compliance, licencias ni vulnerabilidades.
- Shell 3.0, tokens oficiales, @igx-nexus/ui y Lucide; light/dark, comfortable/compact, scroll horizontal local, foco/teclado, reduced motion y forced colors. Evidencia auténtica desktop/tablet/móvil y zoom CSS 200%; no certifica por sí sola WCAG ni zoom nativo/lectores de pantalla.
- Resultados y cada fallo/repetición se registran separadamente en [auditoría PR 9](../audits/pr9-software-os-asset360-v2.md); [decisiones funcionales y UI](../product/software-os-asset360-v2.md). Afectadas finales 89/89; Web final por proyectos consecutivos model 279/279 + browser 172/172 (35 archivos completos); Types 229/229, typecheck y build globales aprobados. Las últimas pasadas conjuntas tuvieron timeouts/bloqueos conservados: no se declara validado el runner conjunto ni con múltiples workers. Flags y excepciones axe explícitos en informe.
- Backend, RBAC, adaptador, provider 0.2, Types y límites operacionales sin cambios. No GLPI Live. La evidencia histórica de 145 instalaciones no se revalida: aquí son 145 instalaciones sintéticas.
- Storybook final 74/74; refresh físico 4/4 y foundations 4/4. QA nueva 12 escenarios/13 capturas; visual existente adaptada para Windows 65 comprobaciones/61 capturas. Fallos originales y repeticiones en paquete. No solicitudes API/GLPI en QA sintética nueva.
- Próximo checkpoint: auditoría humana del informe, parche y ZIP con 21 archivos de cambio. **No commit, push, PR, merge, auto-merge ni PR 10.** Smoke real, lectores de pantalla/dispositivos y escalas mayores requieren trabajo futuro autorizado.

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
