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

**V02-001 a V02-011 están integrados.**

V02-011 — Demo Dataset v0.2 Migration quedó incorporado mediante PR #70 en el merge `45b1adc4f4977732f10f707e993588ced368578a`; CI post-merge #454 verde. La Demo canónica completa vive en `packages/demo-data`, NEXUS API Demo entrega los 240 CIs y la Web v0.1 proyecta compatibilidad desde la misma fuente.

El siguiente ticket planificado es **V02-012 — Relationship Evidence v2**.

Roadmap activo: [IGX NEXUS v0.2 — Technology Intelligence](docs/roadmap-v0.2.md).

La dirección conceptual posterior reserva:

- **v0.3 — Intelligence & Automation**;
- **v0.4 — Product Experience**;
- **v0.5 — Corporate Infrastructure**;
- **v0.6 — Cybersecurity Assurance**;
- **v0.7 — Quality Assurance**.

Ese norte no debe introducir scope creep dentro de v0.2.

## Demo canónica

La Demo mantiene:

- 240 CIs sintéticos;
- IDs estables `DEMO-0001..DEMO-0240`;
- corte fijo `2026-09-09T12:00:00.000Z`;
- 11 escenarios hero;
- 18 relationship fixtures;
- TEST-NET para IP;
- QR/locators reproducibles;
- comportamiento histórico de Dashboard, Explorer, Asset 360 y CMDB Health.

La fuente autorada es:

```text
packages/demo-data
```

`apps/web/src/demo-dataset.ts` es un adapter temporal de presentación para la Web v0.1; no es una segunda fuente de inventario.

Ver [Dataset de Demo](docs/demo-dataset.md) y [ADR-0021](docs/architecture/adr-0021-canonical-demo-dataset-v02.md).

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

Ver:

- [ADR-0011 — Canonical Technology Model](docs/architecture/adr-0011-canonical-technology-model.md)
- [ADR-0019 — Provenance & Reconciliation](docs/architecture/adr-0019-provenance-reconciliation.md)
- [IT/OT Taxonomy v2](docs/taxonomy-v2.md)
- [ADR-0020 — IT/OT Taxonomy v2](docs/architecture/adr-0020-it-ot-taxonomy-v2.md)
- [ADR-0021 — Demo Dataset canónico v0.2](docs/architecture/adr-0021-canonical-demo-dataset-v02.md)

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
- reconciliation y Taxonomy v2.

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

## Demo Web v0.1

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

La Web Demo no necesita GLPI, credenciales ni Docker.

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

CI post-merge de V02-011: **#454 verde**.

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
