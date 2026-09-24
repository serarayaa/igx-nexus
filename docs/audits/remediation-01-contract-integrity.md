# AUD-API-001 — Contract integrity

Base revisada: `eae384cf6fb7853b3bbcf29ba80a0b41072d42d6`. PR #93 continúa separado: no se modifican sus archivos ni Technology Map.

## Causa y corrección

El schema de respuesta Fastify cerraba `TechnologyAsset` con `additionalProperties: false` pero omitía `taxonomy` y `operationalContexts`. El serializer eliminaba datos válidos. Web mantenía además una representación parcial y no validaba versión ni timestamps antes de renderizar.

`packages/types/src/http-contract.ts` define el schema HTTP explícito y el parser compartido. Los objetos canónicos continúan cerrados; solo `attributes`, definido como diccionario en el modelo, admite claves variables con valores escalares/listas de escalares. La ruta valida el snapshot antes de serializarlo. El consumidor valida estructura, versión `technologySchemaVersion`, timestamps con el `isIsoTimestamp` existente y reglas canónicas/taxonómicas existentes.

Web conserva el contrato validado en `InventorySnapshot.canonical`, incluyendo identifiers, source references, provenance, observations y relationships, junto a su proyección de presentación. La proyección conserva la evaluación taxonómica, contextos operacionales y referencias de fuente completas; sus indicadores usan la evaluación canónica cuando existe. El fallback por atributos solo se conserva para snapshots históricos 0.2 sin evaluación (opcional explícitamente en el tipo base); nunca reemplaza una evaluación presente.

Las fechas contractuales deben ser timestamps ISO con zona y calendario válido. `null` sigue representando temporalidad desconocida en relaciones. El atributo GLPI de último inventario consumido como fecha también se comprueba; no se infiere una zona faltante. No se introducen políticas DST, garantías ni normalización temporal de fuentes.

Un contrato inválido rechaza la promesa del provider antes de renderizar. Explorer, Asset360 y Overview reutilizan su ErrorState/reintento; el diagnóstico de Web registra código y ruta, sin payload ni valores sensibles.

## Protección contra regresiones

- `contract-round-trip.test.ts`: fixture canónico completo → Fastify/serialización HTTP → consumidor Web; igualdad profunda del JSON y contrato retenido, taxonomía/contextos y proyección relevante.
- `technology-routes.test.ts`: igualdad profunda del snapshot Demo completo, no solo cantidad/IDs.
- `contract-validation.test.ts`: versiones incompatibles, presencia/tipo/calendario/zona de asOf, timestamps anidados, formas inválidas, prioridad canónica sobre atributos históricos y decisiones sin resolver.
- `ContractIntegrity.browser.test.tsx`: error controlado y retry en Explorer; Asset360/Overview no quedan vacíos por fecha inválida.
- `live-provider.test.ts`: compatibilidad histórica explícita; actualización justificada para conservar source references completas y snapshot canónico.
- Las propiedades de cada objeto del schema satisfacen `Record<Keys<T>, ContractSchema>`: agregar un campo, incluso opcional, al tipo canónico obliga a actualizar el serializer. Se comprobó en una copia desechable: añadir `auditFutureField?: string` a TechnologyAsset produce TS2741 si se omite del schema.

## Evidencia RED → GREEN

Antes de modificar implementación, el nuevo round-trip falló con cuatro aserciones: `taxonomy` ausente, `operationalContexts` ausente, JSON distinto y proyección incompleta. Tras corregir, el mismo test pasó. La fixture incluye source/externalId, identificadores, provenance/evidence, contextos, observación y relación con fecha desconocida.

Comandos de reproducción:

```sh
npm run build --workspace @igx-nexus/types
npm run test --workspace @igx-nexus/web -- --project model src/contract-round-trip.test.ts src/contract-validation.test.ts
npm run test --workspace @igx-nexus/api
npm run typecheck
npm run build
npm test
```

No se agregaron dependencias ni se modificaron los demás hallazgos. La validación Live usa datos sintéticos; no acredita GLPI corporativo end-to-end. El navegador configurado no pudo descargarse en el laboratorio (ZIP truncado); las pruebas browser focales se ejecutaron con Chromium 131 mediante override externo al repositorio. CI debe conservar su navegador configurado.
