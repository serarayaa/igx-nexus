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

**V02-001 .. V02-021**

Último desarrollo funcional integrado:

**V02-021 — Lifecycle & Investment**

Resultado relevante de V02-021:

- hitos temporales lifecycle quedan separados del estado actual de `TechnologyAsset.lifecycle`;
- purchase/commissioned/warranty/EOL/EOS/replacement target requieren fecha válida y provenance explícito para considerarse conocidos;
- ventanas de 3/6/12/24 meses usan meses calendario UTC desde `snapshot.asOf`;
- edad sólo se calcula desde commissioned/purchase respaldados por evidencia;
- coverage se publica por hito y no convierte ausencia de fecha en ausencia de riesgo;
- Demo incorpora hitos sintéticos deterministas; Live mantiene unavailable/partial sin fallback;
- `#lifecycle` ofrece planificación temporal con drill-down a Asset 360;
- Investment no implica CAPEX, precios ni presupuesto inventado;
- ADR-0026 aceptado.

Siguiente desarrollo funcional planificado:

**V02-022 — IT / OT Intelligence**

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
- Lifecycle & Investment.

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

**V02-022 — IT / OT Intelligence**