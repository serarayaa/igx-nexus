# V03-CMDB-01 — Auditoría de capacidades GLPI / Agent / Live Data Contract

Estado: **runtime audit sustancialmente completo**  
Fecha: 2026-10-07  
Baseline probado: **GLPI 11.0.11 / High-Level REST API 2.3.0**

## Objetivo

Determinar qué datos de CMDB TI puede consumir IGX NEXUS desde GLPI + GLPI Agent
sin inventar semántica, sin acceso directo a MariaDB y con una service identity
read-only de mínimo privilegio.

Esta auditoría separa cuatro preguntas:

1. ¿La capability está expuesta por la High-Level API?
2. ¿La service identity está autorizada?
3. ¿El Live Lab contiene datos reales para comprobarla?
4. ¿La superficie es suficiente para el contrato canónico de NEXUS?

## Baseline técnico

- GLPI 11.0.11.
- High-Level API 2.3.0.
- OpenAPI local: 1219 paths.
- OAuth Password Grant con scope `api`.
- Service identity: `svc-nexus-api`.
- Perfil: `NEXUS API Read-Only`.
- Alcance efectivo: `Innergex > Chile`, no recursivo.
- GLPI accesible sólo por loopback en el Live Lab.
- Sin fallback silencioso Live → Demo.
- Sin SQL directo.
- Sin secretos en repositorio, logs o evidencia.

La política declarativa de RBAC vive en
`scripts/bootstrap-glpi/rbac-api-readonly.php`.

## Matriz de activos físicos

| Tipo | Colección | Detail runtime | Datos Live | Resultado |
| --- | --- | --- | ---: | --- |
| Computer | ACCESSIBLE | ACCESSIBLE | 1 | validado |
| Monitor | ACCESSIBLE | ACCESSIBLE | 3 | validado |
| Printer | ACCESSIBLE | no comprobable sin registro | 0 | soportado, no poblado |
| Peripheral | ACCESSIBLE | ACCESSIBLE | 6 | validado |
| NetworkEquipment | ACCESSIBLE | no comprobable sin registro | 0 | soportado, no poblado |
| Phone | ACCESSIBLE | no comprobable sin registro | 0 | soportado, no poblado |

El probe previo al ajuste RBAC confirmó `403` para Monitor, Printer,
Peripheral, NetworkEquipment y Phone. Después de habilitar sólo READ para los
rights correspondientes, las seis colecciones quedaron accesibles.

## Computer — capacidad de Asset 360

Sobre el Computer real del Live Lab:

| Capability | Runtime | Cardinalidad |
| --- | --- | ---: |
| OSInstallation | ACCESSIBLE | 1 |
| Processor | ACCESSIBLE | 1 |
| Memory | ACCESSIBLE | 2 |
| HardDrive | ACCESSIBLE | 1 |
| NetworkCard component | ACCESSIBLE | 0 |
| Volume | ACCESSIBLE | 4 |
| SoftwareInstallation | ACCESSIBLE | 145 |
| VirtualMachine | ACCESSIBLE | 1 |
| Antivirus | ACCESSIBLE | 1 |
| Contract | ACCESSIBLE | 0 |
| PeripheralConnection | ACCESSIBLE | 9 |
| Infocom | HTTP 404 | sin registro asociado |

`SoftwareInstallation` fue validado con paginación real:

- página 0: 100;
- página 100: 45;
- total: **145 instalaciones**.

El `404` de Infocom no se clasifica como fallo de capability: la ruta existe,
el right `infocom` está autorizado y el activo simplemente no posee un
registro asociado.

## Assignment / User / Group

El schema de `Computer` expone relaciones reducidas y seguras:

- `user`: `{ id, name }`;
- `user_tech`: `{ id, name }`;
- `group[]`: `{ id, name }`;
- `group_tech[]`: `{ id, name }`.

En el Computer actual las cuatro relaciones están vacías/no asignadas.

