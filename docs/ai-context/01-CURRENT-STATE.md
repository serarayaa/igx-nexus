# IGX NEXUS — Current State

> Estado operativo resumido del proyecto.
> No reemplaza roadmap, ADR, código ni tests.

## Baseline

- Repository: `serarayaa/igx-nexus`
- Branch estable: `main`
- Baseline de esta actualización: `4c721b3`
- Release en desarrollo: **v0.2 — Technology Intelligence**
- v0.1: **cerrada — 13/13 tickets**

Este archivo representa el estado conocido de `main` en el momento de su última actualización. Si Git contradice este documento, Git prevalece.

---

## Visión actual

IGX NEXUS evoluciona desde una CMDB/ITAM visual hacia una plataforma de **Technology Intelligence**.

Modelo conceptual:

`fuentes reales → reconciliación/evidencia → modelo canónico NEXUS → API → experiencia de producto`

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

- V02-001 — Canonical Technology Model
- V02-002 — NEXUS API Runtime
- V02-003 — API Security Baseline
- V02-004 — Provider Mode Contract
- V02-005 — GLPI API v2 Adapter
- V02-006 — GLPI Service Identity & RBAC
- V02-007 — GLPI Agent Live Lab
- V02-008 — Live Asset 360 Vertical Slice
- V02-009 — Provenance & Reconciliation
- V02-010 — IT/OT Taxonomy v2
- V02-011 — Demo Dataset v0.2 Migration
- V02-012 — Relationship Evidence v2
- V02-013 — Product IA & Visual Direction
- V02-014 — Shell & Motion 2.0
- V02-015 — Technology Overview
- V02-016 — Asset Explorer 2.0
- V02-017 — Asset 360 2.0
- V02-018 — Technology Map 2.0

Siguiente desarrollo funcional planificado:

**V02-019 — Analytics Contract Layer**

El resto del roadmap permanece definido en:

`../roadmap-v0.2.md`

No cargar todos los tickets pendientes salvo que sean necesarios para la tarea actual.

---

## Producto actualmente disponible

Las superficies principales de v0.2 incluyen:

- Technology Overview;
- Asset Explorer;
- Asset 360;
- Technology Map;
- Data Quality / CMDB Health;
- infraestructura Demo / Live;
- modelo canónico con provenance y relationship evidence.

Las pantallas deben responder preguntas operacionales concretas y evitar métricas o inferencias sin contrato semántico defendible.

---

## Arquitectura vigente

ADR canónicos:

`../architecture/`

El índice oficial se encuentra en:

`../architecture/README.md`

Los ADR antiguos pueden ser supersedidos por decisiones posteriores.

`docs/decisions/` es histórico y no debe duplicar ADR canónicos.

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
- reconciliation.

Una señal débil como hostname o IP no debe fusionar CIs automáticamente.

---

## Demo / Live

### Demo

- dataset canónico versionado;
- útil para producto, tests y escenarios reproducibles;
- no debe introducir comportamiento ficticio dentro de Live.

### Live

- usa fuentes reales soportadas;
- debe mostrar explícitamente cobertura parcial o ausencia de datos;
- no debe fabricar relaciones, clasificación o telemetría inexistente.

---

## Auditoría

Las remediaciones integradas en `main` forman parte del baseline actual.

El HEAD de esta actualización incluye:

- correcciones de contract integrity previas;
- correcciones de calidad/integridad de datos;
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
4. consultar el roadmap o ADR únicamente si la tarea lo requiere;
5. verificar `git status`, branch y HEAD antes de modificar código.

## Próximo objetivo funcional

Si no existe otro trabajo activo definido en `03-SESSION-HANDOFF.md`, continuar desde:

**V02-019 — Analytics Contract Layer**