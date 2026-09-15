# Threat Model addendum — V02-008 Live Web

Este addendum extiende `docs/security/threat-model-v0.2.md` para la nueva frontera introducida por **V02-008 — Live Asset 360 Vertical Slice**. El baseline principal continúa vigente; este documento no reemplaza controles anteriores.

## Frontera nueva

```text
Browser
   |
   | same-origin /api/*
   v
Vite dev proxy (Live Lab)
   |
   | Authorization: Bearer <NEXUS_LAB_AUTH_TOKEN>
   v
NEXUS API (loopback only)
   |
   | technology:read
   v
TechnologyProvider Live
   |
   v
GLPI adapter / OAuth backend identity
```

El navegador **no** recibe credenciales GLPI ni `NEXUS_LAB_AUTH_TOKEN`. El bearer local es inyectado por el proceso Vite de desarrollo y no utiliza prefijo `VITE_`.

## Activos adicionales a proteger

- `NEXUS_LAB_AUTH_TOKEN` del bridge local;
- snapshot canónico de activos reales expuesto por NEXUS API;
- separación Demo/Live en Web;
- evidencia de procedencia mostrada al usuario;
- configuración del dev proxy;
- garantía de que datos demo-only no se presenten como observaciones Live.

## Amenazas y controles

| Frontera | Amenaza | Control V02-008 | Gate futuro |
| --- | --- | --- | --- |
| Browser → NEXUS API | snapshot real público/sin auth | `/api/v1/technology/snapshot` requiere `technology:read`; auth default deny-all | Entra/OIDC productivo en v0.3 |
| Browser bundle | secreto embebido en JavaScript | `NEXUS_LAB_AUTH_TOKEN` no usa prefijo `VITE_`; sólo lo consume el proceso Vite | revisión de build y secret scanning |
| Vite proxy → API | bearer reutilizado fuera del lab | runtime prohíbe lab auth en `production` y exige bind loopback | reemplazar por IdP/reverse proxy productivo |
| Vite proxy config | SSRF/proxy hacia host arbitrario | target validado como HTTP loopback sin userinfo/path arbitrario | deployment define upstream fijo |
| API → Browser | fuga de payload GLPI crudo | ruta retorna `TechnologySnapshot` canónico desde `TechnologyProvider` | mantener contract tests al ampliar asset types |
| API → Browser | error upstream filtra detalles | 5xx se enmascara como `INTERNAL_ERROR`; no se devuelve body GLPI | observabilidad server-side segura |
| Web Live | fallback silencioso a Demo | modo `live` explícito; provider Live falla cerrado; no fallback | mantener invariant en nuevas vistas |
| Web Live | inferencias no soportadas | owner, warranty, IP, hostname, lifecycle/criticality ausentes permanecen desconocidos/no informados | V02-009/V02-010 definen reconciliación/mappings |
| Web Live | Health/QR/relaciones sintéticas parecen reales | Asset 360 Live oculta Health y QR demo; relaciones Live quedan declaradas sin evidencia | migrar cada feature sólo con fuentes reales |
| Web → GLPI | bypass de NEXUS API | provider Web consume `/api/v1/technology/snapshot`; no existe URL/credencial GLPI en UI | architecture tests más completos en V02-028 |
| Snapshot global | sobreexposición de todos los activos a un lector válido | permiso global `technology:read` aceptado para Live Lab | autorización por objeto/scope corporativo antes de producción |
| Logs dev proxy/API | bearer o inventario termina en logs | API redaction existente; runbook prohíbe logs completos/evidencia sin sanitizar | revisar logs de reverse proxy/IdP en v0.3 |

## Riesgos aceptados del laboratorio

- el bearer es estático durante la sesión local y no tiene rotación dinámica;
- el endpoint snapshot es de alcance global para quien posea `technology:read`;
- Vite dev server no es un componente productivo;
- no existe TLS entre procesos loopback locales;
- la identidad del usuario final no está modelada todavía.

Estos riesgos **no son aceptables para despliegue corporativo** y no deben trasladarse al servidor. v0.3 debe reemplazar el bridge por HTTPS + identidad corporativa + autorización adecuada + gestión de secretos.

## Gate V02-008

Antes de declarar V02-008 completado:

1. CI verde con tests de auth/API/proyección Web;
2. endpoint snapshot sin auth devuelve 401;
3. Live Web sólo funciona con bridge local configurado;
4. un Computer real de V02-007 aparece en Explorer y Asset 360;
5. no aparecen features demo-only como evidencia Live;
6. evidencia manual sanitizada, sin identificadores reales ni secretos;
7. PR mergeado manualmente por Sergio.
