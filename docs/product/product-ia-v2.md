# IGX NEXUS — Product Information Architecture v2

Estado: **Propuesta de V02-013 / issue #75**. Se considera normativa sólo después de merge manual y CI post-merge verde.

## Propósito

Este documento define cómo debe organizarse IGX NEXUS para evolucionar desde una demo funcional hacia una plataforma de **Technology Intelligence**.

No especifica píxeles ni implementa rutas. Define:

- qué superficies existen;
- qué pregunta operacional responde cada una;
- cómo se navega entre resumen, exploración e investigación;
- dónde vive cada tipo de información;
- qué cambia y qué no cambia entre Demo y Live;
- qué decisiones pertenecen a V02-014..019.

Principio rector:

> **Cada pantalla debe responder una pregunta operacional reconocible.**

La navegación no se diseña alrededor de componentes React ni de la fuente de datos.

---

## 1. Auditoría del baseline actual

Baseline analizado:

`39615a759f29e2d6a4cc6766eaeb885c2193bfad`

### Fortalezas que deben preservarse

- `NexusShell` ya separa shell de contenido.
- existe foco programático correcto al navegar;
- hay breadcrumb en Asset 360;
- Demo y Live comparten providers y componentes base;
- existen estados loading/error/empty explícitos;
- la densidad cómoda/compacta ya es una capacidad real;
- light/dark mode ya existe como concepto;
- el Design System está separado en `packages/ui`;
- la Web nunca habla directamente con GLPI;
- las pantallas actuales contienen lenguaje que distingue Demo de evidencia real.

### Deuda de IA observada

1. **La navegación global y contextual están mezcladas.**
   
   El sidebar incluye destinos globales (`Panel principal`, `Activos`, `CMDB Health`) y, sólo en Dashboard, anchors internos bajo `En este panel`.

2. **Demo y Live alteran la estructura visible del producto.**
   
   El provider cambia qué destinos aparecen. Esto ayuda a la demo, pero hace que la arquitectura mental dependa de la fuente.

3. **Dashboard mezcla monitoreo, resumen, navegación de demo y contenido analítico.**
   
   KPIs, distribuciones, lifecycle, calidad/frescura y “recorrido de la demo” conviven en una sola superficie.

4. **Asset 360 funciona como una página vertical acumulativa.**
   
   Identidad, asignación, hardware, lifecycle, garantía, Health, QR, fuente y relaciones se agregan como bloques sucesivos. Escala mal cuando se incorporen taxonomy, provenance, source coverage, evidence, history y findings.

5. **Technology Map todavía es una capacidad subordinada al activo.**
   
   Conceptualmente debe evolucionar hacia un workspace de investigación con estado propio y deep links.

6. **El modelo de rutas refleja la implementación v0.1.**
   
   `dashboard`, `assets`, `asset`, `relations`, `label`, `qr`, `health` son útiles como baseline, pero no expresan aún la IA objetivo.

7. **La riqueza canónica supera a la presentación.**
   
   Taxonomy v2, provenance, source references, operational contexts y Relationship Evidence v2 ya existen en contratos, pero la UI sólo expone parte de ellos.

Esto último es deuda deliberada, no un defecto crítico: V02-013 define dónde debe aparecer esa riqueza antes de implementarla.

---

## 2. Benchmark externo y patrones extraídos

Investigación realizada el 2026-09-16 sobre documentación oficial.

### ServiceNow CMDB Workspace / Unified Map

Fuentes:

- https://www.servicenow.com/docs/r/servicenow-platform/configuration-management-database-cmdb/ci-form-cmdb-workspace.html
- https://www.servicenow.com/docs/r/servicenow-platform/unified-map/cmdb-workspace-unified-map.html

Patrones útiles:

- detalle de CI organizado por propósito: atributos, relaciones, Health, fuentes/CMDB 360, actividad;
- Unified Map como workspace independiente con `home node`, filtros, niveles, side panel contextual y timeline;
- selección de nodo sin abandonar necesariamente el contexto de investigación;
- relaciones y referencias visualmente distinguibles.

Qué **no** copiar:

- workflows ligados a Incident/Change/Problem Management, porque Jira sigue siendo Service Desk;
- edición de CMDB desde NEXUS, porque GLPI sigue siendo SoR;
- complejidad de roles/acciones que no tiene respaldo en el alcance actual.

### Microsoft Intune

Fuente:

