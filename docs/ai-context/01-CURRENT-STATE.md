# IGX NEXUS — Current State

> Estado operativo resumido del proyecto.  
> No reemplaza roadmap, ADR, código ni tests.

## Baseline

- Repository: `serarayaa/igx-nexus`
- Branch estable: `main`
- Baseline de inicio del workstream CMDB: `main@eb87c68ee2a17b793e34e457c4e2914567889bb1`
- v0.1: cerrada
- v0.2: cerrada
- workstream actual: `V03-CMDB-*`
- target de producto: **NEXUS 1.0 — IT CMDB & Asset Management**

Si Git contradice este documento, Git prevalece.

## Dirección vigente

La versión mayor que se está construyendo es:

**NEXUS 1.0 — IT CMDB & Asset Management**

Debe operar con datos reales y workflows completos antes de abrir NEXUS 2.0.

Release gate resumido:

> Puedo descubrir o registrar un equipo, encontrarlo, entender qué es, dónde está, quién lo usa, qué hardware/software tiene, cuál es su estado, cuándo fue observado, qué cambió, qué tan completa es su información y ejecutar workflows normales de entrega/devolución con documentación trazable.

Docs principales:

- `docs/product/v0.3-it-cmdb-scope.md`
- `docs/roadmap-v0.3.md`

Los nombres de archivo/ticket `v0.3` se conservan por continuidad del workstream actual; no representan el producto final. El destino de release es 1.0.

## Core obligatorio

NEXUS 1.0 debe ser utilizable con:

`GLPI + GLPI Agent + NEXUS`

Ninguna integración opcional puede bloquear el core.

## Integraciones opcionales

Evaluar sólo si aportan valor demostrado:

- Entra ID → identity/account/org;
- Intune → endpoint management/enrollment/compliance/primary user;
- Google Workspace → datos Workspace exclusivos y útiles;
- Zabbix → telemetría operacional.

Las fuentes conservan authority/provenance y no se pisan silenciosamente.

## Endpoint Health

Capacidad opcional / stretch de 1.0 o 1.x.

Candidatos:

- battery health;
- SMART/NVMe/storage health;
- media errors/wear;
- Windows Event Log relevante;
- unexpected restarts;
- hardware/storage errors.

Prioridad de evaluación: GLPI Agent → smartmontools → Zabbix → collector Windows acotado. No introducir cybersecurity como dependencia sólo para obtener health signals.

## Asset Management

1.0 debe cubrir el lifecycle operativo del activo:

- register/detect;
- preparation/stock;
- assign;
- move/change user;
- repair/replace;
- return;
- reassign/retire.

Debe poder producir documentos como actas de entrega/devolución, comprobantes de cambio/reemplazo, fichas de activo, QR/labels y exportaciones cuando correspondan.

## V03-CMDB-00

Scope Freeze / Product Reset / Road to 1.0.

PR #138 fue cerrado sin merge y preservado como research histórico.

Branch:

`feature/v03-cmdb-00-scope-reset`

## V03-CMDB-01

Auditoría GLPI/Agent/Live Data Contract:

`feature/v03-cmdb-01-glpi-capability-audit`

HEAD observado:

`859d4c7e100a909020329151d754532ae29d97d8`

Evidencia runtime:

- GLPI 11.0.11 / High-Level API 2.3.0;
- service identity read-only deny-by-default;
- physical asset collections;
- OS/hardware/storage/software/VM/antivirus/peripherals;
- 145 SoftwareInstallation paginadas;
- Entity/Location;
- assignment embebido;
- gap NetworkPort/IP;
- EventLog no autorizado por defecto y no suficiente para history semántico.

## Versiones mayores

- **1.0 — IT CMDB & Asset Management**
- **2.0 — OT CMDB & Passive Discovery**
- **3.0 — Cybersecurity & Exposure Management**
- **4.0 — Intelligence, Analytics & Automation**

No iniciar 2.0 hasta que el alcance de 1.0 esté completo, probado y operando de forma estable.

## Próximo paso

1. integrar V03-CMDB-00;
2. actualizar/integrar V03-CMDB-01 sobre el nuevo main;
3. iniciar V03-CMDB-02 Canonical CMDB + Provider 2.0;
4. mantener integraciones opcionales y Endpoint Health fuera del critical path del core.
