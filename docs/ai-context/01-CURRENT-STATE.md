# IGX NEXUS — Current State

## Actualización humana V03-003A — 2026-10-06

**V03-003 VISUAL CHECKPOINT = NOT APPROVED; PRODUCT DIRECTION PIVOT APPROVED.** #138 OPEN/DRAFT = TECHNICAL SHELL PROTOTYPE. Foundations técnicas preservadas, expresión admin/dashboard rechazada. Nueva propuesta ONE NEXUS / Spatial Technology Universe: Global, IT y OT como workspaces sobre modelo compartido. Leer docs/product/v0.3-product-universes.md, v0.3-universe-capability-matrix.md, v0.3-spatial-experience-direction.md y evidence/v03-003a/review.md.

003A sólo documentación, investigación y prototypes/v03-003a aislado; no nueva dependencia ni cambio productivo. Software ingestion/Facility registry/OT discovery no implementados. Provider actual Computer-only con relaciones/observations vacías. Demo conceptual identificado. Benchmark renderer sintético no prueba escala/SR/low-power real. GO WITH CONDITIONS recomendado, aceptación003A pendiente antes de implementación final. PR no autorizado para merge aunque Git pueda indicar MERGEABLE. V03-005 NO INICIADO; V02-023 separado.

> Estado operativo resumido del proyecto.
> No reemplaza roadmap, ADR, código ni tests.

## Baseline

- Repository: `serarayaa/igx-nexus`
- Branch estable: `main`
- Release cerrada: **v0.2 — Technology Intelligence**
- v0.1: **cerrada — 13/13 tickets**

Este archivo representa el estado conocido de `main` en el momento de su última actualización.

Si Git contradice este documento, Git prevalece.

## Product Experience v0.3 — estado de integración

V03-001 APPROVED / CLOSED; V03-002 CLOSED / MERGED con condiciones de marca preservadas. V03-008 CLOSED / MERGED por PR #137 en main@eb87c68ee2a17b793e34e457c4e2914567889bb1; Human Review Checkpoint = APPROVED WITH CONDITIONS. Graph productivo legacy, escala corporativa, accesibilidad por superficie y robustez de longitud URL-return extensa siguen pendientes; esta última no bloquea V03-008 y no autoriza sessionStorage/global store sin evidencia.

V03-003 Shell & Navigation 3.0 en feature/v03-003-shell-navigation desde ese baseline limpio; implementación y paquete de revisión en docs/product/v0.3-shell-navigation.md. Sidebar224/rail104, tablet768, drawer320, preferencias existentes, semántica current/focus, consumo de V03-008 sin owner paralelo. Mark B refinado es candidato reversible en shell y Storybook; NO asset definitivo ni favicon/manifest. A sólo fallback técnico si B falla objetivamente; C histórico/rechazado. V03-003 VISUAL CHECKPOINT = NOT APPROVED; PRODUCT DIRECTION PIVOT APPROVED; Draft PR, recomendación GO WITH CONDITIONS sujeta a CI final y revisión humana. No merge automático.

V03-005 NO INICIADO; V03-007 permanece representación Graph/Map dentro de V03-005. Overview, Asset360, Explorer, Graph y superficies especializadas conservan contenido/lógica. Sin backend, providers, router, fuentes, inteligencia, infraestructura o seguridad nuevos. V02-023 separado; Live real no verificado; tests/emulación no certifican accesibilidad completa. Roadmap y handoff son referencias de continuidad, Git prevalece.

---

## Visión actual

IGX NEXUS evoluciona desde una CMDB/ITAM visual hacia una plataforma de **Technology Intelligence**.

Modelo conceptual:

`fuentes reales → reconciliación/evidencia → modelo canónico NEXUS → contratos analíticos/API → experiencia de producto`

Principios vigentes:

- GLPI continúa como System of Record CMDB/ITAM.
- NEXUS actúa como Intelligence Layer.
- Evidence before inference.
- IT y OT comparten plataforma, no necesariamente taxonomía.
- Demo y Live comparten contratos, no datos.
- No existe fallback silencioso Live → Demo.
- Jira continúa como Service Desk.
- No realizar active scanning OT.
- Toda conclusión importante debe ser explicable mediante datos, procedencia o evidencia.

---

## v0.2 — Estado funcional

Integrado:

**V02-001 .. V02-022 + V02-024 + V02-025 + V02-026 + V02-027 + V02-028 + V02-029**

Último desarrollo integrado:

**V02-029 — v0.2 Demo / Live Lab Readiness**

Resultado relevante de V02-028:

- API compilado validado por TCP/HTTP real;
- contrato vertical GLPI/provider/API cubierto con fixtures controlados;
- OpenAPI y auth runtime alineados para el snapshot protegido;
- Knowledge Research rechaza estados runtime no soportados;
- CI mantiene Demo/Live, mínimo privilegio y fail-closed;
- no se introducen secretos, tenant Intune ni servicios externos reales en GitHub Actions.

Trabajo pendiente bloqueado:

**V02-023 — Intune Analytics Feasibility Spike**