**Decisión:** no agregar `user = READ` al perfil técnico sólo para resolver
Asset 360. La relación embebida de Computer es suficiente para el contrato base
de asignación. Si en una fase futura se requiere identidad corporativa rica,
Entra debe evaluarse como fuente de identidad; no se propagará el objeto User
crudo de GLPI.

## Entity y Location

Se demostró autorización independiente y least privilege:

- `Administration/Entity`: 403 antes de `entity = READ`; luego ACCESSIBLE;
- catálogo visible: 1 entidad, `Innergex > Chile`;
- `Dropdowns/Location`: 403 antes de `location = READ`; luego ACCESSIBLE;
- catálogo visible: 15 ubicaciones de Chile.

Entity representa frontera organizacional/autorización. Location representa
sitio físico y jerarquía. NEXUS no crea una segunda fuente canónica de sitios.

## Network

### Expuesto

- `Assets/NetworkEquipment` y detail;
- `Component/NetworkCard`;
- schema `NetworkCard`;
- schema `NetworkCardItem`;
- schema `NetworkPort` con 28 propiedades;
- schemas de NetworkPort Ethernet/Wi-Fi/FiberChannel/Aggregate/Alias/Dialup/Local.

Campos relevantes demostrados por schema incluyen MAC, interface name,
logical number, speed, MTU, duplex, status, counters/errors, itemtype/items_id,
MAC default y asociaciones NetworkCard/NetworkPort.

### Gap de High-Level API 2.3.0

No se encontraron paths directos para:

- `NetworkPort`;
- `IPAddress`;
- `NetworkName`;
- `IPNetwork`.

Tampoco se encontraron schemas High-Level para IPAddress, NetworkName o
IPNetwork.

**Resultado:** inventario de red y componentes = soportado; topología
puerto/IP = **parcial / gap de API**. No se incorpora NetBox ni otra fuente
sólo por este gap; primero debe existir un requisito de producto que lo
justifique.

## EventLog / History

High-Level API expone:

- `GET /Administration/EventLog`;
- `GET /Administration/EventLog/{id}`.

Schema `EventLog`:

- id;
- items_id;
- type;
- date;
- service;
- level;
- message.

El objeto GLPI subyacente usa el right `system_logs`. Con el perfil
`NEXUS API Read-Only` actual, el runtime probe devolvió **HTTP 403**.

**Decisión:** no agregar `system_logs = READ` al baseline por defecto.
EventLog puede contener información operativa o de autenticación y no aporta
un historial semántico estructurado suficiente para Asset 360.

El historial de NEXUS debe modelarse mediante:

`GLPI current state + NEXUS normalized snapshots + semantic diff/events`.

EventLog puede evaluarse más adelante como evidencia auxiliar si existe una
necesidad funcional concreta y una revisión de sensibilidad.

## Baseline RBAC validado

Rights READ actuales:

```text
computer
monitor
printer
peripheral
networking
phone
device
software
infocom
contract
entity
location
```

No se habilitan por defecto:

- `user`;
- `system_logs`;
- Create / Update / Delete / Purge;
- Service Desk;
- administración global;
- scopes o permisos no respaldados por evidencia.

El bootstrap fue aplicado y ejecutado una segunda vez sin cambios:
**0 divergencias de rights y 0 divergencias de metadata**.

## Conclusión

GLPI + GLPI Agent cubren de forma sólida la base de la CMDB TI v0.3:

- identidad de activos;
- hardware;
- sistema operativo;
- almacenamiento;
- software;
- virtualización;
- antivirus;
- periféricos;
- entidad y ubicación;
- asignación embebida;
- lifecycle/financial y contracts cuando estén poblados;
- inventario de NetworkEquipment y NetworkCard.

Brechas o capacidades parciales:

- NetworkPort/IP/topología en High-Level API;
- lifecycle/contract no poblados en el Computer de laboratorio;
- assignment no poblado en el Computer de laboratorio;
- historial semántico: EventLog insuficiente y no autorizado por defecto.

Esta evidencia es suficiente para diseñar V03-CMDB-02 sin expandir permisos
por conveniencia y sin aplanar prematuramente GLPI dentro del modelo actual.
