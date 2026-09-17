# ADR-0023 — Product Information Architecture v2

Estado: **Propuesto — V02-013 / issue #75**. Se considerará aceptado únicamente después del merge manual y CI post-merge verde.

## Contexto

IGX NEXUS v0.1 demostró Dashboard, Asset Explorer, Asset 360, QR/Label, Technology Map y CMDB Health sobre una Demo sintética.

V02-001..V02-012 fortalecieron la base de dominio y backend: modelo canónico, API, Provider Mode, GLPI Live, provenance/reconciliation, Taxonomy v2, Demo canónica y Relationship Evidence v2.

La arquitectura de información de la Web, sin embargo, aún conserva decisiones propias de la demo:

- Demo y Live exponen menús distintos;
- navegación global y anchors internos de Dashboard comparten sidebar;
- Dashboard acumula resumen, calidad, lifecycle y recorrido de demostración;
- Asset 360 acumula secciones verticalmente;
- Technology Map se alcanza principalmente como subruta de un activo;
- `CMDB Health` actual representa sobre todo calidad de registro, mientras el roadmap incorpora Device Health técnico como concepto distinto.

Si se implementan V02-014..018 sin una IA común, cada ticket podría optimizar su pantalla de forma local y producir un producto incoherente.

## Decisión

### 1. La IA del producto es independiente del provider

Demo y Live comparten una arquitectura mental única.

El provider puede cambiar:

- cobertura;
- freshness;
- availability;
- evidence presente;
- capacidades realmente soportadas.

No debe cambiar la definición conceptual de `Overview`, `Assets`, `Asset 360`, `Technology Map`, `Data Quality`, `Intelligence` y `Sources`.

Una capacidad sin datos debe representar honestamente `no evidence`, `partial coverage` o indisponibilidad cuando la superficie exista; nunca se sustituye Live por Demo silenciosamente.

### 2. Navegación global y navegación contextual son conceptos distintos

La navegación global selecciona un workspace.

La navegación contextual cambia el aspecto investigado dentro de un workspace o entidad.

Por lo tanto:

- anchors internos de una página no pertenecen al menú global;
- tabs/sections de Asset 360 son contextuales;
- filtros/scope/depth de Technology Map son estado de investigación;
- QR/Label son acciones contextuales del CI, no módulos primarios.

### 3. Overview es monitoreo y entrada a investigación

Overview responde:

> **¿Qué requiere atención ahora y por qué?**

No debe intentar contener todo el inventario ni todo el analytics disponible.

Se priorizan resúmenes defendibles, cobertura/freshness y drill-downs hacia workspaces especializados.

V02-019 gobierna la definición formal de métricas.

### 4. Assets y Technology Map son workspaces de investigación

`Assets / Explorer` responde qué tecnología existe y permite encontrar el CI correcto.

`Technology Map` responde cómo se relaciona un foco/scope con otros CIs y qué evidencia sostiene esas conexiones.

Technology Map adopta una estrategia **focus-first / scope-first**, no un grafo global de toda la organización.

### 5. Asset 360 adopta jerarquía por intención

Asset 360 deja de evolucionar como una lista abierta de secciones.

La arquitectura conceptual objetivo es:

```text
Overview
Inventory
Evidence & Sources
Relationships
History
```

La implementación puede ajustar labels y composición, pero debe preservar la separación de intenciones.

Quality, Health y Lifecycle pueden resumirse dentro de Asset 360 y enlazar a workspaces especializados filtrados por el CI.

### 6. Data Quality y Device Health permanecen separados

`Data Quality` pregunta si la información es completa, reciente, consistente y suficientemente respaldada.

`Device Health` pregunta si existen señales técnicas de degradación/comportamiento que merecen investigación.

Un CI puede tener:

- alta Data Quality y mala Health;
- baja Data Quality sin evidencia de falla técnica.

No deben compartir un score o label que borre esa diferencia.

### 7. Intelligence agrupa interpretación, no inventario

`Intelligence` puede contener Health, Lifecycle y Findings cuando esas capacidades existan.

No es un contenedor para cualquier vista “avanzada”.

Findings pertenece al futuro Findings Engine y debe mantener la cadena:

```text
evidence -> pattern -> hypothesis -> confidence
```

### 8. Sources es una superficie de coverage/provenance

`Sources` debe explicar qué fuentes alimentan NEXUS, su disponibilidad, freshness y cobertura, sin exponer secretos ni configuración sensible.

No reemplaza la administración técnica de integraciones.

### 9. Sólo se navega a experiencias útiles

La IA conceptual puede reservar áreas futuras, pero el shell no debe llenarse de destinos deshabilitados.

