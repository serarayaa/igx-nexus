# IGX NEXUS — Session Handoff

## PR 6 — Software & Operating System Contracts V2

- Base verificada y árbol inicial limpio: `main@af53ccfa8459b12487539ed219204d4d53db215c`. PR #145 — Visual Foundations & Shell 3.0 ya está integrado.
- Rama de trabajo: `feature/v03-cmdb-software-os-contracts-v2`. Auditoría humana aprobada; commit, push y Draft PR autorizados el 2026-10-10. PR 6 todavía no integrado; merge y auto-merge no autorizados.
- Contratos aditivos Software/OS, validador puro, fixtures sintéticos y pruebas en `packages/types`; separación de producto, versión e instalación, evidencia por registro/sección y ventanas de paginación explícitas.
- Contrato y matriz de compatibilidad: [Software/OS V2](../product/software-os-contracts-v2.md). No cambia contratos 0.2, Hardware V2, providers, API, UI ni persistencia; ninguna dependencia nueva.
- Evidencia V03-CMDB-01 histórica: GLPI 11.0.11 / API 2.3.0, 145 instalaciones paginadas. No representa el estado actual ni autoriza consultas Live. Smoke autenticado pendiente.
- Las decisiones y la entrega histórica de PR 5 se conservan en `git show af53ccfa8459b12487539ed219204d4d53db215c:docs/ai-context/03-SESSION-HANDOFF.md` y [Visual Foundations & Shell 3.0](../product/visual-foundations-shell-3.md). Sus limitaciones de pruebas Windows siguen documentadas allí; no son resultados de PR 6.
- Siguiente checkpoint: revisión de CI del Draft PR y autorización humana antes del merge. No avanzar automáticamente a adapter, API, UI o PR 7.
## Arquitectura vigente y continuidad histórica

Este handoff actualiza el estado de trabajo, no sustituye decisiones de producto. Se preservan abajo las decisiones del handoff base; su evidencia Live es histórica y no autoriza nuevas consultas. El estado previo completo se consulta con `git show 713956222fc928d4787d1123faecad4eb7174c3b:docs/ai-context/03-SESSION-HANDOFF.md`. Su Next sequence correspondía a una fase anterior y no debe ejecutarse como plan actual.

Referencias normativas vigentes: [índice de arquitectura](../architecture/README.md), [límites de producto](../architecture/adr-0001-product-boundaries.md), [sistema de diseño](../architecture/adr-0003-ui-design-system.md), [routing Asset 360](../architecture/adr-0006-asset-360-routing.md), [modelo canónico](../architecture/adr-0011-canonical-technology-model.md), [Demo/Live](../architecture/adr-0014-provider-mode-contract.md), [provenance](../architecture/adr-0019-provenance-reconciliation.md) e [IA de producto](../architecture/adr-0023-product-information-architecture-v2.md). PR 6 no cambia estas decisiones.

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

## V03-CMDB-01 evidence (histórica; no revalidada en PR 6)

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
