# Technology Scan — V02-017 Asset 360 2.0

Fecha de revisión: 2026-09-21.

Objetivo: identificar patrones de **detalle de CI / dispositivo** útiles para NEXUS. No copiar interfaces ni asumir capacidades de terceros que NEXUS todavía no posee.

## ServiceNow CMDB Workspace — CI Form

Referencia oficial:

- https://www.servicenow.com/docs/r/servicenow-platform/configuration-management-database-cmdb/ci-form-cmdb-workspace.html

Patrones útiles:

- cabecera estable para identidad del CI;
- atributos y contexto organizados por intención;
- relaciones separadas del resumen de identidad;
- navegación desde el detalle hacia investigación especializada.

Decisión NEXUS:

- **Adopt:** header estable + áreas contextuales;
- **Adopt:** relaciones como sección y drill-down;
- **Hold:** edición CMDB, workflows ITSM y automatización desde Asset 360.

## Microsoft Intune — Device details

Referencia oficial:

- https://learn.microsoft.com/en-us/intune/device-management/inventory-and-status/device-details

Patrones útiles:

- Overview separado de áreas de detalle;
- progressive disclosure en vez de un scroll único con toda la información;
- identidad del dispositivo estable mientras cambia el contexto.

Decisión NEXUS:

- **Adopt:** Resumen / Inventario / Evidencia y fuentes / Relaciones;
- **Adopt:** mantener identidad y contexto de fuente visibles;
- **Hold:** acciones remotas, compliance/remediation y campos Intune no integrados.

## Atlassian Assets — References

Referencia oficial:

- https://support.atlassian.com/assets/docs/what-is-a-reference/

Patrones útiles:

- distinguir referencias entrantes/salientes;
- navegar al objeto relacionado;
- separar la existencia de una referencia de cualquier conclusión sobre impacto.

Decisión NEXUS:

- **Adopt:** dirección/perspectiva explícita desde el CI enfocado;
- **Adopt:** navegación al otro endpoint sólo cuando existe en el inventario visible;
- **Adopt:** fecha desconocida permanece desconocida;
- **Hold:** inferir impacto, dependencia causal o criticidad a partir de una relación.

## WAI-ARIA APG / WCAG 2.2

Referencias oficiales:

- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- https://www.w3.org/TR/WCAG22/

Evaluación:

Las cuatro áreas de Asset 360 son **destinos navegables y compartibles**, no sólo paneles instantáneos dentro de un widget. Por eso NEXUS conserva enlaces nativos con hash/query en vez de introducir un patrón Tabs ARIA artificial.

Decisión NEXUS:

- **Adopt:** enlaces semánticos, deep links, Atrás/Adelante y refresh;
- **Adopt:** foco programático al h1 o heading de sección tras navegación;
- **Adopt:** tabla horizontal de fuentes keyboard-scrollable;
- **Adopt:** 320 CSS px, light/dark, density, forced colors y reduced motion dentro de QA;
- **Hold:** tabs APG mientras las secciones sigan siendo rutas/contextos navegables.

## Evidence before inference

El scan refuerza límites concretos:

- `domain / assetClass / role` de compatibility projection no equivalen a clasificación resuelta;
- una fuente conocida no demuestra provenance de todos los atributos;
- `sourceReferences` conserva su propio `observedAt`;
- CMDB Health mide calidad del registro, no salud física;
- freshness de inventario no es Device Health;
- una relación no demuestra causalidad ni impacto;
- `History` no se presenta hasta existir historia temporal real.

## Resultado tecnológico

V02-017 evoluciona el stack existente:

```text
InventoryProvider
      ↓
Asset projection
      ↓
Asset 360 header estable
      ↓
Resumen | Inventario | Evidencia y fuentes | Relaciones
```

Decisiones:

- React/TypeScript actuales — **Adopt**;
- Design System NEXUS — **Adopt**;
- hash routing actual — **Evolve** con `?section=`;
- modelo Web de presentación — **Evolve** de forma aditiva;
- nueva librería de tabs/router — **Hold**;
- nuevo backend de Asset 360 — **Hold**;
- History artificial — **Reject**;
- Live → Demo fallback — **Reject**;
- nuevos KPIs/scores — **Hold** para V02-019.
