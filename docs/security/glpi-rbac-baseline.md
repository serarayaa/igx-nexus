# Línea base RBAC de GLPI para IGX NEXUS

Estado: Validada en entorno local para CMDB-004

## Objetivo

Definir los perfiles mínimos necesarios para operar el núcleo GLPI de IGX NEXUS aplicando el principio de menor privilegio y evitando privilegios administrativos innecesarios.

## Perfiles nativos observados

La instancia GLPI 11.0.8 dispone de los perfiles nativos `Self-Service`, `Observer`, `Admin`, `Super-Admin`, `Hotliner`, `Technician`, `Supervisor` y `Read-Only`.

La High-Level REST API 2.3.0 permite consultar metadatos de `Profile`, pero no expone una matriz granular de derechos suficiente para configurar completamente los permisos de cada perfil. Por este motivo, el ajuste fino de derechos se realizará únicamente mediante mecanismos soportados por GLPI, principalmente la interfaz administrativa, el CLI oficial cuando exista soporte explícito y las clases internas de GLPI ejecutadas dentro de su propio runtime. No se realizarán escrituras directas sobre las tablas de permisos en MariaDB.

## Roles de IGX NEXUS

### Super-Admin

Uso: administración excepcional y recuperación.

- Reutiliza el perfil nativo `Super-Admin`.
- No debe utilizarse como perfil operativo diario.
- Debe reservarse para cuentas administrativas controladas o de break-glass.
- En producción deberá estar sujeto a MFA y a controles corporativos de identidad.

### NEXUS Asset Manager

Uso: operación diaria de CMDB/ITAM para Innergex Chile.

Se creó un perfil custom porque el perfil nativo `Admin` resulta más amplio que lo necesario para la operación CMDB/ITAM.

Permisos funcionales aplicados:

- consultar, crear y actualizar activos/CI físicos gestionados por NEXUS;
- gestionar ubicaciones, estados, tipos y modelos utilizados por la taxonomía aprobada;
- gestionar relaciones y metadatos necesarios para inventario y ciclo de vida cuando GLPI lo soporte;
- consultar información administrativa/financiera del activo cuando sea necesaria para ITAM;
- no administrar usuarios, perfiles, autenticación global, configuración del sistema, plugins ni credenciales;
- no incorporar responsabilidades de Service Desk / Help Desk;
- no disponer de `DELETE` ni `PURGE` para activos desde el rol operativo.

El perfil se asignará a la entidad `Chile`. La recursividad se habilitará sólo cuando exista una necesidad real de entidades hijas dentro del alcance chileno.

### NEXUS Auditor

Uso: auditoría, revisión y consulta de CMDB/ITAM.

El perfil nativo `Read-Only` fue auditado y se descartó para este caso de uso porque, aunque sus derechos son de lectura, expone áreas que quedan fuera del alcance de IGX NEXUS, entre ellas tickets, problemas, cambios, proyectos, usuarios, perfiles y configuración global.

Por este motivo se define un perfil custom `NEXUS Auditor` con política deny-by-default y sólo lectura sobre:

- activos/CI y software gestionados por NEXUS;
- infraestructura de datacenter relevante;
- licencias, documentos, contratos, información financiera del activo y certificados;
- ubicaciones, estados, tipos/modelos y dispositivos;
- entidad, inventario y logs necesarios para auditoría;
- proveedores/contactos en modo consulta.

El perfil no tendrá derechos de escritura, Service Desk / Help Desk ni administración global.

La configuración declarativa se implementa mediante `scripts/bootstrap-glpi/rbac-auditor.php` y debe validarse primero con `--check` antes de aplicar cambios.

### NEXUS API Service

Uso futuro: identidad técnica utilizada por NEXUS API para consumir GLPI.

- Debe usar un perfil dedicado de mínimo privilegio.
- El perfil no se provisionará anticipadamente en CMDB-004 con permisos amplios por conveniencia.
- Sus derechos se definirán cuando el contrato real de endpoints y operaciones de NEXUS API esté fijado.
- Sólo se habilitarán las operaciones efectivamente requeridas por la integración.
- La aplicación nunca accederá directamente a MariaDB.

## Validación local del perfil operativo

Durante CMDB-004 se implementó `scripts/bootstrap-glpi/rbac.php` para crear y reconciliar de forma declarativa el perfil `NEXUS Asset Manager` utilizando las clases internas de GLPI dentro de su runtime y sin SQL directo.

Resultado validado en GLPI 11.0.8:

- perfil creado con ID local `9`;
- 26 rights operativos reconciliados desde una política deny-by-default;
- Service Desk / Help Desk sin permisos;
- `DELETE` y `PURGE` eliminados del perfil operativo;
- verificación posterior con 0 divergencias;
- segunda ejecución de `--apply` con 0 cambios, confirmando idempotencia.

