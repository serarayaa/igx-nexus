# Bootstrap GLPI de IGX NEXUS

Este directorio contiene la configuración declarativa y las herramientas de bootstrap del núcleo GLPI utilizado por IGX NEXUS.

## Objetivo

Reproducir de forma segura y consistente la configuración base de **Innergex Chile** sin depender de clics manuales ni de conocimiento no documentado de una estación de trabajo.

El bootstrap es **idempotente**: al ejecutarse varias veces debe detectar lo que ya está conforme, crear únicamente lo faltante y actualizar sólo los campos divergentes soportados.

## Contenido actual

- `config/innergex-chile.json`: entidades, ubicaciones, estados de ciclo de vida y tipos de activos físicos validados durante CMDB-004.
- `bootstrap.py`: validación local, reconciliación read-only y aplicación controlada de ubicaciones contra la API High-Level de GLPI.

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

El modo `--check-glpi`:

1. consulta entidades mediante `/Administration/Entity`;
2. resuelve la entidad objetivo declarada en las ubicaciones;
3. consulta ubicaciones mediante `/Dropdowns/Location` usando el header `GLPI-Entity`;
4. consulta estados mediante `/Dropdowns/State`;
5. compara padres, campos declarados, visibilidad en asistencia y matriz de visibilidades;
6. informa objetos `[OK]`, `[MISSING]` y `[DRIFT]`;
7. no realiza escrituras.

## Aplicación controlada

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

## Seguridad

- Nunca escribir directamente en MariaDB.
- Nunca versionar contraseñas, tokens OAuth, secretos de cliente ni datos corporativos sensibles.
- Los secretos locales deben suministrarse mediante variables de entorno o un mecanismo de secretos aprobado.
- Ejecutar primero `--check-glpi` antes de utilizar `--apply` cuando cambie la configuración declarativa.
- El cliente OAuth dedicado debe usar permisos mínimos suficientes.
- La configuración del repositorio debe contener únicamente datos corporativos aprobados para versionamiento.
- Las operaciones no soportadas o no validadas se rechazan en vez de inferirse de forma riesgosa.

## Alcance inicial

El bootstrap actual corresponde exclusivamente a **Innergex Chile**. La estructura se mantiene preparada para futuras entidades, pero no crea ni habilita despliegues de otros países.
