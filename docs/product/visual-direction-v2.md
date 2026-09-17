# IGX NEXUS — Visual Direction v2

Estado: **Propuesta de V02-013 / issue #75**. Se considera normativa sólo después de merge manual y CI post-merge verde.

## 1. Objetivo

Definir un lenguaje visual coherente para IGX NEXUS antes de implementar Shell 2.0 y las superficies Product Design 2.0.

Este documento no es un mockup ni un rediseño pixel-perfect. Define reglas para que las decisiones visuales futuras:

- comuniquen jerarquía;
- expresen evidencia, incertidumbre y estado sin ambigüedad;
- soporten información densa;
- mantengan accesibilidad WCAG 2.2 AA;
- preserven identidad Innergex/NEXUS sin convertir el producto en una vitrina de marca;
- eviten patrones decorativos que compitan con la información.

Principio rector:

> **La interfaz debe hacer que la información tecnológica sea más legible, no más espectacular.**

---

## 2. Personalidad visual

NEXUS debe sentirse:

- técnico;
- preciso;
- moderno;
- sobrio;
- confiable;
- explicable;
- data-dense cuando el trabajo lo exige;
- calmado incluso cuando comunica riesgo.

No debe sentirse:

- como un dashboard genérico de SaaS;
- como un producto “AI-first” lleno de glow/sparkles;
- como una consola industrial falsa;
- como una copia visual de GLPI, ServiceNow, Grafana o Intune;
- como una colección de cards blancas sin jerarquía;
- como glassmorphism por moda.

---

## 3. Uso de marca

La identidad visual de Innergex/NEXUS actúa como sistema de orientación, no como decoración permanente.

### Principios

- usar el logo en shell, login futuro, documentación y contextos de marca;
- reservar los azules/cyan de marca para identidad, selección, foco y acentos controlados;
- no usar cyan como significado universal de “saludable”, “IT”, “link”, “activo” y “seleccionado” al mismo tiempo;
- separar **brand color** de **semantic color**;
- el producto debe seguir siendo legible en high contrast y dark mode aunque se reduzca la expresión cromática de marca.

---

## 4. Superficies, borders y elevation

### Dirección

NEXUS favorece superficies planas y silenciosas:

- fondo de aplicación;
- surface principal;
- surface secundaria/contextual;
- borders para agrupación;
- elevation sólo cuando existe superposición real o una jerarquía espacial importante.

### Elevation sí

- menú/popover;
- dialog;
- contextual panel superpuesto cuando realmente flota;
- drag preview futuro;
- transient feedback cuando corresponda.

### Elevation no

- cada sección de Asset 360;
- cada métrica;
- cada fila de inventario;
- cada grupo de filtros.

Regla:

> Si un bloque sólo necesita separación semántica, preferir espacio, título y border antes que sombra.

---

## 5. Cards: cuándo sí y cuándo no

### Usar card para

- un objeto discreto con límites claros;
- un callout que necesita destaque;
- un resumen accionable autocontenido;
- una entidad seleccionable cuando la forma de card aporte exploración.

### No usar card para

- envolver cada heading;
- convertir una tabla en veinte tarjetas;
- presentar cada atributo de un CI;
- simular jerarquía cuando basta una sección;
- hacer que Overview parezca una cuadrícula de widgets intercambiables sin propósito.

Especialmente en Asset 360, la unidad principal es la **sección de información**, no la card.

---

## 6. Densidad

La capacidad actual `comfortable | compact` se conserva como una decisión valiosa.

### Comfortable

Adecuada para:

- Overview;
- Asset 360;
- flujos de lectura/explicación;
- tablet.

### Compact

Adecuada para:

- Asset Explorer;
- Data Quality;
- Sources;
- tablas comparativas;
- workspaces de investigación densos.

La densidad cambia espaciado y tamaño de filas, no debe ocultar información ni reducir targets por debajo de accesibilidad.

---

## 7. Tipografía y jerarquía

