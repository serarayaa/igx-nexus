# IGX NEXUS — Working Rules

> Reglas operativas para agentes de IA que desarrollen, revisen o auditen IGX NEXUS.

## 1. Trabajar desde evidencia

Antes de afirmar cómo funciona algo:

- revisar código, tests o documentación vigente;
- no completar vacíos mediante suposición;
- distinguir hechos observados de propuestas.

Si una capacidad no existe, decirlo explícitamente.

## 2. Respetar el alcance del ticket

Implementar el objetivo actual sin adelantar innecesariamente tickets futuros.

No agregar por anticipación:

- frameworks;
- abstracciones;
- integraciones;
- modelos de datos;
- automatizaciones;
- infraestructura.

Una mejora futura válida no implica que deba implementarse ahora.

## 3. Preservar decisiones arquitectónicas

Antes de modificar arquitectura:

- consultar `../architecture/README.md`;
- identificar ADR relevantes;
- comprobar si una decisión previa sigue vigente o fue supersedida.

No duplicar decisiones canónicas en documentación paralela.

## 4. Demo y Live

Mantener separación estricta:

- Demo puede usar datos sintéticos controlados;
- Live solamente puede mostrar información respaldada por fuentes reales disponibles;
- Live nunca debe caer silenciosamente a Demo;
- no fabricar relaciones, telemetría, clasificación ni evidencia faltante.

## 5. Evidence before inference

No convertir señales débiles en hechos fuertes.

Ejemplos:

- hostname no prueba identidad por sí solo;
- IP no determina identidad estable;
- hardware genérico no determina dominio IT/OT;
- ausencia de datos no equivale a estado saludable;
- correlación no equivale a relación canónica.

Cuando exista inferencia, debe ser explícita, trazable y defendible.

## 6. Human before automation

No automatizar decisiones de alto impacto únicamente porque técnicamente sea posible.

Preferir:

`evidencia → propuesta → explicación → decisión humana`

antes que:

`señal → acción automática`

salvo que exista contrato explícito que autorice dicha automatización.

## 7. Dependencias

No agregar nuevas dependencias sin necesidad demostrada.

Antes de introducir una librería:

1. comprobar si el stack actual ya resuelve el problema;
2. evaluar costo de mantenimiento;
3. revisar seguridad y compatibilidad;
4. documentar la decisión cuando sea arquitectónicamente relevante.

## 8. Contratos antes que UI

Una pantalla no debe inventar semántica que el dominio o API todavía no poseen.

Cuando una nueva visualización necesite métricas, estados o agregaciones:

- definir primero su significado;
- identificar fuente;
- definir denominadores y cobertura;
- decidir cómo representar datos faltantes o parciales.

## 9. Calidad

Todo cambio funcional debe considerar según corresponda:

- tests unitarios;
- tests de integración;
- tests de contrato;
- browser tests;
- accesibilidad;
- responsive/reflow;
- estados loading/error/empty;
- regresiones Demo/Live.

No debilitar tests para conseguir CI verde.

## 10. Accesibilidad

Mantener WCAG 2.2 AA como baseline de producto.

Considerar:

- navegación por teclado;
- focus visible;
- semántica;
- contraste;
- reduced motion;
- High Contrast;
- reflow y viewport reducido.

## 11. Seguridad

Mantener:

- mínimo privilegio;
- deny-by-default cuando aplique;
- secretos fuera del código;
- integración Live read-only salvo decisión explícita;
- trazabilidad y auditabilidad;
- ningún active scanning OT.

## 12. Cambios pequeños y verificables

Preferir cambios:

- acotados;
- revisables;
- testeables;
- reversibles.

Evitar refactors masivos junto con cambios funcionales salvo necesidad demostrable.

## 13. Git y entrega

Antes de modificar:

- verificar branch;
- verificar HEAD;
- verificar `git status`.

Antes de declarar terminado:

- revisar diff;
- ejecutar validaciones relevantes;
- confirmar CI cuando corresponda;
- actualizar documentación afectada;
- actualizar `03-SESSION-HANDOFF.md`.

## 14. No vender progreso inexistente

Describir resultados concretos.

Evitar lenguaje promocional como sustituto de evidencia.

Una funcionalidad está lista cuando el código, los tests y los criterios de aceptación lo respaldan.