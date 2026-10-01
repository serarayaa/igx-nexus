# V02-026 — Proactive Findings Engine

Estado: **implementación funcional en curso** · issue #120.

## Pregunta operacional

> **¿Qué patrones observables justifican levantar un finding investigable, con qué evidencia, cobertura y confianza, sin presentarlo como una causa demostrada?**

V02-026 transforma evidencia ya disponible en **findings explicables**. No crea un root-cause engine, no ejecuta remediation y no convierte recurrencia o correlación en causalidad.

## Contrato

El motor separa explícitamente:

1. **Evidence**
   - observations canónicas;
   - ventana temporal;
   - source/sourceInstanceId;
   - coverage suficiente para evaluar la regla.

2. **Pattern**
   - regla determinista;
   - rule ID y versión estables;
   - condición reproducible.

3. **Hypothesis**
   - interpretación posible para orientar investigación;
   - siempre `causal=false`.

4. **Confidence**
   - describe soporte de evidencia del patrón;
   - no representa probabilidad de causa;
   - no es risk score ni severity score.

5. **Investigation guidance**
   - próximos pasos sugeridos;
   - no ejecuta comandos ni acciones.

## IDs y determinismo

Los findings usan IDs deterministas por regla + asset:

```text
<ruleId>:<assetId>
```

Ejemplo:

```text
nexus.endpoint.application-instability:DEMO-0099
```

El mismo snapshot produce exactamente el mismo reporte y el builder no muta el input.

## Población

Se reutilizan las reglas de población de Endpoint Experience:

Asset Class Taxonomy v2 classified:

- `endpoint`;
- `operator_interface`;
- `industrial_compute`.

Lifecycle operacional:

- `active`;
- `maintenance`;
- `repair`.

IT/OT sólo se filtra desde `taxonomy.domain.state=classified`. Compatibility projection no asigna cohortes.

## Ventanas

Se reutilizan las ventanas gobernadas de V02-025:

- 7 días;
- 14 días;
- 30 días.

La presentación inicial usa 14 días.

## Estados de evaluación

Cada regla declara:

- `triggered`: existe al menos un asset que cumple el patrón dentro de población evaluable;
- `not_triggered`: existe coverage suficiente, pero el patrón no aparece;
- `unavailable`: no existe coverage suficiente para evaluar.

`not_triggered` no significa healthy.

`unavailable` no equivale a cero findings.

## Reglas de referencia

### nexus.endpoint.application-instability v1

Pattern:

> al menos 2 observations de `application.crash` / `application.hang` en el mismo endpoint dentro de una ventana cubierta.

El umbral **2** significa únicamente **recurrencia mínima para esta regla de referencia**.

No representa:

- severity;
- impacto de negocio;
- SLA;
- health score;
- probabilidad de falla;
- política corporativa.

Hypothesis:

> existe una señal repetida de inestabilidad de aplicación que conviene investigar.

No identifica por sí sola software, hardware, driver, configuración ni usuario como causa.

### nexus.endpoint.repeated-unclean-restart v1

Pattern:

> al menos 2 observations de `system.unexpected_restart` en el mismo endpoint dentro de una ventana cubierta.

`system.stop_error_restart` puede acompañar la evidencia, pero permanece separado y no convierte automáticamente todos los reinicios no limpios en stop-error.

Hypothesis:

> existe un patrón de reinicios no limpios que requiere investigación.

No demuestra:

- pérdida de energía;
- PSU defectuosa;
- batería defectuosa;
- hardware defectuoso;
- bugcheck;
- causa operacional específica.

### nexus.endpoint.battery-capacity-evidence-gap v1

Pattern:

> `battery.present=true` está observado dentro de la ventana, pero no existe una `battery.capacity.percent` válida con unidad `percent` y rango 0..100.

Este finding describe un **gap de evidencia**.

No demuestra degradación de batería.

Un endpoint con `battery.present=false` es evaluado y no dispara esta regla.

## Coverage

Cada rule evaluation transporta:

- known;
- total;
- ratio;
- state;
- evaluatedAssets;
- triggeredAssets.

Coverage pertenece a la **capacidad de evaluar la regla**, no a la confianza causal.

Ejemplo:

```text
coverage = 80 / 100 endpoints
triggeredAssets = 4
```

Esto significa que la regla pudo evaluarse en 80 endpoints y encontró su patrón en 4.

No significa que los otros 96 estén saludables.

## Confidence

V02-026 usa confidence categórica orientada al soporte de evidencia:

- `supported`;
- `limited` reservado para futuras reglas que puedan emitir findings con soporte parcial defendible.

Las reglas iniciales sólo emiten findings cuando la evidencia requerida para ese asset está disponible, por lo que sus findings son `supported`.

La confidence nunca es una probabilidad causal.

## Demo

La Demo no contiene fixtures de finding desacoplados.

Los findings se derivan exclusivamente de `TechnologySnapshot.observations` sintéticas creadas por V02-025.

Por tanto:

```text
Demo observations
      ↓
rule evaluation
      ↓
finding
```

No existe:

```text
hard-coded Demo finding
```

## Live

Live sólo puede producir findings a partir de evidence real transportada en el snapshot canónico.

Si GLPI Live entrega `observations=[]`:

- las reglas quedan `unavailable`;
- no se generan findings;
- no se interpreta como 0 incidentes;
- no existe fallback a Demo.

V02-023 puede aportar una fuente futura, pero V02-026 no depende de Intune.

## Presentación

Technology Overview incorpora **Proactive Findings** como una lente de triage explicable.

Cada finding muestra:

- asset;
- regla;
- patrón observado;
- hipótesis de investigación;
- evidence count/names;
- confidence;
- coverage de la regla;
- guía de investigación;
- acceso a Asset 360.

No se introduce una ruta global nueva.

## Guardrails

1. Evidence before inference.
2. Correlation is not causation.
3. Finding != root cause.
4. Finding != risk score.
5. Finding != health score.
6. Confidence != causal probability.
7. No remediation automática.
8. No command execution.
9. No búsqueda automática en Internet.
10. No thresholds corporativos inventados.
11. No compatibility taxonomy para cohortes.
12. No fallback Live → Demo.
13. No active OT scanning.
14. Human before automation.

## Relación con V02-027

V02-026 termina en **investigation guidance local y determinista**.

V02-027 — Knowledge Research Workflow podrá decidir cómo consultar fuentes técnicas externas de forma auditable y segura.

V02-026 no adelanta ese workflow.

## Fuera de alcance

- root-cause analysis;
- ML/LLM diagnosis;
- severity scoring corporativo;
- remediation;
- command execution;
- ticket automation;
- alerting productivo;
- SIEM/SOAR integration;
- Internet research;
- V02-027.
