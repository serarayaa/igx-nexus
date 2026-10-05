# IGX NEXUS v0.2 — Live Lab Readiness

Estado: **readiness de release** · V02-029.

## Objetivo

Componer los gates Live ya construidos y revalidar el vertical soportado de v0.2 sin ampliar permisos, fuentes ni superficie productiva.

Arquitectura de laboratorio:

```text
endpoint autorizado
  → GLPI Agent
  → GLPI
  → NEXUS API Live
  → Vite proxy local
  → NEXUS Web
```

Windows/Dell telemetry es un laboratorio local adicional y no constituye actualmente un provider Live conectado al snapshot.

## Evidencia histórica disponible

### V02-007 — GLPI Agent Live Lab

Evidencia:

`glpi-agent-live-lab-evidence-2026-09-15.md`

Resultado histórico: **PASS**.

Demostró:

- endpoint real autorizado;
- Inventory-only;
- Agent → GLPI;
- ausencia de discovery/remote/deploy;
- GLPI → NEXUS API;
- source `glpi`.

### V02-008 — Live Asset 360

Evidencia:

`live-asset-360-evidence-2026-09-15.md`

Resultado histórico: **PASS**.

Demostró:

- `providerMode=live`;
- `/ready=200`;
- snapshot protegido;
- Web Live;
- Explorer / Asset 360;
- no fallback a Demo.

### V02-024 — Windows / Dell Lab Telemetry

Evidencia:

`windows-dell-lab-telemetry-evidence-2026-10-01.md`

Resultado histórico: **PASS**.

Demostró lectura local read-only de señales Windows defendibles sin inventar causalidad.

## Revalidación de cierre v0.2

La evidencia histórica prueba factibilidad, pero V02-029 debe verificar que el vertical principal no haya regresado en el HEAD de cierre.

### Prerrequisitos

- endpoint autorizado del laboratorio;
- GLPI Agent configurado según V02-007;
- identidad NEXUS API `scope=api`;
- credenciales cargadas localmente fuera de Git;
- repo limpio;
- `npm ci`;
- API/Web únicamente en loopback para el bearer de laboratorio.

### 1. Agent preflight

En Windows:

```powershell
.\scripts\live-lab\Test-GlpiAgentPreflight.ps1
```

Esperado:

```text
GLPI Agent Live Lab preflight: PASS
```

No forzar inventario si el preflight falla.

### 2. NEXUS API Live

Configurar localmente las variables definidas en:

`docs/integrations/live-asset-360-lab.md`.

Levantar:

```bash
npm run dev:api
```

Verificar:

```bash
curl -i http://127.0.0.1:3100/health
curl -i http://127.0.0.1:3100/ready
```

Esperado:

- health 200;
- ready 200;
- providerMode Live;
- provider ready.

Sin auth:

```bash
curl -i http://127.0.0.1:3100/api/v1/technology/snapshot
```

Esperado: **401**.

No colocar el bearer literal en historial compartido.

### 3. Web Live

En otra sesión local:

```bash
export VITE_NEXUS_DATA_MODE=live
export NEXUS_API_PROXY_TARGET="http://127.0.0.1:3100/"
npm run dev --workspace @igx-nexus/web
```

El proceso Vite debe recibir `NEXUS_LAB_AUTH_TOKEN` desde environment local.

### 4. Superficies esperadas

#### Overview

Debe:

- mostrar `LIVE LAB · NEXUS API`;
- representar coverage parcial;
- mantener Endpoint Experience unavailable si `observations=[]`;
- no mostrar findings/research Demo;
- no inventar garantías/owner/quality.

#### Asset Explorer

Debe mostrar sólo assets Live retornados por NEXUS API.

#### Asset 360

Debe:

- conservar identidad NEXUS;
- indicar fuente GLPI;
- mantener unknown/no informado cuando falta evidencia;
- no mostrar QR/Health sintético.

#### Lifecycle & Investment

Puede mostrar cobertura unavailable/partial si GLPI no entrega fechas con provenance.

No existe fallback a hitos Demo.

#### Technology Map

Puede no disponer de relaciones Live.

La ausencia de relaciones debe permanecer ausencia; no usar fixtures Demo.

#### CMDB Health

La ruta global Demo no forma parte de la navegación Live mientras no exista cobertura defendible.

#### Knowledge Research

Sin research Live real, debe mostrar packet no disponible.

No usar synthetic fixture como fallback.

## Endpoint signals

Actualmente GLPI Live entrega `observations=[]`.

Por tanto:

- Endpoint Experience Live puede quedar unavailable;
- Proactive Findings pueden no evaluarse;
- esto es comportamiento correcto;
- V02-023 puede añadir evidencia futura, pero no se requiere para falsear readiness.

El probe Windows/Dell no debe conectarse artificialmente al provider durante V02-029.

## Evidencia permitida para V02-029

Registrar sólo:

- fecha;
- commit/HEAD;
- alias de laboratorio no corporativo;
- Agent preflight PASS/FAIL;
- `providerMode=live`;
- `/ready` status;
- snapshot protegido 401 sin auth;
- cantidad agregada de assets Live;
- Overview/Explorer/Asset360 visibles;
- no-fallback verificado;
- states unavailable/unknown observados;
- resultado PASS/PARTIAL/FAIL.

No registrar:

- hostname;
- usuario;
- serial;
- UUID;
- MAC/IP;
- dominio/tenant;
- URL corporativa;
- client id/secret;
- bearer/access token;
- inventario bruto;
- logs completos;
- screenshot sin sanitizar.

## Resultado aceptable

**PASS**: vertical soportado funciona sobre el HEAD de cierre y los guardrails permanecen.

**PARTIAL**: la revalidación real no está disponible, pero CI + evidencia histórica permanecen y la limitación se documenta explícitamente.

**FAIL**: existe regresión del vertical soportado, fuga Demo→Live, seguridad degradada o contrato incompatible.

Un PARTIAL debe ser una decisión explícita de release, no un PASS disfrazado.

## Rollback

1. detener Web/API;
2. retirar variables Live locales;
3. revocar credenciales de laboratorio si corresponde;
4. volver a Demo;
5. no borrar evidencia histórica sanitizada;
6. no modificar activos GLPI sólo para “hacer pasar” el gate.
