# IGX NEXUS — Session Handoff

> Estado de continuidad de la sesión de trabajo más reciente.
> Este archivo se reemplaza; no es un historial acumulativo.

## Repository State

- Repository: `serarayaa/igx-nexus`
- Stable branch: `main`
- Baseline estable al iniciar V02-029: `e16a2272ed6e573259e7db6d88073d3b4e6f1f5c`
- Último desarrollo integrado: **V02-028 — Backend & Integration CI**
- Trabajo activo: **V02-029 — listo para merge manual**
- Issue de cierre: **#128**
- Rama de trabajo: `feature/v02-029-v02-readiness`

## Estado funcional

Integrado en v0.2:

**V02-001 .. V02-022 + V02-024 + V02-025 + V02-026 + V02-027 + V02-028**

Pendiente bloqueado:

**V02-023 — Intune Analytics Feasibility Spike**

- issue #112;
- draft PR #113;
- repo-side preparado;
- tenant-side bloqueado por App Registration/RBAC;
- no solicitar ReadWrite para sortear el bloqueo;
- continuar desde la rama/PR existente cuando exista autorización.

## Resultado de V02-028

PR #127 integrado en `main @ e16a227`.

V02-028 agregó:

- black-box HTTP real contra el API compilado;
- round-trip controlado GLPI → provider → API → contrato;
- OpenAPI auth alignment;
- runtime hardening de Knowledge Research;
- resincronización/review clock de Knowledge Research Demo;
- CI #971 verde.

Documento:

`docs/architecture/backend-integration-ci-v02-028.md`

## V02-029 — Readiness audit

Los ocho criterios de salida de v0.2 no presentan un FAIL estructural inicial.

Estado inicial:

1. Demo/Live contratos compartidos — PASS;
2. evidence/provenance — PASS;
3. reconciliación conservadora — PASS;
4. Taxonomy IT/OT con incertidumbre — PASS;
5. relaciones con evidencia — PASS;
6. UX/analytics útiles — PASS;
7. señales endpoint explicables — PASS con cobertura Live limitada;
8. auditable/seguro/testeable — PASS.

La decisión final debe volver a evaluar estos criterios con evidencia de readiness.

## Hallazgos que V02-029 debe cerrar

1. el smoke oficial integrado seguía siendo Demo v0.1;
2. no existía runbook Demo v0.2;
3. Live Lab estaba documentado por tickets, no como release compuesto;
4. V02-007/V02-008 tenían evidencia PASS histórica pero anterior al HEAD final;
5. roadmap/AI context estaban atrasados respecto de V02-028;
6. V02-023 no debe bloquear ni inducir fallback/coverage ficticia.

## Trabajo ya iniciado en V02-029

Se agregó en la rama:

- `apps/web/src/DemoV02.browser.test.tsx`;
- `npm run test:readiness:v02`;
- gate CI explícito de Demo v0.2;
- `docs/demo-v0.2.md`;
- `docs/integrations/live-lab-v0.2-readiness.md`;
- `docs/v0.2-readiness.md`;
- roadmap/current-state sincronizados.

El smoke v0.2 recorre de forma representativa:

```text
Overview
 → IT/OT Intelligence
 → Endpoint Experience
 → Proactive Findings
 → Knowledge Research
 → Lifecycle
 → Explorer
 → Asset 360
 → Technology Map
 → CMDB Quality
```

DemoV01 se conserva para QR/Label y el recorrido histórico.

## Live Lab

Evidencia existente:

- V02-007 Agent → GLPI: PASS, 2026-09-15;
- V02-008 GLPI → API → Web: PASS, 2026-09-15;
- V02-024 Windows/Dell telemetry: PASS, 2026-10-01.

V02-029 revalidó el vertical soportado el 2026-10-05 sobre `451dae46327b73356a495e23db554dd2c404b105`.

Resultado: **PASS**.

Evidencia: `docs/integrations/live-lab-v0.2-evidence-2026-10-05.md`.

## Guardrails

- no feature creep;
- no secretos reales;
- no datos corporativos en Demo;
- no GLPI/Intune real en CI;
- no nuevos permisos;
- no ReadWrite;
- no active OT scanning;
- no remediation;
- no network discovery;
- no fallback Live → Demo;
- no inventar observations, relationships, lifecycle o research faltante;
- no declarar producción/certificación.

## Próximos pasos

1. confirmar CI verde del HEAD documental final;
2. marcar PR #129 Ready for review;
3. merge manual por Sergio;
4. cerrar issue #128 como completed;
5. realizar housekeeping post-merge sólo si Git/CI lo requiere;
6. mantener V02-023 en su rama/PR separado hasta disponer de autorización tenant.

Git, código, tests y evidencias específicas continúan siendo la fuente de verdad.


## Resultado final V02-029

- Demo readiness: **PASS**;
- Live Lab: **PASS**;
- criterios de salida: **8/8 PASS**;
- no-fallback Demo→Live: **PASS**;
- API snapshot sin auth: **401**;
- V02-023: **BLOCKED / NON-BLOCKING**;
- release v0.2: **READY FOR MANUAL MERGE**.

Los commits posteriores al HEAD de runtime validado sólo registran evidencia y sincronizan documentación de cierre.
