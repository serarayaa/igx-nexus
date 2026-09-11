# NEXUS API

`@igx-nexus/api` es la frontera HTTP de backend de **IGX NEXUS v0.2 — Technology Intelligence**.

En V02-002 su responsabilidad es deliberadamente pequeña: entregar un runtime real, versionado, observable y testeable antes de conectar fuentes corporativas.

## Arquitectura

```text
NEXUS Web
   |
   v
NEXUS API (este workspace)
   |
   v
adapters / integrations   ← tickets posteriores
```

La Web no debe acceder a tablas internas de GLPI/MariaDB ni saltarse esta frontera.

## Runtime

- Node.js 24
- TypeScript ESM / `NodeNext`
- Fastify 5
- logging estructurado Pino
- OpenAPI 3.0.3 generado mediante `@fastify/swagger`
- contratos canónicos importados desde `@igx-nexus/types`

`buildApp()` compone el servidor sin abrir un socket y permite tests mediante `Fastify.inject()`. `startServer()` es el único bootstrap que escucha host/puerto y registra shutdown ordenado para `SIGTERM` / `SIGINT`.

## Endpoints base

| Método | Ruta | Propósito |
| --- | --- | --- |
| GET | `/health` | liveness del proceso |
| GET | `/ready` | readiness del runtime actual |
| GET | `/api/v1` | metadata/versionado HTTP |
| GET | `/openapi.json` | contrato OpenAPI generado |

Todavía no existen endpoints productivos de activos: se agregarán cuando Provider Mode y adapters reales definan su comportamiento.

## Configuración

| Variable | Default | Descripción |
| --- | --- | --- |
| `NEXUS_API_ENV` | `development` | `development`, `test` o `production` |
| `NEXUS_API_HOST` | `127.0.0.1` | host de escucha; loopback por defecto |
| `NEXUS_API_PORT` | `3100` | puerto 1..65535 |
| `NEXUS_API_LOG_LEVEL` | `info` (`silent` en test) | nivel Pino soportado |

Los valores inválidos fallan durante bootstrap. No hay secretos ni credenciales en este ticket.

## Desarrollo

Desde la raíz:

```bash
npm run typecheck --workspace @igx-nexus/api
npm run test --workspace @igx-nexus/api
npm run build --workspace @igx-nexus/api
npm pack --dry-run --workspace @igx-nexus/api
npm run start --workspace @igx-nexus/api
```

Por defecto la API escucha sólo en `127.0.0.1:3100`.

## Seguridad actual y límites

El logger redacta preventivamente autorización, cookies, API keys y `set-cookie`. Las respuestas de error 500 no exponen mensajes internos; cada request devuelve `x-request-id` para correlación.

Esto **no sustituye V02-003 — API Security Baseline**. Todavía no hay autenticación, RBAC, Entra SSO, OAuth GLPI, secret manager ni fuentes reales.
