# Visión Futura de IGX NEXUS — Innergex Chile

## Propósito

IGX NEXUS debe evolucionar desde una CMDB/ITAM hacia una plataforma de Inteligencia de Activos Tecnológicos para Innergex Chile, manteniendo el foco inicial en inventario, trazabilidad, ciclo de vida, calidad de datos y descubrimiento confiable.

Las capacidades descritas aquí forman un backlog de evolución. No todas pertenecen a la Demo v0.1.

## Capacidades futuras prioritarias

### Descubrimiento y reconciliación

- GLPI Agent para inventario de hardware y software.
- Microsoft Intune y Microsoft Entra ID mediante Microsoft Graph.
- Microsoft Defender para postura y estado de seguridad cuando esté disponible.
- SNMPv3 para switches, access points, impresoras, UPS, PDU y otros dispositivos de red.
- Nmap/XML para detección de activos desconocidos y Shadow Assets.
- VMware/vCenter, Hyper-V y Azure Resource Graph para infraestructura virtual y cloud.
- Reconciliation Engine para identificar que múltiples fuentes representan el mismo CI.
- Confidence Score basado en serial, UUID, identificadores de gestión, MAC y hostname.

### Ciclo de vida y garantías

- Fecha de compra, recepción, asignación, devolución, reparación, stock, baja y disposición final.
- Consulta y normalización de garantía por número de serie/service tag cuando el fabricante o proveedor lo permita.
- Alertas por garantías próximas a vencer.
- EOL/EOS y políticas de renovación.
- Costos, proveedor, orden de compra, centro de costo, vida útil y TCO.

### Actas y trazabilidad

- Acta de entrega generada desde los activos asignados.
- Acta de recepción/devolución.
- Aceptación digital por usuario y aprobación de jefatura mediante identidad corporativa.
- Registro de fecha, actor, evidencia, versión del documento y hash de integridad.
- Documentos finales inmutables y asociados al CI.
- Integración futura con repositorios corporativos de documentos cuando corresponda.

### Gestión de stock e inventario físico

- Stock disponible, asignado, en preparación, reparación, devolución y baja.
- Niveles mínimos y alertas de reposición.
- Inventario físico mediante QR.
- Campañas de inventario con esperados, encontrados, faltantes y activos no registrados.
- Métrica de precisión entre inventario físico y CMDB.

### Métricas y KPI

- Asset Coverage.
- Assignment Accuracy.
- CMDB Completeness.
- Data Freshness.
- Warranty Coverage.
- EOL Exposure.
- Asset Utilization.
- Stock Coverage.
- Mean Asset Age.
- Refresh Compliance.
- Inventory Accuracy.
- Unmanaged Assets.
- Duplicate CI Rate.
- Orphan CI Rate.
- Lifecycle Compliance.
- Cost per Employee.
- Repair Rate y Failure Rate por modelo/fabricante.
- Warranty Claim Rate.

### Inteligencia de seguridad

- NVD para CVE/CPE.
- CISA KEV para vulnerabilidades conocidas como explotadas.
- FIRST EPSS para probabilidad estimada de explotación.
- Asset Risk Score combinando vulnerabilidades, EOL, compliance, cifrado, edad, garantía, frescura y exposición.

### Automatización

- Garantía próxima a vencer → alerta TI.
- Stock bajo mínimo → alerta de reposición.
- Usuario deshabilitado/offboarding → activos asignados pendientes de recuperación.
- Nuevo ingreso/onboarding → recomendación de perfil y kit tecnológico.
- Activo detectado en red y no reconciliado → Shadow Asset.
- Datos obsoletos → regla de CMDB Health.
- Relación con Jira sólo como referencia o automatización externa; NEXUS no implementará Service Desk.

## Ciencia de datos y DATRYA

Una integración futura con DATRYA podrá utilizar datos normalizados o anonimizados de IGX NEXUS para:

- predicción de renovación.
- análisis de fallas por modelo, fabricante y antigüedad.
- detección de anomalías.
- clustering de perfiles tecnológicos.
- proyección de stock y consumo.
- proyección presupuestaria de renovación.
- recomendaciones determinísticas y posteriormente predictivas.

Principio de integración:

**DATRYA recomienda. IGX NEXUS informa y contextualiza. El humano decide.**

Ambos productos deben permanecer desacoplados mediante contratos/API y no compartir lógica interna ni bases de datos de forma directa.

## Expansión futura

El producto se desarrolla primero para Innergex Chile. Si demuestra valor y estabilidad, la arquitectura podrá habilitar nuevas entidades, por ejemplo Innergex Canadá, sin rediseñar el núcleo del producto.

La expansión internacional será un despliegue posterior y no debe aumentar innecesariamente el alcance de la primera implementación chilena.
