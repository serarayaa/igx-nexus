# IGX NEXUS — Screen Purpose Matrix

Estado: **Propuesta de V02-013 / issue #75**.

Esta matriz evita que una capacidad termine en una pantalla simplemente porque existe un dato disponible.

Regla:

> **Una superficie entra al producto cuando puede expresar con claridad qué pregunta responde, qué evidencia necesita y hacia dónde permite profundizar.**

---

## 1. Matriz objetivo

| Superficie | Pregunta primaria | Usuarios funcionales principales | Contenido primario | Acciones principales | Drill-downs | Evidencia / datos mínimos | Owner roadmap | No es para |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Overview** | ¿Qué requiere atención ahora y por qué? | Management, IT, Infra, Asset Mgmt, OT | atención priorizada, estado resumido, cobertura/freshness, lifecycle próximo, source status | abrir investigación, cambiar alcance | Assets, Data Quality, Health, Lifecycle, Map | métricas defendibles + coverage + freshness | V02-015 + V02-019 | mostrar todos los datos disponibles |
| **Assets / Explorer** | ¿Qué tecnología existe en este alcance y cómo encuentro el CI correcto? | IT, Infra, OT, Asset Mgmt, Auditoría | inventario data-dense, identidad, taxonomy, lifecycle, site, source/freshness útiles | buscar, filtrar, ordenar, abrir CI | Asset 360, Map focalizado | snapshot canónico + campos normalizados | V02-016 | card grid de miles de activos |
| **Asset 360** | ¿Qué es este CI, qué sabemos de él, de dónde lo sabemos y qué requiere atención? | Todos los perfiles operacionales | identidad, estado, inventory, evidence/sources, relations, quality, health/lifecycle summaries | investigar, abrir relación, revisar evidence, QR/label | Map, Data Quality, Sources, Health, Lifecycle | TechnologyAsset + provenance + contexts + relations | V02-017 | scroll infinito de cards sin jerarquía |
| **Technology Map** | ¿Cómo se relaciona este foco con otros CIs y qué evidencia sostiene esas conexiones? | Infra, OT, IT, Auditoría | focus node, edges, scope, depth, evidence, temporalidad | cambiar foco/scope, filtrar, seleccionar edge/node | Asset 360, evidence, table/tree | TechnologyRelationship + endpoints + evidence | V02-018 | grafo global de toda la organización |
| **Data Quality** | ¿Puedo confiar en la información usada para decidir? | Auditoría, Asset Mgmt, IT, Management | completeness, freshness, source coverage, conflicts, unresolved taxonomy, ambiguous identity | filtrar gaps, abrir CI, revisar source/evidence | Asset 360, Sources | provenance + reconciliation + source coverage | V02-020 | Device Health |
| **Intelligence / Health** | ¿Qué señales técnicas indican degradación que merece investigación? | IT, Infra | health signals, cohorts, evidence técnica, trends cuando existan | investigar señal, abrir CI/cohort | Asset 360, future Finding | telemetry/endpoint evidence real | V02-025 | calidad de registro CMDB |
| **Intelligence / Lifecycle** | ¿Qué tecnología se acerca a una transición de garantía/EOL/EOS/reemplazo? | Asset Mgmt, Management, IT | warranty, age, EOL/EOS, horizons, coverage | filtrar horizonte, abrir CI, export futuro | Asset 360 | lifecycle sources con fechas y cobertura | V02-021 | presupuesto inventado o riesgo técnico automático |
| **Intelligence / Findings** | ¿Qué patrón/anomalía merece investigación y con qué confianza? | IT, Infra, OT | evidence → pattern → hypothesis → confidence | investigar, aceptar/revisar futuro, abrir contexto | Asset 360, Map, Sources | Findings Engine + provenance | V02-026 / v0.3 | afirmar causalidad automática |
| **Sources** | ¿Qué fuentes alimentan NEXUS, qué cobertura tienen y qué tan recientes/disponibles son? | IT, Infra, Auditoría | source status, freshness, coverage, scope autorizado, sanitized errors | filtrar source, abrir coverage gap | Assets, Data Quality | SourceReference + provider/readiness metadata | v0.2 cuando haya contenido útil | mostrar secretos/config sensible |
| **QR / Physical Identity** | ¿Qué CI corresponde a esta identidad física y qué puedo hacer con ella? | Soporte IT, Asset Mgmt, auditoría física | locator, identidad resumida, etiqueta, resolución autorizada | resolver, abrir Asset 360, generar etiqueta autorizada | Asset 360 | locator ↔ CI mapping | contextual, basado en v0.1 | módulo global de navegación |
| **Administration** | ¿Cómo se gobierna/configura la plataforma? | Administradores autorizados | configuración futura, RBAC, integrations admin | gestionar configuración autorizada | Sources/audit futuro | auth/RBAC/config corporativa real | v0.5+ | navegación primaria v0.2 |

