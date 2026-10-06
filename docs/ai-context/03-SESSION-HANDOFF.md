# IGX NEXUS — Session Handoff

## Baseline y scope

- main y origin/main verificados en eb87c68ee2a17b793e34e457c4e2914567889bb1, clean antes de crear feature/v03-003-shell-navigation. PR #137 MERGED; V03-001/002/008 cerrados.
- V03-003 implementado para revisión humana, NO integrado/NO cerrado. Draft PR y SHA/checks finales registrados en su body. No merge automático; Sergio decide y hace merge manual.
- V03-005 NO INICIADO. V03-007 sólo Graph dentro de V03-005; V02-023 separado.

## Entrega

Leer docs/product/v0.3-shell-navigation.md y docs/product/evidence/v03-003/review.md. Audit OBSERVED/INFERRED/RECOMMENDED, IA existente conservada, propuesta sidebar224/rail104, tablet768/mobile320, modo explícito, preferences Light/Dark/Comfortable/Compact y marca B óptica16/regular24+.

Shell representa view de App y consume canonicalHash/assetReturnHash/buildInvestigationLink; no selectedRoute/store/history/scope duplicados. Collapse persiste sólo disposición; ninguna URL en storage. Skip link mueve foco sin borrar investigación. Drawer conserva inert/Escape/trap/body lock/restore; targets ocultos excluidos y resize devuelve foco a main si trigger desaparece. CSS shell usa tokens semánticos existentes, sin colores literales ni motion library. Current != selection != focus.

B refinado sigue candidato visual reversible. Exports SVG limpios en assets/branding/proposals/v03-003; histórico preservado, no A adoptado ni C reabierto. Favicon/manifest NO modificados. Aprobación estética NO inferida de tests.

## Validación observada

- Build types/UI y web typecheck/build PASS; Storybook build PASS.
- Shell + V03-008 browser17/17 PASS; Storybook67/67 PASS; foundation4/4 PASS; recarga física/deep links2/2 PASS; shell physical/media/history/brand4/4 PASS.
- Full local Web previo al último test de skip:360/362, con dos timeouts existentes HTTP5s y Lifecycle30s. Rerun aislado8/8 PASS sin debilitar límites. No declarar full local verde. CI del SHA final es gate de regresión completa.
- Reflow1440/768/320; navtargets≥44; widths224/104; contraste navtexto≥4.5:1 y currentmarker≥3:1 Light/Dark. High Contrast/reduced emulados Chromium, no sesión OS/SR ni WCAG certificado. Live indicator fixture, no tenant Live validado.
- Manifest incluye viewport/tema/densidad/URL/capture time, baseline SHA y hashes de fuentes/imágenes; SHA de integración de la evidencia en Draft PR. Capturas nativas sin retoque; baseline humano pendiente.

## Próximo paso permitido

V03-003 Human Review Checkpoint = PENDING. Recomendación técnica GO WITH CONDITIONS, sujeta a CI SUCCESS y revisión estética explícita. Presentar Desktop Light/Dark, tablet,320, expanded/collapsed, drawer, B16/24/32/64/monocromo, Overview y datos densos. Mantener Draft hasta decisión humana; sin merge automático.

Pendientes transversales: Graph legacy productivo y escala corporativa en V03-005, accessibility por superficie, robustez de URL final Asset360 con return codificado e investigación extensa14facetas/search/selection/Graphparams (condición no bloqueante heredada de V03-008, límites actuales, sin workaround storage sin evidencia). No avanzar V03-005 automáticamente.