- https://learn.microsoft.com/en-us/intune/device-management/inventory-and-status/device-details

Patrón útil:

- un dispositivo no se presenta como una lista interminable de propiedades: Overview, Hardware, Apps, Compliance/configuration y otras áreas separan intenciones de uso.

Aplicación a NEXUS:

- Asset 360 necesita jerarquía y navegación contextual, no más cards verticales.

### Atlassian Assets

Fuentes:

- https://support.atlassian.com/assets/docs/what-are-object-schemas/
- https://support.atlassian.com/assets/docs/what-is-the-assets-common-data-model/

Patrones útiles:

- separar identidad del objeto, atributos, referencias/relaciones y contexto compartido;
- conectar hardware con personas, geografía y organizaciones sin duplicar esas entidades conceptualmente;
- diferenciar nombre de sistema y nombre mostrado.

Aplicación a NEXUS:

- owner, site y otras referencias deben evolucionar como contexto conectado, no crecer indefinidamente como strings duplicados;
- la UI debe diferenciar identidad NEXUS de identificadores de fuente.

### Grafana Explore / Drilldown

Fuentes:

- https://grafana.com/docs/learning-hub/explore-your-data/00-intro/02-what-is-drilldown/
- https://grafana.com/docs/grafana/latest/visualizations/

Patrón útil:

- **dashboard = monitoreo/resumen**;
- **explore/drilldown = investigación**.

Aplicación a NEXUS:

- Overview no debe intentar contener toda la plataforma;
- Explorer y Technology Map son workspaces de investigación;
- un hallazgo debe poder llevar al usuario desde resumen hacia evidencia y contexto.

### NetBox Visual Explorer

Fuente:

- https://netboxlabs.com/docs/visual-explorer/

Patrones útiles:

- scope explícito;
- no renderizar toda la organización como un único “hairball”;
- detalle contextual al seleccionar elementos;
- estado compartible/deep-linkable.

Aplicación a NEXUS:

- Technology Map debe comenzar desde un foco/scope defendible;
- filtros y profundidad forman parte del estado de la investigación;
- la vista debe poder compartirse mediante URL cuando V02-018 lo implemente.

### WCAG 2.2

Fuente:

- https://www.w3.org/TR/WCAG22/

Impactos directos:

- navegación consistente;
- foco visible y no oculto;
- target size mínimo;
- alternativas a operaciones que dependan de dragging;
- grafos con alternativa semántica no gráfica;
- reduced motion y high contrast como requisitos de producto, no extras.

---

## 3. Personas funcionales y Jobs-to-be-Done

No representan roles RBAC reales ni organigramas de Innergex. Sirven para validar que la IA pueda responder preguntas distintas sin crear seis aplicaciones separadas.

| Perspectiva | Preguntas principales |
| --- | --- |
| Soporte IT | ¿Qué equipo es? ¿quién lo usa? ¿qué sabemos de él? ¿hay señales que requieren atención? |
| Infraestructura | ¿qué depende de este CI? ¿qué fuentes lo observan? ¿qué cambia si falla o se retira? |
| OT | ¿qué activo industrial es? ¿en qué contexto operacional está? ¿qué evidencia sustenta su clasificación/relaciones? |
| Asset Management | ¿dónde está el activo? ¿quién es responsable? ¿qué lifecycle/garantía tiene? ¿qué debería revisarse o renovarse? |
| Management | ¿qué requiere atención? ¿dónde están los principales gaps/riesgos y con qué cobertura? |
| Auditoría / Compliance | ¿de dónde viene este dato? ¿cuándo se observó? ¿qué cambió? ¿qué puede demostrarse? |

Regla:

> Las personas cambian la prioridad del contenido, no la verdad del dominio.

---

## 4. Arquitectura de información objetivo

### Estructura conceptual

```text
IGX NEXUS
│
├─ Overview
│
├─ Assets
│  ├─ Explorer
│  └─ Asset 360 (contextual)
│
├─ Technology Map
│
├─ Intelligence
│  ├─ Health
│  ├─ Lifecycle
│  └─ Findings            [v0.3 cuando exista]
│
├─ Data Quality
│
├─ Sources
│
└─ Administration        [no navegación primaria en v0.2]
```

Esta es la arquitectura conceptual. El shell sólo debe mostrar destinos que tengan una experiencia útil implementada; no se deben llenar menús con placeholders deshabilitados.

### Qué entra en v0.2

