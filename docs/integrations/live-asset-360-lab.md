# Live Asset 360 Vertical Slice — V02-008

Estado: **implementación / Live Lab**. Este runbook valida el recorrido:

```text
endpoint autorizado → GLPI Agent → GLPI → NEXUS API → NEXUS Web
```

No es un procedimiento de despliegue productivo. DNS, HTTPS, reverse proxy, Entra SSO, secret manager y hardening corporativo pertenecen a v0.3.

## Principios de seguridad

- GLPI sigue siendo el System of Record.
- NEXUS API es la única frontera que consume la Web; no existe Web → GLPI.
- El endpoint de activos NEXUS exige `technology:read`.
- El bridge de autenticación de este laboratorio sólo puede habilitarse en `development`/`test` y con NEXUS API escuchando en loopback.
- `NEXUS_LAB_AUTH_TOKEN` no lleva prefijo `VITE_`: Vite lo consume únicamente en su proceso servidor y lo inyecta al proxy `/api`; no debe quedar en el bundle del navegador.
- El token del Live Lab no reemplaza OAuth GLPI ni se reutiliza como client secret/password.
- Nunca copiar a Git hostname, serial, UUID, MAC/IP, usuarios, tokens, client secrets, inventario bruto ni logs completos reales.

## Prerrequisitos

1. V02-007 validado: al menos un `Computer` real aparece en GLPI mediante GLPI Agent.
2. Identidad `svc-nexus-api` y OAuth Password Grant + `scope=api` funcionando.
3. NEXUS API Live obtiene `/ready = 200`.
4. Dependencias instaladas con `npm ci`.
5. Rama V02-008 sincronizada.

## 1. Preparar variables NEXUS API

En WSL, desde el repo, usar la misma configuración GLPI validada en V02-007. No pegar secretos en chats ni versionarlos.

Variables no secretas de ejemplo:

```bash
export NEXUS_API_ENV=development
export NEXUS_PROVIDER_MODE=live
export NEXUS_GLPI_INSTANCE_ID=glpi-primary
NEXUS_GLPI_BASE_URL="http://127.0.0.1:8080/"
export NEXUS_GLPI_SERVICE_USERNAME="svc-nexus-api"
export NEXUS_GLPI_ALLOW_INSECURE_HTTP=true
```

Cargar Client ID y secretos de forma interactiva. Además generar un token **distinto** para el bridge Web local:

```bash
read -rsp "NEXUS Lab auth token (>=32 chars): " NEXUS_LAB_AUTH_TOKEN; echo
export NEXUS_LAB_AUTH_TOKEN
```

Ese mismo valor debe estar disponible en el proceso Vite, pero no debe escribirse en archivos versionados.

## 2. Levantar NEXUS API

```bash
npm run dev:api
```

La API debe permanecer en `127.0.0.1:3100`. Si se intenta usar `NEXUS_LAB_AUTH_TOKEN` con `NEXUS_API_ENV=production` o bind no-loopback, el runtime debe fallar cerrado.

Validar:

```bash
curl -i http://127.0.0.1:3100/health
curl -i http://127.0.0.1:3100/ready
```

Esperado: `200` y provider `live`/`ready`.

## 3. Levantar NEXUS Web en modo Live

En una segunda terminal WSL que tenga `NEXUS_LAB_AUTH_TOKEN`:

```bash
export VITE_NEXUS_DATA_MODE=live
export NEXUS_API_PROXY_TARGET="http://127.0.0.1:3100/"
npm run dev --workspace @igx-nexus/web
```

Abrir `http://127.0.0.1:3000/`.

En modo Live la ruta inicial debe ser **Activos**. Vite proxifica `/api/*` hacia NEXUS API e inyecta el Bearer únicamente en el proceso dev server.

## 4. Validación funcional

En el Explorer Live:

- debe aparecer el/los `Computer` normalizados desde GLPI;
- el badge debe indicar `LIVE LAB · NEXUS API`;
- al abrir un activo se navega por identidad NEXUS, no por ID GLPI;
- Asset 360 muestra campos presentes y deja ausentes como `No informado`;
- lifecycle/criticality `unknown` se muestran como desconocidos, no se convierten artificialmente en valores positivos;
- la sección Fuente indica `glpi` sin exponer external ID;
- no se muestran QR/label ni Device/CMDB Health sintéticos como si fueran reales;
- no se ofrece el grafo sintético como relación Live.

## 5. Validación de frontera API

Sin autenticación:

```bash
curl -i http://127.0.0.1:3100/api/v1/technology/snapshot
```

Esperado: `401`.

A través del navegador/Vite proxy, la misma ruta debe responder correctamente porque el dev proxy aporta la identidad de laboratorio con permiso `technology:read`.

No ejecutar un `curl` con el token escrito en línea de comandos si eso lo dejará en historial. Para depuración, cargarlo mediante `read -s` y usar la variable de entorno.

## 6. Evidencia permitida

Registrar solamente:

- fecha;
- cantidad de activos Live observados;
- `providerMode=live`;
- `/ready=200`;
- endpoint NEXUS snapshot protegido;
- Asset 360 Live visible;
- fuente `glpi` visible;
- campos ausentes tratados como desconocidos/no informados;
- resultado PASS/PARTIAL/FAIL.

No guardar capturas sin sanitizar si contienen datos reales.

## Rollback

1. detener Web y API;
2. `unset VITE_NEXUS_DATA_MODE NEXUS_API_PROXY_TARGET NEXUS_LAB_AUTH_TOKEN`;
3. volver a Demo sin `VITE_NEXUS_DATA_MODE=live`;
4. no modificar ni eliminar el inventario GLPI para revertir una prueba Web.

## Fuera de alcance

- Entra SSO/OIDC;
- exposición de NEXUS API fuera de loopback usando el bearer de laboratorio;
- reconciliación multisource;
- relaciones Live;
- QR/labels productivos;
- Device Health real;
- despliegue a servidor corporativo.
