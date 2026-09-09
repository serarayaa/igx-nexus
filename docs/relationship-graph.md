# Grafo de Relaciones — CMDB-010

CMDB-010 incorpora la primera versión funcional de **The Technology Map**. La vista responde cómo se relacionan los CI sin afirmar que existe discovery productivo: todo el escenario es sintético y reproducible.

## Ruta e integración

```text
/#assets/<asset-id>/relations
```

Asset 360 ofrece el enlace “Abrir grafo de relaciones”. El mapa mantiene un CI enfocado, permite seleccionar nodos, abrir su Asset 360 o reenfocar el mapa mediante rutas generadas por `navigation-model.ts`.

## Arquitectura

| Capa | Responsabilidad |
|---|---|
| `relationship-model.ts` | Contratos, taxonomía, validación, direccionalidad, filtros, vecindario y layout puro |
| `demo-relationship-provider.ts` | Fixture y provider asíncrono sintético |
| `RelationshipGraph.tsx` | Estados, filtros, mapa, selección, navegación y representación accesible |
| `relationship-graph.css` | Presentación responsive, temas y forced-colors |

El provider recibe `RelationshipQuery` y `AbortSignal`. La futura NEXUS API puede reemplazarlo sin entregar coordenadas ni estructuras propias de una librería gráfica.

## Modelo

Cada relación declara:

- identidad propia;
- `sourceId` y `targetId` NEXUS;
- tipo;
- dirección explícita;
- estado;
- procedencia demo;
- fecha de observación opcional.

Tipos iniciales:

| Tipo | Dirección | Lectura |
|---|---|---|
| `depends_on` | dirigida | el origen depende del destino |
| `uses` | dirigida | el origen usa el destino |
| `connected_to` | bidireccional | ambos extremos están conectados |

Desde un CI enfocado, una relación dirigida saliente representa **upstream** (“de qué depende”) y una entrante representa **downstream** (“qué podría verse afectado”). Una relación bidireccional es una conexión entre pares. CMDB-010 no calcula impacto empresarial ni criticidad propagada.

## Dataset demo

El escenario reutiliza seis activos del inventario sintético y seis relaciones. Permite observar un desktop y otro equipo que dependen de un switch, utilizan monitores y comparten conectividad con impresoras. No representa nombres, topología, ubicaciones ni direccionamiento corporativo.

El provider devuelve hasta dos niveles. La UI permite reducir a un nivel y filtrar por tipo o perspectiva. Las referencias incompletas permanecen visibles como “CI no disponible” y no generan links falsos.

## Visualización y accesibilidad

- Layout radial determinista, sin simulación física ni animación permanente. Las líneas se recortan matemáticamente contra un rectángulo conceptual por nodo, de modo que las flechas quedan visibles cerca del borde sin usar mediciones del DOM.
- Flechas para dirección y flechas dobles para relaciones simétricas.
- Patrones de línea, texto y leyenda; el significado no depende sólo del color.
- Nodos HTML accionables con foco visible y selección mediante teclado.
- Lista semántica permanente con endpoints, verbo, tipo, dirección y estado.
- En móvil se oculta el plano visual y se prioriza la lista equivalente.
- Light/dark, densidad, `forced-colors` y `prefers-reduced-motion` reutilizan el baseline IGX.

## Estados

La vista contempla loading, error con retry, activo inexistente, activo sin relaciones, filtros sin resultados, referencias incompletas y datos válidos. Las respuestas obsoletas se descartan mediante cancelación con `AbortSignal`.

## Seguridad y evolución

CMDB-010 no ejecuta discovery. Las fuentes futuras deben ingresar por NEXUS API y providers normalizados. Todo descubrimiento debe estar autorizado; se priorizan APIs e inventarios aprobados. SNMP requerirá configuración segura. En OT/ICS deben preferirse fuentes pasivas/read-only y coordinación previa con Infraestructura y Ciberseguridad, sin asumir active scanning.

## Límites v0.1

- sin edición o persistencia de relaciones;
- sin integraciones reales;
- sin zoom/pan, innecesarios para el vecindario pequeño;
- sin cálculo avanzado de impacto;
- sin CMDB Health (CMDB-011);
- sin Service Desk ni tickets, gestionados en Jira.