- Overview;
- Assets / Explorer;
- Asset 360;
- Technology Map;
- Health;
- Data Quality;
- Lifecycle cuando V02-021 exista;
- Sources cuando haya una superficie mínimamente útil de cobertura/provenance.

### Qué se reserva

- Findings como módulo completo: V02-026 / v0.3;
- AI assistant: v0.3+;
- administración corporativa/SSO/RBAC: v0.5;
- auditoría operativa completa: v0.6/v0.7+ según alcance;
- personalización profunda por persona: posterior a evidencia de uso real.

---

## 5. Modelo de navegación

### Navegación global

La navegación global responde “¿a qué espacio de trabajo quiero ir?”.

Ejemplos:

- Overview
- Assets
- Technology Map
- Intelligence
- Data Quality
- Sources

No contiene anchors internos como “Garantías y lifecycle” de una página concreta.

### Navegación contextual

La navegación contextual responde “¿qué aspecto de este contexto quiero investigar?”.

Ejemplos:

- tabs/sections de Asset 360;
- filtros del Technology Map;
- subviews de Intelligence;
- breadcrumbs;
- acciones del CI como QR/etiqueta.

### Demo y Live

Demo/Live son **modos de fuente**, no arquitecturas de producto.

Reglas:

1. la jerarquía conceptual permanece estable;
2. el modo se muestra como contexto/status;
3. una capacidad sin datos Live debe explicar ausencia/cobertura cuando la superficie exista;
4. nunca sustituir Live por Demo silenciosamente;
5. Demo no debe aparecer como evidencia real;
6. no mantener dos menús mentalmente incompatibles sólo por cambiar provider.

### QR y Label

QR/etiquetado no son módulos globales.

Son acciones contextuales del CI:

```text
Asset 360
  -> Physical Identity / QR
  -> Diseñar etiqueta
  -> Resolver locator autorizado
```

### Deep links

La dirección futura debe permitir que el estado relevante sea compartible:

```text
asset
map focus/scope
filters
time window cuando exista
selected source/evidence
```

V02-014 decidirá si esto justifica reemplazar hash routing. V02-013 no prescribe una librería.

---

## 6. Overview — pregunta operacional

Pregunta primaria:

> **¿Qué requiere atención ahora y por qué?**

Overview no debe convertirse en un catálogo de todos los KPIs disponibles.

Debe priorizar, cuando los contratos analíticos existan:

1. cambios/alertas accionables;
2. gaps de calidad o cobertura;
3. lifecycle próximo;
4. estado general de fuentes;
5. entradas hacia investigación.

### Patrón recomendado

```text
Overview
├─ Contexto / alcance / freshness
├─ Requiere atención
│  ├─ hallazgos/gaps priorizados
│  └─ explicación + cobertura
├─ Estado resumido
│  ├─ inventario
│  ├─ calidad
│  └─ lifecycle
└─ Drill-downs
   ├─ Assets
   ├─ Data Quality
   ├─ Health
   └─ Technology Map
```

### Anti-patrón

```text
card + card + card + donut + donut + card
```

Una métrica sólo merece protagonismo si responde una pregunta y su definición es defendible.

V02-019 sigue siendo dueño de numeradores, denominadores, ventanas y contratos métricos.

---

## 7. Assets / Explorer

Pregunta primaria:

> **¿Qué tecnología existe dentro de este alcance y cómo encuentro el CI que necesito investigar?**

El Explorer debe ser data-dense y priorizar:

- búsqueda;
- filtros;
- sorting;
- columnas útiles;
- estado de fuente/freshness cuando aporte valor;
- navegación a Asset 360;
- views/scope persistentes cuando exista soporte.

No debe convertirse en un grid de cards para 10.000 activos.

V02-016 implementará esta dirección.

---

## 8. Asset 360 — jerarquía de información

Pregunta primaria:

> **¿Qué es este CI, qué sabemos de él, de dónde lo sabemos y qué requiere atención?**

### Nivel 1 — Header / identidad operacional

Siempre visible:

- nombre/display name;
- ID NEXUS;
- domain/class/role cuando estén resueltos;
- lifecycle;
- criticidad;
- owner/site cuando existan;
- freshness resumida;
- source coverage resumida;
- acciones contextuales.

### Nivel 2 — Overview del CI

Debe responder rápidamente:

- estado general;
- lifecycle/warranty;
- calidad de información;
- Health cuando exista señal técnica;
- relaciones principales;
- findings futuros;
- gaps que requieran revisión.

