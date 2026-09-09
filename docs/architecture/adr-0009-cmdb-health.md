# ADR-0009 — Calidad explicable del registro CMDB

Estado: Propuesto por CMDB-011; pendiente de aceptación mediante merge manual.

## Contexto

El inventario normalizado y el grafo de CMDB-010 permiten revisar calidad de registros, pero no contienen telemetría operacional. Asset 360 disponía de señales booleanas que exigían hostname y responsable sin distinguir tipo/lifecycle. El provider de relaciones sólo exponía vecindarios.

## Decisión

1. Crear un motor puro sobre snapshots normalizados, fuera de React y providers. Reutilizar `freshnessOf` y `validateRelationship`; sustituir las señales booleanas de Asset 360 por la evaluación común.
2. Cinco dimensiones pequeñas: contexto/completitud 25, frescura 25, identidad 25, relaciones 15 y consistencia 10. Pesos/bandas centralizados. Las reglas demo se documentan como heurísticas, no como políticas corporativas.
3. Separar ausencia obligatoria (0), desconocido (excluido del score, reduce cobertura), dato inválido (0 con evidencia) y no aplicable (excluido de score/cobertura).
4. Presentar cobertura junto al score. Ajustar el peso de cada dimensión por su fracción evaluable y agregar puntos/pesos sin redondeo. No promediar scores redondeados ni otorgar peso completo a dimensiones casi desconocidas.
5. Mantener findings tipados con severidades de **calidad**, campos/relaciones y un catálogo de mensajes/acciones fuera del motor. Ningún error interno se devuelve al usuario.
6. Añadir un contrato de snapshot completo `RelationshipInventoryProvider` sin modificar el contrato de vecindarios de CMDB-010. Compartir exactamente el fixture original, no hacer n consultas ni reconstruir un dataset paralelo.
7. Exigir cortes temporales compatibles; no mezclar silenciosamente inventarios de épocas distintas. El motor permite un snapshot de relaciones explícitamente desconocido; la UI muestra retry si falla la carga completa.
8. No penalizar baja, stock, reparación, criticidad, garantía vencida ni ausencia legítima de relaciones. El `status` del grafo no tiene semántica suficiente para ser score de data health: sólo nota informativa.
9. Mantener `#health` en el routing hash existente y reutilizar shell, tokens, badges, paginación y estados. Vista global y Asset Health comparten evaluación/presentación; la ficha individual permanece utilizable si falla Health.
10. Las relaciones huérfanas se informan globalmente aunque no puedan atribuirse al score de un CI. El score agregado expresa calidad de registros CI, no un certificado de integridad total.

## Alternativas y consecuencias

Un promedio simple de cinco scores oculta distintas coberturas. Contar unknown como cero confunde ausencia de evidencia con error; ignorarlo sin cobertura premia inventarios escasos. Se acepta un modelo de pesos efectivos algo más explícito a cambio de trazabilidad matemática y tests reproducibles.

No se usa un motor de reglas genérico, librería gráfica, router, state manager ni framework de calidad externo: el dominio actual es pequeño. Las reglas sólo conocen datos normalizados. Procedencia por atributo, reconciliación y adaptación a otras fuentes se decidirán en una etapa posterior; no se implementan preventivamente.

La evaluación y su índice por endpoints son O(n+r), más orden de presentación O(n log n). Los 240 activos se conservan; casos adversos sólo en tests. No se avanza a CMDB-012/013, integraciones, discovery o Service Desk.

Fórmula, umbrales, severidades, UX y límites: [CMDB Health](../cmdb-health.md).