---

## 2. Mapeo desde v0.1/v0.2 actual

| Superficie actual | Estado | Destino conceptual |
| --- | --- | --- |
| `Panel principal` / Dashboard | conservar capacidad, rediseñar propósito | **Overview** |
| `Activos` | conservar y profundizar | **Assets / Explorer** |
| Asset detail | conservar, reorganizar | **Asset 360** |
| `#assets/:id/relations` | dejar de tratar como simple subpágina a largo plazo | **Technology Map** enfocado en CI |
| `CMDB Health` actual | su semántica es principalmente calidad de registro | **Data Quality** |
| Health técnico futuro | aún no es la misma cosa | **Intelligence / Health** |
| Garantías/lifecycle dentro de Dashboard | sacar del papel de anchor global | **Lifecycle** + resumen en Overview/Asset 360 |
| `Label Designer` | mantener como acción especializada | **Asset 360 → Physical Identity** |
| QR resolver | mantener como deep link/field workflow | **Physical Identity → Asset 360** |
| `En este panel` del sidebar | retirar de navegación global | navegación interna/local de la view si sigue siendo necesaria |
| `Recorrido de la demo` | útil para demo, no IA de producto | demo/help/documentación, no módulo global |

---

## 3. Preguntas que cada superficie NO debe absorber

### Overview

No debe responder:

- todos los atributos del CI;
- todos los tipos de relación;
- todos los datos de una fuente;
- consultas ad-hoc complejas;
- configuración de administración.

### Asset Explorer

No debe convertirse en:

- Dashboard alternativo;
- Asset 360 expandido dentro de cada fila;
- Technology Map tabular completo;
- report builder.

### Asset 360

No debe duplicar completamente:

- Data Quality workspace;
- Technology Map;
- Sources;
- analytics de cohortes.

Debe resumir y enlazar al contexto profundo.

### Technology Map

No debe ser:

- mapa geográfico salvo que la pregunta sea geográfica;
- herramienta de discovery activo;
- editor de topología por defecto;
- fuente autoritativa independiente.

### Data Quality

No debe concluir:

- que un equipo falla por tener campos incompletos;
- que un CI es sano porque su registro está completo;
- que una fuente es correcta sólo porque es reciente.

### Device Health

No debe concluir:

- que un registro es confiable por ausencia de eventos técnicos;
- que correlación implica causa;
- que una señal aislada demuestra falla.

---

## 4. Jerarquía de acciones

### Globales

Acciones que cambian workspace/contexto principal:

- ir a Overview;
- abrir Assets;
- abrir Technology Map;
- abrir Data Quality;
- abrir Intelligence;
- abrir Sources.

### Contextuales de CI

- abrir Asset 360;
- abrir Map con foco en CI;
- revisar evidence/sources;
- abrir QR/etiqueta;
- filtrar Health/Lifecycle/Data Quality por CI cuando exista soporte.

### Contextuales de investigación

- cambiar scope;
- aplicar filtros;
- cambiar profundidad;
- seleccionar node/edge;
- comparar sources;
- abrir evidencia.

### Preferencias de interfaz

- theme;
- density;
- reduced motion vía sistema/setting futuro;
- preferencias visuales futuras.

Estas preferencias no deben competir visualmente con acciones operacionales.

---

