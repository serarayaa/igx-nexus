# Visión Futura de IGX NEXUS — Innergex Chile

## Propósito

IGX NEXUS debe evolucionar desde una CMDB/ITAM hacia una plataforma de Inteligencia de Activos Tecnológicos para Innergex Chile, manteniendo el foco inicial en inventario, trazabilidad, ciclo de vida, calidad de datos y descubrimiento confiable.

Las capacidades descritas aquí forman un backlog de evolución. No todas pertenecen a la Demo v0.1.

## Capacidades futuras prioritarias

### Descubrimiento, fuentes y reconciliación

La visión es multifuente. NEXUS no debe asumir que todos los CI ejecutan GLPI Agent:

| Dominio / activo | Fuentes previstas | Restricción principal |
|---|---|---|
| Windows / Linux administrado | GLPI Agent | inventario autenticado y controlado |
| Switch, router, AP, PDU, UPS, impresora | GLPI Network Discovery, SNMPv3 y APIs cuando corresponda | read-only, credenciales protegidas, segmentación |
| Teléfonos corporativos | Microsoft Intune + Microsoft Graph | permisos mínimos y scopes controlados |
| Identidad / ownership | Microsoft Entra ID | no convertir Entra en CMDB paralela |
| Postura de seguridad | Microsoft Defender cuando corresponda | normalizar señales, no duplicar su función |
| Virtual/cloud | VMware/vCenter, Hyper-V, Azure Resource Graph | reconciliar identidad del CI |
| OT / ICS | SNMP/API/vendor/passive/import mediante collectors controlados | safety y disponibilidad por sobre cobertura |

NEXUS normaliza y reconcilia estas señales en una identidad única del CI. La fuente original conserva su autoridad sobre los atributos que le correspondan.

En redes IT, herramientas activas como Nmap/XML pueden evaluarse para Shadow Assets únicamente en rangos aprobados y bajo controles explícitos. **No deben trasladarse por defecto a OT**.

Para OT/ICS no se asume que active scanning sea seguro. La estrategia debe priorizar read-only, segmentación, collectors controlados, SNMPv3 cuando sea apropiado, APIs/vendor y passive discovery o imports cuando el riesgo operativo lo aconseje. Ninguna función de NEXUS debe comprometer disponibilidad ni safety de procesos industriales.

El Reconciliation Engine futuro podrá utilizar serial, UUID, identificadores de gestión, MAC, hostname y otras señales para estimar confianza, sin exponer esos atributos en códigos QR físicos.

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
- Inventario físico mediante QR con locator opaco y política de revocación.
- Campañas de inventario con esperados, encontrados, faltantes y activos no registrados.
- Métrica de precisión entre inventario físico y CMDB.
- Generación por lotes y adaptadores de impresión ZPL/EPL/browser/vendor sin acoplar el núcleo QR.

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

La arquitectura de seguridad busca alinearse progresivamente con buenas prácticas de OWASP, NIST Cybersecurity Framework y Zero Trust, CIS Controls, ISO/IEC 27001/27002, IEC 62443 cuando aplique a OT/ICS, recomendaciones de seguridad Microsoft y secure SDLC. Esta orientación no constituye una declaración de certificación o cumplimiento formal.

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
