# Preparación de la Demo v0.1 — Innergex Chile

## Objetivo

La Demo v0.1 debe demostrar que IGX NEXUS puede convertirse en el sistema oficial de inventario y CMDB de Innergex Chile, justificando su promoción desde el notebook local de desarrollo hacia un servidor corporativo.

La demo no necesita contener todas las capacidades futuras del producto. Debe probar con claridad la arquitectura, la experiencia de usuario y el valor operativo del sistema.

## Estado actual

Completado:

- CMDB-001 ✅ Inicio / Arquitectura / Alcance
- CMDB-002 ✅ Repositorio y Entorno Local
- CMDB-003 ✅ Stack de Desarrollo Docker

Pendiente para la demo:

- CMDB-004 ⬜ Núcleo GLPI
- CMDB-005 ⬜ Sistema de Diseño IGX
- CMDB-006 ⬜ Panel Principal
- CMDB-007 ⬜ Explorador de Activos
- CMDB-008 ⬜ Asset 360°
- CMDB-009 ⬜ Motor QR
- CMDB-010 ⬜ Grafo de Relaciones
- CMDB-011 ⬜ CMDB Health
- CMDB-012 ⬜ Dataset de Demo
- CMDB-013 ⬜ Demo v0.1

Por conteo de tickets, el avance es 3 de 13: aproximadamente **23% completado** y **77% pendiente**.

Este porcentaje no representa horas de trabajo lineales: la infraestructura base ya está operativa, por lo que varios tickets posteriores pueden construirse sobre un entorno validado.

## Criterios mínimos para presentar la demo

La demo debe permitir, como mínimo:

1. Visualizar un dashboard de estado general de activos.
2. Explorar y buscar activos mediante un Asset Explorer.
3. Abrir un Asset 360° con identidad, hardware, asignación, ubicación, estado y fuentes de datos.
4. Mostrar relaciones entre activos o CI mediante un grafo comprensible.
5. Generar o representar un QR seguro que apunte al activo autenticado.
6. Mostrar un indicador CMDB Health con completitud, frescura y calidad de datos.
7. Utilizar un dataset sintético representativo de Innergex Chile, sin información corporativa real.
8. Mantener GLPI como motor desacoplado de la experiencia NEXUS.
9. Ejecutar de forma reproducible mediante Docker Compose.
10. Demostrar que los datos sobreviven reinicios normales del stack.

## Gate de oficialización

Si la Demo v0.1 es aprobada por TI Chile, el proyecto pasa a una etapa de piloto/producción controlada en servidor corporativo.

Antes de utilizar datos reales deberán agregarse, al menos:

- HTTPS.
- autenticación corporativa / Entra ID SSO.
- RBAC y principio de mínimo privilegio.
- gestión segura de secretos.
- backup y restauración probados.
- monitoreo y logs persistentes.
- estrategia de actualización de GLPI, NEXUS y dependencias.
- política de retención y auditoría.

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
5. Restaurar/copiar los volúmenes sólo si contienen información que deba conservarse; para la demo sintética puede hacerse una instalación limpia.
6. Levantar el stack y validar healthchecks.
7. Configurar DNS y HTTPS.
8. Configurar autenticación y permisos corporativos.
9. Ejecutar pruebas funcionales y de restauración.
10. Habilitar progresivamente fuentes reales de Innergex Chile.

## Principio de promoción

El notebook actual es un entorno de desarrollo, no el servidor definitivo. Todo componente debe mantenerse reproducible desde código/configuración para evitar dependencias ocultas de la máquina del desarrollador.