### Jerarquía recomendada

Mantener una escala contenida:

1. título de view;
2. heading de sección;
3. heading contextual/subsección;
4. body;
5. metadata/annotation.

Evitar demasiados tamaños o pesos compitiendo.

### Monospace

Usar selectivamente para valores técnicos donde ayuda a escanear/comparar:

- NEXUS ID;
- serial;
- asset tag;
- hostname;
- IP;
- hashes;
- locator;
- IDs de source/evidence cuando sean visibles.

No usar monospace para todo el producto ni para texto explicativo.

---

## 8. Color semántico

Estados base:

```text
neutral
info
success
warning
critical
```

### Reglas

- color nunca es el único portador de significado;
- acompañar con label, icono, forma, patrón o texto según el componente;
- `success` no significa automáticamente “IT”;
- `critical` no significa automáticamente “OT”;
- `warning` no significa “inferred”;
- confianza, autoridad, freshness, criticality y severidad son dimensiones distintas.

### IT / OT

Si se usan colores para IT y OT:

- son una dimensión categórica, no semántica de salud;
- siempre aparecen con texto `IT` / `OT` o iconografía asociada;
- deben distinguirse también en high contrast;
- no reutilizar la misma paleta de warning/critical.

---

## 9. Badges y status chips

Los badges sirven para metadata compacta, no para convertir una pantalla en “badge soup”.

### Buenos usos

- domain;
- lifecycle;
- source;
- classification state;
- authority/derivation cuando el contexto lo exige;
- coverage/status corto.

### Malos usos

- reemplazar frases enteras por cinco chips;
- dar el mismo peso visual a todos los atributos;
- usar un badge para datos que deberían estar en una tabla o definición;
- comunicar relaciones complejas sólo mediante color.

Componentes especializados futuros pueden ser preferibles a un `Badge` genérico:

```text
<TaxonomyBadge />
<SourceStatus />
<EvidenceBadge />
<ConfidenceIndicator />
<FreshnessIndicator />
<LifecycleStatus />
```

La existencia conceptual de estos componentes no obliga a implementarlos en V02-013.

---

## 10. Iconografía

- usar una familia consistente;
- iconos apoyan reconocimiento, no reemplazan labels críticos;
- no asignar iconos arbitrarios a cada dato;
- evitar iconografía “AI magic” para inteligencia normal del producto;
- relaciones, fuentes, evidencia y lifecycle deben utilizar metáforas consistentes entre pantallas.

---

## 11. Tablas

Las tablas son una superficie principal de NEXUS, no un fallback visual.

Son el patrón preferido para:

- inventario;
- discrepancias;
- sources;
- evidence lists;
- relaciones en vista accesible;
- datos comparativos.

### Requisitos

- row header claro;
- sorting explícito;
- filtros fuera de la tabla cuando sea posible;
- columnas configuradas por pregunta operacional;
- horizontal overflow controlado;
- column priority para responsive;
- navegación por teclado;
- estados loading/empty/error dentro del contexto de la tabla;
- no sacrificar legibilidad por “densidad enterprise”.

---

## 12. Data visualization grammar

La selección de visualización parte de la pregunta, no de la disponibilidad del componente.

| Pregunta / naturaleza | Visual principal | Alternativa / complemento |
| --- | --- | --- |
| Tendencia en tiempo | Line chart | tabla temporal |
| Distribución continua | Histogram | summary statistics |
| Comparar categorías | Bar chart | tabla ordenada |
| Proporción / coverage | ratio + numerador/denominador | bar 100% cuando compara cohortes |
| Cambio entre estados | delta / slope / before-after | tabla |
| Lifecycle | timeline / horizon bands | tabla por fecha |
| Relaciones | graph focalizado | tree / table |
| Riesgo con dos ejes definidos | matrix | tabla con ejes explícitos |
| Source coverage | matrix/bar/ratio | source table |
| Evidence/provenance | lineage/evidence list | table/detail panel |
| Estado actual | textual status + supporting number | no gauge salvo razón demostrada |

