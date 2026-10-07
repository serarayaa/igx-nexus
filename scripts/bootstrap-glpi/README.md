# Bootstrap GLPI de IGX NEXUS

Este directorio contiene la configuración declarativa y las herramientas de bootstrap del núcleo GLPI utilizado por IGX NEXUS.

## Objetivo

Reproducir de forma segura y consistente la configuración base de **Innergex Chile** sin depender de clics manuales ni de conocimiento no documentado de una estación de trabajo.

El bootstrap es **idempotente**: al ejecutarse varias veces debe detectar lo que ya está conforme, crear únicamente lo faltante y actualizar sólo los campos divergentes soportados.

## Contenido actual

- `config/innergex-chile.json`: entidades, ubicaciones, estados de ciclo de vida y tipos de activos físicos validados durante CMDB-004.
- `bootstrap.py`: validación local, reconciliación read-only y aplicación controlada de ubicaciones contra la API High-Level de GLPI.
- `rbac.php`: reconciliación declarativa del perfil operativo `NEXUS Asset Manager` mediante las clases internas de GLPI, sin editar manualmente cientos de casillas y sin SQL directo.
- `rbac-auditor.php`: reconciliación declarativa del perfil de consulta `NEXUS Auditor`, con sólo lectura sobre la superficie CMDB/ITAM aprobada y deny-by-default para el resto.
- `rbac-api-readonly.php`: reconciliación declarativa del perfil técnico `NEXUS API Read-Only`, limitado a capabilities read-only demostradas en Live Lab.
- `inventory-rules.php`: reconciliación declarativa de reglas `RuleImportEntity` administradas por NEXUS, usando clases internas de GLPI y sin SQL directo.

## Validación local

Desde la raíz del repositorio:

```bash
python3 scripts/bootstrap-glpi/bootstrap.py
```

El comando valida referencias, duplicados y consistencia básica, incluidas las reglas declarativas de enrutamiento de inventario, e imprime el plan sin conectarse a GLPI ni modificar datos.

## Reconciliación read-only contra GLPI

La API High-Level de GLPI 11 utiliza OAuth2. Una vez obtenido un access token válido, expórtalo únicamente en la sesión local:

```bash
export GLPI_ACCESS_TOKEN="<token>"
python3 scripts/bootstrap-glpi/bootstrap.py --check-glpi
```

También puede definirse una URL distinta mediante `GLPI_BASE_URL` o `--glpi-base-url`. Para el entorno local de CMDB-004 la URL por defecto es:

```text
http://localhost:8080/api.php/v2.3.0
```

Por seguridad, HTTP plano sólo está permitido para endpoints loopback explícitos (`localhost`, `127.0.0.1` o `::1`). Cualquier GLPI remoto debe usar HTTPS. El cliente no sigue redirects autenticados, por lo que un `3xx` falla cerrado antes de que el Bearer token pueda enviarse a otro destino.

El modo `--check-glpi`:

1. consulta entidades mediante `/Administration/Entity`;
2. resuelve la entidad objetivo declarada en las ubicaciones;
3. consulta ubicaciones mediante `/Dropdowns/Location` usando el header `GLPI-Entity`;
4. consulta estados mediante `/Dropdowns/State`;
5. compara padres, campos declarados, visibilidad en asistencia y matriz de visibilidades;
6. informa objetos `[OK]`, `[MISSING]` y `[DRIFT]`;
7. no realiza escrituras.

## Aplicación controlada de ubicaciones

Durante CMDB-004 se validaron de manera independiente los contratos de escritura de GLPI API 2.3.0:

- `POST /Dropdowns/Location` → `HTTP 201`;
- `PATCH /Dropdowns/Location/{id}` → `HTTP 200`.

Una vez validado previamente el estado con `--check-glpi`, las ubicaciones declaradas pueden reconciliarse mediante:

```bash
python3 scripts/bootstrap-glpi/bootstrap.py --apply
```

El modo `--apply` actualmente se limita deliberadamente a **ubicaciones**:

1. verifica que existan las entidades y los nueve estados base requeridos;
2. trabaja únicamente en la entidad declarada (`Chile` en CMDB-004);
3. procesa las ubicaciones en el orden del archivo declarativo para garantizar que los padres existan antes de crear hijos;
4. crea ubicaciones faltantes mediante `POST`;
5. actualiza sólo campos divergentes mediante `PATCH`;
6. no mueve ubicaciones entre entidades;
7. no elimina relaciones padre automáticamente;
8. ejecuta una reconciliación read-only final para verificar el resultado.

