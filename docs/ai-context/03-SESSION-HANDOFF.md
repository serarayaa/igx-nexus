# IGX NEXUS — Session Handoff

## PR 7 — GLPI Software & Operating System Adapter V2

- Base verificada: `main@ae8ae38a9b64888bee500af4d977a837e9e5f2fe`, árbol inicial limpio. PR #146 — Software & Operating System Contracts V2 ya está integrado.
- Rama: `feature/v03-cmdb-software-os-glpi-adapter-v2`. Segunda auditoría humana aprobada; commit, push y Draft PR autorizados el 2026-10-10. PR 7 todavía no integrado; merge y auto-merge no autorizados.
- Adapter interno aditivo y read-only, con GlpiApiTransport existente: ancla Computer de la instancia configurada, identidad canónica preservada, OS/software independientes y catálogos vinculados sólo por IDs explícitos.
- Paginación con agotamiento verificado, límites y deadline; 401/403 fail-closed incluso después de páginas previas o durante catálogos. Sin fuentes Demo, secretos, SQL, nuevos permisos ni consultas GLPI Live.
- Contratos PR 6, Hardware V2, provider 0.2, endpoints, frontend y Shell 3.0 sin cambios. Mapeos, rutas verificadas, cobertura y riesgos: [adapter Software/OS V2](../integrations/glpi-software-os-v2.md).
- La entrega y decisiones históricas de PR 6 se consultan en `git show ae8ae38a9b64888bee500af4d977a837e9e5f2fe:docs/ai-context/03-SESSION-HANDOFF.md` y [contratos Software/OS V2](../product/software-os-contracts-v2.md). La evidencia de 145 instalaciones es histórica, no una validación actual del laboratorio. Smoke autenticado pendiente, sin autorización.
- Corrección puntual de auditoría: consumir exactamente el presupuesto tras la última colección agotada no genera gap; si quedan páginas/productos pendientes, collect conserva pagination_incomplete explícito. Tres regresiones nuevas (presupuesto 4, presupuesto 3 y otro producto pendiente); instalaciones, vínculos explícitos y 401/403 fail-closed preservados.
- Validación tras corrección: 74 pruebas nuevas; afectadas 158/158, API completa 332/332, types 229/229, typecheck y build generales aprobados. La primera afectada previa a esta corrección falló 154/155 por timeout de 5 s en readiness existente; se conserva el log y no se declara esa pasada verde. Rerun idéntico aprobado sin cambiar aserciones/timeouts. No se ejecutó npm test global ni suites UI/Web.
- Verificación de publicación: API completa 332/332, types 229/229, typecheck y build aprobados. Primera afectada 157/158 por timeout de 5000 ms en readiness existente; repetición idéntica 158/158 sin modificar aserciones ni timeouts. Logs originales y repetición conservados por separado; no se declara verde la pasada fallida.
- Siguiente checkpoint: revisión de CI del Draft PR y autorización humana antes del merge. No iniciar PR 8.

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
