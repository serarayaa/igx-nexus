# Tipos de Dominio Compartidos

`@igx-nexus/types` contiene el **modelo canónico de Technology Intelligence de IGX NEXUS v0.2**.

La regla principal es que el dominio de NEXUS no pertenece a GLPI, Intune, Entra ID ni a otra fuente individual. Los adapters traducen esas fuentes hacia contratos compartidos; los identificadores externos se conservan como evidencia y nunca reemplazan automáticamente la identidad canónica de NEXUS.

## Principios

- **NEXUS identity is canonical.** `TechnologyAsset.id` es independiente de los IDs de origen.
- **Sources remain evidence.** `SourceReference` y `ProvenanceRecord` permiten explicar de dónde proviene un dato.
- **IT and OT share a platform, not a taxonomy.** `domain`, `assetClass` y `role` son conceptos distintos.
- **Observations are temporal.** Una señal de batería, crash o evento no es un atributo permanente ni un score de CMDB Health.
- **Relationships require evidence.** Una relación canónica conserva dirección, estado, tiempo y evidencia.
- **Unresolved evidence is visible.** Los validadores pueden producir warnings para referencias aún no reconciliadas en lugar de ocultarlas.

## Estructura

- `src/model.ts`: contratos canónicos y catálogos base.
- `src/validation.ts`: validadores puros e invariantes runtime.
- `src/model.test.ts`: casos IT/OT, fuentes múltiples, observaciones, relaciones y snapshots.

## IT / OT

La clasificación es deliberadamente independiente de las clases físicas de GLPI. Por ejemplo:

```text
OT
└─ control
   └─ plc
```

puede ser adaptado posteriormente a la representación soportada por GLPI sin convertir `Peripheral`, `Computer` u otra clase GLPI en la semántica del producto.

Los roles conocidos son una base, no una lista exhaustiva. Extensiones justificadas utilizan el namespace `custom:<nombre>` para impedir strings arbitrarios silenciosos.

## Compatibilidad con v0.1

V02-001 es **aditivo**. No reemplaza todavía:

- `apps/web/src/asset-model.ts`;
- el dataset sintético v0.1;
- Relationship Graph;
- CMDB Health;
- Dashboard / Explorer / Asset 360 / QR.

La migración de consumidores se realizará progresivamente en tickets posteriores una vez exista NEXUS API y los adapters correspondientes.

## Validación

Desde la raíz:

```bash
npm run typecheck --workspace @igx-nexus/types
npm run test --workspace @igx-nexus/types
npm run build --workspace @igx-nexus/types
```

El paquete no contiene secretos, IDs corporativos reales ni integración de red.
