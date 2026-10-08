# IGX NEXUS — Session Handoff

## Repository state

- Stable baseline al iniciar el reset: `main@eb87c68ee2a17b793e34e457c4e2914567889bb1`.
- Active branch: `feature/v03-cmdb-00-scope-reset`.
- V03-CMDB-00 es documental/product-scope; no modifica product code.
- PR #138 (V03-003 Shell / V03-003A research) está **CLOSED / NOT MERGED / SUPERSEDED**.
- V03-002 foundations y V03-008 navigation/state permanecen preservados; PR #137 ya está integrado en main.
- V03-CMDB-01 existe en `feature/v03-cmdb-01-glpi-capability-audit` con HEAD observado `859d4c7e100a909020329151d754532ae29d97d8`.

## Product decision

La definición vigente es:

**IGX NEXUS v0.3 = IT CMDB sobre GLPI + GLPI Agent.**

No continuar el roadmap anterior orientado a Product Experience / spatial universe como objetivo de release.

Objetivo de salida:

> Puedo buscar un equipo, abrirlo, entender qué es, dónde está, quién lo usa, qué hardware/software tiene, cuándo fue observado y qué tan completa es su información.

Docs principales:

- `docs/product/v0.3-it-cmdb-scope.md`
- `docs/roadmap-v0.3.md`
- `docs/ai-context/01-CURRENT-STATE.md`

## Preserved work

- V03-002: design-system/semantic foundations reutilizables.
- V03-008: URL/navigation/return state contract reutilizable.
- V03-003/003A: sólo research histórico; no merge.
- visual/spatial/2.5D research: inspiración futura opcional, no requisito.
- v0.2 canonical provenance/reconciliation foundations: preservar y evolucionar.

## V03-CMDB-01 evidence already observed

Live Lab GLPI 11.0.11 / API 2.3.0:

- physical collections authorized read-only;
- Computer detail rich enough for OS/hardware/storage/software/virtualization/antivirus/peripherals;
- software pagination validated at 145 installations;
- assignment contract embedded as reduced id/name relations;
- Entity/Location independently authorized;
- NetworkPort schema exists but direct port/IP surface is incomplete in HL API;
- EventLog schema/path exists but `system_logs` remains denied and is not required for semantic history.

Do not expand `user` or `system_logs` rights by convenience.

## Next permitted sequence

1. Finish and merge V03-CMDB-00.
2. Rebase/update V03-CMDB-01 onto the new main if needed.
3. Merge V03-CMDB-01 after review.
4. Create `feature/v03-cmdb-02-canonical-provider-v2`.
5. Design structured CMDB contracts before broad provider implementation.

Do not begin the premium UI rebuild until the canonical CMDB/provider contract is stable enough to avoid rework.
