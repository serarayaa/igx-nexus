# IGX NEXUS — Session Handoff

## PR 11 — GLPI Network Cards Adapter V2, 2026-10-14

- PR #150 integrado en main@bfc4b19f448d2f623a7159ac47d2a68b41622a80; CI posterior success, [run 38593208120](https://github.com/serarayaa/igx-nexus/actions/runs/38593208120).
- Rama local feature/v03-cmdb-network-glpi-adapter-v2 desde ese baseline. PR 11 **no publicado**; sin commit/push/PR y pendiente de revisión humana.
- Adaptador interno de sólo lectura Computer Network Cards, transporte inyectado, catálogo opcional desactivado por defecto. Identidad literal, ancla GLPI única/instancia correcta, propietario explícito validado, evidencia independiente y validación canónica.
- Páginas/registros/detalles/timeout acotados; agotamiento requiere [] explícito. 401/403 descartan toda la sección. Fallos ordinarios y límites producen unavailable/partial con gaps, nunca vacío exitoso artificial. Sin deduplicar asociaciones por MAC/catálogo ni completar MAC observada desde default.
- [Mapeos y límites](../integrations/glpi-network-adapter-v2.md), [informe y resultados reales](../audits/pr11-glpi-network-adapter-v2.md). Fallos/repeticiones se conservan en logs separados; no se declara validado el runner paralelo.
- Preflight: árbol inicial limpio, sin agentes concurrentes activos. .agents/ y skills-lock.json no versionados; ausentes en este checkout y presentes en C:/Proyectos/igx-nexus. Se preservan sin incluir ni modificar; no cambios de skills.
- Hardware V2, Software/OS V2, snapshot 0.2 y contratos Network aprobados sin cambios. No endpoint, runtime productivo, UI, consultas GLPI Live, discovery, SNMP, RBAC ni infraestructura. No interfaces completas/IP/VLAN/topología inferidas.
- Detenerse antes de commit, push y PR. No iniciar API Network ni adaptador productivo desplegado; auditoría humana decidirá publicación.

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
