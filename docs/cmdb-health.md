# CMDB Health

Baseline histórico: CMDB-011 integrado mediante PR #29. Evolución **V02-020 — CMDB Quality 2.0** integrada mediante PR #103 / issue #102.

## V02-020 — CMDB Quality 2.0

V02-020 incorpora evidencia canónica sin redefinir silenciosamente el score histórico.

### Señales canónicas

La superficie agrega tres métricas contractuales separadas del score ponderado:

1. **Identidad de instancia de fuentes** — reutiliza `nexus.sources.instance_identity.ratio`. Como `SourceReference` es obligatoria en un asset canónico válido, medir sólo su presencia sería tautológico; se mide si todas las referencias declaran `sourceInstanceId`.
2. **Provenance de campos canónicos gobernados** — `nexus.quality.provenance.core_fields.ratio`. Evalúa seis field paths obligatorios: `displayName`, `domain`, `assetClass`, `role`, `lifecycle` y `criticality`.
3. **Conflictos Taxonomy v2** — `nexus.quality.taxonomy.conflict.ratio`. Sólo un estado `conflict` explícito cuenta como conflicto. Un assessment ausente reduce measurement coverage y nunca se interpreta como ausencia de conflicto.

Estas métricas conservan la distinción de V02-019:

`value ≠ measurement coverage`

Por ejemplo, provenance ausente para un field path reduce el value porque esa ausencia es observable en el asset canónico; no convierte automáticamente la medición en unavailable.

### Score histórico

Las cinco dimensiones y sus pesos de CMDB-011 permanecen sin cambios en V02-020:

- completitud 25 %;
- frescura 25 %;
- identidad 25 %;
- relaciones 15 %;
- consistencia 10 %.

Source/provenance coverage no recibe un peso nuevo dentro del score. Hacerlo exigiría inventar una política corporativa de ponderación que no existe. En cambio, los gaps aparecen como findings explicables y como métricas con numerator, denominator y coverage propios.

Taxonomy `conflict`, provenance incompleto y source instance ausente generan señales de revisión por CI, pero no alteran por sí mismos el score histórico.

### Conflictos de reconciliación

`AttributeConflict` existe en el resultado interno de reconciliation, pero schema 0.2 no lo transporta dentro de `TechnologySnapshot`.

Por tanto:

- la UI muestra esa capacidad como **no disponible**;
- no reconstruye conflictos comparando valores;
- no infiere conflictos desde hostname, serial, vendor u otras señales;
- un futuro contrato explícito deberá transportar esa evidencia antes de incorporarla.

### Demo / Live

Demo y Live comparten el mismo contrato:

- `InventorySnapshot.canonical` conserva el `TechnologySnapshot` usado para las métricas;
- Demo declara una identidad lógica estable `sourceInstanceId=demo-v0.2`;
- Live utiliza exclusivamente el snapshot validado recibido desde NEXUS API;
- no existe fallback Live → Demo.

La calidad CMDB sigue separada de Device Operational Health. CPU, RAM, batería, SMART, disponibilidad, uptime y telemetría endpoint permanecen fuera de V02-020.

## Qué responde

«¿Qué tan completa, vigente y coherente es la información del CI, y qué deberíamos revisar?»

**CMDB Data Health no es Device Operational Health.** No se conocen CPU, RAM usada, temperatura, batería, SMART, sensores, disponibilidad, uptime ni estado real de servicios. La criticidad, un lifecycle retirado o una garantía vencida no son errores de calidad.

## Auditoría y base

Baseline confirmado en GitHub: `89ca34325c48eb53ed37c41f5322c01370b9f20e`, PR #27 mergeado, issue #26 completed, CI PR #110 y post-merge #111 success. Antes del merge de CMDB-011: 10/13 (76,9%). Después: 11/13 (84,6%).

