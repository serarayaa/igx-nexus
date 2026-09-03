# IGX NEXUS

> **The Technology Map** — by Innergex

IGX NEXUS es una plataforma interna de **CMDB e Inteligencia de Activos TI** para Innergex.

La plataforma está enfocada en gestión de configuración, inteligencia de activos, descubrimiento, relaciones entre elementos de configuración (CI), identificación mediante códigos QR, calidad de datos, seguridad, ciclo de vida e integraciones con fuentes corporativas autoritativas.

## Alcance

### Incluido
- CMDB / ITAM
- Descubrimiento e inventario de activos
- Relaciones entre elementos de configuración
- Vistas Asset 360°
- Identificación mediante QR e inventario físico
- CMDB Health y calidad de datos
- Ciclo de vida, responsables, ubicaciones, contratos, garantías y cumplimiento
- Integraciones con GLPI, Microsoft Intune, Microsoft Entra ID y otras fuentes autoritativas
- UI/UX moderna con identidad visual de Innergex
- Auditabilidad y seguridad desde el diseño

### Fuera de alcance
- Service Desk / Help Desk
- Creación y gestión de tickets de soporte

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

Objetivo actual: **v0.1 — Demo Local**

El primer hito es una demostración local pulida que posteriormente pueda promoverse a una máquina virtual de Innergex con cambios arquitectónicos mínimos.

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
Inteligencia interna de activos tecnológicos para Innergex.