### Pie / donut

No son el patrón por defecto.

Sólo usar cuando:

- hay pocas categorías;
- el total importa;
- la comparación angular no impide responder la pregunta;
- una barra no comunica mejor el mismo dato.

### Gauges

Evitar gauges decorativos. Un score sin definición no se vuelve útil por tener aguja o arco.

### Chart contract

Toda visualización analítica debe poder explicar, cuando aplique:

- qué mide;
- universo/denominador;
- ventana temporal;
- fuente;
- cobertura;
- filtros activos;
- freshness.

La definición formal pertenece a V02-019.

---

## 13. Technology Map / grafos

El grafo no puede depender sólo del color.

### Nodes

Pueden usar:

- shape;
- icono;
- label;
- border;
- badge contextual;
- status overlay controlado.

### Edges

Deben distinguir:

- dirección;
- tipo;
- status;
- evidence/derivation cuando sea relevante;
- temporalidad/freshness cuando exista.

Herramientas posibles:

- arrows;
- stroke pattern;
- label corto;
- icono/context panel.

No intentar codificar cinco dimensiones simultáneas en color/grosor/opacity sin leyenda y alternativa semántica.

---

## 14. Evidence y provenance

NEXUS debe hacer visible la procedencia sin convertir cada pantalla en un log de auditoría.

### Tres niveles de detalle

**Nivel 1 — resumen**

- source coverage;
- freshness;
- conflict/review indicator.

**Nivel 2 — contextual**

- source(s);
- observedAt;
- authority;
- derivation;
- confidence cuando aplique.

**Nivel 3 — auditoría**

- claims/evidence completos;
- source IDs/references;
- timeline/history futura.

Esto permite `Evidence before inference` sin saturar el Overview.

---

## 15. Loading, empty y error states

No deben ser placeholders genéricos.

Cada estado debe explicar:

1. qué contexto estaba cargando;
2. qué alcance/source estaba involucrado cuando puede mostrarse de forma segura;
3. qué significa la ausencia;
4. qué puede hacer el usuario ahora.

### Ejemplos conceptuales

- `Sin relaciones observadas para este CI` es distinto de `No se pudo consultar relaciones`.
- `Fuente Live sin cobertura de garantía` es distinto de `Garantía vencida`.
- `No hay datos en este filtro` es distinto de `Inventario vacío`.

Los detalles internos sensibles de errores no se muestran al usuario.

---

## 16. Light y dark mode

Ambos son temas de primera clase.

No diseñar light y “invertir colores” al final.

Cada tema debe validar:

- contraste;
- borders;
- focus;
- semantic states;
- data viz;
- selected/hover;
- disabled;
- graph edges;
- source/evidence markers.

La identidad NEXUS debe sobrevivir sin depender de un fondo oscuro.

---

## 17. Motion

Motion sirve para:

- mantener orientación espacial;
- explicar entrada/salida de paneles;
- feedback de interacción;
- transición entre estados relacionados.

No sirve para:

- decorar métricas;
- hacer que cada card “flote”;
- animar números constantemente;
- presentar inteligencia como magia.

### Dirección temporal

Como baseline de diseño, transiciones pequeñas pueden apuntar a un rango aproximado de **120–200 ms**; el valor exacto debe probarse en V02-014.

### Reduced motion

`prefers-reduced-motion` debe eliminar o minimizar transformaciones/animaciones no esenciales sin perder feedback ni orientación.

---

## 18. Accessibility visual contract

Baseline: **WCAG 2.2 AA**.

Especial atención a:

- Focus Not Obscured (2.4.11);
- Dragging Movements (2.5.7);
- Target Size Minimum (2.5.8, 24×24 CSS px con excepciones normativas);
- contraste de texto y componentes;
- reflow;
- navegación consistente;
- status messages;
- labels/names consistentes.

Fuente normativa:

