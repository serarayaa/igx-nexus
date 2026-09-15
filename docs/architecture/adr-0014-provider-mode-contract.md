# ADR-0014 — Provider Mode Contract

Estado: **Propuesto en V02-004 / issue #49 / PR #50**. Este ADR queda aceptado únicamente cuando dicho PR sea integrado manualmente a `main`.

## Contexto

IGX NEXUS v0.1 opera sobre un dataset sintético propio de la Web. V02-001 incorporó un modelo canónico v0.2 independiente de las taxonomías e IDs de fuentes externas, V02-002 creó NEXUS API y V02-003 endureció su frontera HTTP.

El siguiente riesgo arquitectónico es introducir integraciones reales mediante condicionales dispersos de modo (`if demo`, `if live`) o hacer que la Web conozca detalles de GLPI, Intune u otras fuentes. Eso convertiría cada integración futura en una rama paralela del producto y dificultaría testing, seguridad, procedencia y evolución.

V02-004 define una frontera de providers antes de implementar GLPI API v2 en V02-005.

## Decisión

### 1. Provider Mode es explícito

El runtime reconoce solamente:

```text
demo
live
```

La selección se configura mediante:

```text
NEXUS_PROVIDER_MODE
```

En `development` y `test`, la ausencia de configuración selecciona `demo` para conservar una experiencia local reproducible. En `production`, el valor es obligatorio: no se permite que un despliegue productivo termine en Demo por omisión.

### 2. La selección ocurre en composición

`buildApp()` resuelve exactamente un `TechnologyProvider` al levantar el runtime.

Los handlers, componentes y consumidores posteriores no deben decidir el modo mediante condicionales repartidos por la aplicación. Deben trabajar contra el contrato del provider y el modelo canónico NEXUS.

### 3. Contrato común

`TechnologyProvider` expone:

- un descriptor inmutable;
- disponibilidad;
- capabilities explícitas;
- sistemas fuente declarados;
- lectura de `TechnologySnapshot` canónico.

El contrato no contiene tipos GLPI, Intune, Entra ni de la Web v0.1.

La capability inicial es:

```text
technology.snapshot.read
```

Las capabilities crecerán sólo cuando existan operaciones reales que justifiquen una distinción contractual.

### 4. Demo es un provider canónico, no una dependencia hacia la Web

V02-004 incorpora un provider Demo mínimo con identidades sintéticas ya conocidas (`DEMO-0007` y `DEMO-0013`) normalizadas al modelo canónico v0.2.

NEXUS API **no importa** módulos desde `apps/web`. La demo v0.1 conserva temporalmente su modelo legado hasta V02-011 — Demo Dataset v0.2 Migration.

Esta duplicación mínima y deliberada evita crear una dependencia invertida API → frontend sólo para reutilizar fixtures antiguos.

### 5. Live falla cerrado

Mientras V02-005 no implemente un adapter real, `live` se resuelve a un provider explícitamente `unavailable`.

No existe fallback silencioso:

```text
live unavailable  !=  demo
```

Intentar leer el snapshot del placeholder Live produce `ProviderUnavailableError` y el runtime no presenta datos sintéticos como si fueran Live.

### 6. Readiness depende del provider; liveness no

`/health` responde por la vida del proceso y permanece disponible aunque el provider Live no esté listo.

`/ready` refleja la capacidad del runtime para operar con el provider configurado:

- Demo canónico listo → HTTP 200;
- Live sin implementación → HTTP 503;
- un provider Live válido inyectado en composición → HTTP 200.

Esto permite que infraestructura futura distinga “proceso vivo” de “servicio apto para operar”.

### 7. Descriptor público acotado

`GET /api/v1/provider` expone únicamente metadata declarativa:

```text
id
mode
displayName
availability
capabilities
sourceSystems
```

No expone credenciales, URLs de upstream, tokens, client IDs secretos, headers ni configuración sensible.

La ruta es pública mientras esta metadata siga siendo parte del estado runtime no sensible. Si providers futuros agregan metadata operativa más delicada, el contrato público deberá revisarse antes de exponerla.

### 8. Provider inyectable para tests y adapters futuros

`buildApp({ technologyProvider })` admite una implementación inyectada sólo si el `descriptor.mode` coincide con el modo configurado.

Esto habilita tests y V02-005 sin crear variables de entorno que carguen módulos arbitrarios ni bypasses de runtime.

Un provider marcado `ready` debe declarar `technology.snapshot.read`; configuraciones incoherentes fallan durante composición.

## Procedencia

Los snapshots Demo utilizan `SourceReference.source = demo` y conservan referencias de fuente explícitas. Los providers Live futuros deberán producir el mismo contrato canónico y preservar procedencia suficiente para que tickets posteriores puedan reconciliar, auditar y explicar atributos.

V02-004 no define todavía reglas de matching/reconciliación multisource; eso pertenece a V02-009.

## Consecuencias positivas

- la Web y la lógica de producto pueden permanecer independientes del origen de datos;
- agregar GLPI no obliga a introducir ramas `if live` por toda la aplicación;
- Live nunca se disfraza de Demo ante una falla de configuración;
- readiness refleja dependencias funcionales reales;
- provider metadata y capabilities son testeables;
- V02-005 puede implementar GLPI detrás de una frontera ya estable;
- Demo sigue siendo reproducible sin convertir `apps/web` en dependencia del backend.

## Costos y riesgos aceptados

- el provider Demo canónico de V02-004 contiene sólo un subconjunto mínimo del catálogo v0.1;
- durante la transición coexisten temporalmente el dataset Web v0.1 y el snapshot Demo canónico;
- el placeholder Live no sirve datos hasta V02-005;
- `sourceSystems` del descriptor es metadata declarativa y deberá revisarse si en el futuro su exposición se considera sensible;
- todavía no existe caching, paginación, streaming ni resiliencia de upstream.

## Fuera de alcance

- GLPI API v2 y mapping completo;
- OAuth/service identity GLPI;
- Intune, Entra, Windows, Dell o Defender providers;
- migración total de los 240 CIs sintéticos al modelo v0.2;
- reconciliación multisource;
- autorización por objeto;
- caching/persistencia distribuida;
- selección dinámica de provider por request/usuario;
- fallback automático entre fuentes;
- despliegue corporativo.

## Relación con ADR anteriores

- ADR-0001 permanece vigente: NEXUS API aísla la Web de los sistemas aguas arriba.
- ADR-0011 permanece vigente: providers producen dominio canónico, no IDs/tipos de fuente como contrato de producto.
- ADR-0012 permanece vigente: `buildApp()` es el punto de composición testeable.
- ADR-0013 permanece vigente: Provider Mode opera dentro de una frontera deny-by-default y con configuración validada.

V02-004 agrega una frontera de origen de datos sin cambiar esas responsabilidades.