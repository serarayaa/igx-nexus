# Stack de Desarrollo Docker

IGX NEXUS utiliza Docker Compose para el entorno local de desarrollo y demostración de la v0.1.

## Servicios incluidos en CMDB-003

| Servicio | Imagen | Acceso desde el host |
| --- | --- | --- |
| GLPI | `glpi/glpi:11.0.11` | `http://127.0.0.1:8080` / `http://localhost:8080` |
| MariaDB | `mariadb:11.4` | Solo red interna de Docker |
| Redis | `redis:7.4-alpine` | Solo red interna de Docker |

Durante el desarrollo local, GLPI escucha únicamente en la interfaz loopback. Los puertos `3000` y `8000` quedan reservados para los futuros servicios NEXUS Web y NEXUS API. Los puertos `80` y `443` permanecen libres para una futura capa de reverse proxy/HTTPS.

## Primer inicio

Desde la raíz del repositorio:

```bash
cp .env.example .env
```

Genera secretos locales de desarrollo independientes para `GLPI_DB_PASSWORD` y `MARIADB_ROOT_PASSWORD`, y almacénalos únicamente en `.env`. Nunca versionar `.env`.

Valida el modelo de Compose antes de iniciar los contenedores:

```bash
docker compose config --quiet
```

Inicia el stack:

```bash
docker compose up -d
```

Comprueba el estado y healthcheck de los servicios:

```bash
docker compose ps
```

Para seguir los logs durante una investigación:

```bash
docker compose logs -f --tail=100
```

## Detener / reiniciar

Detén el stack conservando los datos persistentes:

```bash
docker compose down
```

Vuelve a iniciarlo:

```bash
docker compose up -d
```

Los volúmenes nombrados conservan los datos de MariaDB, GLPI y Redis después de un `docker compose down` normal.

## Validación de persistencia

CMDB-003 valida la persistencia comparando un valor conocido de la base de datos de GLPI antes y después de un ciclo normal `docker compose down` / `docker compose up -d`. El valor debe permanecer sin cambios y los tres servicios deben volver a un estado saludable (`healthy`).

## Reinicio destructivo

Utilizar únicamente cuando se requiera intencionalmente un reinicio local completo:

```bash
docker compose down -v
```

**Advertencia:** `-v` elimina los volúmenes locales nombrados y, por lo tanto, la base de datos local de GLPI y los datos persistentes de la aplicación.

## Requisito de Redis en el host WSL2

Redis recomienda habilitar el memory overcommit de Linux para una persistencia confiable en segundo plano. En el host Ubuntu de WSL2 se debe establecer `vm.overcommit_memory=1` y persistir la configuración mediante `/etc/sysctl.d/`.

## Límites de arquitectura

- GLPI escucha únicamente en loopback durante el desarrollo local.
- No exponer MariaDB ni Redis directamente al host Windows.
- Los servicios NEXUS no deben escribir directamente en las tablas de la base de datos de GLPI.
- GLPI debe permanecer actualizable de forma independiente.
- NEXUS Web se comunicará a través de NEXUS API.
- Los flujos de Service Desk y tickets de soporte están fuera de alcance; Jira es responsable de esos flujos.