- https://www.w3.org/TR/WCAG22/

### Aplicación NEXUS

- focus ring visible en temas y high contrast;
- sidebars/header no ocultan elemento enfocado;
- graph pan/drag no puede ser la única forma de operar;
- icon buttons mantienen accessible name;
- controles compactos no violan target-size o spacing equivalente;
- tablas y grafos conservan lectura semántica.

---

## 19. Responsive

### Mobile / tablet prioritario

- búsqueda;
- QR;
- Asset 360 resumen;
- owner/location;
- lifecycle/status;
- evidencia resumida;
- field audit futuro;
- confirmaciones humanas.

### Desktop-first

- Explorer de muchas columnas;
- Technology Map avanzado;
- source comparison;
- analytics densos.

Responsive no significa apilar todo verticalmente. Debe cambiar prioridad, ocultar información secundaria de forma accesible y preservar acciones críticas.

---

## 20. AI / ML visual direction futura

Si v0.3 incorpora inteligencia asistida:

- contextual, no un chatbot flotante obligatorio;
- explicar evidence, pattern, hypothesis y confidence;
- citar source/provenance;
- usar lenguaje de recomendación/investigación, no certeza artificial;
- sin sparkle/glow como sustituto de semántica;
- distinguir contenido generado/inferido de evidencia observada.

Ejemplos futuros:

```text
Asset 360 -> Explicar Health
Finding -> Investigar
Technology Map -> Explicar dependencias
Audit -> Resumir excepciones
```

---

## 21. Design System — evolución esperada

El Design System actual ya posee primitives útiles. V02-014+ puede añadir patrones de dominio sólo cuando se repitan y estabilicen.

Candidatos conceptuales:

```text
SourceStatus
EvidenceBadge
ConfidenceIndicator
TaxonomyBadge
FreshnessIndicator
MetricDefinition
FindingCard
LifecycleTimeline
RelationshipView
CoverageIndicator
```

No crear componentes “por anticipación” sin consumidores reales.

---

## 22. Patrones a evitar

- dashboard = cards + donuts;
- card alrededor de cada sección;
- color como único significado;
- “critical” rojo usado también para OT;
- score sin denominador/fuente;
- graph hairball;
- tablas reemplazadas por cards en desktop;
- gradients/glow para simular modernidad;
- animaciones de contador sin valor;
- floating AI assistant sin workflow;
- skeleton infinito que oculta un error real;
- texto gris de bajo contraste como estética.

---

## 23. Handoff

### V02-014

Debe materializar shell, navegación, theme/density, motion/reduced motion y responsive foundations con estas reglas.

### V02-015

Debe usar Overview como superficie de atención y drill-down, no recrear el dashboard v0.1.

### V02-016

Debe priorizar table/search/filter/density sobre card grids.

### V02-017

Debe transformar Asset 360 desde scroll acumulativo hacia jerarquía y áreas de investigación.

### V02-018

Debe implementar grafo focalizado + contextual panel + alternativa table/tree.

### V02-019

Debe convertir la gramática visual en métricas con definiciones defendibles.

---

## 24. Referencias externas consultadas

Consultadas el 2026-09-16:

- W3C WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- Grafana Drilldown — https://grafana.com/docs/learning-hub/explore-your-data/00-intro/02-what-is-drilldown/
- Grafana visualizations — https://grafana.com/docs/grafana/latest/visualizations/
- NetBox Visual Explorer — https://netboxlabs.com/docs/visual-explorer/
- Microsoft Intune device details — https://learn.microsoft.com/en-us/intune/device-management/inventory-and-status/device-details
- ServiceNow CMDB Workspace / Unified Map — https://www.servicenow.com/docs/r/servicenow-platform/unified-map/cmdb-workspace-unified-map.html
- Atlassian Assets common data model — https://support.atlassian.com/assets/docs/what-is-the-assets-common-data-model/

Las referencias se usan para extraer patrones y restricciones, no para copiar una interfaz de terceros.