Repo-side está preparado en draft PR #113, pero la validación tenant requiere una App Registration dedicada o intervención administrativa en Entra.

Cierre v0.2:

**V02-029 — PASS e integrado mediante PR #129 / `main @ 775e8a1`; CI post-merge #1016 verde. Demo + Live Lab PASS, 8/8 criterios de salida PASS.**

El detalle completo permanece definido en:

`../roadmap-v0.2.md`

No cargar todos los tickets pendientes salvo que sean necesarios para la tarea actual.

---

## Producto actualmente disponible

Las principales superficies y capacidades disponibles incluyen:

- Technology Overview;
- Asset Explorer;
- Asset 360;
- Technology Map;
- CMDB Quality 2.0 / CMDB Health;
- infraestructura Demo / Live;
- modelo canónico con provenance y relationship evidence;
- Analytics Contract Layer;
- Lifecycle & Investment;
- IT / OT Intelligence;
- Endpoint Experience;
- Proactive Findings;
- Knowledge Research.

CMDB Quality y Device Operational Health permanecen conceptualmente separados.

Las pantallas deben responder preguntas operacionales concretas y evitar métricas o inferencias sin contrato semántico defendible.

---

## Arquitectura vigente

Los ADR canónicos viven en:

`../architecture/`

Índice oficial:

`../architecture/README.md`

La arquitectura actual incluye decisiones hasta:

**ADR-0026 — Lifecycle Evidence & Planning**

Los ADR antiguos pueden ser supersedidos por decisiones posteriores.

`docs/decisions/` es histórico y no debe utilizarse para duplicar decisiones canónicas.

---

## Modelo de datos

El modelo canónico NEXUS es independiente de IDs y taxonomías internas de GLPI, Intune, Entra u otras fuentes.

Conceptos centrales:

- identidad NEXUS;
- source references;
- provenance;
- observations;
- taxonomy assessment;
- operational contexts;
- relationship evidence;
- reconciliation;
- analytics contracts.

Una señal débil como hostname o IP no debe fusionar CIs automáticamente.

Una métrica o agregación tampoco debe adquirir semántica únicamente porque pueda calcularse técnicamente.

Un conflicto sólo se presenta como tal cuando el contrato transporta evidencia explícita suficiente.

---

## Demo / Live

### Demo

- dataset canónico versionado;
- útil para producto, tests y escenarios reproducibles;
- puede representar escenarios sintéticos explícitos;
- mantiene `sourceInstanceId=demo-v0.2`;
- no debe introducir comportamiento ficticio dentro de Live.

### Live

- usa únicamente fuentes reales soportadas;
- debe mostrar explícitamente cobertura parcial o ausencia de datos;
- no debe fabricar relaciones, clasificación, telemetría, métricas ni evidencia inexistente.

---

## Auditoría

Las remediaciones integradas en `main` forman parte del baseline actual.

Remediaciones históricas relevantes ya integradas:

- `AUD-API-001` — preservación del contrato canónico durante el HTTP round-trip;
- `AUD-DATA-001` — endurecimiento de calidad de identificadores para reconciliación;
- `AUD-DATA-002` — source identity namespaced by instance.

Post-release audit 2026-10-05 — hotfixes prioritarios cerrados:

- post-release `AUD-LIVE-001` — PR #131 / CI #1021;
- post-release `AUD-API-001` — PR #132 / CI #1023;
- post-release `AUD-DATA-001` — PR #133 / CI #1025;
- post-release `AUD-SEC-001` — PR #134 / CI #1027.

Baseline post-remediación: `main @ 8a1661f205fd872e8a117dc9e5b30e867b856cc0`.

Los IDs post-release pueden coincidir con findings históricos. Usar siempre fecha/PR/SHA para desambiguar y no asumir que un finding histórico sigue activo.

Cierre verificable:

`../audits/v0.2-post-release-remediation-closure.md`

Para trabajo de auditoría consultar `../audits/` y el handoff actual.

---

## Regla de trabajo inmediata

Para comenzar una nueva tarea:

1. leer `00-START-HERE.md`;
2. leer este archivo;
3. leer `03-SESSION-HANDOFF.md`;
4. consultar roadmap, ADR o documentación específica únicamente si la tarea lo requiere;
5. verificar `git status`, branch y HEAD antes de modificar código.

---

## Próximo objetivo funcional

v0.2 está formalmente cerrada y sus cuatro hotfix prioritarios post-release están integrados.

La siguiente fase funcional planificada es **v0.3 — Product Experience**, dedicada a UI/UX, interfaz, visualización, accesibilidad, responsive, motion y flujos por persona. No ampliar v0.3 hacia Intelligence & Automation.

**v0.4 — Intelligence & Automation** concentra automatización, reporting/auditoría, observabilidad, ciencia de datos, Graph Intelligence, detección de anomalías e IA/ML explicable.

V02-023 permanece pendiente y bloqueado hasta disponer de App Registration/intervención administrativa autorizada en Entra. Su estado no invalida el cierre de v0.2.