Los rights de infraestructura de datacenter (`Rack`, `PDU`, `Enclosure` y `PassiveDCEquipment`) comparten el right interno `datacenter` en GLPI 11. Los activos no gestionados (`Unmanaged`) no se habilitan en CMDB-004 y se reservarán para la futura fase de discovery/reconciliación.

## Auditoría del perfil nativo Read-Only

El perfil nativo `Read-Only` (ID local `8`) fue inspeccionado directamente mediante `ProfileRight::getProfileRights()`.

Se detectaron derechos no nulos fuera del alcance de NEXUS, incluyendo `ticket`, `problem`, `change`, `project`, `user`, `profile`, `config`, `rule_ticket`, `notification`, `planning` y otros módulos de Service Desk/administración.

Conclusión: `Read-Only` es técnicamente de sólo lectura, pero funcionalmente demasiado amplio para el rol de auditoría de IGX NEXUS. Se reemplaza por un perfil custom de mínimo privilegio.

## Validación local del perfil de auditoría

Durante CMDB-004 se implementó `scripts/bootstrap-glpi/rbac-auditor.php` para crear y reconciliar de forma declarativa el perfil `NEXUS Auditor` dentro del runtime oficial de GLPI y sin SQL directo.

Resultado validado en GLPI 11.0.8:

- perfil creado con ID local `10`;
- 26 rights reconciliados exclusivamente en modo lectura;
- escritura CMDB/ITAM denegada;
- Service Desk / Help Desk denegado por política deny-by-default;
- administración global denegada;
- verificación posterior con 0 divergencias;
- segunda ejecución de `--apply` con 0 cambios, confirmando idempotencia.

## Validación de persistencia

La configuración relevante de CMDB-004 fue sometida a un reinicio normal del stack:

```text
docker compose down
docker compose up -d
```

sin `-v` ni eliminación de volúmenes.

Después del reinicio se verificó:

- GLPI 11.0.8 saludable y accesible únicamente por `127.0.0.1:8080`;
- MariaDB y Redis saludables;
- entidades `Innergex` y `Chile` persistentes;
- 15/15 ubicaciones persistentes;
- relaciones `CCO -> Parque Eólico Cuel`, `BESS Salvador -> Parque Solar Salvador` y `BESS San Andrés -> Parque Solar San Andrés` persistentes;
- 9/9 estados de ciclo de vida persistentes;
- `NEXUS Asset Manager` con sus 26 rights conformes;
- `NEXUS Auditor` con sus 26 rights conformes;
- respuesta HTTP local de GLPI con código `200`.

Resultado: la persistencia funcional requerida por CMDB-004 quedó validada.

## Cierre de credenciales OAuth temporales

Durante CMDB-004 se creó el cliente OAuth temporal `IGX NEXUS Bootstrap` para validar los contratos de la API High-Level de GLPI.

Como su Client Secret fue expuesto durante una prueba interactiva, la credencial se consideró comprometida. Al finalizar las validaciones el cliente fue **eliminado permanentemente** desde GLPI, en lugar de conservarlo o reutilizarlo.

Decisiones de seguridad:

- el cliente temporal no queda activo después de CMDB-004;
- no se versionó su Client Secret ni access tokens en el repositorio;
- no se conservará una identidad OAuth amplia por conveniencia;
- la futura identidad `NEXUS API Service` tendrá cliente y perfil propios de mínimo privilegio cuando exista un contrato técnico estable.

## Asignación usuario / perfil / entidad

GLPI 11.0.8 expone el comando oficial:

```text
php bin/console user:grant <username> --profile=<profile> --entity=<entity> [--recursive]
```

Este mecanismo soportado permite asignar explícitamente usuario, perfil, entidad y recursividad sin manipular directamente la base de datos.

La opción `--recursive` debe utilizarse de forma deliberada. La ausencia de recursividad será el valor preferido mientras no exista un requisito funcional que justifique acceso a entidades hijas.

## Principios de operación

1. Menor privilegio por defecto.
2. `Super-Admin` no es un rol operativo diario.
3. Reutilizar perfiles nativos sólo cuando satisfagan correctamente el caso de uso y su superficie funcional sea apropiada.
4. Crear perfiles custom cuando sea necesario reducir o separar privilegios.
5. Asignar perfiles en la entidad mínima requerida.
6. No ampliar scopes OAuth ni permisos de perfiles para sortear una limitación de una prueba o herramienta.
7. No gestionar derechos mediante SQL directo.
8. Registrar y auditar cambios privilegiados.
9. Eliminar credenciales temporales cuando dejan de ser necesarias y rotarlas o revocarlas inmediatamente si se exponen.

## Resultado de CMDB-004

La línea base RBAC quedó validada en el entorno local, ambos perfiles custom demostraron idempotencia, la configuración sobrevivió un reinicio normal del stack y el cliente OAuth temporal utilizado para las pruebas fue eliminado al cerrar la validación. La identidad definitiva de NEXUS API se implementará más adelante, cuando exista un contrato técnico estable para esa integración.
