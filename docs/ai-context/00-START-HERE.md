# IGX NEXUS — AI Context Entry Point

> Contexto mínimo para agentes de IA que trabajen en IGX NEXUS.

## Propósito

Reducir la reconstrucción de contexto entre sesiones sin duplicar la documentación existente.

El repositorio y su documentación vigente son la fuente de verdad.

## Inicio obligatorio

Antes de trabajar:

1. Leer `01-CURRENT-STATE.md`.
2. Leer `03-SESSION-HANDOFF.md`.
3. Identificar el tipo de tarea.
4. Cargar únicamente la documentación adicional necesaria.

No recorrer todo `docs/`, todo el código ni todo el historial Git salvo necesidad real.

## Router de contexto

### Desarrollo funcional v0.2

- `../roadmap-v0.2.md`
- documentos asociados al ticket actual

### Arquitectura

- `../architecture/README.md`
- únicamente los ADR relevantes

### Producto / UX / Information Architecture

- `../product/README.md`
- documento específico de la superficie afectada

### Auditoría / remediación

- `../audits/`
- documentación del finding activo

Los findings cerrados no deben tratarse como deuda pendiente.

### Taxonomía / modelo tecnológico

- `../taxonomy-v2.md`
- ADR canónicos relacionados

### Relaciones / reconciliación

- `../relationship-graph.md`
- `../reconciliation.md`

## Jerarquía de verdad

En caso de contradicción:

1. código y tests actuales;
2. ADR aceptado más reciente;
3. documentación específica vigente;
4. `01-CURRENT-STATE.md`;
5. roadmap;
6. documentación histórica;
7. conversaciones o memoria del agente.

Una conversación anterior nunca prevalece sobre el estado real del repositorio.

## Demo y Live

Demo y Live comparten contratos de producto, pero no deben mezclarse ni usar fallback silencioso entre fuentes.

## Continuidad

Al finalizar trabajo relevante:

- actualizar `01-CURRENT-STATE.md` solo si cambió el estado global;
- reemplazar `03-SESSION-HANDOFF.md` con el punto exacto donde quedó el trabajo;
- no convertir el handoff en un diario histórico.