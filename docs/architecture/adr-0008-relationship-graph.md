# ADR-0008 — Modelo y visualización del grafo de relaciones

Estado: Propuesto por CMDB-010; listo para aceptación al integrar el PR.

## Contexto

Asset 360 ya entrega una identidad NEXUS y una ruta estable. CMDB-010 debe representar cómo se relacionan los CI, conservar semántica dirigida, ofrecer una alternativa accesible y permitir reemplazar fixtures por fuentes normalizadas en el futuro.

La Demo v0.1 usa un vecindario pequeño. Incorporar una librería de grafos general agregaría bundle, API propia, mantenimiento y riesgos de accesibilidad sin resolver una necesidad actual de escala, edición o simulación física.

## Decisión

- Definir `Relationship` como dominio independiente de React, coordenadas y proveedores de visualización.
- Usar `sourceId`, `targetId`, tipo, dirección, estado, procedencia y fecha de observación.
- Mantener una taxonomía inicial cerrada y extensible: `depends_on`, `uses` y `connected_to`.
- Exigir dirección explícita: `depends_on` y `uses` son dirigidas; `connected_to` es bidireccional.
- Consultar datos mediante `RelationshipProvider(RelationshipQuery, AbortSignal)` y mantener `DemoRelationshipProvider` fuera de los componentes.
- Construir el vecindario con funciones puras, filtros por tipo/perspectiva y profundidad máxima de dos niveles.
- Usar un layout radial determinista propio. El foco ocupa el centro y los demás nodos se ordenan por ID antes de calcular posiciones. Las aristas se recortan contra un bounding box conceptual de cada nodo en espacio SVG para mantener visibles sus marcadores sin medir el DOM.
- Renderizar aristas en SVG y nodos como botones HTML. Así el SVG puede ser decorativo mientras los nodos conservan interacción y foco nativos.
- Mantener una lista semántica equivalente con endpoints, verbo, dirección, estado y navegación.
- Ocultar el plano visual bajo 768 px y priorizar la lista; no se encoge un canvas hasta volverlo ilegible.
- Extender el routing actual con `#assets/<nexusAssetId>/relations`, sin incorporar un router adicional.

## Semántica de dirección

`A → depends_on → B` significa que A requiere B. Desde A, B es upstream. Desde B, A es downstream y podría verse afectado si B falla. `connected_to` tiene flechas en ambos extremos y se presenta como conexión entre pares.

Esta semántica no constituye análisis de impacto empresarial ni propagación de criticidad.

## Consecuencias

- La UI no conoce GLPI, Intune, Graph, Entra, SNMP ni coordenadas entregadas por proveedores.
- El layout es estable, testeable y no depende de animación permanente.
- Las puntas de flecha terminan aproximadamente en el borde conceptual de las tarjetas, incluso en relaciones bidireccionales; la aproximación evita observers y cálculos dependientes del viewport.
- No se agrega dependencia de visualización; el bundle conserva su perfil actual.
- Un CI referenciado pero ausente del inventario se muestra como referencia incompleta y nunca genera un enlace falso.
- La solución es intencionalmente acotada. Zoom, pan, clustering y virtualización deben reconsiderarse sólo con datasets y requisitos reales.

## Accesibilidad

El color no es el único canal: dirección mediante puntas de flecha, tipos mediante patrones de línea y texto, foco mediante borde doble y selección mediante contorno. Los nodos son botones con nombre accesible, la selección se refleja con `aria-pressed` y la lista semántica entrega la información equivalente. Se reutilizan focus visible, light/dark, forced-colors y reduced-motion del Design System.

## Seguridad y fuentes futuras

Los fixtures son sintéticos. CMDB-010 no implementa discovery. Toda fuente futura debe pasar por NEXUS API y adaptadores autorizados. Se deben preferir APIs e inventarios aprobados; SNMP requerirá configuración segura y mínimo privilegio. En OT/ICS se priorizarán métodos pasivos/read-only coordinados con Infraestructura y Ciberseguridad, sin asumir active scanning.

Service Desk y tickets permanecen fuera del producto; esa responsabilidad se mantiene en Jira.

## Fuera de alcance

Discovery real, active scanning, cálculo avanzado de impacto, edición/persistencia de relaciones, autenticación productiva, CMDB Health, Service Desk y CMDB-011.
