# IGX NEXUS

> **The Technology Map** — by Innergex

IGX NEXUS es una plataforma interna de **CMDB, IT Asset Management e Inteligencia de Activos Tecnológicos** para **Innergex Chile**.

La plataforma está enfocada en gestión de configuración, inteligencia de activos, descubrimiento, relaciones entre elementos de configuración (CI), identificación mediante códigos QR, calidad de datos, seguridad, ciclo de vida e integraciones con fuentes corporativas autoritativas.

## Alcance actual

La implementación actual está diseñada exclusivamente para **Innergex Chile**. La arquitectura deberá permanecer preparada para una futura expansión hacia otras entidades o países de Innergex, pero esa expansión no forma parte del alcance actual.

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

Desde v0.2, la identidad NEXUS y los contratos canónicos permanecen además desacoplados de los IDs y taxonomías internas de cada fuente. GLPI sigue siendo el System of Record CMDB/ITAM; NEXUS actúa como capa de integración, contexto e inteligencia.

## Estado del proyecto

### v0.1 — Demo Local Innergex Chile ✅

La Demo v0.1 está completada e integrada.

Avance formal integrado en `main`: **13/13 tickets — 100%**. CMDB-013 — Demo v0.1 quedó integrado mediante PR #37 (`58fabd8`); issue #35 completado y CI post-merge #138 verde.

La v0.1 responde la pregunta: **«¿Podemos construir la idea?»**

### v0.2 — Technology Intelligence 🚧

La v0.2 está iniciada y responde: **«¿Puede IGX NEXUS convertirse realmente en una plataforma de Technology Intelligence para Innergex?»**

Primer ticket: **V02-001 — Canonical Technology Model**, issue #40. El trabajo se realiza en `feature/v02-001-canonical-technology-model` y no cuenta como integrado hasta su merge manual.

El roadmap activo está en [IGX NEXUS v0.2 — Technology Intelligence](docs/roadmap-v0.2.md).

La v0.2 prioriza:

- modelo canónico multisource;
- NEXUS API real;
- integración GLPI / Live Lab;
- procedencia y reconciliación;
- taxonomía IT/OT correcta;
- Product Design 2.0;
- analytics orientado a decisiones;
- Endpoint Intelligence explicable.

El despliegue/hardening completo en infraestructura corporativa se reserva conceptualmente para **v0.3 — Corporate Deployment**, evitando que v0.2 dependa del notebook local o requiera una reescritura para su traslado.

## Flujo de desarrollo

- `main` es la línea base estable de desarrollo.
- El trabajo se implementa por ticket en ramas dedicadas.
- Los Pull Requests se revisan antes del merge.
- Se utiliza Conventional Commits.
- El merge final a `main` permanece manual.
- Nunca deben versionarse secretos ni datos corporativos reales.

## Idioma del proyecto

- La documentación del repositorio se mantiene en **español**.
- Los issues y descripciones de Pull Requests se redactan en **español**.
- El código, identificadores, nombres de variables, contratos de API y términos técnicos que requieran consistencia pueden mantenerse en inglés.
- Los nombres oficiales del producto y de tecnologías de terceros no se traducen.

---

**IGX NEXUS — The Technology Map**  
Inteligencia interna de activos tecnológicos para Innergex Chile.

## Ejecutar la demostración Web v0.1

Con la versión de Node indicada en `.nvmrc`, ejecutar `npm ci` y `npm run dev` desde la raíz. Abrir `http://127.0.0.1:3000`. La Web v0.1 usa datos sintéticos y no requiere conectarse a GLPI.

Rutas principales de demostración:

```text
/#overview                       Panel principal
/#health                         CMDB Health
/#assets                         Explorador de activos
/#assets/DEMO-0013               Asset 360 hero OT
/#assets/DEMO-0013/label         Diseñador QR/etiqueta
/#assets/DEMO-0013/relations     Technology Map
/#q/<demo-locator>               Simulador interno del resolver QR
```

El QR físico de la demo no codifica estas rutas internas: utiliza una URL `.invalid` con locator opaco. El diseñador permite perfiles físicos, 203/300 DPI y exportación SVG real; no simula PNG/PDF ni impresoras que todavía no existen.

Ver [guía de Demo v0.1](docs/demo-v0.1.md), [instrucciones de Web](apps/web/README.md), [Dashboard](docs/dashboard.md), [Asset Explorer](docs/asset-explorer.md), [Asset 360](docs/asset-360.md), [Motor QR y Etiquetado](docs/qr-label-engine.md), [Grafo de Relaciones](docs/relationship-graph.md) y [CMDB Health](docs/cmdb-health.md).

Validación completa: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:demo` y `npm run storybook:build --workspace @igx-nexus/ui`. Las pruebas de navegador requieren `npx playwright install --with-deps chromium`.

## Contratos canónicos v0.2

V02-001 incorpora progresivamente `@igx-nexus/types` bajo `packages/types`. El package modela identidad NEXUS, IT/OT, referencias de fuentes, procedencia, observaciones temporales y relaciones con evidencia sin migrar todavía los consumidores Web de v0.1.

Ver [ADR-0011 — Modelo canónico de Technology Intelligence](docs/architecture/adr-0011-canonical-technology-model.md).
