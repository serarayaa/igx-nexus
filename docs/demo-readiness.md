# Preparación de la Demo v0.1 — Innergex Chile

## Objetivo

La Demo v0.1 debe demostrar que IGX NEXUS puede convertirse en el sistema oficial de inventario y CMDB de Innergex Chile, justificando su promoción desde el notebook local de desarrollo hacia un servidor corporativo.

La demo no necesita contener todas las capacidades futuras del producto. Debe probar con claridad la arquitectura, la experiencia de usuario y el valor operativo del sistema.

## Estado actual

Completado e integrado:

- CMDB-001 ✅ Inicio / Arquitectura / Alcance
- CMDB-002 ✅ Repositorio y Entorno Local
- CMDB-003 ✅ Stack de Desarrollo Docker
- CMDB-004 ✅ Núcleo GLPI
- CMDB-005 ✅ Sistema de Diseño IGX — PR #16
- CMDB-006 ✅ Panel Principal — PR #17 (`93b6474`)
- CMDB-007 ✅ Explorador de Activos — PR #19 (`2f7e61f`)
- CMDB-008 ✅ Asset 360° — PR #21 (`bdee501`)
- CMDB-009 ✅ Motor QR y Etiquetado — PR #23 (`5b0b0a9`); issue #22 cerrado
- CMDB-010 ✅ Grafo de Relaciones — integrado mediante PR #27 (`89ca343`)
- CMDB-011 ✅ CMDB Health — integrado mediante PR #29 (`d7ed149`)
- CMDB-012 ✅ Dataset de Demo — integrado mediante PR #32 (`9afb26d`); issue #31 completado; CI post-merge #128 verde

Pendiente para la demo:

- CMDB-013 ⬜ Demo v0.1

Integrado en `main`: **12/13 (~92,3%)**. CMDB-012 completado e integrado mediante PR #32; el [Dataset de Demo](demo-dataset.md) documenta casos hero, distribuciones, relaciones, métricas y límites. CMDB-013 — Demo v0.1 es el siguiente y último ticket del roadmap actual.

CMDB-008 conecta el Explorer con una ficha individual mediante `#assets/<nexusAssetId>`. Incluye identidad, asignación, ubicación, hardware, lifecycle, garantía, frescura/calidad básica, fuente demo, estados de carga/error/not-found y navegación accesible.

CMDB-009 está integrado. Añade locator opaco separado de `Asset.id`, QR sin datos sensibles, diseñador de etiquetas, perfiles físicos 203/300 DPI y exportación SVG. La demo usa una base `.invalid` y un simulador hash interno para no fingir infraestructura productiva.

CMDB-010 añade el primer Technology Map: relaciones dirigidas y simétricas, foco por CI, navegación Asset 360, filtros mínimos, layout estable y representación semántica equivalente. El dataset es sintético y no ejecuta discovery.

## Estado del baseline visual para la demo

CMDB-005 establece un contrato reusable: design tokens, light/dark, densidad comfortable/compact, `forced-colors`, `prefers-reduced-motion`, `@igx-nexus/ui`, Storybook, AppShell y primitives accesibles. CMDB-009 reutiliza ese baseline y mantiene la salida física del label independiente del tema.

## Criterios mínimos para presentar la demo

1. Visualizar un dashboard de estado general de activos.
2. Explorar y buscar activos mediante un Asset Explorer.
3. Abrir un Asset 360° con identidad, hardware, asignación, ubicación, estado y fuentes de datos.
4. Mostrar relaciones entre activos o CI mediante un grafo comprensible.
5. Generar un QR seguro por diseño, sin datos sensibles, y una etiqueta física exportable.
6. Mostrar un indicador CMDB Health con completitud, frescura y calidad de datos.
7. Utilizar un dataset sintético representativo de Innergex Chile, sin información corporativa real.
8. Mantener GLPI como motor desacoplado de la experiencia NEXUS.
9. Ejecutar de forma reproducible mediante Docker Compose.
10. Demostrar que los datos sobreviven reinicios normales del stack.

## Gate de oficialización

Si la Demo v0.1 es aprobada por TI Chile, el proyecto pasa a una etapa de piloto/producción controlada en servidor corporativo.

Antes de utilizar datos reales y emitir QR físicos permanentes deberán agregarse, al menos:

- HTTPS y URL corporativa estable;
- autenticación corporativa / Entra ID SSO;
- RBAC y principio de mínimo privilegio;
- gestión segura de secretos;
- backup y restauración probados;
- monitoreo y logs persistentes;
- estrategia de actualización de GLPI, NEXUS y dependencias;
- política de retención y auditoría;
- resolver `/q/:locator` de servidor;
- persistencia, unicidad, emisión segura y política de revocación/reemplazo de locators;
- pruebas físicas de impresión y lectura con hardware/material real.

## Migración notebook local → servidor corporativo

La arquitectura actual fue diseñada para minimizar esta migración. Docker Compose, imágenes, configuración declarativa y volúmenes permiten reproducir el stack en un host Linux compatible.

### Dificultad estimada

**Baja a media** para la capa técnica, siempre que el servidor corporativo entregue Linux/VM compatible, Docker Engine/Compose, almacenamiento suficiente, DNS y conectividad requerida.

La parte más delicada no será mover el código, sino integrar correctamente el entorno corporativo: certificados, DNS, firewall, SSO, secretos, backups, acceso a Intune/Entra y políticas de seguridad.

### Estrategia prevista

1. Aprovisionar servidor corporativo Linux.
2. Instalar Docker Engine y Docker Compose.
3. Clonar el repositorio desde GitHub.
4. Crear secretos corporativos sin copiar el `.env` local.
5. Restaurar/copiar volúmenes sólo si contienen información que deba conservarse; para la demo sintética puede hacerse una instalación limpia.
6. Levantar el stack y validar healthchecks.
7. Configurar DNS y HTTPS.
8. Configurar autenticación, RBAC y resolver QR.
9. Ejecutar pruebas funcionales, físicas y de restauración.
10. Habilitar progresivamente fuentes reales de Innergex Chile.

## Principio de promoción

El notebook actual es un entorno de desarrollo, no el servidor definitivo. Todo componente debe mantenerse reproducible desde código/configuración para evitar dependencias ocultas de la máquina del desarrollador.

## CMDB-011 integrado

Motor de calidad explicable, cobertura, findings, vista `#health` y resumen Asset 360. Reutiliza fixtures/proveedores y reglas comunes; no evalúa hardware ni disponibilidad. Fórmula y QA en [CMDB Health](cmdb-health.md).

## CMDB-012 integrado

Dataset sintético único y determinista para Dashboard, Explorer, Asset 360, QR, Technology Map y CMDB Health. Mantiene 240 CI, 18 relaciones y 11 activos hero sobre la misma fuente compartida. Integrado mediante PR #32, con issue #31 completado y CI post-merge #128 verde. CMDB-013 queda como siguiente y último ticket para validar y pulir la Demo v0.1 de punta a punta.