Se revisaron README, roadmap, demo-readiness, arquitectura/ADRs 0001–0008, modelos/proveedores de inventario, Dashboard/Explorer/Asset 360/QR/Relaciones, diseño, Storybook y CI. La frescura existente usa siete días; Asset 360 contenía comprobaciones booleanas de responsable, ubicación, serial y hostname. Se sustituye ese bloque por el motor común, evitando exigir hostname a monitores o responsable a bajas. El Dashboard conserva sus métricas históricas (con alcance de activos vigentes), claramente distintas del nuevo índice.

## Arquitectura

- `health-model.ts`: contratos, estados, pesos y thresholds.
- `health-engine.ts`: evaluación pura de `InventorySnapshot` + `RelationshipSnapshot | null`, agregación, filtros y orden. No accede al reloj, React, GLPI, Graph ni red.
- `health-presentation.ts`: catálogo de mensajes/acciones, labels y presentación; no decide reglas.
- `RelationshipInventoryProvider(AbortSignal)`: contrato explícito del snapshot completo. El provider del grafo sigue entregando vecindarios por CI sin cambios de API.
- `demoRelationshipInventoryProvider`: comparte las relaciones del catálogo CMDB-012, sin n peticiones por activo ni inventario paralelo.
- `useHealthReport`: carga cancelable de los dos snapshots y cálculo; ignora resoluciones/rechazos obsoletos y cancela la otra carga al fallar. Mensajes seguros con retry.
- `CmdbHealth`: vista global; `HealthDetails`/`AssetHealthSection`: evaluación individual sobre el inventario ya cargado por Asset 360. El fallo de Health no oculta el resto de la ficha ni roba su foco.

La evaluación es O(n+r), con un índice de endpoints y conteos de identificadores. El orden visual agrega O(n log n). No se añade dependencia. Fuentes futuras entregarán datos normalizados mediante NEXUS API/adaptadores; provenance y reconciliación multifuente quedan para etapas posteriores.

## Dimensiones y pesos base

| Dimensión | Peso | Comprobaciones |
| --- | ---: | --- |
| Completitud | 25% | Fabricante, modelo y ubicación; responsable sólo si lifecycle es `assigned`. |
| Frescura | 25% | Última observación de registro, comparada con corte explícito. |
| Identidad | 25% | ID NEXUS, nombre, serial, asset tag; hostname sólo en Computer/NetworkEquipment. Unicidad de ID y asset tag. |
| Integridad de relaciones | 15% | Estructura/ID único, referencias unívocas y fecha de observación por relación. |
| Consistencia | 10% | Lifecycle reconocido y calendario válido de fecha de garantía. |

Los pesos suman 100. Contexto, identidad y vigencia son pilares con el mismo peso; relaciones tiene menor cobertura de aplicación; consistencia sólo dispone de dos comprobaciones demostrables. Son **heurísticas de la demo, no políticas corporativas aprobadas**. La configuración por tipo es pequeña y explícita. Phone/Printer no requieren hostname porque no se conoce que todos sus subtipos lo posean. No se evalúan IP, campos externos inexistentes ni topologías esperadas.

IDs NEXUS/endpoints son exactos, como el grafo; no se hace reconciliación implícita. La unicidad de asset tag es una heurística demo que ignora mayúsculas y espacios exteriores. No se exige unicidad global de serial/hostname, al no existir una regla de negocio aprobada para ello. Un ID NEXUS duplicado hace ambigua una referencia y no produce links individuales desde la lista Health.

## Estados de comprobaciones

| Estado | Score | Evidencia/cobertura | Interpretación |
| --- | --- | --- | --- |
| `pass` | 100 | Sí | Dato presente que supera la regla disponible. No implica veracidad contra una fuente real. |
| `missing` | 0 | No | Atributo obligatorio/aplicable sin valor, incluyendo cadena vacía o sólo espacios. |
| `invalid` | 0 | Sí | Hay evidencia de un error verificable (duplicado, calendario, referencia, estructura). |
| `warning` | 50 o 0 | Sí | Observación antigua según umbral. |
| `unknown` | Excluido | No | No se puede evaluar; reduce cobertura, no es un cero artificial. |
| `not_applicable` | Excluido | Excluido | Regla ajena al tipo/lifecycle o CI sin relaciones en un snapshot completo. |

