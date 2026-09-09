# ADR-0007 — Locator QR opaco y motor de etiquetas desacoplado

Estado: Propuesto en PR #23 para integración con CMDB-009 (issue #22), pendiente de merge manual.

## Contexto

ADR-0006 mantiene `#assets/<nexusAssetId>` como ruta interna suficiente para Asset 360. Esa ruta no debe convertirse en la identidad física de un CI: una etiqueta permanente necesita sobrevivir cambios de routing, despliegue y fuentes de datos sin exponer identificadores o información del activo.

La Demo v0.1 todavía no dispone de NEXUS API productiva, dominio corporativo definitivo, autenticación Entra productiva, HTTPS desplegado ni resolver de servidor `/q/:locator`.

## Decisión

### 1. Separar identidad NEXUS y locator físico

`Asset.id` sigue identificando el activo en el dominio NEXUS. `QrLocatorRecord` representa la identidad física de la etiqueta y mantiene su propio estado (`active`/`revoked`).

Un locator puede reemplazarse o revocarse, pero nunca debe reutilizarse para otro CI.

### 2. El QR sólo codifica un locator URL

El payload tiene forma `<base HTTPS>/q/<opaqueLocator>` y no contiene información del activo. El locator no es secreto, no es contraseña y no sustituye autenticación ni autorización.

La producción deberá emitir locators no enumerables mediante un generador criptográficamente adecuado y persistir la asociación locator ↔ CI en la NEXUS API.

### 3. Demo explícitamente no productiva

CMDB-009 usa `https://nexus-demo.invalid` para generar QR reproducibles sin fingir que existe un dominio Innergex. El hash `#q/<locator>` es un simulador interno para probar la resolución contra fixtures sintéticos y no aparece en el QR físico.

Cambiar la base URL futura no requiere rehacer el motor de etiquetas: el environment se inyecta al construir el payload.

### 4. Mantener `#assets/:id` como ruta interna

CMDB-009 no reemplaza el routing de ADR-0006. Se agrega `#assets/:id/label` para el diseñador y `#q/:locator` sólo como simulador. El endpoint productivo `/q/:opaqueLocator` será responsabilidad de servidor/API y deberá aplicar autenticación/RBAC antes de entregar Asset 360.

### 5. SVG como salida maestra

El Label Engine calcula dimensiones físicas, DPI, módulos QR, quiet zone y contenido visible mediante funciones puras. SVG es la primera salida real porque preserva geometría, imprime de forma robusta y evita acoplar el dominio a un fabricante.

Los futuros adaptadores ZPL/EPL/Browser/vendor consumen el mismo `LabelModel`; no modifican el QR ni la identidad del CI.

### 6. QR pequeño y auditable para v0.1

El encoder actual implementa QR Model 2 Version 5, ECC M, byte mode y máscara 0 sin dependencia externa. El contrato limita el payload a 84 bytes UTF-8 y conserva quiet zone de 4 módulos.

Esta decisión prioriza una base auditable y reproducible para la demo. El gate productivo exige validación física con materiales, impresoras y cámaras reales y permite sustituir internamente el encoder sin cambiar el locator contract.

## Seguridad

El diseño aplica minimización de datos, secure-by-default, least privilege, zero trust y defense in depth como objetivos de arquitectura. La posesión del QR nunca concede autorización.

Controles productivos previstos:

- HTTPS obligatorio;
- autenticación corporativa;
- RBAC y mínimo privilegio;
- locators aleatorios/no enumerables;
- rate limiting/telemetría del resolver cuando corresponda;
- revocación, reemplazo y auditoría;
- inputs validados y outputs escapados;
- secretos fuera del navegador y del código;
- ninguna redirección QR directa a GLPI, base de datos o dispositivos IT/OT.

NEXUS se diseña considerando guías OWASP, NIST Cybersecurity Framework y principios Zero Trust, CIS Controls, ISO/IEC 27001/27002, IEC 62443 para contextos OT/ICS, guía de seguridad Microsoft y prácticas de secure SDLC. Esto expresa una dirección de diseño; **no implica certificación ni cumplimiento formal**.

## Consecuencias

- Cambios de usuario, ubicación, hostname, IP o lifecycle no requieren reimprimir la etiqueta.
- El routing de la SPA puede evolucionar sin invalidar la identidad física.
- El QR expone únicamente un locator y no información del CI.
- La demo puede probar el flujo sin desplegar infraestructura ficticia.
- El renderer físico permanece independiente de light/dark mode.
- La integración de impresoras queda encapsulada detrás de adaptadores futuros.

## Criterios para emitir QR permanentes

No deben emitirse etiquetas permanentes hasta disponer de URL estable/HTTPS, resolver, persistencia, generador productivo de locators, autenticación/RBAC, revocación y validación física de lectura/impresión.

## Fuera de alcance

Autenticación productiva, NEXUS API productiva, deployment, impresoras específicas, lotes masivos, discovery real, CMDB-010 y CMDB-011.