## 5. Estados de disponibilidad

La IA no cambia por provider, pero una superficie puede estar en uno de estos estados:

```text
available
partial_coverage
no_evidence
temporarily_unavailable
not_implemented
not_authorized [futuro]
```

### Regla de producto

- `no_evidence` no equivale a error;
- `temporarily_unavailable` no equivale a cero resultados;
- `partial_coverage` debe decir cuál es el denominador cuando sea relevante;
- `not_implemented` no debe llenar la navegación con placeholders;
- `not_authorized` se implementará sólo cuando exista RBAC real.

---

## 6. Demo vs Live — matriz de coherencia

| Concepto | Demo | Live | Regla |
| --- | --- | --- | --- |
| IA global | misma | misma | provider no redefine el producto |
| Identidad NEXUS | synthetic canonical | canonical from provider/reconciliation | misma semántica |
| Evidence | sintética explícita | fuente real cuando existe | nunca mezclar |
| Relationships | 18 canónicas | hoy sin evidence relacional | ausencia visible, no synthetic fallback |
| QR | locator Demo | futuro gobernado | locator no es credencial |
| Data Quality | fixture explicable | debe basarse en coverage real | semántica común |
| Health técnico | fixture v0.1 limitado | futuro telemetry | no confundir con Data Quality |
| Lifecycle | fechas sintéticas | fuentes reales cuando existan | coverage visible |

---

## 7. Flujo de investigación recomendado

### Desde Overview

```text
“Hay CIs con información incompleta”
            ↓
Data Quality filtrado
            ↓
Asset 360
            ↓
Evidence & Sources
```

### Desde un activo

```text
Asset 360
   ↓
Relationships summary
   ↓
Technology Map focused
   ↓
edge selected
   ↓
evidence / temporalidad
```

### Desde Health futuro

```text
cohort / signal
   ↓
CI(s)
   ↓
Asset 360
   ↓
telemetry evidence / finding
```

La navegación debe preservar contexto suficiente para volver a la investigación anterior.

---

## 8. Mobile / field purpose matrix

| Superficie | Mobile priority | Estrategia |
| --- | --- | --- |
| Overview | media | atención resumida + drill-down |
| Asset search | alta | búsqueda rápida / scan |
| Asset 360 | alta | resumen + secciones prioritarias |
| QR | muy alta | field workflow directo |
| Data Quality | media | lista priorizada / filtros simples |
| Health | media | findings/signals priorizados |
| Technology Map | baja-media | resumen/tree/table; graph avanzado desktop-first |
| Sources | baja-media | status/coverage resumido |
| Administration | baja | desktop-first |

---

## 9. Handoff a implementación

### V02-014

Debe convertir esta matriz en navegación, routes, shell slots y responsive behavior.

### V02-015

Debe eliminar del Overview contenido cuyo propósito real pertenezca a otra superficie y reemplazar el “recorrido demo” por drill-downs operacionales.

### V02-016

Debe seleccionar columnas/filtros a partir de la pregunta del Explorer, no de todos los campos del modelo.

### V02-017

Debe implementar Asset 360 con jerarquía y navegación contextual, no sólo reestilizar las secciones existentes.

### V02-018

Debe diseñar el Map como investigación focalizada y accesible.

### V02-019

Debe formalizar qué métricas pueden aparecer como números/ratios oficiales en Overview/Data Quality/Lifecycle.

---

## 10. Criterio para agregar una nueva pantalla

Antes de crear otra ruta global deben poder responderse estas preguntas:

1. ¿qué pregunta operacional única responde?;
2. ¿qué usuario funcional necesita esa respuesta?;
3. ¿por qué no cabe como sección/contexto de una superficie existente?;
4. ¿qué fuente/evidencia necesita?;
5. ¿qué acciones permite?;
6. ¿hacia dónde hace drill-down?;
7. ¿cómo funciona con teclado/screen reader?;
8. ¿cómo cambia con partial coverage/no evidence?;
9. ¿es una capacidad de v0.2 o pertenece a otra versión?

Si estas preguntas no tienen respuesta, todavía no necesita una pantalla propia.