### Nivel 3 — Áreas de investigación

Propuesta conceptual:

```text
Overview
Inventory
Evidence & Sources
Relationships
History
```

`Quality`, `Health` y `Lifecycle` pueden tener resúmenes dentro de Overview y deep-links a workspaces globales filtrados por el CI.

No se recomienda crear una tab por cada campo del modelo.

### Inventory

- identidad técnica;
- hardware;
- software futuro;
- network identifiers;
- operational contexts;
- taxonomy.

### Evidence & Sources

- sources que reportan el CI;
- timestamps;
- claims/provenance;
- conflicts;
- authority/derivation;
- confidence cuando corresponda;
- campos ausentes o divergentes.

### Relationships

- upstream/downstream/conectividad;
- tipo y dirección;
- temporalidad;
- evidence;
- link a Technology Map enfocado en el CI.

### History

Se reserva para cuando exista historia real defendible. No fabricar timeline a partir de `updatedAt` aislados.

---

## 9. Technology Map — workspace de investigación

Pregunta primaria:

> **¿Cómo se relaciona este CI o conjunto acotado con el resto de la tecnología y qué evidencia sostiene esas conexiones?**

### Modelo conceptual

```text
┌──────────────────────────────────────────────────────────┐
│ scope / search / filters / depth / overlays             │
├───────────────────────────────┬──────────────────────────┤
│                               │ Context panel            │
│          MAP / GRAPH          │ - selected CI            │
│                               │ - selected edge          │
│                               │ - evidence               │
│                               │ - freshness              │
├───────────────────────────────┴──────────────────────────┤
│ alternate semantic view: tree/table                     │
└──────────────────────────────────────────────────────────┘
```

### Reglas

- siempre existe un `home/focus node` o scope explícito;
- profundidad inicial limitada;
- filtros forman parte del estado de investigación;
- una relación no se visualiza como certeza si su evidence indica inference/uncertainty;
- edges deben mostrar dirección/semántica sin depender sólo del color;
- selección abre contexto, no obliga a perder el mapa;
- existe alternativa table/tree para teclado/screen reader;
- cualquier futura interacción drag debe tener alternativa no-drag.

### Anti-patrón

> “Mostrar todos los activos y relaciones de la organización en un canvas.”

Eso produce un hairball visual y no responde una pregunta operacional.

V02-018 implementará esta dirección.

---

## 10. Intelligence

`Intelligence` agrupa interpretación operacional derivada de datos/evidencia; no agrupa toda la aplicación.

### Health

Pregunta:

> **¿Qué señales indican degradación o comportamiento técnico que merece investigación?**

No confundir con calidad CMDB.

### Lifecycle

Pregunta:

> **¿Qué tecnología se aproxima a una transición de garantía/EOL/EOS/reemplazo y con qué evidencia?**

No inventar presupuesto ni fechas de fabricante sin fuente.

### Findings (futuro)

Pregunta:

> **¿Qué patrón o anomalía detectó NEXUS y por qué cree que importa?**

Debe expresar:

```text
evidence -> pattern -> hypothesis -> confidence
```

No presentar correlación como causalidad.

---

## 11. Data Quality

Pregunta primaria:

> **¿Qué tan confiable/completa/actual es la información con la que estamos tomando decisiones?**

Se mantiene separada de Health.

Dimensiones futuras:

- completeness;
- freshness;
- source coverage;
- conflicts;
- taxonomy unresolved;
- relationship evidence gaps;
- duplicated/ambiguous identity;
- manual review required.

No usar un único score como sustituto de estas dimensiones sin contrato métrico explícito.

---

## 12. Sources

Pregunta primaria:

> **¿Qué fuentes alimentan NEXUS, qué cobertura tienen y qué tan recientes/disponibles son?**

Posibles fuentes futuras:

- GLPI;
- Intune;
- Windows/Dell telemetry;
- visual evidence;
- otras fuentes gobernadas.

La vista debe hablar de:

- disponibilidad;
- última observación/ingesta;
- cobertura;
- scope autorizado;
- errores sanitizados;
- provenance.

No mostrar secretos ni internals sensibles.

---

## 13. Separación conceptual obligatoria

