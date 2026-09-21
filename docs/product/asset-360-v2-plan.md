# V02-017 — Asset 360 2.0

Estado: **en implementación**; issue canónico: [#89](https://github.com/serarayaa/igx-nexus/issues/89).

## Objetivo
Responder: **¿Qué es este CI, qué sabemos de él, de dónde lo sabemos y qué requiere atención?**

Evolucionar Asset 360 conforme a ADR-0023 y Product IA v2, preservando React, Design System, providers y hash routing existentes. Evidence before inference; Evolution over reinvention.

## Baseline verificado — 2026-09-21
- PR funcional #87 y housekeeping #88 mergeados manualmente.
- main: `229e1f57cf6a15c1d369af23a2bdc0db797b072f`.
- [CI post-housekeeping #610](https://github.com/serarayaa/igx-nexus/actions/runs/35624258155): completed / success, evento push sobre ese SHA.
- #85 cerrado como completed tras verificar CI.
- Rama dedicada: `feature/v02-017-asset-360-2`.

## Auditoría de código y documentación
Revisados Asset360.tsx, asset-model.ts, live-provider.ts, Asset360.browser.test.tsx, HealthDetails.tsx, relationship-model.ts; Product IA v2, Screen Purpose Matrix, roadmap y ADR-0020/0023.

Fortalezas: identidad estable, breadcrumb, foco al h1, cancelación y descarte de respuestas obsoletas, error/retry, campos ausentes explícitos, separación Live de QR/relaciones sintéticas, pruebas axe/light/dark/densidad/reflow.

Brechas verificadas:
1. Asset360 acumula identidad, asignación, hardware, lifecycle, garantía, calidad, QR, fuentes y relaciones en una grilla vertical sin navegación contextual.
2. Asset ya transporta class/role, taxonomyState/review/fallback y operationalContexts; el detalle no los presenta.
3. El badge de dominio usa el scalar directamente incluso cuando puede ser compatibility fallback.
4. Demo aún presenta criticidad binaria aunque existe criticidad canónica; no confundir ausencia con criticidad media confirmada.
5. Loading/empty mencionan demostración incluso para proveedores Live.
6. Texto Live anuncia V02-009/012 como futuros aunque ya están integrados; Demo sigue hablando de relaciones v0.1.
7. Evidencia se reduce a fuente y fechas. Live conserva nombres de fuentes y sólo la fecha de la primera referencia; eso no representa freshness de todas las fuentes ni provenance por atributo.
8. AssetHealthSection presenta calidad CMDB, no Device Health.
9. Relationship Web projection conserva tipo/dirección/status/observedAt, pero no toda la evidencia canónica. No fingir authority/confidence ausentes.

Auditoría estática: no equivale a nueva validación visual o ejecución local. CI #610 valida el baseline.

## Alcance y decisiones
### Jerarquía
Header con nombre/ID NEXUS, modo, clasificación defendible, lifecycle, criticidad, owner/site y freshness con semántica clara. Navegación contextual: **Resumen / Inventario / Evidencia y fuentes / Relaciones**. Mantener header fuera del panel seleccionado.
- Resumen: atención explicable sobre datos existentes; calidad del registro, lifecycle/garantía y disponibilidad de señal técnica separados.
- Inventario: identificadores, hardware, taxonomy y contextos operacionales disponibles.
- Evidencia y fuentes: referencias y fechas por fuente; claims/provenance/conflictos sólo cuando llegan por contrato validado.
- Relaciones: lista semántica de relaciones incidentes al CI, dirección/estado/fecha/evidencia disponible, navegación al otro CI y mapa existente.
- History reservado hasta tener historia real. No fabricar timeline desde updatedAt.
- QR/Label como acción contextual Demo; no introducir capacidad Live ficticia.

### Taxonomía
Reutilizar labels y reglas existentes. Mostrar classified/unknown/unclassified/conflict, revisión y compatibility fallback. Scalar preservado por compatibilidad no equivale a clasificación confirmada. No deducir IT/OT desde hostname, fabricante o forma del hardware.

### Datos y providers
Misma arquitectura Demo/Live, sin fallback sintético. Extensiones de proyección aditivas, desde contratos existentes, validadas con datos parciales.
Antes de exponer provenance completa, trazar contrato canónico → payload API → parser → proyección → UI; si un dato no se transporta, documentar cobertura limitada. No crear backend/reconciliación alternativos.
Distinguir corte del snapshot, lectura de fuente, observación del activo y observación de relación; null permanece desconocido.
Preservar dataset único, IDs/QR y legacy compatibility digest.

### Navegación/accesibilidad
Conservar #assets/:id y destinos actuales. Hacer compartible la sección si aporta valor mediante extensión compatible del hash, sin router nuevo. Atrás/Adelante y refresh deben restaurar contexto; sección inválida cae a Resumen.
Preferir enlaces semánticos si son subrutas. Si se usan tabs, implementar patrón APG completo (roles, selección, panel asociado, flechas/Home/End, activación explícita si hay latencia).
WCAG 2.2 AA: teclado, foco visible/no oculto, nombres accesibles, headings, contraste, target size, 320 CSS px y zoom/reflow. Mantener light/dark, comfortable/compact, High Contrast y reduced motion.
No afirmar conformidad sólo por axe.

### Estados
Loading, error/retry, inventario vacío, CI ausente, sin evidencia, cobertura parcial e indisponibilidad deben ser diferentes. Fallo de relaciones/evidencia no elimina identidad disponible. Cancelar cargas al cambiar CI/provider/sección; no mostrar datos del CI anterior.

## Investigación oficial — decisiones NEXUS
- [ServiceNow CI Form](https://www.servicenow.com/docs/r/servicenow-platform/configuration-management-database-cmdb/ci-form-cmdb-workspace.html): resumen y secciones de atributos, relaciones y fuentes. Adoptar jerarquía; excluir edición/ITSM y automatización.
- [Microsoft Intune device details](https://learn.microsoft.com/en-us/intune/device-management/inventory-and-status/device-details): Overview y áreas de detalle separadas. Adoptar divulgación progresiva; no copiar acciones remotas ni asumir cobertura Intune.
- [Atlassian Assets references](https://support.atlassian.com/assets/docs/what-is-a-reference/): referencias entrantes/salientes. Adoptar dirección explícita y navegación; referencias no demuestran automáticamente impacto o causalidad.
- [WAI-ARIA APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) y [WCAG 2.2](https://www.w3.org/TR/WCAG22/): interacción y requisitos accesibles. APG orienta implementación, no certifica conformidad.
Consulta: 2026-09-21. Patrones de producto, no copia visual.

## Secuencia de implementación
1. Modelo de presentación y cobertura, reutilizando proyecciones/labels.
2. Header y navegación contextual accesible; preservar rutas.
3. Inventario/taxonomy y resumen explicable.
4. Fuentes/evidencia y relaciones incidentes desde contratos existentes.
5. Estados, copy y regresiones Demo/Live.
6. QA browser/visual, CI y PR para merge manual.

## Aceptación y pruebas pendientes
- [ ] Header no presenta fallback como clasificación confirmada; criticidad canónica coherente.
- [ ] Cuatro áreas navegables, sin scroll acumulativo de todas las cards.
- [ ] Fuentes múltiples conservan sus propias fechas; ausencia/conflicto/incertidumbre explícitos.
- [ ] Calidad CMDB, Health técnico y lifecycle no comparten score ni conclusión.
- [ ] Relaciones incidentes: dirección, endpoints ausentes, fecha null y error/cero evidencia diferenciados.
- [ ] Demo/Live misma IA, sin datos ni QR/Health sintéticos en Live.
- [ ] Deep links, refresh, Atrás/Adelante, teclado/foco y cambios rápidos de CI/provider cubiertos.
- [ ] Loading/error/retry/empty/not-found/partial coverage cubiertos.
- [ ] Tests unitarios de proyecciones y browser de flujos; axe por tema/densidad, 320 px, zoom, forced colors, reduced motion y revisión visual.
- [ ] Legacy digest, contratos, API y pruebas requeridas por CI sin regresiones.
- [ ] Documentación de implementación y technology scan actualizados según evidencia.
- [ ] CI del PR verde; merge manual de Sergio; luego CI post-merge y housekeeping.

## Fuera de alcance
V02-018 Technology Map 2.0 (no nuevo grafo/layout/impact engine), V02-019 Analytics Contract Layer (no nuevos KPIs/scores/cohortes), edición CMDB, nuevas integraciones, Intune real, telemetry, AI/ML, history inventada, revisión manual persistida, scanning OT y remediación.

No auto-merge. GLPI sigue como SoR y Jira como Service Desk. No versionar secretos, PII ni inventario corporativo real.
