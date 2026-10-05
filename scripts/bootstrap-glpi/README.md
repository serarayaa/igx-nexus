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

## Validación local

Desde la raíz del repositorio:

```bash
python3 scripts/bootstrap-glpi/bootstrap.py
```

El comando valida referencias, duplicados y consistencia básica, e imprime el plan sin conectarse a GLPI ni modificar datos.

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
