# IGX NEXUS

> **The Technology Map** — by Innergex

IGX NEXUS es una plataforma interna de **CMDB, IT Asset Management e Inteligencia de Activos Tecnológicos** para **Innergex Chile**.

Su objetivo es transformar inventario técnico y evidencia multisource en una visión tecnológica trazable, explicable y útil para operación, gestión de activos, calidad CMDB, lifecycle y futuras capacidades de inteligencia.

## Alcance actual

La implementación actual está diseñada para Innergex Chile. La arquitectura debe seguir preparada para expansión futura, pero esa expansión no forma parte del alcance actual.

### Incluido

- CMDB / ITAM;
- descubrimiento e inventario de activos;
- relaciones entre elementos de configuración;
- Asset 360;
- identificación mediante QR;
- CMDB Health y calidad de datos;
- lifecycle, responsables, ubicaciones y garantías;
- integración con fuentes corporativas autoritativas;
- provenance y reconciliación multisource;
- taxonomía IT/OT explícita;
- métricas y capacidades analíticas;
- auditabilidad y seguridad desde el diseño.

### Fuera de alcance

- Service Desk / Help Desk;
- creación y gestión de tickets de soporte;
- active scanning sobre OT;
- despliegue productivo corporativo durante v0.2.

Jira continúa siendo el sistema de Service Desk; NEXUS no debe duplicar esa responsabilidad.

## Principios de arquitectura

1. **GLPI continúa como System of Record CMDB/ITAM.**
2. **NEXUS actúa como Intelligence Layer.**
3. **Evidence before inference.**
4. **IT and OT share a platform, not a taxonomy.**
5. **Human before automation.**
6. La Web nunca habla directamente con GLPI.
7. Demo nunca se presenta como evidencia corporativa real.
8. No se versionan secretos, PII ni inventario corporativo real.

Arquitectura lógica actual:

```text
IGX NEXUS Web
      |
      v
  NEXUS API
      |
      v
TechnologyProvider / Reconciliation Layer
      |                    |
     Demo                 Live
      |                    |
packages/demo-data       GLPI v2.3
```

Desde v0.2, la identidad NEXUS y los contratos canónicos permanecen desacoplados de IDs y taxonomías internas de cada fuente.

## Estado del proyecto

### v0.1 — Demo Local Innergex Chile ✅

Completada: **13/13 tickets — 100%**.

La v0.1 respondió:

> **¿Podemos construir la idea?**

### v0.2 — Technology Intelligence 🚧

La v0.2 responde:

> **¿Puede IGX NEXUS convertirse realmente en una plataforma de Technology Intelligence para Innergex?**

**V02-001 a V02-014 están integrados.**

V02-014 — Shell & Motion 2.0 quedó incorporado mediante PR #80 en el merge `e650e288b47903d6811675aa265ac7f0141f51a7`; CI post-merge #537 verde. NEXUS ya materializa Product IA v2 en el shell real con navegación global y contextual separadas, Demo/Live como contexto de fuente, preferencias persistentes de theme/density, responsive móvil accesible y motion breve compatible con reduced motion.

