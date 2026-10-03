# IGX NEXUS — Current State

> Estado operativo resumido del proyecto.
> No reemplaza roadmap, ADR, código ni tests.

## Baseline

- Repository: `serarayaa/igx-nexus`
- Branch estable: `main`
- Release en desarrollo: **v0.2 — Technology Intelligence**
- v0.1: **cerrada — 13/13 tickets**

Este archivo representa el estado conocido de `main` en el momento de su última actualización.

Si Git contradice este documento, Git prevalece.

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

**V02-001 .. V02-022 + V02-024 + V02-025 + V02-026 + V02-027**

Último desarrollo funcional integrado:

**V02-027 — Knowledge Research Workflow**

Resultado relevante de V02-027:

- Knowledge Research agrega una capa auditable sobre Proactive Findings;
- external knowledge permanece separado de observations/evidence local;
- fuentes transportan provenance, clase y temporalidad explícita;
- todo contenido de research se trata como `untrusted input`;
- claims enlazan fuentes y conservan estados de soporte/contradicción;
- contradicciones permanecen visibles como `unresolved`;
- recomendaciones requieren revisión humana y nunca autorizan ejecución;
- Demo usa fixtures sintéticos deterministas y claramente etiquetados;
- Live sin research real queda explícitamente sin packet y no cae a Demo;
- no existe crawler, búsqueda web autónoma, remediation ni command execution en V02-027.

Trabajo pendiente bloqueado:

**V02-023 — Intune Analytics Feasibility Spike**

Repo-side está preparado en draft PR #113, pero la validación tenant requiere una App Registration dedicada o intervención administrativa en Entra.

Siguiente desarrollo funcional no bloqueado:

**V02-028 — Backend & Integration CI**

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

Remediaciones relevantes ya integradas:

- `AUD-API-001` — preservación del contrato canónico durante el HTTP round-trip;
- `AUD-DATA-001` — endurecimiento de calidad de identificadores para reconciliación;
- `AUD-DATA-002` — source identity namespaced by instance.

No asumir que un finding histórico sigue activo.

Para trabajo de auditoría consultar:

`../audits/`

y el handoff actual.

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

Si no existe otro trabajo activo definido en `03-SESSION-HANDOFF.md`, continuar desde:

**V02-028 — Backend & Integration CI**

V02-023 permanece pendiente y bloqueado hasta disponer de App Registration/intervención administrativa autorizada en Entra.