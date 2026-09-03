# ADR-0001 — Límites del producto

Estado: Aceptado

## Decisión

IGX NEXUS es un producto de CMDB e Inteligencia de Activos TI. No implementará gestión de tickets de Service Desk o Help Desk, porque Innergex utiliza Jira para esa función.

GLPI se considera un motor CMDB/ITAM y un objetivo de integración, no la interfaz de usuario del producto. La aplicación web de IGX NEXUS se comunicará a través de una NEXUS API dedicada y no debe escribir directamente en las tablas de la base de datos de GLPI.

## Consecuencias

- La interfaz permanece moderna, con identidad propia y capacidad de evolucionar de forma independiente.
- Las actualizaciones de GLPI tienen menor probabilidad de afectar la experiencia del producto.
- Las reglas de negocio, la reconciliación y los flujos QR viven fuera del núcleo de GLPI.
- Jira permanece como la plataforma autoritativa para los flujos de soporte.
