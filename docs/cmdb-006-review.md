# Revisión y entrega de CMDB-006

## Estado de partida verificado

`main` en `c6216741f6e80d5be9f4e186152e74ebfa01916d`, merge del PR #16.
CMDB-001 a CMDB-005 integrados. PR #6 y #10 respaldan los hitos Docker y GLPI.
CI de main aprobada. `apps/web` y NEXUS API no tenían implementación funcional.
No se encontró issue específico de CMDB-006 al revisar la colección completa;
se trabaja contra el ticket del roadmap sin crear issues duplicados.

Se revisaron README, ADR, roadmap, preparación de demo, documentación de diseño,
seguridad, bootstrap, estructura de workspaces, componentes consumidos y CI.
Es una revisión dirigida al siguiente hito, no una auditoría exhaustiva de seguridad.
No se accedió al laboratorio ni se comprobó la instancia GLPI de Sergio en vivo.

## Hallazgos y cambios

- Roadmap y preparación de demo aún contabilizaban 4/13: corregidos a 5/13 integrados.
- `npm test` raíz era un mensaje sin tests: ahora ejecuta UI y Dashboard.
- Panel funcional con 240 activos sintéticos, métricas documentadas, IT/OT,
  garantías, datos faltantes y adaptación responsive; reutiliza el DS.
- Prueba Chromium detectó foco perdido al abrir el drawer móvil. La corrección
  acotada en AppShell espera el primer paint antes de enfocar; CI confirma la
  regresión resuelta y los tests anteriores continúan aprobados.
- El consumidor cierra el drawer al pasar a escritorio para liberar `inert`.
- Logo oficial preservado con superficie clara también en Dark.
- La intención preliminar de Next.js se sustituye por Vite para esta SPA; ADR-0004
  documenta motivo, límites y futuro contrato de integración.

## Evidencia de QA

En la ejecución CI `34308044567`, commit `cc9824f`:

- 44 tests de Storybook aprobados.
- 10 tests de Dashboard aprobados (4 de modelo y 6 de navegador).
- axe sin infracciones en la matriz ensayada: Light/Dark, 1440/768/320 px.
- Typecheck y builds de UI, tokens, Web y Storybook aprobados.
- Tokens generados sin divergencias y paquete UI distribuible verificado.

Localmente pasaron typecheck, builds, 4 tests del modelo, referencias CSS,
`git diff --check`, `npm pack --dry-run` y validación/dry-run del bootstrap GLPI.
Chromium no pudo descargarse localmente por timeout; las pruebas de navegador
se ejecutaron en GitHub Actions. No se omitieron ni desactivaron esos controles.
La CI del último commit del PR debe quedar aprobada antes del merge.

## Límites y pendientes

No hay autenticación, NEXUS API ni fuentes reales; esta entrega es apta para revisar
la demo, no para manejar inventario corporativo en producción. CMDB-007+ permanece
fuera de alcance. Los duplicados históricos de issues están cerrados y no se alteraron.
Main no tiene protección de rama según la API consultada; se recomienda evaluar
protección y checks requeridos antes de habilitar colaboración adicional.

Los smoke tests manuales recomendados están en `docs/dashboard.md`: lector de
pantalla, zoom 200%/400%, High Contrast, reduced motion y teléfono físico.
No se declaran ejecutados ni equivalentes a los checks de axe.

## Al volver Sergio

1. Revisar el PR de CMDB-006 y comprobar CI verde sobre su último commit.
2. Si desea ejecutar la demo, actualizar la rama y seguir `apps/web/README.md`.
3. Realizar el merge manual cuando esté conforme. No hay auto-merge habilitado.
4. Actualizar main y comenzar CMDB-007 en una rama nueva desde esa base.

El avance formal permanece en 5/13 hasta el merge manual de CMDB-006; después
corresponderá actualizarlo a 6/13 (~46,2%).
