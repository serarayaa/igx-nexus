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

Avance formal integrado: **7/13 tickets (~53,8%)**. CMDB-007 — Explorador de Activos está integrado mediante PR #19. CMDB-008 — Asset 360 se desarrolla en `feature/cmdb-008-asset-360` y sólo contará después de su merge manual.

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

Con la versión de Node indicada en `.nvmrc`, ejecutar `npm ci` y `npm run dev`
desde la raíz. Abrir `http://127.0.0.1:3000`. La Web usa datos sintéticos y no
requiere conectarse a GLPI.

Rutas principales de demostración:

```text
/#overview              Panel principal
/#assets                Explorador de activos
/#assets/DEMO-0002      Asset 360 de un activo sintético
```

El Explorer permite buscar, filtrar, ordenar y paginar el mismo inventario demo del Dashboard. Asset 360 añade una ficha individual con identidad, hardware, asignación, ubicación, lifecycle, garantía, frescura/calidad básica y fuente demo.

Ver [instrucciones de Web](apps/web/README.md), [Dashboard](docs/dashboard.md), [Asset Explorer](docs/asset-explorer.md), [Asset 360](docs/asset-360.md) y [ADR-0006](docs/architecture/adr-0006-asset-360-routing.md).

Validación completa: `npm run typecheck`, `npm run build`, `npm test` y
`npm run storybook:build --workspace @igx-nexus/ui`. Las pruebas de navegador
requieren `npx playwright install --with-deps chromium`.
