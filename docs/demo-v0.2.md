# IGX NEXUS — Demo v0.2

Estado: **readiness de release** · V02-029.

## Propósito

La Demo v0.2 demuestra las capacidades de Technology Intelligence construidas durante v0.2 sobre un dataset **100% sintético y determinista**.

No demuestra despliegue corporativo, SSO productivo, disponibilidad de Intune, operación real OT ni cobertura completa de fuentes Live.

## Prerrequisitos

- Node.js definido en `.nvmrc`;
- npm;
- repositorio limpio y sincronizado;
- dependencias instaladas mediante `npm ci`;
- Chromium de Playwright cuando se ejecuten browser tests.

No se requiere GLPI, Intune, Entra ni conexión a fuentes corporativas para ejecutar la Demo una vez instaladas las dependencias. `npm ci` y la instalación de Chromium pueden requerir acceso a los registries/orígenes de paquetes.

## Preparación

Desde la raíz:

```bash
npm ci
npm run build
```

Validación de readiness integrada:

```bash
npm run test:readiness:v02
```

El smoke histórico v0.1 permanece disponible:

```bash
npm run test:demo
```

## Levantar la Demo

El modo por defecto es Demo.

```bash
npm run dev
```

Abrir:

```text
http://127.0.0.1:3000/
```

No definir `VITE_NEXUS_DATA_MODE=live`.

## Recorrido recomendado

### 1. Technology Overview

Verificar:

- badge `DEMO`;
- contexto de datos sintéticos;
- alcance y cobertura;
- IT / OT Intelligence;
- Endpoint Experience;
- Proactive Findings;
- drill-down a Assets / Lifecycle / Data Quality.

Las señales presentadas son deterministas y explicables. No constituyen un risk score ni una causa raíz.

### 2. Knowledge Research

Dentro de un Proactive Finding:

- abrir **Investigar conocimiento**;
- comprobar fuentes `Synthetic fixture`;
- comprobar `untrusted input`;
- observar contradicciones conservadas;
- verificar `Execution allowed: no`;
- la revisión Demo es local, no persistente y nunca autoriza ejecución.

### 3. Lifecycle & Investment

Abrir `#lifecycle`.

Verificar:

- horizontes 3/6/12/24 meses;
- coverage por hito;
- provenance para fechas conocidas;
- fechas ausentes reducen coverage;
- Investment representa planificación temporal, no presupuesto/CAPEX.

### 4. Asset Explorer

Abrir **Activos**.

Hero recomendado:

```text
DEMO-0013
Consola Demo Supervisión Norte
serial sintético: SYNTH-SN-000013
```

Verificar filtros, taxonomy, source/context y acceso a Asset 360.

### 5. Asset 360

Verificar:

- identidad NEXUS;
- Taxonomy v2;
- source references / provenance;
- operational context cuando corresponde;
- inventory/freshness;
- relaciones;
- límites entre CMDB Quality y señales endpoint.

### 6. Technology Map

Desde DEMO-0013 abrir Technology Map.

Verificar:

- focus CI;
- depth 1/2;
- relaciones con dirección/status/evidence;
- selección de CI;
- alternativa semántica;
- ningún claim de impacto causal.

### 7. Data Quality / CMDB Health

Abrir **Calidad de datos**.

Verificar:

- score histórico;
- cobertura;
- dimensiones/findings;
- evidence coverage;
- separación de Device/Endpoint Health.

### 8. QR / Label histórico

El recorrido QR/Label sigue cubierto por `DemoV01.browser.test.tsx`.

V02-029 no reimplementa ese flujo.

## Dataset

La fuente canónica vive en:

```text
packages/demo-data
```

Propiedades esperadas:

- 240 CIs;
- 199 IT / 41 OT;
- 18 relaciones canónicas;
- `sourceInstanceId=demo-v0.2`;
- identifiers sintéticos;
- direcciones IP de documentación cuando aplica;
- observations sintéticas para escenarios Endpoint Experience;
- Knowledge Research sintético etiquetado explícitamente.

## Gate automatizado

`apps/web/src/DemoV02.browser.test.tsx` valida un recorrido integrado representativo:

```text
Overview
 → IT/OT Intelligence
 → Endpoint Experience
 → Proactive Findings
 → Knowledge Research
 → Lifecycle
 → Explorer
 → Asset 360
 → Technology Map
 → CMDB Quality
```

El gate busca invariantes semánticos y navegación principal; evita assertions cosméticas innecesarias.

## Qué no demuestra la Demo

- datos corporativos reales;
- producción GLPI;
- Intune/Entra tenant;
- Device Health productivo;
- relaciones Live;
- investigación web autónoma;
- remediation;
- active OT scanning;
- alta disponibilidad;
- seguridad productiva certificada;
- accesibilidad formalmente certificada.

## Troubleshooting

Si el smoke falla:

1. ejecutar `npm ci`;
2. comprobar Node con `node --version`;
3. ejecutar `npm run build`;
4. ejecutar `npm run test:readiness:v02`;
5. revisar primero cambios de semántica/navegación antes de actualizar assertions;
6. no debilitar el gate sólo para obtener verde.

Git, contratos y tests prevalecen sobre este documento.
