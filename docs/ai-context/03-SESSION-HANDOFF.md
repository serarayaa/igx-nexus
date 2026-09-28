# IGX NEXUS — Session Handoff

> Estado de continuidad de la sesión de trabajo más reciente.
> Este archivo se reemplaza; no es un historial acumulativo.

## Repository State

- Repository: `serarayaa/igx-nexus`
- Stable branch: `main`
- Bootstrap de contexto modular: **integrado**
- Último desarrollo funcional integrado: **V02-020 — CMDB Quality 2.0**
- Próximo desarrollo funcional: **V02-021 — Lifecycle & Investment**

## Estado actual

V02-020 consolidó CMDB Quality sobre evidencia canónica sin convertirla en Device Health ni redefinir silenciosamente el score histórico.

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

**V02-001 .. V02-020**

Último desarrollo funcional integrado:

**V02-020 — CMDB Quality 2.0**

Siguiente desarrollo funcional:

**V02-021 — Lifecycle & Investment**

Las remediaciones de auditoría relevantes integradas incluyen:

- `AUD-API-001`
- `AUD-DATA-001`
- `AUD-DATA-002`

Los findings históricos no deben asumirse como deuda activa sin verificar el estado actual.

## Próxima acción

Iniciar **V02-021 — Lifecycle & Investment**.

Antes de implementar:

1. verificar `main` limpio y actualizado;
2. consultar `../roadmap-v0.2.md`;
3. crear issue y branch cuando el alcance esté suficientemente definido;
4. cargar solamente ADR, contratos y documentación relacionados con lifecycle/investment;
5. definir semántica temporal y coverage antes de diseñar UI.

No adelantar V02-022 ni tickets posteriores salvo dependencia demostrada.

## Regla para futuras sesiones

Antes de continuar:

```bash
git status
git branch --show-current
git rev-parse --short HEAD
```