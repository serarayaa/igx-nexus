# V02-021 — Lifecycle & Investment

Estado: **integrado** · PR #107 · issue #105 · merge `34f3ee8`.

## Pregunta operacional

> **¿Qué hitos conocidos del ciclo de vida requieren planificación dentro de los próximos 3, 6, 12 o 24 meses, y qué cobertura de evidencia respalda esa lectura?**

La superficie no responde cuánto dinero debe invertir Innergex. V02-021 usa **Investment** en el sentido de planificación temporal de renovación/reemplazo y mantiene costos, CAPEX y presupuesto fuera de alcance mientras no exista una fuente corporativa explícita.

## Separación de conceptos

### Estado lifecycle

`TechnologyAsset.lifecycle` describe el estado actual del CI:

- `planned`;
- `in_stock`;
- `active`;
- `maintenance`;
- `repair`;
- `retired`;
- `disposed`;
- `unknown`.

No representa una fecha ni permite inferir compra, garantía, EOL, EOS o reemplazo.

### Hitos temporales

V02-021 gobierna seis atributos canónicos:

| Hito | Attribute key |
| --- | --- |
| Compra | `nexus.lifecycle.purchaseAt` |
| Puesta en servicio | `nexus.lifecycle.commissionedAt` |
| Fin de garantía | `nexus.lifecycle.warrantyEndAt` |
| End of Life | `nexus.lifecycle.eolAt` |
| End of Support | `nexus.lifecycle.eosAt` |
| Objetivo de reemplazo | `nexus.lifecycle.replacementTargetAt` |

Los cuatro últimos forman la vista de planificación. Compra y puesta en servicio sirven además como base explícita para edad.

## Evidence before inference

Una fecha sólo se considera **known** cuando:

1. existe como string ISO-8601 válido; y
2. existe al menos un `ProvenanceRecord` para su `fieldPath` exacto.

Estados posibles:

- `known`: fecha válida con provenance;
- `unavailable`: no existe un valor;
- `invalid`: existe un valor pero no es una fecha válida;
- `unverified`: fecha válida sin provenance.

NEXUS no completa un gap usando fabricante, modelo, edad promedio, una tabla pública ni una política no documentada.

## Horizontes

Horizontes soportados:

- 3 meses;
- 6 meses;
- 12 meses;
- 24 meses.

Los límites utilizan **aritmética de meses calendario en UTC** desde `snapshot.asOf`, no aproximaciones de 90/180/365/730 días.

Un hito conocido queda en una de tres posiciones:

- `expired`: anterior al corte;
- `in_window`: desde el corte hasta el final inclusivo del horizonte;
- `outside_window`: posterior a la ventana.

Los hitos sin evidencia suficiente no se cuentan automáticamente como `outside_window`.

## Cobertura

Cada tipo de hito publica:

- activos con evidencia conocida;
- población total;
- ratio de cobertura;
- vencidos;
- dentro del horizonte;
- fuera de ventana;
- inválidos;
- unverified.

Esto evita presentar un número pequeño de vencimientos como si el inventario completo hubiese sido medido.

## Edad

La edad del CI sólo se calcula si existe evidencia conocida.

Orden de preferencia:

1. `commissionedAt`;
2. `purchaseAt`.

La base utilizada queda visible en el contrato. Una fecha posterior al `asOf` no produce edad.

## Demo

El dataset Demo autoriza fechas sintéticas deterministas para demostrar:

- cobertura completa y parcial;
- garantía vencida y próxima;
- EOL/EOS en diferentes horizontes;
- objetivo de reemplazo;
- edad con compra/puesta en servicio;
- ausencia legítima de evidencia.

`demo.warrantyEnds` permanece como compatibilidad de la proyección histórica v0.1. La semántica v0.2 utiliza `nexus.lifecycle.warrantyEndAt`.

## Live

La misma superficie se utiliza en Live.

Si NEXUS API/GLPI no transporta un hito respaldado por provenance:

- permanece unavailable;
- reduce cobertura;
- no se sustituye por Demo;
- no se deriva de fabricante/modelo;
- no se consulta automáticamente una fuente externa.

Esto permite introducir nuevas fuentes lifecycle en el futuro sin cambiar la semántica de la UI.

## Superficie de producto

`#lifecycle` es un workspace propio y ofrece:

- selector 3/6/12/24 meses;
- cobertura de edad;
- coverage por hito;
- conteos expired/in-window/outside-window;
- tabla de hitos a revisar;
- source/provenance visible;
- drill-down a Asset 360;
- boundary explícito sobre presupuesto.

Technology Overview enlaza a esta superficie, pero no duplica su análisis.

## Fuera de alcance

V02-021 no implementa:

- presupuesto o forecast financiero;
- CAPEX/OPEX;
- precios de compra o reemplazo;
- vida útil estándar por fabricante/modelo;
- scraping de EOL/EOS;
- recomendación automática de inversión;
- scoring de riesgo;
- Device Health;
- V02-022 IT / OT Intelligence.

## QA

La implementación integrada conserva:

- contrato puro testeable en `@igx-nexus/types`;
- Demo/Live sin fallback;
- loading/error/empty/unavailable diferenciados;
- deep link `#lifecycle`;
- WCAG 2.2 AA;
- reflow hasta 320 CSS px;
- light/dark;
- High Contrast mediante tokens existentes;
- CI existente sin relajar el gate de seguridad.
