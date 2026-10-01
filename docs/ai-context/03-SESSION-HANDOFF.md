# IGX NEXUS — Session Handoff

> Estado de continuidad de la sesión de trabajo más reciente.
> Este archivo se reemplaza; no es un historial acumulativo.

## Repository State

- Repository: `serarayaa/igx-nexus`
- Stable branch: `main`
- Baseline estable verificado: `aad9a3adbef1254d458e9f29d904934385779899`
- Bootstrap de contexto modular: **integrado**
- Último desarrollo funcional integrado: **V02-027 — Knowledge Research Workflow**
- Próximo desarrollo funcional no bloqueado: **V02-028 — Backend & Integration CI**

## Estado actual

V02-027 fue integrado mediante PR #124 y cerró issue #123.

Knowledge Research extiende Proactive Findings mediante una cadena explícita:

```text
local evidence
  → finding
  → research question
  → external/synthetic sources
  → claims
  → recommendation
  → human review
```

Las capas permanecen separadas:

- external knowledge != local evidence;
- research claim != observation canónica;
- recommendation != remediation;
- human review != execution authorization.

El contrato fuerza `executionAllowed=false` y `executionAuthorized=false`.
Demo usa fixtures sintéticos deterministas y Live no cae silenciosamente a Demo.

## Estado funcional relevante

v0.2 tiene integrado:

**V02-001 .. V02-022 + V02-024 + V02-025 + V02-026 + V02-027**

Último desarrollo funcional integrado:

**V02-027 — Knowledge Research Workflow**

Pendiente bloqueado:

**V02-023 — Intune Analytics Feasibility Spike**

- draft PR #113;
- issue #112;
- validación real detenida por RBAC/App Registration en Entra;
- no ampliar permisos ni solicitar ReadWrite para sortear el bloqueo;
- retomar desde el runbook/preflight existente cuando exista identidad autorizada.

Siguiente desarrollo funcional no bloqueado:

**V02-028 — Backend & Integration CI**

## Insumos concretos para V02-028

El objetivo de V02-028 es extender el rigor de QA más allá del frontend y cubrir de forma explícita API, contracts, adapters, auth, integración y seguridad.

Al revisar V02-027 quedaron tres candidatos de hardening que no bloquearon su merge y pueden evaluarse dentro de V02-028:

1. **Runtime validation de Knowledge Research**
   - endurecer validación de enums/estados frente a payloads runtime inválidos, aunque TypeScript ya restrinja tipos en compile time;
   - ejemplos: `supportState`, `review.state` y estructuras externas recibidas por frontera HTTP/provider.

2. **Resincronización de estado en KnowledgeResearchPanel**
   - `useState(report)` inicializa desde la prop pero no se resincroniza automáticamente si cambia el report manteniendo la misma instancia de componente;
   - evaluar si el flujo real puede cambiar el packet sin remount y cubrirlo con test si corresponde.

3. **Timestamp de revisión Demo**
   - la interacción Demo usa actualmente `generatedAt` como `reviewedAt`;
   - evaluar un reloj inyectable/determinista para distinguir claramente generación de packet y momento de revisión sin volver los tests no deterministas.

Estos puntos son **candidatos**, no findings activos confirmados hasta verificarlos dentro del alcance de V02-028.

## Dirección para V02-028

Antes de implementar:

1. verificar `main` limpio y actualizado;
2. revisar CI actual y mapear qué capas están realmente cubiertas;
3. identificar gaps concretos en:
   - API runtime;
   - contratos y serialización HTTP;
   - adapters/providers;
   - auth/authz y security baseline;
   - integración Demo/Live;
   - scripts/preflight donde aplique;
4. preferir tests que crucen fronteras reales sobre duplicar unit tests existentes;
5. preservar deny-by-default, mínimo privilegio y Live read-only;
6. no debilitar tests ni agregar dependencias sólo para aumentar coverage;
7. distinguir coverage numérico de cobertura semántica de riesgos;
8. mantener V02-029 fuera de alcance salvo artefactos estrictamente necesarios para validar V02-028.

## Remediaciones de auditoría integradas

Las remediaciones relevantes ya integradas incluyen:

- `AUD-API-001`;
- `AUD-DATA-001`;
- `AUD-DATA-002`.

Los findings históricos no deben asumirse como deuda activa sin verificar el estado actual.

## Regla para futuras sesiones

Antes de continuar:

```bash
git status
git branch --show-current
git rev-parse --short HEAD
```

GitHub, código, tests, ADR y documentación específica continúan siendo la fuente de verdad.