Garantía sin fecha: unknown. Una fecha de garantía válida, pasada o futura: pass. No hay fecha de compra ni contrato para deducir más incoherencias. Última observación ausente: unknown; timestamp suministrado inválido o posterior al corte: invalid. Se aceptan fechas ISO de calendario y timestamps ISO con zona explícita, rechazando fechas imposibles que JavaScript normalizaría (por ejemplo 30 de febrero).

`freshnessOf` sigue siendo la definición compartida de reciente: edad entre 0 y 7 días inclusive. Health subdivide el estado antiguo: >7 y ≤30 días vale 50; >30 vale 0. No se redefine reciente ni se utiliza `Date.now()`.

Los cortes de los dos snapshots deben ser válidos y representar el mismo instante; de lo contrario se rechaza la evaluación y se ofrece retry seguro. `null` en el motor significa relaciones no disponibles (unknown); `[]` significa snapshot completo sin relaciones (no aplicable), nunca una carga fallida disfrazada de inventario vacío. La UI exige carga completa de ambos providers; un fallo no genera un score parcial engañoso.

## Fórmula y cobertura

Para cada dimensión d:

- A_d: número de comprobaciones aplicables (excluye no aplicable).
- E_d: número de comprobaciones con valor numérico (incluye missing=0; excluye unknown).
- V_d: suma de valores de comprobaciones evaluables (0, 50 o 100).
- K_d: comprobaciones con evidencia disponible, válida o inválida (excluye missing/unknown).
- w_d: peso base.

El breakdown de dimensión es `V_d / E_d` y su cobertura `100 × K_d / A_d`. Sin E_d, score desconocido; sin A_d, no aplicable.

Por CI:

```text
puntos = Σ(w_d × V_d / (100 × A_d))
peso_evaluado = Σ(w_d × E_d / A_d)
peso_evidencia = Σ(w_d × K_d / A_d)
peso_aplicable = Σ(w_d para dimensiones con A_d > 0)
score = 100 × puntos / peso_evaluado
cobertura = 100 × peso_evidencia / peso_aplicable
```

Cada suma excluye dimensiones con A_d=0. Sin peso evaluado, el score es null, no cero. La cobertura vacía se muestra en 0%. Una dimensión parcialmente conocida sólo aporta su fracción evaluable del peso: una única comprobación correcta no reemplaza a todas las desconocidas.

El global suma puntos y pesos **sin redondear** de todos los CI y divide después. No promedia medias redondeadas ni transforma unknown en cero. Las dimensiones globales agregan las fracciones por CI del mismo modo. Cobertura significa presencia de evidencia ponderada, **no probabilidad de confianza** ni exactitud estadística. Evidencia inválida cuenta para cobertura, aunque valga 0 en calidad.

Ejemplo verificable sin relaciones: CI A perfecto aporta 85/85 puntos/peso. CI B con observación y garantía desconocidas y serial ausente aporta 50/55. El score global es `100×135/140 = 96,428…`, cobertura `100×135/170 = 79,411…`. La pantalla muestra 96/100 y 79%. Este ejemplo demuestra por qué no se usa promedio simple de los dos scores.

## Bandas y redondeo

- Sin valor numérico: **Sin evaluación**.
- Cobertura <60%: **Cobertura insuficiente**, aunque el score disponible sea alto.
- Cobertura ≥60% y score ≥90: **Confiable**.
- Cobertura ≥60% y score ≥70 y <90: **Atención**.
- Cobertura ≥60% y score <70: **Degradado**.

La banda usa los valores sin redondear. La presentación trunca a entero inferior para no mostrar un umbral todavía no alcanzado. No hay animación ni número mágico: siempre existe estado textual, cobertura y desglose.

## Findings y acciones

Cada finding lleva código tipado, dimensión, severidad y opcionalmente campo/ID de relación. El catálogo separado explica qué revisar.

