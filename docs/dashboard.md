# CMDB-006 — Panel principal

## Alcance implementado

Resumen de activos, calidad básica, frescura, criticidad, distribución por tipo,
ubicación y ciclo de vida, garantías y filtro IT/OT. Incluye Light/Dark,
Comfortable/Compact, navegación móvil y estados loading/empty/error recuperables.

`Card`, `AppShell`, `AppHeader`, `AppSidebar`, `PageHeader`, `Toolbar`,
`ContentSection`, `Button`, `IconButton`, `Badge`, `StatusBadge`, `DataTable` y
feedback states proceden de `@igx-nexus/ui`. Se conserva el logo versionado.

## Definiciones de métricas

Todos los valores usan el filtro de dominio actual y el corte `2026-09-09T12:00:00Z`.
La fecha se muestra en UTC para conservar reproducibilidad entre equipos.

| Métrica | Numerador | Base / regla |
| --- | --- | --- |
| Registrados | Todos los activos del alcance | Incluye bajas |
| Vigentes | Activos cuyo lifecycle no es `retired` | Incluye asignados, stock y reparación |
| Información básica completa | Vigentes con responsable y ubicación no vacíos | Total de vigentes; no afirma completitud de otros campos |
| Información reciente | Vigentes con observación entre corte−7 días y corte | Ambos límites incluidos; fechas futuras, inválidas o ausentes no son recientes |
| Críticos sin información reciente | Vigentes críticos que no cumplen frescura | Total de vigentes críticos |
| Garantías por vencer | Vigentes con vencimiento entre corte y corte+90 días | Ambos límites incluidos |
| Garantías vencidas | Vigentes con vencimiento anterior al corte | Excluye fechas inválidas o ausentes |
| Sin fecha válida | Vigentes sin fecha de garantía interpretable | No se cuentan como cubiertos |
| Distribuciones | Conteos por tipo, ubicación o lifecycle | Todos los registrados; cada distribución suma el total |

Con denominador cero se muestra «Sin datos». Las ubicaciones nulas aparecen como
«Sin ubicación» para no perder registros. Los porcentajes se redondean y pueden
sumar 99% o 101%; los conteos son exactos. Las garantías muestran los próximos cinco
vencimientos, por fecha y código, sin implementar búsqueda ni Asset Explorer.

## Límites explícitos

- No representa inventario, responsables ni ubicaciones reales.
- No existe conexión a GLPI, Intune, Entra, fabricantes ni contratos.
- No implementa score CMDB Health, discovery, QR, actas o gestión de tickets.
- Los estados simplificados del fixture no reemplazan la taxonomía GLPI: el proveedor
  real deberá normalizarla según los ADR y el contrato de NEXUS API.
- El artefacto es una demo de producto; operación corporativa requiere los controles
  de `docs/security/README.md` y `docs/demo-readiness.md`.

## QA automatizado

- TypeScript estricto, incluyendo tests y configuración.
- Build de tokens, UI, Web y catálogo Storybook.
- Tests de límites temporales, bajas, denominadores vacíos y reconciliación.
- Chromium: filtro, tema/densidad, carga/error/reintento, vacío, cancelación y
  respuestas fuera de orden; teclado del drawer y cambio móvil → escritorio.
- axe WCAG A/AA hasta 2.2 en 1440, 768 y 320 px, Light/Dark; ausencia de overflow
  horizontal del documento, manteniendo scroll de DataTable.
- CI conserva tests de Storybook, verificación de tokens generados y paquete UI.

## Pruebas manuales recomendadas

No bloquean la revisión técnica automatizada: recorrido con NVDA/VoiceOver,
zoom real 200%/400%, contraste alto de Windows, reduced motion y revisión visual
en un teléfono físico. Comprobar lectura de métricas, foco tras cerrar navegación
y desplazamiento horizontal de garantías.

## Siguiente hito

Revisar CMDB-006 y fusionarlo manualmente sólo con CI aprobada. Después iniciar
CMDB-007 desde `main` actualizado. No se crea una cadena de PR dependientes.

## Integración CMDB-011

El panel conserva todas sus métricas históricas y su alcance de activos vigentes. Agrega navegación real hacia `#health`; las señales básicas no se renombraron como score. CMDB-010 y CMDB-011 figuran integrados; CMDB-011 mediante PR #29. El nuevo índice está explicado en [CMDB Health](cmdb-health.md).
