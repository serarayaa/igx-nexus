# ADR-0004 — Panel principal con proveedor sintético

Estado: Propuesto para integración con CMDB-006.

## Contexto

CMDB-005 está integrado mediante PR #16. `apps/web` aún no tenía aplicación y
`services/api` sólo define su responsabilidad. El roadmap separa el panel (006),
explorador (007), Asset 360 (008), CMDB Health (011) y dataset completo (012).
El README de Web mencionaba Next.js como stack planificado, sin configuración ni
implementación. No existía un ADR que requiriera SSR o Next.js.

## Decisión

- Crear una SPA React/TypeScript/Vite en el workspace existente. Vite ya forma parte
  del lockfile de Storybook; se declara como dependencia directa de la Web. Para una
  única vista interna con NEXUS API separada no se necesita SSR, otro servidor ni
  router. Se sustituye la intención preliminar de Next.js y se actualiza el README.
- Consumir el contrato publicado de `@igx-nexus/ui`, construyendo primero el paquete.
  React Aria permanece encapsulado. No se reemplazan tokens ni componentes del DS.
- Mantener un proveedor asíncrono cancelable y un fixture determinista de 240 activos.
  La fecha de corte es fija y visible; no representa la última sincronización real.
- Calcular sólo conteos y señales elementales necesarias para el panel. No definir
  un score global, reconciliación ni motor de calidad de CMDB-011.
- Usar barras CSS con valores y etiquetas siempre visibles. La lista textual es la
  alternativa accesible; la geometría decorativa queda oculta al lector. No incorporar
  una librería de gráficos para distribuciones univariadas sencillas.
- Aplicar CSS de aplicación con namespace `nexus-*` y tokens semánticos/data-viz.
- Mostrar las vistas futuras como información pendiente, sin enlaces rotos, rutas
  ficticias ni botones que prometan acciones todavía inexistentes.
- Mantener demo exclusivamente local, sin despliegue, autenticación ficticia ni
  llamadas a fuentes corporativas. La integración futura sigue Web → NEXUS API → GLPI.

## Consecuencias

El panel se puede revisar de forma independiente del backend y del laboratorio GLPI.
La fixture de UI no sustituye CMDB-012. Al conectar NEXUS API será necesario definir
contratos de transporte, validación, autorización, errores y agregación en servidor:
el tipo TypeScript actual no es un contrato de API aprobado.

El filtro por dominio afecta todas las métricas y distribuciones. Ubicaciones,
responsables y códigos se identifican como Demo. El alcance continúa en Chile;
no se introducen reglas que impidan un futuro proveedor para otra entidad.

Las pruebas de navegador/axe son un control automatizado y no una certificación
WCAG completa. Se conservan los smoke tests manuales documentados.