- **Información**: observación desconocida, garantía desconocida, relaciones no evaluadas, estado de relación por aclarar.
- **Revisar**: atributo requerido faltante, observación inválida/futura, datos antiguos/muy antiguos, observación de relación ausente/inválida/antigua, garantía inválida o lifecycle no reconocido. Las observaciones ausentes se presentan con severidad informativa.
- **Error de integridad**: ID/asset tag duplicado, relación inválida/duplicada y referencia ausente/ambigua.

El estado `degraded`/`unknown` de CMDB-010 no tiene semántica suficiente para asumir mala calidad ni falla física. Produce una nota informativa **sin afectar score ni cobertura**. No se introducen reglas de disponibilidad.

Una relación con ambos extremos ausentes sigue visible en «Señales del registro de relaciones», incluso con inventario vacío. No puede atribuirse al score de un CI inexistente. El indicador global se titula **Score de registros CI**, y el conteo de relaciones huérfanas se comunica por separado: no confundir este escalar con ausencia de problemas en todo el registro de relaciones.

## Experiencia y navegación

- Ruta nativa `#health`, título de documento, sidebar con `aria-current`, drawer móvil y acceso desde Dashboard.
- Vista global: score/cobertura, cantidad evaluada, distribución, dimensiones, principales causas y lista priorizada paginada de 20 CI.
- La distribución y las causas actúan como filtros accesibles con foco en resultados. Los filtros estado/dimensión/tipo/causa se combinan por AND, sólo afectan la lista, y se reinician al salir (convención Explorer). El resumen conserva alcance global y lo dice explícitamente.
- Orden: score ascendente, luego severidad y ID; null primero. Sin resultados hay recuperación. Sin problemas no se inventan findings.
- Los conteos de causas cuentan cada CI una vez por código aunque tenga varios campos o relaciones con esa causa.
- Asset 360: resumen individual, dimensiones, causas/acciones y disclosure de comprobaciones. Link de regreso a Health global. La calidad básica anterior deja de tener una segunda lógica.
- No se implementa edición ni remediación automática. Jira sigue fuera de este producto.

## Datos y límites

En el desarrollo original de CMDB-011 se conservaron 240 activos y seis relaciones. CMDB-012 consolida ahora 240 activos y 18 relaciones; cifras y causas actuales en [Dataset de Demo](demo-dataset.md). El motor y sus reglas no cambian; los casos estructuralmente inválidos siguen en tests. CMDB-013 permanece pendiente.

No hay integraciones reales, escaneo, autenticación productiva, secretos, infraestructura corporativa, reconciliación multifuente ni nuevas políticas corporativas. La evaluación comprueba propiedades del snapshot normalizado, no que un serial presente corresponda físicamente al equipo.

## QA

Comandos: `npm run typecheck`, `npm run build`, `npm test`, `npm run storybook:build --workspace @igx-nexus/ui`, `git diff --check`, paridad de tokens generados y `npm pack --dry-run --workspace @igx-nexus/ui`.

La suite de modelo cubre score perfecto, faltantes por dimensión, unknown/no aplicable, cortes, calendario, unicidad, referencias/relaciones, estado informativo, determinismo, fórmula global, conteos, orden y filtros. Browser cubre ruta/navegación/historial, Asset Health, filtros/paginación, loading/error/retry/vacío/sin problemas/degradación, cancelación, teclado/foco y axe en cuatro anchos, ambos temas y densidades.

`node scripts/qa-cmdb-health.mjs` prueba el build de producción: 1440/768/390/320, ambos temas, drawer móvil, forced-colors, reduced-motion, foco y reflow con texto al 200%. CI conserva screenshots y un registro JSON temporal en el artefacto `cmdb-health-qa` (7 días). No se versionan capturas ni datos reales.

Axe y Chromium emulado no equivalen a certificación WCAG ni sustituyen prueba manual con NVDA/JAWS y Windows High Contrast real. Se conserva este límite explícito.
