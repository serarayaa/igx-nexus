# IGX NEXUS — Current State

> Estado operativo resumido del proyecto.  
> No reemplaza roadmap, ADR, código ni tests.

## Baseline

- Repository: `serarayaa/igx-nexus`
- Branch estable: `main`
- Baseline de inicio v0.3 CMDB: `main@eb87c68ee2a17b793e34e457c4e2914567889bb1`
- v0.1: cerrada
- v0.2: cerrada
- v0.3: **scope reset activo — IT CMDB**

Si Git contradice este documento, Git prevalece.

## Definición vigente de v0.3

**IGX NEXUS v0.3 = CMDB TI completa, moderna y visualmente premium sobre GLPI + GLPI Agent.**

Objetivo:

> Entregar una CMDB TI utilizable en producción, integrada con GLPI, capaz de representar inventario, software, lifecycle, relaciones, calidad e historial mediante una experiencia moderna, confiable y extensible.

Documento canónico de scope:

`docs/product/v0.3-it-cmdb-scope.md`

Roadmap:

`docs/roadmap-v0.3.md`

## Reset de la dirección Product Experience anterior

El trabajo anterior no se elimina:

- V03-002 Design System foundations permanece reusable.
- V03-008 Cross-Surface State & Navigation Contract fue integrado mediante PR #137 y forma parte de `main@eb87c68`.
- PR #138 (V03-003 / V03-003A) fue **cerrado sin merge** al quedar superseded por el scope CMDB.
- su investigación visual/spatial permanece como evidencia histórica y puede reutilizarse selectivamente.

No continuar el antiguo roadmap V03-003/V03-005 como si siguiera vigente.

## V03-CMDB-00

Scope Freeze / Product Reset.

Responsabilidades:

- una sola definición de v0.3;
- IA CMDB;
- source strategy;
- non-goals;
- preservation matrix;
- namespace `V03-CMDB-*`;
- cierre de PR #138 como superseded sin merge.

Branch de trabajo:

`feature/v03-cmdb-00-scope-reset`

## V03-CMDB-01

La auditoría GLPI/Agent/Live Data Contract se desarrolla en:

`feature/v03-cmdb-01-glpi-capability-audit`

HEAD observado durante el scope reset:

`859d4c7e100a909020329151d754532ae29d97d8`

Evidencia runtime ya levantada en el Live Lab incluye:

- GLPI 11.0.11 / High-Level API 2.3.0;
- service identity read-only con deny-by-default;
- inventario físico Computer/Monitor/Peripheral y colecciones Printer/NetworkEquipment/Phone;
- OS, CPU, RAM, disk, volumes, software installations, virtualization, antivirus y peripheral connections;
- 145 SoftwareInstallation paginadas para el Computer real;
- entity/location con least privilege;
- assignment embebido `user/user_tech/group/group_tech`;
- gap explícito de NetworkPort/IP en High-Level API;
- EventLog expuesto por API pero no autorizado por defecto; no reemplaza history semántico.

Esta evidencia debe integrarse formalmente después de V03-CMDB-00 antes de iniciar Provider 2.0.

## Arquitectura de producto vigente

Modelo conceptual:

`GLPI + Agent → source observations → canonical CMDB NEXUS → provenance/history/quality → product experience`

Principios:

- GLPI = System of Record CMDB/ITAM.
- NEXUS no replica formularios GLPI; normaliza, relaciona y explica.
- Evidence before inference.
- Live nunca cae silenciosamente a Demo.
- una ausencia de datos se representa como coverage gap.
- no direct GLPI DB writes.
- nuevas fuentes no sobrescriben silenciosamente datos canónicos.

## Scope futuro fuera de v0.3

- v0.4: OT CMDB & Discovery.
- v0.5: Cybersecurity.
- v0.6: Intelligence / Analytics & Data Science.

V02-023 Intune continúa como trabajo separado condicionado por acceso tenant; no bloquea el scope reset.

## Próximo paso

1. integrar V03-CMDB-00;
2. poner V03-CMDB-01 sobre el baseline actualizado y cerrar su documentación/PR;
3. iniciar V03-CMDB-02 sólo desde un main que contenga ambos.

V03-CMDB-02 diseñará el Canonical CMDB / Provider 2.0, evitando convertir `TechnologyAsset.attributes` en un contenedor plano de toda la semántica GLPI.
