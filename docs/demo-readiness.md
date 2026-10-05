# IGX NEXUS — Demo Readiness

Estado: **índice vigente de preparación de Demo**.

## v0.2 — Technology Intelligence

La guía actual de presentación y validación de release es:

- [Demo v0.2](demo-v0.2.md);
- [Release Readiness v0.2](v0.2-readiness.md);
- [Live Lab v0.2 Readiness](integrations/live-lab-v0.2-readiness.md).

V02-029 valida que v0.2 pueda demostrarse de forma reproducible sin convertir la Demo en evidencia corporativa real.

La arquitectura vigente es:

```text
NEXUS Web
  → NEXUS API
  → TechnologyProvider / Reconciliation
      ├─ Demo: dataset sintético canónico
      └─ Live: fuentes reales soportadas, actualmente GLPI
```

Principios que deben mantenerse durante readiness:

- GLPI continúa como **System of Record CMDB/ITAM**;
- NEXUS actúa como **Intelligence Layer**;
- Demo y Live comparten contratos, no datos;
- Live nunca cae silenciosamente a Demo;
- evidence before inference;
- human before automation;
- sin active scanning OT;
- sin secretos, PII ni inventario corporativo real en Git o CI.

## Smoke de Demo v0.2

Desde la raíz:

```bash
npm ci
npm run test:readiness:v02
```

El recorrido integrado cubre de forma representativa:

```text
Technology Overview
 → IT / OT Intelligence
 → Endpoint Experience
 → Proactive Findings
 → Knowledge Research
 → Lifecycle & Investment
 → Asset Explorer
 → Asset 360
 → Technology Map
 → CMDB Quality
```

El smoke histórico v0.1 sigue disponible mediante:

```bash
npm run test:demo
```

y conserva la validación QR/Label y compatibilidad histórica.

## v0.1 — Histórico

La Demo v0.1 quedó cerrada en **13/13 tickets**.

Su documentación permanece disponible en:

- [Demo v0.1](demo-v0.1.md);
- roadmap v0.1 e historial de CMDB-001..013.

Ese material es histórico y no define la arquitectura vigente de v0.2.

En particular, cualquier referencia antigua a NEXUS como reemplazo del System of Record debe interpretarse como dirección inicial de la PoC. La arquitectura vigente mantiene GLPI como System of Record y NEXUS como capa de inteligencia.

## Qué no demuestra la Demo

Una Demo verde no implica:

- despliegue corporativo;
- SSO/Entra productivo;
- HA;
- cobertura completa de Intune;
- relaciones Live donde no existe evidencia;
- Device Health productivo;
- active OT scanning;
- remediation;
- certificación formal de seguridad o accesibilidad.

Para el cierre de v0.2 prevalecen Git, tests, ADR y la matriz de readiness.
