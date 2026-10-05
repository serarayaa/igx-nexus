# IGX NEXUS — Session Handoff

> Estado de continuidad de la sesión de trabajo más reciente.
> Este archivo se reemplaza; no es un historial acumulativo.

## Repository State

- Repository: `serarayaa/igx-nexus`
- Stable branch: `main`
- Baseline estable de cierre funcional v0.2: `775e8a16c1128384549e704c0cea2d0eb423bc63`
- Baseline estable post-remediación: `8a1661f205fd872e8a117dc9e5b30e867b856cc0`
- Último ciclo integrado: **v0.2.x post-release audit hardening**
- Release: **v0.2 cerrada**
- V02-029: PR #129 / CI #1016 SUCCESS
- Post-release hotfixes: PR #131–#134 / CI #1021, #1023, #1025, #1027 SUCCESS

## Estado funcional

Integrado en v0.2:

**V02-001 .. V02-022 + V02-024 + V02-025 + V02-026 + V02-027 + V02-028 + V02-029**

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

## V02-029 — Readiness final

Resultado final:

1. Demo/Live contratos compartidos — PASS;
2. evidence/provenance — PASS;
3. reconciliación conservadora — PASS;
4. Taxonomy IT/OT con incertidumbre — PASS;
5. relaciones con evidencia — PASS;
6. UX/analytics útiles — PASS;
7. señales endpoint explicables — PASS con cobertura Live limitada;
8. auditable/seguro/testeable — PASS.

Demo y Live Lab quedaron PASS; V02-029 fue mergeado mediante PR #129 y `main` quedó verde en CI #1016.

## Hallazgos que V02-029 debe cerrar

1. el smoke oficial integrado seguía siendo Demo v0.1;
2. no existía runbook Demo v0.2;
3. Live Lab estaba documentado por tickets, no como release compuesto;
4. V02-007/V02-008 tenían evidencia PASS histórica pero anterior al HEAD final;
5. roadmap/AI context estaban atrasados respecto de V02-028;
6. V02-023 no debe bloquear ni inducir fallback/coverage ficticia.

## Entregables de V02-029

Integrado en `main`:

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

1. sincronizar el checkout local con `main` antes de iniciar nuevo trabajo;
2. iniciar **v0.3 — Product Experience** como fase dedicada a UI/UX, interfaz, visualización, accesibilidad, responsive, motion y flujos por persona;
3. mantener Intelligence & Automation fuera de v0.3 y reservarla para **v0.4**;
4. mantener V02-023 en su rama/PR separado hasta disponer de autorización tenant;
5. no reabrir el scope funcional de v0.2 salvo hotfix explícito.

Git, código, tests y evidencias específicas continúan siendo la fuente de verdad.


## Post-release audit hardening — 2026-10-05

Cerrados e integrados:

- post-release AUD-LIVE-001 — PR #131 / CI #1021;
- post-release AUD-API-001 — PR #132 / CI #1023;
- post-release AUD-DATA-001 — PR #133 / CI #1025;
- post-release AUD-SEC-001 — PR #134 / CI #1027.

Detalle: `docs/audits/v0.2-post-release-remediation-closure.md`.

Los IDs anteriores deben interpretarse dentro del namespace de la auditoría post-release 2026-10-05; existen IDs históricos coincidentes en el repositorio.

## Resultado final V02-029

- Demo readiness: **PASS**;
- Live Lab: **PASS**;
- criterios de salida: **8/8 PASS**;
- no-fallback Demo→Live: **PASS**;
- API snapshot sin auth: **401**;
- V02-023: **BLOCKED / NON-BLOCKING**;
- release v0.2: **CLOSED — PR #129 merged / CI #1016 SUCCESS**.

Los commits posteriores al HEAD de runtime validado sólo registran evidencia y sincronizan documentación de cierre.
