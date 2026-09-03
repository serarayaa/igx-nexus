# Bootstrap GLPI de IGX NEXUS

Este directorio contiene la configuración declarativa y las herramientas de bootstrap del núcleo GLPI utilizado por IGX NEXUS.

## Objetivo

Reproducir de forma segura y consistente la configuración base de **Innergex Chile** sin depender de clics manuales ni de conocimiento no documentado de una estación de trabajo.

El bootstrap debe ser **idempotente**: al ejecutarse varias veces, debe validar o actualizar los objetos existentes y no crear duplicados.

## Contenido actual

- `config/innergex-chile.json`: entidades, ubicaciones, estados de ciclo de vida y tipos de activos físicos validados durante CMDB-004.
- `bootstrap.py`: validador y dry-run de la configuración declarativa.

## Uso actual

Desde la raíz del repositorio:

```bash
python3 scripts/bootstrap-glpi/bootstrap.py
```

El comando valida referencias, duplicados y consistencia básica, e imprime el plan sin modificar GLPI.

## Evolución prevista en CMDB-004

La siguiente etapa conectará el bootstrap con una **API soportada por GLPI** para:

1. detectar objetos existentes;
2. crear únicamente los faltantes;
3. actualizar configuraciones divergentes de manera controlada;
4. validar el resultado final;
5. emitir un reporte reproducible de la ejecución.

La API High-Level de GLPI 11 utiliza OAuth2. Para automatizaciones se priorizará el grant `password` con un cliente OAuth dedicado y permisos mínimos suficientes.

## Seguridad

- Nunca escribir directamente en MariaDB.
- Nunca versionar contraseñas, tokens OAuth, secretos de cliente ni datos corporativos sensibles.
- Los secretos locales deben suministrarse mediante variables de entorno o un mecanismo de secretos aprobado.
- El bootstrap debe soportar un modo de validación/dry-run antes de aplicar cambios.
- La configuración del repositorio debe contener únicamente datos corporativos aprobados para versionamiento.

## Alcance inicial

El bootstrap actual corresponde exclusivamente a **Innergex Chile**. La estructura se mantiene preparada para futuras entidades, pero no crea ni habilita despliegues de otros países.
