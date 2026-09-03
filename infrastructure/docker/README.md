# Docker Development Stack

IGX NEXUS uses Docker Compose for the local v0.1 development/demo environment.

## Services in CMDB-003

| Service | Image | Host access |
| --- | --- | --- |
| GLPI | `glpi/glpi:11.0.8` | `http://localhost:8080` |
| MariaDB | `mariadb:11.4` | Internal Docker network only |
| Redis | `redis:7.4-alpine` | Internal Docker network only |

Ports `3000` and `8000` are reserved for the future NEXUS Web and NEXUS API services. Ports `80` and `443` remain free for a later reverse-proxy/HTTPS layer.

## First start

From the repository root:

```bash
cp .env.example .env
```

Generate separate local development secrets for `GLPI_DB_PASSWORD` and `MARIADB_ROOT_PASSWORD` and store them only in `.env`. Never commit `.env`.

Validate the Compose model before starting containers:

```bash
docker compose config --quiet
```

Start the stack:

```bash
docker compose up -d
```

Check status and health:

```bash
docker compose ps
```

Follow logs when troubleshooting:

```bash
docker compose logs -f --tail=100
```

## Stop / restart

Stop the stack while preserving persistent data:

```bash
docker compose down
```

Start it again:

```bash
docker compose up -d
```

Named volumes preserve MariaDB, GLPI and Redis data across a normal `docker compose down`.

## Destructive reset

Only when a full local reset is intentionally required:

```bash
docker compose down -v
```

**Warning:** `-v` deletes the local named volumes and therefore the local GLPI database and persistent application data.

## WSL2 Redis host requirement

Redis recommends Linux memory overcommit for reliable background persistence. On the WSL2 Ubuntu host, set `vm.overcommit_memory=1` and persist it through `/etc/sysctl.d/`.

## Architecture guardrails

- Do not expose MariaDB or Redis directly to the Windows host.
- Do not write directly to GLPI database tables from NEXUS services.
- GLPI must remain independently upgradeable.
- NEXUS Web will communicate through NEXUS API.
- Service Desk / support-ticket workflows are out of scope; Jira owns those workflows.