Una segunda ejecución sobre un GLPI ya conforme debe producir únicamente acciones `[SKIP]` y cero creaciones/actualizaciones.


## Bootstrap declarativo de reglas de enrutamiento de inventario

Las reglas de **Administration → Rules → Rules for assigning an item to an entity**
se administran como configuración declarativa mediante
`inventory_routing_rules` en `config/innergex-chile.json`.

La primera regla validada end-to-end en V03-CMDB-01 es:

```text
Inventory tag = nexus-live-lab
  -> Entity   = Innergex > Chile
  -> Location = Santiago
```

GLPI procesa esta colección con semántica **first match wins**. Por seguridad,
`inventory-rules.php`:

1. administra únicamente reglas `RuleImportEntity` cuyos nombres están declarados;
2. no modifica ni elimina reglas ajenas;
3. no reordena rankings existentes;
4. crea reglas faltantes al final de la colección, en el orden del archivo declarativo;
5. detecta drift de metadata, criterios y acciones;
6. reconcilia criterios/acciones faltantes o divergentes dentro de una regla administrada;
7. rechaza automáticamente criterios o acciones extra dentro de una regla administrada,
   en vez de borrarlos silenciosamente;
8. valida que Entity y Location existan antes de escribir.

El flujo usa clases internas de GLPI 11, no SQL directo. Copiar el script y la
configuración al contenedor:

```bash
docker compose cp scripts/bootstrap-glpi/inventory-rules.php glpi:/tmp/igx-nexus-inventory-rules.php
docker compose cp scripts/bootstrap-glpi/config/innergex-chile.json glpi:/tmp/igx-nexus-innergex-chile.json
```

Comprobar en modo read-only:

```bash
docker compose exec glpi php /tmp/igx-nexus-inventory-rules.php \
  --check \
  --config=/tmp/igx-nexus-innergex-chile.json
```

Aplicar únicamente después de revisar el plan:

```bash
docker compose exec glpi php /tmp/igx-nexus-inventory-rules.php \
  --apply \
  --config=/tmp/igx-nexus-innergex-chile.json
```

Una segunda ejecución de `--apply` debe resultar en `[SKIP]` y la
verificación final debe quedar sin divergencias. Si el orden relativo de dos
reglas administradas difiere del orden declarativo, el script reporta
`ORDER-DRIFT` y no mueve rankings automáticamente.

## Bootstrap RBAC del perfil operativo

La High-Level API 2.3.0 expone metadatos de perfiles, pero no toda la matriz granular de derechos. GLPI 11 sí dispone internamente de `Profile` y `ProfileRight`, incluyendo métodos para obtener y actualizar rights. Para evitar una configuración manual extensa, `rbac.php` se ejecuta **dentro del contenedor GLPI** y utiliza esas clases de aplicación; no realiza consultas SQL directas desde IGX NEXUS.

Primero copiar el script temporalmente al contenedor:

```bash
docker compose cp scripts/bootstrap-glpi/rbac.php glpi:/tmp/igx-nexus-rbac.php
```

Validar el plan sin cambios:

```bash
docker compose exec glpi php /tmp/igx-nexus-rbac.php --check
```

Aplicar únicamente después de revisar el plan:

```bash
docker compose exec glpi php /tmp/igx-nexus-rbac.php --apply
```

El perfil administrado es `NEXUS Asset Manager` y sigue una política **deny-by-default**:

- habilita activos/CI y objetos de gestión CMDB/ITAM explícitamente aprobados;
- reutiliza los masks conocidos del perfil nativo `Admin` sólo para los rights permitidos;
- elimina `DELETE` y `PURGE` del perfil operativo;
- no habilita Service Desk / Help Desk;
- no habilita administración de usuarios, perfiles, autenticación global ni configuración general;
- limita entidades e inventario a lectura cuando corresponde;
- no modifica perfiles nativos;
- una segunda ejecución debe resultar sin divergencias.

## Bootstrap RBAC del perfil de auditoría

El perfil nativo `Read-Only` fue auditado y descartado para IGX NEXUS porque, aun siendo de lectura, expone módulos fuera del alcance del producto como tickets, problemas, cambios, proyectos, usuarios y configuración global.