Una ruta global entra en navegación cuando existe suficiente contenido y una pregunta operacional real que responder.

### 10. Estado de investigación debe ser addressable cuando aporta valor

Vistas como Asset 360 y Technology Map deben tender a URLs/deep links capaces de representar contexto relevante:

- asset;
- focus/scope;
- filtros;
- profundidad;
- selección o ventana temporal cuando corresponda.

V02-013 no impone librería de routing. V02-014 decide la implementación técnica.

### 11. WCAG 2.2 AA es parte del contrato de producto

La IA y las visualizaciones deben soportar:

- navegación consistente;
- keyboard;
- foco visible/no oculto;
- alternativas a dragging;
- target size;
- reduced motion;
- high contrast;
- alternativa semántica para grafos.

La accesibilidad no se posterga a un ticket cosmético.

## Arquitectura conceptual

```text
IGX NEXUS
│
├─ Overview
├─ Assets
│  ├─ Explorer
│  └─ Asset 360 (contextual)
├─ Technology Map
├─ Intelligence
│  ├─ Health
│  ├─ Lifecycle
│  └─ Findings (futuro)
├─ Data Quality
├─ Sources
└─ Administration (futuro / no primary nav v0.2)
```

No todos los nodos deben estar visibles en v0.2 antes de tener una experiencia útil.

## Alternativas rechazadas

### Menú distinto por provider

Rechazada: convierte Demo y Live en dos productos mentalmente distintos y hace que la fuente dicte IA.

### Dashboard como contenedor de todas las métricas

Rechazada: dificulta distinguir monitoreo de investigación y favorece card/widget sprawl.

### Asset 360 como scroll incremental de secciones

Rechazada como dirección futura: escala mal cuando se incorporan evidence, sources, taxonomy, history y findings.

### Technology Map global

Rechazada: renderizar todo el universo produce un hairball visual, degrada rendimiento y no responde una pregunta concreta.

### Elegir router/framework nuevo en V02-013

Rechazada: la decisión de producto precede a la implementación. V02-014 debe evaluar la solución técnica con requirements ya definidos.

### Una pantalla distinta para cada persona

Rechazada: las personas validan preguntas y prioridades, no justifican duplicar el producto.

### Fusionar Data Quality y Device Health

Rechazada: son conceptos distintos, con fuentes, evidencia e implicaciones distintas.

## Consecuencias positivas

- V02-014..018 reciben un lenguaje de producto común;
- Demo y Live pueden evolucionar sin bifurcar UX;
- la riqueza canónica tiene lugares claros donde mostrarse;
- Overview deja de competir con los workspaces de investigación;
- Technology Map tiene scope y propósito defendibles;
- Asset 360 puede crecer sin convertirse en una pared de cards;
- Data Quality, Health, Lifecycle y Findings quedan semánticamente separados;
- WCAG se incorpora antes de refactors visuales mayores.

## Costos y deuda aceptada

- la Web v0.1 seguirá contradiciendo parte de la IA objetivo hasta V02-014..018;
- hash routing puede permanecer temporalmente;
- algunas superficies conceptuales no aparecerán en navegación hasta tener contenido real;
- History no tendrá valor completo hasta existir historia temporal defendible;
- Sources necesitará más información real de coverage antes de ser una superficie madura;
- Device Health real depende de V02-023..025.

## Relación con otros ADR

- ADR-0003 estableció el Design System inicial; V02-013 define su dirección de producto v2 sin reemplazar tokens/primitives automáticamente.
- ADR-0004..0009 documentan superficies v0.1 que esta IA reorganiza conceptualmente.
- ADR-0014 gobierna Provider Mode; ADR-0023 evita que Provider Mode bifurque la estructura del producto.
- ADR-0019, ADR-0020 y ADR-0022 aportan provenance, taxonomy y relationship evidence que las nuevas superficies deben poder explicar.
- V02-014 implementará Shell & Motion 2.0 conforme a esta decisión.

## Documentos normativos asociados

- `docs/product/product-ia-v2.md`
- `docs/product/visual-direction-v2.md`
- `docs/product/screen-purpose-matrix.md`

## Referencias externas

La decisión fue informada por patrones documentados en:

- ServiceNow CMDB Workspace / Unified Map;
- Microsoft Intune device details;
- Atlassian Assets;
- Grafana Explore/Drilldown;
- NetBox Visual Explorer;
- W3C WCAG 2.2.

Las fuentes completas y fecha de consulta se registran en los documentos de producto. No se adopta la interfaz de un tercero como diseño de NEXUS.
