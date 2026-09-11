# ADR-0010 — Catálogo sintético único y escenarios de demo

Estado: Aceptado en CMDB-012; integrado mediante PR #32 (`9afb26d`).

## Contexto

CMDB-006 a CMDB-011 comparten inventario, pero su fixture preliminar mezcla ciclos uniformes y las relaciones declaran su corte aparte. CMDB-012 necesita escenarios intencionales, identidad estable entre vistas y pruebas de integridad sin crear otro inventario ni una integración GLPI prematura.

## Decisión

Concentrar inventario y relaciones en `demo-dataset.ts`. Combinar 24 activos declarativos con 216 activos de cohortes tipadas y rangos de ID explícitos. Las nueve familias usan las cinco clases del modelo actual. Un corte fijo y offsets reproducibles reemplazan cualquier dependencia del reloj. Devolver snapshots congelados con una factoría pura y compartir una instancia mediante los providers existentes.

Mantener los 240 IDs y el contrato de locators. Tres componentes de relaciones, máximo siete nodos, ejercitan el layout actual sin requerir clustering. Metadatos de héroes indican intención funcional, pero no participan en scoring. Health calcula sobre los datos; no recibe scores ni bandas prefijadas.

Tests de integridad y un digest del contenido detectan drift. Valores agregados y ejemplos hero son expectativas explícitas de revisión. Los tests adversos de dominio continúan fuera del catálogo: no necesitamos endpoints inválidos para demostrar observaciones antiguas o desconocidas.

## Alternativas

- JSON completo de 240 registros: claro, pero introduce repetición y revisión ruidosa.
- Sólo generación uniforme: compacto, pero no permite explicar fácilmente escenarios particulares.
- Faker/aleatoriedad con seed: dependencia y cambios de versión afectan reproducibilidad sin aportar valor aquí.
- Importar a GLPI: requiere contratos y permisos aún no implementados; crearía una integración fuera de alcance.

## Consecuencias

Los cambios de contenido son intencionales y versionados. Los rangos no se reordenan ni reciclan; los locators permanecen estables por ID. Congelar datos evita mutaciones compartidas; los tests construyen copias para escenarios adversos. La factoría no contiene reglas de UI, consultas, autenticación ni reconciliación futura. El fixture se reemplazará mediante providers al conectar NEXUS API.

Los valores son sintéticos y no representan distribución real de Innergex. CMDB-013, discovery e integraciones productivas siguen pendientes. Reglas de coherencia entre tipos/sitios/estados en tests pertenecen a este catálogo; no se imponen como políticas universales de CMDB.

Detalles y mantenimiento: [Dataset de Demo](../demo-dataset.md).
