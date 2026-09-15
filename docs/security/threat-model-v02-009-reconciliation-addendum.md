# Threat Model addendum — V02-009 Provenance & Reconciliation

Este addendum extiende `docs/security/threat-model-v0.2.md` para la nueva frontera de **V02-009 — Provenance & Reconciliation**. No reemplaza el baseline ni el addendum de V02-008.

## Frontera nueva

```text
TechnologyProvider / adapters
   |
   | registros canónicos + evidence
   v
Reconciliation Layer
   |
   | decisiones / claims / conflictos
   v
Canonical projection
   |
   v
NEXUS consumers futuros
```

V02-009 no introduce una integración de red nueva. El riesgo principal cambia desde autenticación/transporte hacia **integridad de identidad, contaminación de datos y exposición de evidencia sensible**.

## Activos adicionales a proteger

- identidad canónica `TechnologyAsset.id`;
- reglas de matching y su versión;
- source references;
- identificadores observables usados como evidencia;
- claims/provenance por atributo;
- conflictos y decisiones de reconciliación;
- futuras decisiones humanas de corrección;
- separación entre evidencia observada e inferencia.

## Amenazas y controles

| Amenaza | Impacto | Control V02-009 | Riesgo/gate futuro |
| --- | --- | --- | --- |
| Falso merge por hostname/IP | contaminación de identidad, relaciones y analítica | hostname es insuficiente; IP volátil; ninguna de ambas señales auto-fusiona | ampliar reglas por clase de activo al madurar V02-010 |
| Dos identificadores fuertes contradictorios | unión de equipos diferentes | strong support + strong contradiction produce `conflict`; no se proyecta automáticamente | UI/persistencia de revisión manual futura |
| Más de un candidato válido | selección arbitraria por orden | resultado `ambiguous`; candidatos ordenados por clave estable | revisión manual futura |
| Orden de entrada altera resultado | decisiones no reproducibles | sorting determinista de candidatos/evidencia/sources; tests de permutación | mantener contract tests al extender reglas |
| Fuente nueva re-keyea activo | enlaces/QR/analytics pierden continuidad | canonical projection preserva siempre `anchor.id` | formalizar durable identity store en ticket futuro |
| Fuente de mayor autoridad sobrescribe todo | degradación semántica de atributos | políticas centralizadas por familia de atributo; autoridad no es regla global | revisar políticas al integrar fuentes reales |
| Timestamp más nuevo sobrescribe evidencia mejor | datos incorrectos presentados como actuales | recencia sólo participa después de dimensiones previas de política | definir freshness SLA por fuente futura |
| Claim alternativo se pierde | imposibilidad de auditar/corregir | `AttributeResolution` conserva todos los claims y conflicto; provenance se fusiona | persistencia durable del reconciliation envelope |
| Fuente falsifica autoridad | selección canónica manipulada | `AuthorityLevel` forma parte del contrato validado; adapters/composition deben asignarlo, no el navegador | autenticar y autorizar futuras fuentes/ingest pipelines |
| Identificadores sensibles terminan en errores/logs | fuga de inventario | decisiones explican kind/rule, no valor; errores sólo mensaje genérico + issue codes; motor no loguea | revisar observabilidad al persistir decisiones |
| Payload inválido produce salida corrupta | corrupción de dominio | validación de assets de entrada y de decisión/proyección de salida | mantener validadores en boundary de persistencia |
| Fuzzy/AI matching no reproducible | falsos positivos opacos | no existe fuzzy matching, IA ni score caja negra | cualquier cambio requiere nuevo ADR/gate de riesgo |
| Candidate set masivo consume recursos | degradación/DoS lógico | motor es puro y sin llamadas externas; candidate discovery futura debe acotar antes de evaluar grandes catálogos | índices/bounded queries al conectar persistencia real |
| Resolución manual futura borra historial | pérdida de trazabilidad | contratos distinguen decisión/evidencia/proyección y preservan claims | futura UI/API debe ser append-only/auditable |
| Fixtures contienen inventario real | fuga a Git/CI | tests usan valores `SYNTH-*` y rangos de documentación; no se reutiliza Live Lab | secret/data review en PR/CI |

## Controles de privacidad específicos

Los tipos de identificador (`serial_number`, `hardware_uuid`, `bios_uuid`, `imei`, `mac_address`, `hostname`, `ip_address`) pueden ser necesarios dentro del dominio para reconciliar, pero sus valores no se copian dentro de:

- `ReconciliationEvidence.reason`;
- mensajes de `ReconciliationInputError`;
- mensajes de `ReconciliationOutputError`;
- códigos de validación.

La regla evita multiplicar datos sensibles en logs, traces o errores futuros. Los objetos canónicos siguen requiriendo los controles de acceso definidos por V02-003/V02-008.

## Integridad de políticas

Las políticas de fuente/autoridad están centralizadas. Incorporar una nueva fuente real debe exigir revisión de:

1. qué atributos puede observar;
2. cuáles administra realmente;
3. qué `AuthorityLevel` corresponde;
4. si debe participar en una política específica;
5. cómo se prueba una contradicción con las fuentes existentes.

Registrar una fuente en el catálogo no implica automáticamente convertirla en autoridad para todos los campos.

## Riesgos residuales aceptados en V02-009

- no existe todavía persistencia durable del historial de reconciliation;
- no existe UI ni API de decisión manual;
- la creación inicial de ids del adapter GLPI conserva el baseline V02-005;
- las reglas fuertes se probaron con fuentes sintéticas adicionales, no con Intune real;
- candidate discovery todavía opera sobre un conjunto entregado por el caller y no implementa índices de catálogo a escala corporativa.

Estos límites son deliberados: resolverlos anticipadamente mezclaría V02-009 con integración Intune, persistencia, UX de revisión o deployment corporativo.

## Gate V02-009

Antes de considerar V02-009 listo para merge:

1. contratos y engine pasan typecheck/build/tests;
2. hostname-only nunca produce `matched`;
3. contradicciones fuertes no se fusionan silenciosamente;
4. orden distinto produce la misma decisión;
5. claims alternativos y provenance se conservan;
6. canonical id permanece estable;
7. errores/decisiones no duplican valores sensibles de identificadores;
8. fixtures son sintéticos y no contienen inventario Live;
9. V02-008 y Demo siguen pasando regresión;
10. dependency audit y CI completos quedan verdes;
11. ADR-0019 permanece propuesto hasta el merge manual.
