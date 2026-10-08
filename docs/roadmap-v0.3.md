# Road to IGX NEXUS 1.0 — IT CMDB & Asset Management

Estado: **dirección de producto aprobada**  
Workstream actual: `V03-CMDB-*`  
Baseline de inicio: `main@eb87c68ee2a17b793e34e457c4e2914567889bb1`

## Visión de producto

La primera versión mayor de NEXUS será **100% dedicada a CMDB TI & Asset Management**.

> **NEXUS 1.0 debe funcionar en producción, con datos reales, workflows operativos completos y trazabilidad suficiente para administrar el ciclo de vida del equipamiento TI de Innergex.**

No se inicia NEXUS 2.0 mientras el alcance definido para 1.0 no esté completo, probado y operando de forma estable.

Las versiones menores `1.1`, `1.2`, etc. pueden mejorar la CMDB antes de abrir el dominio OT.

## Qué debe lograr NEXUS 1.0

NEXUS 1.0 debe permitir:

- descubrir e inventariar activos TI;
- buscar y comprender cada activo mediante Asset 360;
- conocer ubicación, responsable, hardware, OS, software, estado y lifecycle;
- administrar asignación, devolución, reasignación, reparación, bodega, baja y reemplazo;
- generar documentos operativos de entrega/devolución y otros comprobantes del lifecycle;
- conservar provenance, snapshots e historial semántico;
- medir calidad/confiabilidad del inventario;
- operar con seguridad, RBAC, backup/restore, tests y documentación suficientes para producción.

## Release gate 1.0

La release no está lista sólo porque compile o tenga todas las pantallas.

Debe ser posible afirmar:

> “Puedo descubrir o registrar un equipo, encontrarlo, abrirlo, entender qué es, dónde está, quién lo usa, qué hardware/software tiene, cuál es su estado, cuándo fue observado, qué cambió, qué tan completa es su información y ejecutar sus workflows normales de entrega/devolución con documentación trazable.”

## Core obligatorio

### GLPI + GLPI Agent + NEXUS

El core de 1.0 debe funcionar por sí solo con:

- GLPI como System of Record CMDB/ITAM;
- GLPI Agent como fuente principal de inventario automático;
- NEXUS como capa canónica, experiencia, provenance, history, quality y workflows.

Ninguna integración opcional puede impedir que este core sea utilizable.

## Integraciones opcionales de 1.0 / 1.x

Sólo se incorporan si aportan valor demostrado y pueden mantenerse con least privilege.

### Entra ID

Candidato prioritario para enriquecer identidad y organización corporativa.

### Intune

Candidato prioritario para management/enrollment/compliance/primary user y otros datos exclusivos del endpoint administrado.

### Google Workspace

Candidato condicionado a que entregue información útil que no duplique innecesariamente GLPI/Entra.

### Regla de autoridad

Una fuente nueva no sobrescribe silenciosamente a otra.

Ejemplo de intención:

- GLPI → asset/lifecycle/assignment administrativo;
- Entra → identity/account/org;
- Intune → endpoint management/compliance;
- Google Workspace → datos Workspace sólo donde agreguen valor;
- Zabbix → telemetría operacional.

## Endpoint Health — opcional

NEXUS 1.0 no depende de Endpoint Health para liberarse.

Puede incorporarse como stretch goal de 1.0 o como 1.x si es suficientemente estable.

Objetivo:

> responder si existen señales observables de que un endpoint puede requerir atención.

Candidatos:

- battery health;
- storage SMART / NVMe health;
- media errors / wear;
- Windows Event Log relevante;
- unexpected restarts;
- hardware/storage errors;
- señales de temperatura o sensores cuando sean confiables.

Estrategia preferida:

1. exprimir primero GLPI Agent y fuentes ya disponibles;
2. evaluar smartmontools para storage health;
3. reutilizar Zabbix para telemetría si ya es fuente operacional;
4. evitar convertir Wazuh/cybersecurity en dependencia de la CMDB sólo para leer errores;
5. NEXUS consume señales semánticas/provenance, no necesariamente telemetría cruda histórica.

## Workflows de Asset Management

1.0 debe soportar un ciclo operativo como:

```text
Detected / Registered
        ↓
In stock / Preparation
        ↓
Assigned to user
        ↓
Generate delivery record
        ↓
In use
        ↓
Move / Repair / Replace
        ↓
Return
        ↓
Generate return record
        ↓
Stock / Reassign / Retire
```

Documentos candidatos:

- acta de entrega;
- acta de devolución;
- comprobante de reemplazo/cambio;
- ficha del activo;
- inventario por usuario/ubicación;
- etiquetas/QR;
- exportaciones PDF/Excel cuando corresponda.

## Secuencia técnica actual V03-CMDB

Los tickets `V03-CMDB-*` son la ruta de construcción hacia NEXUS 1.0.

| ID | Resultado |
| --- | --- |
| V03-CMDB-00 | Scope Freeze / Product Reset / Road to 1.0 |
| V03-CMDB-01 | GLPI/Agent capability + Live data contract audit |
| V03-CMDB-02 | Canonical CMDB + Provider 2.0 + provenance/history |
| V03-CMDB-03 | Premium CMDB Experience Foundation |
| V03-CMDB-04 | Overview |
| V03-CMDB-05 | Assets Explorer |
| V03-CMDB-06 | Asset 360 |
| V03-CMDB-07 | Software |
| V03-CMDB-08 | Network |
| V03-CMDB-09 | Relationships |
| V03-CMDB-10 | Lifecycle & Asset Management workflows |
| V03-CMDB-11 | CMDB Health |
| V03-CMDB-12 | Changes / History |
| V03-CMDB-13 | Global Search / Command Palette |
| V03-CMDB-14 | Product Polish / a11y / responsive / motion |
| V03-CMDB-15 | Release Hardening / production readiness |

Los workflows documentales y de entrega/devolución se diseñan dentro de Lifecycle & Asset Management y pueden generar tickets específicos si el alcance lo requiere.

## Versiones mayores

### NEXUS 1.0 — IT CMDB & Asset Management

Producto estable y operativo de inventario TI.

### NEXUS 2.0 — OT CMDB & Passive Discovery

Sólo después de 1.x estable. Incluye modelado OT y descubrimiento pasivo seguro.

### NEXUS 3.0 — Cybersecurity & Exposure Management

Construida sobre inventario IT/OT confiable. Wazuh, Greenbone u otras herramientas se evalúan aquí según necesidad.

### NEXUS 4.0 — Intelligence, Analytics & Automation

Analítica avanzada, detección de anomalías, IA/ML explicable y automatización sobre datos ya confiables.

## Preservación

- V03-002 design foundations: KEEP.
- V03-008 navigation/state contract: KEEP.
- PR #138 / spatial shell: CLOSED / NO MERGE / historical research.
- research 2.5D/map/spatial: optional future inspiration.
- v0.2 provenance/reconciliation: KEEP + EVOLVE.

Documento de scope vigente: `docs/product/v0.3-it-cmdb-scope.md`.