| Concepto | Pregunta | NO significa |
| --- | --- | --- |
| Data Quality | ¿puedo confiar en este registro? | que el dispositivo esté sano |
| Device Health | ¿hay señales técnicas de degradación? | que la CMDB esté completa |
| Lifecycle | ¿en qué etapa/ventana de renovación está? | que exista riesgo técnico inmediato |
| Finding | ¿qué patrón merece investigación? | verdad causal automática |
| Criticality | ¿qué importancia tiene el CI? | severidad del hallazgo |
| Confidence | ¿cuánta confianza tiene este claim/inferencia? | authority de la fuente |
| Freshness | ¿cuándo fue observado? | que el valor sea correcto |

La UI no debe mezclar estos conceptos sólo porque todos puedan representarse con badges o colores.

---

## 14. Navegación global propuesta para v0.2

Cuando las superficies correspondientes estén implementadas:

```text
Overview
Assets
Technology Map
Intelligence
  Health
  Lifecycle
Data Quality
Sources
```

### No incluir todavía como navegación primaria

- QR;
- Label Designer;
- Demo recorrido;
- Admin corporativo;
- AI Assistant;
- Reports/Audit package todavía no implementados.

Esas capacidades pueden existir como acciones contextuales o futuras.

---

## 15. Responsive / field workflows

No todas las superficies necesitan equivalencia desktop/móvil.

### Deben ser prioritariamente utilizables en móvil/tablet

- búsqueda rápida de activo;
- resolver QR;
- Asset 360 resumen;
- identity/owner/location;
- confirmación de evidencia futura;
- auditoría física futura.

### Desktop-first

- Technology Map complejo;
- analytics densos;
- comparación de múltiples fuentes;
- tablas de inventario extensas.

Desktop-first no significa inaccesible en móvil: debe existir una degradación comprensible y funcional.

---

## 16. Accessibility contract

Baseline: **WCAG 2.2 AA**.

Requisitos de IA:

- navegación global consistente;
- landmarks semánticos;
- un `h1` reconocible por view;
- foco movido al contexto principal tras navegación;
- breadcrumbs cuando existe jerarquía;
- foco nunca oculto por header/sidebar/overlays;
- target sizes compatibles con 2.5.8;
- no depender sólo de hover;
- no depender sólo de color;
- grafos con table/tree equivalente;
- dragging con alternativa por botones/menús cuando aplique;
- estados de carga/error no rompen el contexto de screen reader;
- reduced motion respetado por shell y visualizaciones.

---

## 17. Handoff

### V02-014 — Shell & Motion 2.0

Implementar:

- navegación global vs contextual;
- IA estable Demo/Live;
- responsive sidebar/header;
- breadcrumbs/context slots;
- motion y reduced motion;
- deep-link model/routing técnico cuando corresponda.

### V02-015 — Technology Overview

Implementar la pregunta:

> ¿Qué requiere atención ahora y por qué?

No copiar Dashboard v0.1 sin revisión.

### V02-016 — Asset Explorer 2.0

Implementar búsqueda/exploración data-dense y multisource.

### V02-017 — Asset 360 2.0

Implementar jerarquía Overview / Inventory / Evidence & Sources / Relationships / History según disponibilidad real.

### V02-018 — Technology Map 2.0

Implementar workspace de investigación con focus node, filtros, contexto y alternativa accesible.

### V02-019 — Analytics Contract Layer

Definir formalmente métricas, denominadores, ventanas, cobertura y comparabilidad antes de convertir visualizaciones en KPI oficiales.

---

## 18. Decisiones que esta IA evita

- construir una pantalla por cada tabla/source;
- esconder la estructura del producto al cambiar Demo/Live;
- usar Dashboard como contenedor de todo;
- convertir Asset 360 en scroll infinito de cards;
- convertir Technology Map en grafo global sin foco;
- usar Health como sinónimo de calidad de datos;
- usar cards o donuts como lenguaje visual por defecto;
- introducir AI como navegación principal sin caso de uso probado.

---

## 19. Criterio de éxito

La IA funciona si un usuario puede responder rápidamente:

1. **¿Qué requiere atención?** → Overview / Intelligence / Data Quality.
2. **¿Qué activo busco?** → Assets.
3. **¿Qué sabemos de este CI y de dónde?** → Asset 360.
4. **¿Cómo se relaciona con otros?** → Technology Map.
5. **¿Puedo confiar en la información?** → Data Quality / Evidence & Sources.
6. **¿Qué fuente observó esto y cuándo?** → Asset 360 / Sources.

Sin conocer GLPI internamente y sin confundir evidencia, inferencia o estado técnico.
