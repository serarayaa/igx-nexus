# IGX NEXUS — Session Handoff

## PR 5 — Visual Foundations & Shell 3.0

- Base verificada: `713956222fc928d4787d1123faecad4eb7174c3b`, merge PR #144; incorpora PR #141–144. Árbol inicial limpio.
- Rama activa con tracking: `feature/v03-visual-foundations-shell-3`. HEAD conserva la base; cambios locales para auditoría humana. No commit, push, PR, merge ni auto-merge autorizados para esta entrega.
- Implementación Connected Infrastructure real: plano de navegación navy, rail desktop persistido, drawer completo móvil, cabecera responsive, refinamiento vectorial Mark B, tokens de navegación por tema y movimiento finito CSS/SVG.
- Arquitectura, decisiones, contratos aditivos y límites: `docs/product/visual-foundations-shell-3.md`. Branding refinado pendiente de aprobación humana. Originales históricos preservados.
- Navegación hash/history, investigación, filtros, providers, modos, APIs, contratos Hardware V2, backend y permisos conservados. No consultas GLPI Live. Smoke autenticado sigue pendiente y sin autorización.
- Focus trap/restore, Escape, inert y scroll lock conservados; cierre por breakpoint enfoca un enlace visible. Preferencia rail no cambia ruta ni remonta contenido. Theme/density conservan reglas existentes.
- Tres overrides globales del Shell en asset-360.css retirados para una composición consistente; contenido Hardware y navegación local preservados. ContentSection añade ariaLabel opcional sólo para distinguir regiones repetidas de findings; headings visibles originales conservados.
- Cambio de tema inmediato: se retiró una transición de fondo que produjo contraste transitorio inválido. Tests/aserciones/timeouts no debilitados.
- Pruebas específicas verificadas 79/79; Storybook 67/67; reduced motion/forced colors Chromium 36/36; foundations 4/4; refresh navegación 3/3; API serial 258/258; audit high aprobado con un advisory moderate Fastify existente. Typecheck, build global y Storybook build aprobados. Pasada Web final 407/408: un timeout Lifecycle de 30 s; rerun aislado 6/6 sin ampliar límites. Los restantes casos, incluidas las específicas, aprobaron. No declarar la pasada Web completa verde. Sin fallos de contraste en la versión corregida.
- npm test global original Windows falló: types 149/149 y API 250/258, ocho timeouts ya observados, sin ejecutar las etapas posteriores. Logs originales separados de suites seriales y configuraciones de puerto externas. No declarar npm test global verde.
- Evidencia before/after de React real en app Demo y Storybook con fixtures sintéticos, tamaños 320/390/768/1024/1440/1920 y distintas combinaciones theme/density. Before aislado mediante git archive de la base, sin reset del árbol de trabajo. Sin información corporativa real.
- Checkpoint siguiente: revisar ZIP, diff, resultados técnicos, identidad y composición; esperar aprobación estética/técnica antes de commit.

## Segunda pasada limitada de PR 5 (2026-10-09)

- Cabecera con firma NEXUS visible incluso a 320 px; contexto de workspace sin nuevo heading. Control de contracción integrado junto a marca, proporciones y selección refinadas. No cambia geometría Mark B ni contenido interno.
- Llegada visual finita de 320 ms sólo en una línea decorativa de cabecera al montar/cambiar view. No anima datos ni main, no introduce remount/esperas del contenido ni modifica foco, scroll, rutas o estado; reduced motion la deja estática.
- Afectadas 95/95; Shell final 14/14; reduced motion/forced colors final 38/38; Storybook 67/67; refresh 3/3; typecheck/build finales aprobados. Primera afectada 61/62 falló por timeout Lifecycle; el filtro Hardware inicialmente incorrecto se corrigió y no se cuenta como cobertura de ese archivo. Lifecycle aislado pasó 6/6 en base exacta y 6/6 actual. Antecedente del mismo timeout en PR 4 y primera pasada PR 5; no se demuestra su causa ni se declara suite completa verde.
- Se conservan logs originales. No se repiten npm test global, Web/API completas ni foundations en esta pasada. Los resultados previos anteriores son históricos, no gates ejecutados sobre el refinamiento final.
- Veinte capturas adicionales: before/after del PR 5 previamente auditado, light/dark, cómoda/compacta, expandido/rail y cuatro vistas móviles. Patch incremental y consolidado; revisión estética/técnica humana pendiente. Sin commit, push, PR ni consultas Live.

## Arquitectura vigente y continuidad histórica

Este handoff actualiza el estado de trabajo, no sustituye decisiones de producto. Se preservan abajo las decisiones del handoff base; su evidencia Live es histórica y no autoriza nuevas consultas. El estado previo completo se consulta con `git show 713956222fc928d4787d1123faecad4eb7174c3b:docs/ai-context/03-SESSION-HANDOFF.md`. Su Next sequence correspondía a una fase anterior y no debe ejecutarse como plan actual.

Referencias normativas vigentes: [índice de arquitectura](../architecture/README.md), [límites de producto](../architecture/adr-0001-product-boundaries.md), [sistema de diseño](../architecture/adr-0003-ui-design-system.md), [routing Asset 360](../architecture/adr-0006-asset-360-routing.md), [modelo canónico](../architecture/adr-0011-canonical-technology-model.md), [Demo/Live](../architecture/adr-0014-provider-mode-contract.md), [provenance](../architecture/adr-0019-provenance-reconciliation.md) e [IA de producto](../architecture/adr-0023-product-information-architecture-v2.md). PR 5 no cambia estas decisiones.

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

## V03-CMDB-01 evidence (histórica; no revalidada en PR 5)

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
