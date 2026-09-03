# Bootstrap GLPI de IGX NEXUS

Este directorio contiene la configuración declarativa y las herramientas de bootstrap del núcleo GLPI utilizado por IGX NEXUS.

## Objetivo

Reproducir de forma segura y consistente la configuración base de **Innergex Chile** sin depender de clics manuales ni de conocimiento no documentado de una estación de trabajo.

El bootstrap debe ser **idempotente**: al ejecutarse varias veces, debe validar o actualizar los objetos existentes y no crear duplicados.

## Contenido actual

- `config/innergex-chile.json`: entidades, ubicaciones, estados de ciclo de vida y tipos de activos físicos validados durante CMDB-004.
- `bootstrap.py`: validador local y reconciliador read-only contra la API High-Level de GLPI.

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

## Evolución prevista en CMDB-004

La siguiente etapa habilitará un modo explícito de aplicación para:

1. crear únicamente objetos faltantes;
2. actualizar configuraciones divergentes de manera controlada;
3. validar nuevamente el resultado;
4. emitir un reporte reproducible de la ejecución.

Las escrituras se harán exclusivamente mediante la API soportada por GLPI. No se habilitará `--apply` hasta validar por completo el modo read-only.

## Seguridad

- Nunca escribir directamente en MariaDB.
- Nunca versionar contraseñas, tokens OAuth, secretos de cliente ni datos corporativos sensibles.
- Los secretos locales deben suministrarse mediante variables de entorno o un mecanismo de secretos aprobado.
- El bootstrap debe soportar validación/dry-run y reconciliación read-only antes de aplicar cambios.
- El cliente OAuth dedicado debe usar permisos mínimos suficientes.
- La configuración del repositorio debe contener únicamente datos corporativos aprobados para versionamiento.

## Alcance inicial

El bootstrap actual corresponde exclusivamente a **Innergex Chile**. La estructura se mantiene preparada para futuras entidades, pero no crea ni habilita despliegues de otros países.
