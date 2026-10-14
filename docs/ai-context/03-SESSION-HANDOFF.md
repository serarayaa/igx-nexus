# IGX NEXUS — Session Handoff

## PR 10 — contratos Computer Network Cards, 2026-10-14

- Baseline y HEAD main@3a1f4eef9147323103c88c2d77ad04670b733bb4; entrega local para revisión humana, sin commit/push/PR.
- Auditoría humana favorable; implementados únicamente contratos canónicos, validadores puros y fixtures sintéticos Network V2. networkCards representa asociaciones de un Computer, sin interfaces completas, IP ni topología.
- [Contrato vigente](../product/network-inventory-v2-contracts.md) e [informe de entrega](../audits/pr10-network-contracts-v2.md). La propuesta y auditoría de investigación conservan su texto histórico; el ZIP original conserva los cinco documentos auditados, incluido el handoff anterior.
- IDs literales, MAC observada separada del catálogo, enriquecimiento opcional, evidencia independiente, cobertura y paginación reutilizadas. Denegación de autorización: unavailable sin datos retenidos.
- Pruebas relevantes 231/231; Types 319/319, incluidas 90 Network; typecheck y build aprobados. Fallo inicial de typecheck y repetición conservados separadamente. No se declara validado el runner paralelo API/Web.
- Ocho fixtures coinciden exactamente con los ejemplos auditados. Cuatro documentos de investigación intactos; respaldo OpenAPI bruto fuera del repo y entrega. Sin GLPI Live.
- Hardware V2, Software/OS V2 y snapshot 0.2 sin cambios. No adaptador, endpoint, UI, RBAC, discovery, SNMP ni infraestructura. Nuevos dominios Network necesitan decisión explícita de versión o contrato complementario.
- Detenerse para revisión humana antes de commit, push y PR. No iniciar integración ni asumir permisos efectivos o datos poblados a partir de schemas.

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
