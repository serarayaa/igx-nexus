# IGX NEXUS — Session Handoff

## Repository state

- Baseline de esta entrega: `2213aea35a3738f888f7e730ce6c8ca4a9d11411`, árbol inicial limpio; incorpora PR #143 (Hardware API V2) y sus predecesores.
- Active branch: `feature/v03-cmdb-02-pr4-asset360-hardware-ui`.
- V03-CMDB-02 / PR 4 implementa Hardware Experience V2 en Asset 360. Auditoría técnica y visual completada; alcance cerrado. Commit, push y PR hacia main autorizados tras validación de cierre. NO merge ni auto-merge; smoke GLPI Live autenticado NO autorizado.
- Detalles, invariantes, reproducción sintética y límites: `docs/product/asset360-hardware-v2.md`. No cambia API, contratos, permisos, provider GLPI ni persistencia.
- Connected Infrastructure integrada en React/Asset 360 con tipografía operativa 14–16 px, panorama asimétrico, navegación local animada, índice accesible de componentes, detalles CPU y firma Confluencia CSS/SVG finita. Cliente HTTP, hook, contratos, fixtures, backend y GLPI preservados. Cierre: foco Hardware con token semántico de 2 px; Confluencia estática/deshabilitada y sin anunciar replay bajo reduced motion; historias rotuladas como fixtures sin sesión GLPI ni HTTP, ocultando indicadores Live del shell sólo en Storybook. Mejoras transversales reservadas para NEXUS Visual Foundations & Shell 3.0; no reabrir investigación ni rediseño global.
- Validación de convergencia: específicas 51/51; web completa alternativa serial 399/399; API serial 258/258; Storybook 60/60; reduced-motion específico 23/23; refresh 3/3; foundations 4/4; typecheck y build aprobados. npm test original falló 8 timeouts API (250/258), web original 2 timeouts (396/398); no se reprodujo EACCES en esta ejecución y no se declara global verde. Evidencia nueva captura componentes React reales vía Storybook sintético y app Vite Demo, sin consultas Live.
- Se conservan resultados originales fallidos de Windows separados de suites alternativas. No declarar `npm test` global verde. El informe de entrega registra cifras y logs exactos.
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

Validación definitiva de cierre PR 4 (2026-10-09): Hardware/cliente/formato/navegación 52/52; Web completa serial 400/400; API serial 258/258; Hardware en Chromium con reduced motion real 24/24; Storybook 60/60; refresh de navegación 3/3. Typecheck y build globales aprobados; git diff --check sin errores. npm test global falló (exit 1): types 149/149 y API 250/258, con ocho timeouts; no ejecutó las etapas siguientes. Los resultados seriales usan configuraciones temporales externas, sin modificar aserciones ni timeouts del repositorio, y no sustituyen el resultado global fallido. No se reprodujo EACCES en este cierre. Persiste la advertencia de chunk >500 kB y el smoke GLPI Live autenticado pendiente; no se realizaron consultas Live.

Auditoría técnica y visual aprobada por el usuario. Alcance congelado: foco Hardware con token de diseño, Confluencia estática y sin control de reproducción bajo reduced motion, y aviso inequívoco de fixtures sintéticos exclusivo de Storybook. Se autoriza commit/push/PR hacia main, sin merge ni auto-merge. Backend, contratos Hardware V2, API v1/0.2, permisos y modos productivos conservados. Las mejoras globales se reservan para NEXUS Visual Foundations & Shell 3.0.