`rbac-auditor.php` administra el perfil custom `NEXUS Auditor` con una política **deny-by-default** y sólo lectura sobre la superficie CMDB/ITAM aprobada.

```bash
docker compose cp scripts/bootstrap-glpi/rbac-auditor.php glpi:/tmp/igx-nexus-rbac-auditor.php
docker compose exec glpi php /tmp/igx-nexus-rbac-auditor.php --check
docker compose exec glpi php /tmp/igx-nexus-rbac-auditor.php --apply
```

Una segunda ejecución de `--apply` debe quedar sin divergencias ni cambios efectivos.


## Bootstrap RBAC del perfil técnico NEXUS API Read-Only

`rbac-api-readonly.php` administra el perfil utilizado por `svc-nexus-api`.
La política es **least privilege by evidence**: sólo se habilitan rights cuya
necesidad fue demostrada contra GLPI 11.0.11 durante V03-CMDB-01.

Baseline validado:

```text
computer = READ
device   = READ
software = READ
infocom  = READ
contract = READ
entity   = READ
location = READ
```

El perfil permanece deny-by-default para cualquier otro right. En particular,
el script no habilita escritura, Service Desk, reglas, administración de
usuarios/perfiles, configuración global ni gestión de OAuth.

```bash
docker compose cp scripts/bootstrap-glpi/rbac-api-readonly.php glpi:/tmp/igx-nexus-rbac-api-readonly.php
docker compose exec -T glpi php -l /tmp/igx-nexus-rbac-api-readonly.php
docker compose exec -T glpi php /tmp/igx-nexus-rbac-api-readonly.php --check
```

Aplicar sólo después de revisar el plan:

```bash
docker compose exec -T glpi php /tmp/igx-nexus-rbac-api-readonly.php --apply
```

La autorización del usuario técnico a una entidad concreta sigue siendo una
operación separada del perfil. Para el Live Lab validado, `svc-nexus-api`
está acotado a `Innergex > Chile`, sin recursividad.

## Asignación usuario / perfil / entidad

La asignación de perfiles a usuarios se realiza posteriormente con el CLI oficial de GLPI:

```text
php bin/console user:grant <username> --profile=<profile> --entity=<entity> [--recursive]
```

No se asigna automáticamente ningún usuario durante los bootstraps RBAC.

## Seguridad

- Nunca escribir directamente en MariaDB desde IGX NEXUS o sus scripts de bootstrap.
- Nunca versionar contraseñas, tokens OAuth, secretos de cliente ni datos corporativos sensibles.
- Los secretos locales deben suministrarse mediante variables de entorno o un mecanismo de secretos aprobado.
- Ejecutar primero los modos `--check` / `--check-glpi` antes de cualquier `--apply`.
- Un cliente OAuth dedicado debe usar permisos mínimos suficientes y existir sólo mientras sea necesario para el flujo que lo requiere.
- El cliente temporal `IGX NEXUS Bootstrap` utilizado durante CMDB-004 fue eliminado permanentemente al terminar las pruebas; no queda como credencial persistente del proyecto.
- La futura identidad `NEXUS API Service` tendrá su propio cliente/perfil de mínimo privilegio cuando exista un contrato técnico estable para la integración.
- La configuración del repositorio debe contener únicamente datos corporativos aprobados para versionamiento.
- Las operaciones no soportadas o no validadas se rechazan en vez de inferirse de forma riesgosa.
- El bootstrap GLPI exige HTTPS para destinos no-loopback y bloquea redirects autenticados.
- Los errores HTTP upstream no incorporan el body remoto en el mensaje local.

## Validación de persistencia CMDB-004

La configuración fue validada después de un ciclo normal:

```bash
docker compose down
docker compose up -d
```

sin `-v` ni eliminación de volúmenes. Después del reinicio se verificaron correctamente:

- entidades `Innergex` y `Chile`;
- 15/15 ubicaciones y sus relaciones padre relevantes;
- 9/9 estados de ciclo de vida;
- `NEXUS Asset Manager` con 26 rights conformes;
- `NEXUS Auditor` con 26 rights conformes;
- GLPI, MariaDB y Redis saludables;
- GLPI respondiendo localmente por `127.0.0.1:8080`.

## Alcance inicial

El bootstrap actual corresponde exclusivamente a **Innergex Chile**. La estructura se mantiene preparada para futuras entidades, pero no crea ni habilita despliegues de otros países.
