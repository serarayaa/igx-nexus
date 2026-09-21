# Technology Overview — V02-015

Estado: **integrado mediante V02-015 / PR #83**.

Baseline de implementación:

`main = ccebc18d7440d338f59e0263cc38c5d42bd1afe4`

Integrado en `main`:

`c30eb25fa581f45eafa61c8bf7dd9d23fd7ccfe9`

CI post-merge V02-015: **#573 verde**.

## Pregunta operacional

Technology Overview responde:

> **¿Qué requiere atención ahora y por qué?**

No intenta mostrar todo el inventario ni convertirse en un catálogo de KPIs. Su función es resumir el snapshot actual, señalar condiciones defendibles y conducir hacia superficies de investigación existentes.

## Jerarquía

```text
Technology Overview
├─ Contexto / alcance / cobertura
├─ Requiere atención
├─ Estado resumido
├─ Detalle acotado cuando aporta contexto
└─ Drill-downs
   ├─ Assets
   └─ Data Quality cuando la cobertura existe
```

El antiguo bloque “Recorrido de la demo” deja de formar parte de la home. Technology Map, QR y otros destinos no se promocionan desde Overview sólo porque ya existan técnicamente.

## Modelo de atención

`overview-model.ts` es una capa de presentación determinista. No agrega contratos de dominio ni persiste findings.

### Demo

Puede priorizar señales ya existentes en el modelo histórico:

- activos críticos sin información reciente;
- datos básicos incompletos;
- freshness antigua o desconocida;
- garantías dentro de la ventana histórica de 90 días.

Estas reglas describen el escenario Demo. No son políticas corporativas ni un risk score.

### Live

Overview Live consume el mismo `InventoryProvider` que Explorer/Asset 360 y sólo presenta información respaldada por NEXUS API.

Actualmente puede usar:

- inventario visible;
- dominio;
- lifecycle canónico ya proyectado;
- última actualización de inventario cuando existe.

No convierte ausencia de `owner`, garantía u otros campos no cubiertos por el vertical Live en defectos del registro. La ausencia se comunica como **cobertura parcial**.

Live nunca usa Demo como fallback.

## Summary facts

V02-015 permite hechos descriptivos cuyo denominador es visible:

- activos visibles;
- activos vigentes según el modelo UI actual;
- freshness reciente/antigua/desconocida;
- en Demo, presencia de responsable + ubicación;
- en Demo, garantías próximas/vencidas/desconocidas.

V02-015 **no** define:

- KPI corporativo;
- score de riesgo;
- SLA/SLO;
- tendencia temporal;
- forecasting;
- causalidad;
- ventanas analíticas nuevas;
- contrato de cobertura reutilizable entre módulos.

Esas definiciones pertenecen a **V02-019 — Analytics Contract Layer**.

## Visualización

No se agrega una librería de charts.

La dirección visual usa:

- listas para triage;
- `dl` para summary facts;
- tabla únicamente para el detalle acotado de garantías Demo;
- cards sólo cuando representan una unidad conceptual real.

Esto evita reconstruir el patrón histórico de “cards + donuts + widgets” sin propósito.

## Navegación y routing

Se preserva `#overview`.

El shell muestra **Overview** tanto en Demo como en Live. En Live, la ruta raíz/unsupported se normaliza a Overview y sólo se mantienen rutas cuya experiencia Live es defendible.

Breadcrumbs activos usan “Overview” como raíz conceptual.

No se introduce router nuevo.

## Estados

Technology Overview distingue explícitamente:

- loading;
- error;
- inventario vacío;
- filtro sin resultados;
- señales de atención;
- ausencia de señales dentro de la cobertura;
- cobertura parcial Live.

> “Sin señales” no significa “todo está saludable”.

## Accessibility

Baseline: WCAG 2.2 AA.

La implementación conserva:

- foco programático al `h1` tras navegación;
- keyboard;
- focus visible;
- drawer accesible del Shell 2.0;
- reflow a 320 CSS px;
- light/dark;
- comfortable/compact;
- forced colors;
- reduced motion.

El contenido no depende sólo de color: cada señal incluye texto, etiqueta semántica, cantidad y explicación.

## Continuity Check

V02-015 sigue **Evolution over reinvention**:

- extiende `DashboardContent`, `InventoryProvider`, `NexusShell` y Design System existentes;
- preserva `#overview`, providers, contratos canónicos, NEXUS API y dataset Demo;
- no modifica GLPI, reconciliación, Taxonomy v2 ni Relationship Evidence;
- no introduce librerías nuevas;
- no crea un segundo modelo de inventario;
- no adelanta Explorer 2.0, Asset 360 2.0, Technology Map 2.0 ni Analytics Contract Layer;
- mantiene Demo y Live como contextos de fuente de una misma arquitectura de producto.

## Ownership futuro

- V02-016: Explorer data-dense;
- V02-017: Asset 360 2.0;
- V02-018: Technology Map 2.0;
- V02-019: contratos métricos;
- V02-020: CMDB Quality 2.0;
- V02-021: Lifecycle & Investment.

Technology Overview podrá consumir esas capacidades cuando existan contratos defendibles, sin cambiar su pregunta operacional.
