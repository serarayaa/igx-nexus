# IGX NEXUS v0.3 — IT CMDB

Estado: **scope reset aprobado / ejecución por tickets V03-CMDB-***  
Baseline de inicio: `main@eb87c68ee2a17b793e34e457c4e2914567889bb1`

## Definición de v0.3

**IGX NEXUS v0.3 = CMDB TI completa, moderna y visualmente premium, construida sobre GLPI + GLPI Agent.**

Objetivo de release:

> Entregar una CMDB TI utilizable en producción, integrada con GLPI, capaz de representar inventario, software, lifecycle, relaciones, calidad e historial mediante una experiencia moderna, confiable y extensible.

NEXUS no es sólo una skin de GLPI. GLPI permanece como System of Record CMDB/ITAM; NEXUS normaliza, relaciona, explica, visualiza y organiza la experiencia de inventario.

## Exit gate funcional

La release no se considera utilizable mientras no pueda afirmarse:

> “Puedo buscar un equipo, abrirlo, entender qué es, dónde está, quién lo usa, qué hardware/software tiene, cuándo fue observado y qué tan completa es su información.”

## Secuencia V03-CMDB

| Orden / ID | Resultado esperado | Gate principal |
| --- | --- | --- |
| V03-CMDB-00 | Scope Freeze / Product Reset | definición única de v0.3, non-goals, IA, fuentes, preservación y roadmap |
| V03-CMDB-01 | GLPI/Agent capability + Live data contract audit | matriz Exposed / Authorized / Populated / Gap con least privilege |
| V03-CMDB-02 | Canonical CMDB + Provider 2.0 + provenance/history model | modelo estructurado sin aplanar GLPI en attributes; compatibilidad controlada |
| V03-CMDB-03 | Premium CMDB Experience Foundation | shell CMDB, navegación, a11y y dirección visual aprobada |
| V03-CMDB-04 | Overview | estado del inventario, atención, lifecycle, calidad y cambios |
| V03-CMDB-05 | Assets Explorer | Visual + Table, filtros, URL state y búsqueda |
| V03-CMDB-06 | Asset 360 | identity, assignment, hardware, OS, software, lifecycle, relations, history, provenance |
| V03-CMDB-07 | Software | productos, versiones, instalaciones y activos |
| V03-CMDB-08 | Network | inventario soportado por fuentes reales; gaps explícitos |
| V03-CMDB-09 | Relationships | User ↔ Device ↔ Software ↔ Network ↔ Location con provenance |
| V03-CMDB-10 | Lifecycle | reglas y campos reales; sin inferencia silenciosa |
| V03-CMDB-11 | CMDB Health | completeness, freshness, consistency, uniqueness y relationship coverage |
| V03-CMDB-12 | Changes / History | snapshots, diff semántico, timeline y evidencia |
| V03-CMDB-13 | Global Search / Command Palette | búsqueda transversal y navegación rápida |
| V03-CMDB-14 | Product Polish | responsive, motion, microinteracciones, visual QA y accesibilidad |
| V03-CMDB-15 | Release Hardening | regresión, seguridad, performance, documentación y release gate |

No reutilizar los IDs históricos `V03-001..` para estos tickets.

## IA objetivo

La IA de v0.3 queda acotada a:

- Overview
- Assets
- Software
- Network
- Relationships
- Lifecycle
- Data Quality / CMDB Health
- Changes / History
- Asset 360
- Global Search / Command Palette

Una superficie sólo se considera terminada si mantiene navegación por teclado, foco visible, contraste objetivo WCAG AA, reduced motion, alternativa semántica a visualizaciones y reflow móvil razonable.

## Estrategia de fuentes

### GLPI + GLPI Agent

Base canónica para CMDB/ITAM v0.3:

- activos físicos;
- hardware;
- sistema operativo;
- software;
- users/assignment cuando la relación esté disponible;
- entidades y ubicaciones;
- lifecycle/status;
- relaciones soportadas;
- inventario observado por Agent.

### NEXUS

Responsable de modelo canónico independiente de IDs GLPI, provenance, reconciliación, snapshots, diff/historial semántico, calidad de datos y experiencia de producto.

### Complementarias

- Entra: identidad/account/org.
- Intune: management/enrollment/managed state/primary user/compliance.
- Zabbix: disponibilidad y telemetría operacional.

No recrear monitoreo operacional en GLPI/NEXUS si Zabbix es la fuente adecuada. No añadir una fuente nueva sólo porque técnicamente exista: primero debe haber gap probado y requisito real.

## Non-goals de v0.3

Quedan fuera:

- OT CMDB & Discovery;
- ciberseguridad TI/OT;
- vulnerability scanning;
- Wazuh / Greenbone productivo;
- Malcolm / Zeek / ICSN productivo;
- Intelligence / Analytics & Data Science;
- ML/IA;
- automatización autónoma;
- topología inventada desde señales insuficientes.

Dirección futura:

- **v0.4 — OT CMDB & Discovery**
- **v0.5 — Cybersecurity**
- **v0.6 — Intelligence / Analytics & Data Science**

## Preservación del trabajo anterior

El reset no elimina trabajo previo.

| Trabajo previo | Decisión |
| --- | --- |
| V03-002 Design System & Semantic/Brand Foundations | preservar como foundation reusable |
| V03-008 Cross-Surface State & Navigation Contract | preservar; integrado en main mediante PR #137 |
| V03-003 / V03-003A | no mergear; preservar como investigación histórica |
| PR #138 | cerrado como superseded, sin merge |
| research visual/spatial/2.5D/map | inspiración futura, no requisito v0.3 |
| componentes/contratos v0.2 | reutilizar cuando encajen; no asumir suficiencia para Provider 2.0 |

La dirección visual final de la CMDB se decide nuevamente en V03-CMDB-03.

## Estado inmediato

- `V03-CMDB-00`: activo en `feature/v03-cmdb-00-scope-reset`.
- `V03-CMDB-01`: auditoría Live ejecutada en `feature/v03-cmdb-01-glpi-capability-audit`; se integra después del scope reset.
- `V03-CMDB-02`: no iniciar hasta integrar el scope reset y consolidar la auditoría de capacidades.

Documento canónico de scope: `docs/product/v0.3-it-cmdb-scope.md`.