El trabajo actual es **V02-015 — Technology Overview** (issue #82).

Roadmap activo: [IGX NEXUS v0.2 — Technology Intelligence](docs/roadmap-v0.2.md).

La dirección conceptual posterior reserva:

- **v0.3 — Intelligence & Automation**;
- **v0.4 — Product Experience**;
- **v0.5 — Corporate Infrastructure**;
- **v0.6 — Cybersecurity Assurance**;
- **v0.7 — Quality Assurance**.

Ese norte no debe introducir scope creep dentro de v0.2.

## Product IA v2

V02-013 establece como baseline:

- Demo y Live comparten una arquitectura mental única;
- Overview responde **¿Qué requiere atención ahora y por qué?**;
- navegación global y navegación contextual permanecen separadas;
- Assets/Explorer y Technology Map son workspaces de investigación;
- Asset 360 se organiza por intención y no como scroll infinito de cards;
- Data Quality permanece separada de Device Health;
- Technology Map adopta focus/scope-first y alternativa semántica table/tree;
- QR/Label son acciones contextuales del CI;
- WCAG 2.2 AA forma parte del contrato de producto.

Ver [Product IA v2](docs/product/product-ia-v2.md), [Visual Direction v2](docs/product/visual-direction-v2.md), [Screen Purpose Matrix](docs/product/screen-purpose-matrix.md) y [ADR-0023](docs/architecture/adr-0023-product-information-architecture-v2.md).

## Shell & Motion 2.0

V02-014 materializa Product IA v2 en la experiencia real de navegación:

- navegación global separada de anchors contextuales del contenido;
- Demo y Live visibles como contexto de fuente, no como productos distintos;
- header contextual por view/workspace;
- preferencias `light | dark` y `comfortable | compact` con persistencia segura;
- fallback inicial de tema a `prefers-color-scheme` cuando no existe elección guardada;
- drawer móvil con focus trap, Escape, restauración de foco, `inert` y bloqueo de scroll;
- responsive usable a 320 CSS px;
- motion espacial breve y localizado, compatible con `prefers-reduced-motion`;
- sin dependencias nuevas ni reemplazo del router.

Ver [Shell & Motion 2.0](docs/product/shell-motion-v2.md) y [Technology Scan V02-014](docs/product/technology-scan-v02-014.md).

## Technology Overview

V02-015 transforma `#overview` en una superficie de triage que responde **¿Qué requiere atención ahora y por qué?**. La vista prioriza contexto, cobertura, señales explicables, hechos resumidos y drill-downs existentes, sin inventar KPIs ni adelantar V02-019.

Demo y Live comparten Overview. Live sólo presenta datos soportados por NEXUS API y comunica cobertura parcial sin fallback silencioso a Demo.

Ver [Technology Overview](docs/product/technology-overview-v2.md).

## Demo canónica

La Demo mantiene:

- 240 CIs sintéticos;
- IDs estables `DEMO-0001..DEMO-0240`;
- 18 relaciones canónicas `DEMO-REL-001..DEMO-REL-018`;
- corte fijo `2026-09-09T12:00:00.000Z`;
- 11 escenarios hero;
- TEST-NET para IP;
- QR/locators reproducibles;
- comportamiento histórico de Dashboard, Explorer, Asset 360 y CMDB Health.

La fuente autorada es:

```text
packages/demo-data
```

`apps/web/src/demo-dataset.ts` es un adapter temporal de presentación para la Web v0.1; no es una segunda fuente de inventario ni relaciones.

Ver [Dataset de Demo](docs/demo-dataset.md), [ADR-0021](docs/architecture/adr-0021-canonical-demo-dataset-v02.md) y [ADR-0022](docs/architecture/adr-0022-relationship-evidence-v2.md).

## Contratos canónicos v0.2

`@igx-nexus/types` modela:

- identidad canónica;
- `SourceReference`;
- provenance/evidence;
- observations;
- relationships;
- lifecycle y criticality;
- `TechnologyTaxonomyAssessment`;
- `OperationalContextReference`;
- reconciliación multisource.

Taxonomy v2 mantiene `domain` cerrado a `IT | OT`. `unknown`, `unclassified` y `conflict` son estados del assessment, no domains.

V02-011 retiró del contrato activo los aliases taxonómicos pre-v2 (`compute`, `laptop`, `plc`, `hmi`, etc.). Esos términos pueden existir como vocabulario de fuente o documentación histórica, pero ya no son valores canónicos válidos.

GLPI conserva temporalmente un **compatibility scalar projection** para assessments no resueltos porque schema `0.2` aún exige scalars concretos. Ese fallback usa únicamente valores v2 (`IT / endpoint / user_endpoint`), queda marcado como compatibilidad y nunca altera la verdad del assessment.

V02-012 establece que una relación es un claim canónico respaldado por evidencia. `RelationshipEvidence` separa source, authority, derivation y confidence; `observedAt=null` representa fecha realmente desconocida y no se sustituye por el corte del snapshot.

Ver:

- [ADR-0011 — Canonical Technology Model](docs/architecture/adr-0011-canonical-technology-model.md)
- [ADR-0019 — Provenance & Reconciliation](docs/architecture/adr-0019-provenance-reconciliation.md)
- [IT/OT Taxonomy v2](docs/taxonomy-v2.md)
- [ADR-0020 — IT/OT Taxonomy v2](docs/architecture/adr-0020-it-ot-taxonomy-v2.md)
- [ADR-0021 — Demo Dataset canónico v0.2](docs/architecture/adr-0021-canonical-demo-dataset-v02.md)
- [ADR-0022 — Relationship Evidence v2](docs/architecture/adr-0022-relationship-evidence-v2.md)
- [ADR-0023 — Product Information Architecture v2](docs/architecture/adr-0023-product-information-architecture-v2.md)

## NEXUS API v0.2

Runtime actual:

- Node.js 24;
- TypeScript ESM / NodeNext;
- Fastify 5;
- OpenAPI;
- logging estructurado;
- CORS explícito;
- security headers;
- rate limiting;
- auth/authz deny-by-default para rutas de dominio;
- Provider Mode Demo/Live;
- adapter GLPI 11 High-Level API v2.3 read-only;
- OAuth de identidad técnica GLPI;
- reconciliation, Taxonomy v2 y Relationship Evidence v2.

Endpoints base:

```text
GET /health
GET /ready
GET /api/v1
GET /api/v1/provider
GET /api/v1/technology/snapshot
GET /openapi.json
```

`/health` expresa liveness. `/ready` comprueba además disponibilidad efectiva del provider y no cae silenciosamente de Live a Demo.

Ver [README de NEXUS API](services/api/README.md).

## Web NEXUS — Demo/Live

Con Node indicado en `.nvmrc`:

```bash
npm ci
npm run dev
```

Abrir `http://127.0.0.1:3000`.

Rutas principales:

```text
/#overview
/#health
/#assets
/#assets/DEMO-0013
/#assets/DEMO-0013/label
/#assets/DEMO-0013/relations
/#q/<demo-locator>
```

En modo Demo, la Web no necesita GLPI, credenciales ni Docker. En modo Live Lab, la Web consume exclusivamente NEXUS API y no habla directamente con GLPI.

## Validación

Baseline de CI exige, entre otros:

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run test:demo
npm run storybook:build --workspace @igx-nexus/ui
```

CI post-merge de V02-014: **#537 verde** sobre `e650e288b47903d6811675aa265ac7f0141f51a7`.

## Flujo de desarrollo

- `main` es la línea base estable;
- cada ticket se implementa en rama dedicada;
- Conventional Commits;
- PR + CI antes de integrar;
- merge final a `main` permanece manual;
- no auto-merge.

## Idioma

- documentación, issues y PRs: español;
- código e identificadores técnicos: inglés cuando favorezca consistencia;
- nombres oficiales de tecnologías no se traducen.

---

**IGX NEXUS — The Technology Map**  
Technology Intelligence para Innergex Chile.
