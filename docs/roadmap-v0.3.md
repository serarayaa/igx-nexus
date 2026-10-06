# IGX NEXUS v0.3 — Product Experience

V03-001: **APPROVED / GO WITH CONDITIONS**, según cierre humano del archivo de solicitud. Baseline estable `80b07704c8ba719a6c7a53449168739dc1745d32`. V03-002: **Human Review Checkpoint = APPROVED WITH CONDITIONS**; integrado mediante PR #136 en `main@e04c4025dc3764bc668a6155df883e275c0519f6`. No adopción automática de marca.

## Secuencia recomendada y dependencias

| Orden / ID | Resultado | Gate |
|---|---|---|
| V03-001 · audit | Auditoría de experiencia, Innergex, benchmarks y Preservation/Restructure Matrix | Aprobado GO WITH CONDITIONS; preservar sus límites |
| V03-002 · foundations | Tokens aditivos, semántica, tipografía, surfaces, componentes, marca propuesta y Visual QA | Checkpoint humano completado con condiciones; CI verde y merge manual; docs en design-system |
| V03-008 · state/navigation | Contrato tipado URL, helpers/history, adaptador Explorer/360 y recorrido Graph controlado; [contrato](product/v0.3-navigation-state-contract.md) | V03-008 Human Review Checkpoint = APPROVED WITH CONDITIONS; GO WITH CONDITIONS; CI final y merge manual en PR #137 |
| V03-003 · shell | Navegación, naming y aplicación de marca aprobada | 002/008, keyboard/drawer/preferencias |
| V03-005 · Technology Workspace | Explorer + Map como representaciones del contexto | Hipótesis; 002/008/003; validar performance y alternativa semántica |
| V03-007 · Graph / Map | Implementación/evolución de Graph/Map dentro de V03-005; **no es una superficie independiente** | Comparte scope, filtros, selección, navegación, URL state y contexto de investigación; sin estado paralelo ni scope duplicado |
| V03-006 · Asset 360 | Evolucionar identidad, evidencia y relaciones; mantener cuatro secciones | 002/008/005; no campos/historia inventados |
| V03-004 · Overview | “Qué requiere atención ahora y por qué”; continuidad para investigar | Destinos/scopes resueltos, cobertura separada |
| V03-013 · especializadas | Lifecycle, Calidad, Findings/Research y QR; disclosure | Preservar cálculos, razones, límites y legibilidad de impresión |
| V03-009 · responsive/a11y | Gates transversales desde 002 | 320/768/1440, teclado/SR/focus/contrast/forced colors |
| V03-010 · motion | Integración que explique cambios y preserve contexto | Política 002 y contratos 008; equivalente reduced |
| V03-011 · screenshot/QA | Baselines aprobados por componente/superficie | Matriz mínima; no certificar desde screenshots/axe |
| V03-012 · readiness | Handoff y revisión humana de integración | Todos los gates, límites Demo/Live documentados |

La secuencia conserva los IDs propuestos por V03-001; no crea tickets de implementación masivos. No se inicia automáticamente el siguiente ticket.

## Preservation / Restructure Matrix vigente

| Área | Decisión | Límite |
|---|---|---|
| React, providers, modelos y contratos | KEEP | Sin nuevas fuentes/Intune/Graph/IA/backend/security/infra |
| DTCG adapter, primitive/semantic, themes/density | KEEP + POLISH | Sin cambio de formato ni big-bang |
| Semántica de evidencia/cobertura/condición | ADD / EVOLVE | Nuevas APIs, legacy preservado hasta migración |
| Shell y branding raster | KEEP concept + EVOLVE assets | B dirección aprobada; SVG no final, refinamiento 16/24/32 antes de producción; A sólo fallback si B falla, C rechazado |
| Explorer y Technology Map | EVOLVE como hipótesis | State contract, scope/URL/performance/a11y primero |
| Asset 360 | KEEP + POLISH / EVOLVE | Cuatro secciones y contratos actuales |
| Overview | EVOLVE composición | Prioridad de atención; no KPI/card soup |
| Especializadas | KEEP lógica + EVOLVE disclosure | QR físico y fuentes/cálculos preservados |
| Motion y accesibilidad | KEEP + POLISH | CSS actual, sin heavy dependency ni compliance absoluto |

**GO WITH CONDITIONS** para el siguiente nivel de trabajo, con revisión humana de 002 completada. Condiciones: refinamiento óptico de B antes de asset productivo y aplicación posterior de branding; contrato V03-008 antes de implementación completa de Workspace; Live real no verificado; auditoría específica de accesibilidad por superficie, sin compliance WCAG absoluto; migración incremental. **V03-008 aprobado con condiciones**, desde baseline `e04c402…`; V03-003/V03-005 no iniciados. El renderer Map legacy no se declara convergido antes de su migración por consumidor. V02-023 permanece separado, bloqueado por tenant externo y no bloqueante para v0.3; v0.2 y hotfixes no se reabren.

**V03-008 Human Review Checkpoint = APPROVED WITH CONDITIONS**. Se mantiene **GO WITH CONDITIONS**. Cierre humano autorizado; integración pendiente de merge manual de Sergio en PR #137 tras CI final SUCCESS y mergeability clean. V03-003/V03-005 NO iniciados.

Condiciones pendientes: integración productiva del renderer Graph legacy en V03-005; performance a escala corporativa; auditoría de accesibilidad específica por superficie; Asset 360 return URL length robustness. No declarar Graph completamente migrado, accesibilidad completa ni escala corporativa resuelta.

El patrón `#assets/:id?...&return=<encoded investigation URL>` queda aprobado. La robustez de longitud es una condición NO BLOQUEANTE para V03-008, pendiente como seguimiento de superficies consumidoras / V03-005 si corresponde. Validar longitud práctica de la URL final Asset 360 después del encoding y probar una investigación extensa representativa con 14 facetas, búsqueda, selección y parámetros Graph; comprobar navegación, refresh y retorno para evitar URLs excesivas o degradación inesperada. Este caso ampliado no fue ejecutado durante el cierre documental. Mantener límites actuales del contrato (hash4096, q256, facetas/IDs160); el límite del origen no demuestra robustez del destino codificado. No introducir sessionStorage/global store como workaround sin evidencia.
