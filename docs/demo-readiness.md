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
- CMDB-010 ✅ Grafo de Relaciones — PR #27 (`89ca343`)
- CMDB-011 ✅ CMDB Health — PR #29 (`d7ed149`)
- CMDB-012 ✅ Dataset de Demo — PR #32 (`9afb26d`); issue #31 completado

Candidato final:

- CMDB-013 🟡 Demo v0.1 — `feature/cmdb-013-demo-v0-1`; issue #35; pendiente de revisión/merge manual

Integrado en `main`: **12/13 (~92,3%)**. CMDB-013 no cuenta como integrado mientras su PR permanezca abierto. La guía [Demo v0.1](demo-v0.1.md) documenta el recorrido reproducible y el uso de los activos hero. El merge manual de CMDB-013 completa 13/13 del roadmap actual.

## Criterios mínimos para presentar la demo

1. Visualizar un dashboard de estado general de activos.
2. Explorar y buscar activos mediante Asset Explorer.
3. Abrir Asset 360 con identidad, hardware, asignación, ubicación, estado, Health y fuente.
4. Completar `Asset 360 → Label → QR → resolver → mismo Asset 360` sin perder identidad.
5. Mostrar Technology Map con dirección, bidireccionalidad, profundidad 1/2 y navegación entre CI.
6. Mostrar CMDB Health con score, cobertura, dimensiones, findings y drilldown de causas.
7. Utilizar exclusivamente el dataset sintético compartido; sin información corporativa real.
8. Mantener GLPI como motor desacoplado de la experiencia NEXUS.
9. Ejecutar la Web de forma reproducible sin exigir conexión a GLPI.
10. Mantener el stack Docker reproducible y la persistencia ya validada para GLPI/MariaDB/Redis.

## Validación de CMDB-013

`DemoV01.browser.test.tsx` recorre Dashboard → Explorer → Asset 360 → QR/Label → resolver → Asset 360 → Graph → Health y conserva identidad, tema y densidad. Las suites existentes siguen siendo la fuente principal para axe, keyboard/focus, reflow 1440/768/390/320, light/dark, High Contrast, reduced motion, Graph y Health.

Se expone `npm run test:demo` para ejecutar únicamente el smoke integrado. No se agrega un `scripts/qa-demo-v0.1.mjs`, ya que duplicaría el mismo recorrido Browser sin aportar una clase de evidencia diferente.

Objetivo de accesibilidad: WCAG 2.2 AA mediante pruebas automatizadas y revisión funcional, sin declarar certificación formal.

## Estado del baseline visual para la demo

CMDB-005 establece el contrato reusable: design tokens, light/dark, densidad comfortable/compact, `forced-colors`, `prefers-reduced-motion`, `@igx-nexus/ui`, Storybook, AppShell y primitives accesibles. CMDB-013 mantiene ese contrato y evita un rediseño cosmético de último minuto.

## Seguridad y límites de arquitectura

- Todos los activos, responsables, hostnames, seriales, tags, IP y relaciones de la demo son sintéticos.
- TEST-NET-1 se usa para direcciones de ejemplo; la aplicación no se conecta a ellas.
- QR contiene sólo locator opaco y una URL `.invalid`; no contiene serial, IP, propietario o ubicación.
- La Web no accede directamente a MariaDB ni GLPI.
- La arquitectura objetivo permanece `NEXUS Web → futura NEXUS API → adapters/integraciones → fuentes`.
- Technology Map no ejecuta discovery, SNMP ni escaneo OT.
- CMDB Health evalúa calidad del registro, no hardware ni disponibilidad.
- Jira mantiene Service Desk y tickets de soporte.

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
