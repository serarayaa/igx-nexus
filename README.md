# IGX NEXUS

> **The Technology Map** — by Innergex

IGX NEXUS es una plataforma interna de **CMDB, IT Asset Management e Inteligencia de Activos TI** para **Innergex Chile**.

La plataforma está enfocada en gestión de configuración, inteligencia de activos, descubrimiento, relaciones entre elementos de configuración (CI), identificación mediante códigos QR, calidad de datos, seguridad, ciclo de vida e integraciones con fuentes corporativas autoritativas.

## Alcance actual

La primera implementación y la demo v0.1 están diseñadas exclusivamente para **Innergex Chile**. La arquitectura deberá permanecer preparada para una futura expansión hacia otras entidades o países de Innergex, pero esa expansión no forma parte del alcance actual.

### Incluido
- CMDB / ITAM
- Descubrimiento e inventario de activos
- Relaciones entre elementos de configuración
- Vistas Asset 360°
- Identificación mediante QR e inventario físico
- CMDB Health y calidad de datos
- Ciclo de vida, responsables, ubicaciones, contratos, garantías y cumplimiento
- Integraciones con GLPI, Microsoft Intune, Microsoft Entra ID y otras fuentes autoritativas
- Gestión de asignación, entrega, devolución y trazabilidad de activos
- Base para actas digitales de entrega y recepción con evidencias y consentimiento
- Métricas, KPI y capacidades analíticas de Asset Management
- UI/UX moderna con identidad visual de Innergex
- Auditabilidad y seguridad desde el diseño

### Fuera de alcance
- Service Desk / Help Desk
- Creación y gestión de tickets de soporte
- Despliegue operativo para otras entidades de Innergex durante la etapa Chile

Innergex ya utiliza Jira para los flujos de soporte. IGX NEXUS no debe duplicar esa responsabilidad.

## Principio de arquitectura

La experiencia personalizada de IGX NEXUS permanece desacoplada del núcleo de GLPI. La interfaz web se comunica con una API dedicada, **NEXUS API**, responsable de autorización, normalización, reconciliación, lógica de negocio, flujos QR, integraciones y auditabilidad.

```text
IGX NEXUS Web
      |
      v
  NEXUS API
      |
  +---+--------------------+
  |          |             |
 GLPI      Intune       Entra ID
  |
MariaDB
```

## Estado del proyecto

Objetivo actual: **v0.1 — Demo Local Innergex Chile**

El primer hito es una demostración local pulida que permita validar el producto con TI Chile. Si la demo es aprobada, el siguiente paso será promover el stack a un servidor corporativo de Innergex con cambios arquitectónicos mínimos.

La eventual adopción por Innergex Canadá u otras entidades se considera una oportunidad futura y no debe condicionar el alcance de la primera implementación chilena.

Avance formal integrado en `main`: **11/13 tickets (~84,6%)**. CMDB-011 — CMDB Health está integrado mediante PR #29 (`d7ed149`). Siguiente ticket: CMDB-012 — Dataset de Demo. CMDB-013 sigue pendiente.

## Flujo de desarrollo

- `main` es la línea base estable de desarrollo.
- El trabajo se implementa por ticket CMDB en ramas dedicadas.
- Los Pull Requests se revisan antes del merge.
- Se utiliza Conventional Commits.
- Nunca deben versionarse secretos ni datos corporativos reales.

## Idioma del proyecto

- La documentación del repositorio se mantiene en **español**.
- Los issues y descripciones de Pull Requests se redactan en **español**.
- El código, identificadores, nombres de variables, contratos de API y términos técnicos que requieran consistencia pueden mantenerse en inglés.
- Los nombres oficiales del producto y de tecnologías de terceros no se traducen.

---

**IGX NEXUS — The Technology Map**  
Inteligencia interna de activos tecnológicos para Innergex Chile.

## Ejecutar la demostración Web

Con la versión de Node indicada en `.nvmrc`, ejecutar `npm ci` y `npm run dev` desde la raíz. Abrir `http://127.0.0.1:3000`. La Web usa datos sintéticos y no requiere conectarse a GLPI.

Rutas principales de demostración:

```text
/#overview                       Panel principal
/#health                         CMDB Health
/#assets                         Explorador de activos
/#assets/DEMO-0002               Asset 360 de un activo sintético
/#assets/DEMO-0002/label         Diseñador QR/etiqueta
/#assets/DEMO-0002/relations     Grafo de Relaciones
/#q/<demo-locator>               Simulador interno del resolver QR
```

El QR físico de la demo no codifica estas rutas internas: utiliza una URL `.invalid` con locator opaco. El diseñador permite perfiles físicos, 203/300 DPI y exportación SVG real; no simula PNG/PDF ni impresoras que todavía no existen.

Ver [instrucciones de Web](apps/web/README.md), [Dashboard](docs/dashboard.md), [Asset Explorer](docs/asset-explorer.md), [Asset 360](docs/asset-360.md), [Motor QR y Etiquetado](docs/qr-label-engine.md), [Grafo de Relaciones](docs/relationship-graph.md) y [ADR-0008](docs/architecture/adr-0008-relationship-graph.md).

Validación completa: `npm run typecheck`, `npm run build`, `npm test` y `npm run storybook:build --workspace @igx-nexus/ui`. Las pruebas de navegador requieren `npx playwright install --with-deps chromium`.

CMDB-011: [guía de calidad y fórmula del score](docs/cmdb-health.md) y [ADR-0009](docs/architecture/adr-0009-cmdb-health.md). No mide salud física de dispositivos.
