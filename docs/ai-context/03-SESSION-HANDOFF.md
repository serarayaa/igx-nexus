# IGX NEXUS — Session Handoff

> Estado de continuidad de la sesión de trabajo más reciente.
> Este archivo se reemplaza; no es un historial acumulativo.

## Repository State

- Repository: `serarayaa/igx-nexus`
- Stable branch: `main`
- Bootstrap de contexto modular: **integrado**
- Último desarrollo funcional integrado: **V02-025 — Endpoint Experience**
- Próximo desarrollo funcional no bloqueado: **V02-026 — Proactive Findings Engine**

## Estado actual

V02-025 consolidó Endpoint Experience como lectura explicable sobre observations canónicas: crashes, hangs, restarts, startup y batería con ventanas/coverage explícitas, sin score global, causalidad inventada ni fallback Live → Demo.

La capa `docs/ai-context/` está compuesta por:

- `00-START-HERE.md`
- `01-CURRENT-STATE.md`
- `02-WORKING-RULES.md`
- `03-SESSION-HANDOFF.md`

Su objetivo es reducir reconstrucción repetida de contexto y consumo innecesario de tokens sin duplicar documentación canónica.

## Decisiones vigentes

GitHub, código, tests, ADR y documentación específica continúan siendo la fuente de verdad.

Obsidian funciona únicamente como interfaz local de navegación y edición.

`.obsidian/` permanece fuera de control de versiones.

Los agentes deben cargar contexto de forma progresiva:

1. `00-START-HERE.md`
2. `01-CURRENT-STATE.md`
3. este handoff
4. documentación específica requerida por la tarea

No recorrer todo el repositorio ni toda la documentación salvo necesidad real.

## Estado funcional relevante

v0.2 tiene integrado:

**V02-001 .. V02-022 + V02-024 + V02-025**

Último desarrollo funcional integrado:

**V02-025 — Endpoint Experience**

Pendiente bloqueado:

**V02-023 — Intune Analytics Feasibility Spike**

- draft PR #113;
- issue #112;
- validación real detenida por RBAC/App Registration en Entra;
- no ampliar permisos ni solicitar ReadWrite para sortear el bloqueo.

Siguiente desarrollo funcional no bloqueado:

**V02-026 — Proactive Findings Engine**

Las remediaciones de auditoría relevantes integradas incluyen:

- `AUD-API-001`
- `AUD-DATA-001`
- `AUD-DATA-002`

Los findings históricos no deben asumirse como deuda activa sin verificar el estado actual.

## Próxima acción

Iniciar **V02-026 — Proactive Findings Engine** sin cerrar artificialmente V02-023.

Antes de implementar:

1. verificar `main` limpio y actualizado;
2. consultar `../roadmap-v0.2.md`;
3. reutilizar observations, coverage y ventanas ya definidas por V02-025;
4. separar hecho observado, patrón, hipótesis y confianza;
5. no presentar correlación como causalidad;
6. no crear remediation automática ni ejecutar comandos;
7. preservar Demo/Live bajo contratos compartidos, sin fallback;
8. mantener findings explicables y auditables.

Cuando exista App Registration autorizada, retomar V02-023 desde su runbook/preflight sin rehacer el spike.

## Regla para futuras sesiones

Antes de continuar:

```bash
git status
git branch --show-current
git rev-parse --short HEAD
```