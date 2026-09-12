# ADR-0012 — Runtime de NEXUS API

Estado: Aceptado en V02-002 mediante issue #42 y PR #44, integrado manualmente a `main` en el merge `7eede47465da03019c78465837dbde2c3bad3c96`.

## Contexto

IGX NEXUS v0.1 validó la experiencia Web sobre datos sintéticos. V02-001 agregó el modelo canónico compartido `@igx-nexus/types`, pero `services/api` seguía siendo sólo una frontera documental.

Antes de conectar GLPI, Intune, Entra u otras fuentes, v0.2 necesita un runtime HTTP real que concentre contratos, observabilidad y lifecycle de proceso sin introducir todavía autenticación productiva ni provider logic.

## Decisión

### 1. Node.js 24 + TypeScript ESM

NEXUS API utiliza la versión Node fijada por `.nvmrc`, TypeScript strict y módulos ESM con resolución `NodeNext`.

Esto alinea backend y packages compartidos, evita un segundo toolchain y mantiene la aplicación portable hacia el despliegue corporativo de v0.3.

### 2. Fastify 5 como servidor HTTP

Se adopta Fastify 5 por:

- soporte activo sobre Node moderno;
- lifecycle HTTP pequeño y explícito;
- schemas por ruta;
- `inject()` para integración in-process sin abrir sockets;
- request IDs integrados;
- logging estructurado Pino;
- integración oficial con OpenAPI mediante `@fastify/swagger` 9.x.

No se incorpora Swagger UI en V02-002. El contrato primario es `/openapi.json`; una UI documental se agregará sólo si aporta valor operacional real.

### 3. `buildApp()` y `startServer()` son responsabilidades distintas

`buildApp()` compone plugins, hooks, handlers y rutas sin escuchar red.

`startServer()`:

1. carga configuración;
2. construye la app;
3. registra shutdown ordenado;
4. abre host/puerto.

Importar el package o `server.ts` no debe iniciar un listener por efecto secundario.

### 4. Configuración explícita por entorno

El runtime usa variables `NEXUS_API_*` validadas al iniciar.

Defaults de desarrollo:

```text
NEXUS_API_ENV=development
NEXUS_API_HOST=127.0.0.1
NEXUS_API_PORT=3100
NEXUS_API_LOG_LEVEL=info
```

Loopback es intencional: ejecutar el proyecto localmente no debe exponer accidentalmente la API a la LAN.

Un valor inválido falla temprano. No se agregan secretos ni credenciales en este ticket.

### 5. OpenAPI se genera desde los schemas del runtime

`@fastify/swagger` se registra antes de las rutas y genera OpenAPI 3.0.3.

Rutas base:

```text
GET /health
GET /ready
GET /api/v1
GET /openapi.json
```

No se crean endpoints ficticios de assets. Los endpoints de dominio aparecerán cuando V02-004 Provider Mode defina cómo entregar datos Demo/Live mediante la misma frontera.

### 6. Liveness y readiness permanecen separados

`/health` responde si el proceso/runtime está vivo.

`/ready` expresa si la instancia actual está lista para recibir tráfico. En V02-002 no existen dependencias aguas arriba, por lo que ambos son simples. En tickets posteriores readiness podrá incorporar dependencias sin cambiar el significado de liveness.

### 7. Logging y request correlation son baseline de runtime

Fastify/Pino entrega logging JSON y request IDs. NEXUS API devuelve `x-request-id` en la respuesta y lo incluye en errores normalizados.

Se redactan preventivamente campos sensibles comunes como Authorization, cookies, API keys y Set-Cookie. No se loguean bodies completos por defecto.

La política completa de auditoría, auth y RBAC pertenece a V02-003.

### 8. Errores HTTP no filtran implementación

Los errores exponen un contrato pequeño:

```text
code
statusCode
message
requestId
```

Los 500 no devuelven stack ni mensaje interno. El detalle técnico permanece en logging del servidor.

### 9. Shutdown ordenado

`SIGTERM` y `SIGINT` cierran Fastify mediante `app.close()` de forma idempotente. Esto permite contenedores y futuros orquestadores sin diseñar todavía la infraestructura de v0.3.

## Frontera resultante

```text
NEXUS Web
    |
    v
NEXUS API
    |
    v
adapters / integrations
    |
    +-- GLPI
    +-- Intune
    +-- Entra
    +-- futuras fuentes IT/OT
```

La Web no accede directamente a GLPI/MariaDB. Los adapters consumen `@igx-nexus/types` y la API expone contratos HTTP versionados.

## Compatibilidad

V02-002 es aditivo:

- no migra la Web v0.1;
- no cambia el dataset sintético;
- no altera CMDB Health;
- no conecta fuentes reales;
- no agrega persistencia propia.

## Consecuencias positivas

- existe por primera vez una frontera HTTP ejecutable;
- API y contratos canónicos comparten toolchain;
- tests de API no requieren puertos reales;
- OpenAPI nace junto al runtime;
- la configuración no depende del notebook local;
- el servicio queda preparado para V02-003/V02-004 y para traslado posterior a servidor.

## Costos y riesgos

- Fastify y Swagger agregan dependencias backend que deberán mantenerse parcheadas;
- readiness todavía no prueba fuentes porque aún no existen adapters;
- `API_SERVICE_VERSION` debe mantenerse alineada con el package hasta introducir una estrategia de versionado/release formal;
- request IDs emitidos por Fastify son locales al runtime; propagación distribuida futura requerirá una decisión explícita.

## Fuera de alcance

- Entra SSO / auth real;
- RBAC productivo;
- secrets management;
- OAuth GLPI;
- providers Demo/Live;
- endpoints productivos de assets;
- persistencia;
- Redis como dependencia de API;
- Web consumiendo NEXUS API;
- TLS/reverse proxy/DNS;
- despliegue corporativo.

## Relación con ADR anteriores

- ADR-0001 permanece vigente: NEXUS API aísla la Web de sistemas aguas arriba.
- ADR-0011 permanece vigente: `@igx-nexus/types` es el modelo canónico compartido y ninguna taxonomía de fuente define el dominio del producto.
