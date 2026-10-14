# PR 10 — entrega de contratos Network V2

Fecha: 2026-10-14. Baseline y HEAD: main@3a1f4eef9147323103c88c2d77ad04670b733bb4. Entrega local pendiente de revisión humana; sin commit, push ni PR.

## Resultado y alcance

Se implementa Computer Network Cards exclusivamente: contratos y validación pura de asociaciones, catálogo opcional y evidencia. Se reutilizan SourceReference, provenance, cobertura y paginación existentes. MAC observada y predeterminada permanecen independientes; duplicados legítimos no se fusionan; IDs se preservan literalmente. Se rechazan relaciones y campos fuera del contrato, evidencia inválida, ventanas incoherentes y datos residuales en estados no recopilados. La autorización denegada requiere unavailable/unauthorized, sin retener datos mediante partial.

No hay adaptador, endpoint, UI, consultas GLPI Live, RBAC, discovery, SNMP ni infraestructura. Hardware V2, Software/OS V2 y snapshot 0.2 conservan su código. NetworkInventoryV2 sólo representa networkCards; una ampliación requiere decisión explícita de versión o contrato complementario.

## Archivos

12 archivos en el parche consolidado: los cinco documentos de investigación ya auditados (handoff actualizado y cuatro documentos conservados), network.ts, network-validation.ts, network.test.ts, test/network-fixtures.ts, index.ts y los dos documentos actuales de contratos e informe. El manifiesto de entrega enumera las rutas completas y hashes.

Los cuatro documentos de investigación conservan exactamente sus bytes auditados. Los cinco originales, incluido el handoff anterior, permanecen en el ZIP original de investigación incluido como evidencia histórica. SHA-256 original: 5d1eef8de844fb29e247c7c94aec7388d11c4f9900355b3ef89fd42e4713049b. La documentación actual supersede el checkpoint histórico de propuesta sin alterar sus conclusiones de capacidad. No se incluye el respaldo OpenAPI bruto.

## Ejecuciones preservadas

| Log | Resultado real |
| --- | --- |
| 01-affected.log | 226/226, primera versión de pruebas afectadas |
| 02-types-typecheck.log | Fallo: prueba usaba node:fs, URL e import.meta.url fuera del entorno Types |
| 03-types-typecheck-repeat.log | Aprobado tras retirar I/O del test y trasladar comparación JSON a verificación externa; sin dependencias nuevas |
| 04-network-tests.log | 85/85, versión intermedia |
| 05-types-full.log | 314/314, versión intermedia |
| 06-affected-final.log | 231/231: Network, Hardware y Software |
| 07-types-final.log | 319/319, 12 archivos; incluye 90 pruebas Network |
| 08-typecheck.log | Typecheck global aprobado |
| 09-build.log | Build global aprobado |
| 10-verification.log | Comparación exacta de ocho fixtures, validador público, exports e integridad histórica |
| 11-diff-check.log | Diff check, alcance exacto y reversibilidad del parche |

Comandos finales: `npm run test --workspace @igx-nexus/types -- src/network.test.ts src/software.test.ts src/hardware.test.ts`, `npm run test --workspace @igx-nexus/types`, `npm run typecheck`, `npm run build`. La comprobación externa usa Node sobre los artefactos compilados, sin incorporarlo al entorno del contrato. Los logs originales no se sobrescribieron. No hubo variación solicitada de workers ni se declara validado el runner paralelo de API/Web. No se ejecutaron suites completas API/Web; sus compilaciones y typechecks sí quedaron cubiertos por comandos globales.

Build conserva advertencia Vite de chunk mayor de 500 kB y aviso de tiempos de plugins; no bloquean la compilación. Los CSS regenerados por build fueron restaurados a baseline, fuera del alcance de esta entrega.

## Límites y riesgos pendientes

La validación es estructural y semántica local, sin resolver entidades ni demostrar permisos efectivos, origen real, historial de solicitudes de catálogo o pertenencia remota al Computer. El productor futuro debe distinguir catálogo no solicitado de fallo de enriquecimiento y conservar la cobertura adecuada. No hay mediciones runtime nuevas ni smoke GLPI Live. La evidencia histórica de colecciones vacías y schemas disponibles no se presenta como prueba de atributos poblados, interfaces o topología. La política de deadlines, presupuestos y concurrencia de una futura integración queda pendiente; no se hereda automáticamente la política Software.

Revisión humana siguiente: contratos cerrados, evidencia y variantes de cobertura, fixtures y paquete consolidado. Detenerse antes de commit, push y PR; no iniciar implementación de integración.
