# IGX NEXUS — Session Handoff

## Repository state

- Stable baseline al iniciar el reset: `main@eb87c68ee2a17b793e34e457c4e2914567889bb1`.
- Active branch: `feature/v03-cmdb-00-scope-reset`.
- V03-CMDB-00 es documental/product-scope; no modifica product code.
- PR #138 está CLOSED / NOT MERGED / SUPERSEDED.
- V03-002 foundations y V03-008 navigation/state permanecen preservados.
- V03-CMDB-01 existe en `feature/v03-cmdb-01-glpi-capability-audit` con HEAD observado `859d4c7e100a909020329151d754532ae29d97d8`.

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

## V03-CMDB-01 evidence

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

## Next sequence

1. Merge V03-CMDB-00.
2. Rebase/update V03-CMDB-01 sobre main.
3. Merge V03-CMDB-01.
4. Crear `feature/v03-cmdb-02-canonical-provider-v2`.
5. Diseñar contratos CMDB estructurados antes de implementar el provider amplio.
6. Mantener integraciones opcionales/Endpoint Health fuera del critical path hasta que el core esté estable.

No iniciar el premium UI rebuild antes de estabilizar suficiente contrato canónico/provider para evitar retrabajo.
