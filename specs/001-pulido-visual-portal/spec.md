# Especificación: Pulido visual del portal móvil y del dashboard

**Rama:** `001-pulido-visual-portal` · **Creada:** 2026-10-05 · **Versión:** 2 (aclaraciones resueltas)
**Estado:** Aprobada para planificar
**Constitución aplicable:** v1.1.0 (en especial V, VI, VII, VIII, IX y X)

## Resumen

La interfaz de Klassi funciona, pero se construyó pantalla por pantalla y se nota: textos muy
pequeños, botones difíciles de tocar, la misma información dibujada de maneras distintas y poca
jerarquía entre lo urgente (un pago vencido) y lo informativo. Esta especificación pide **pulir la
experiencia visual y táctil del portal móvil (familias e instructores) y del dashboard (staff) de
forma conservadora: misma estética y misma marca, mejor ejecución, sin cambiar la lógica de
negocio.** La meta es que una persona entienda su situación de un vistazo y complete sus tareas
sin pensar, en un teléfono o en una computadora.

## Contexto y problemas observados

Diagnóstico sobre el código actual (inventario completo en `plan.md`). Se confirmará con capturas
reales durante la fase de fundaciones.

1. **Legibilidad:** 138 usos de texto menor de 12 px en pantallas y componentes (etiquetas de
   estado, fechas, datos de alumno y escuela).
2. **Objetivos táctiles pequeños:** los botones de acción del portal (confirmar asistencia,
   adjuntar comprobante, cambiar de opinión) son más bajos que el mínimo recomendado para dedos.
3. **Inconsistencia:** la insignia de estado de pago tiene su propia versión en al menos 5
   archivos además del componente compartido; los estados vacíos, de carga y de error varían entre pantallas; el portal no usa los
   componentes compartidos que ya existen.
4. **Colores sin sistema:** hay varios rojos, ámbares y verdes equivalentes escritos a mano en el
   código (por ejemplo tres rojos distintos para "peligro"), lo que complica el contraste y el
   modo oscuro.
5. **Poca jerarquía:** Pagos del portal lista cargos sin resumir cuánto se debe; Inicio no pone
   primero lo accionable; el pase de lista no muestra cuántos alumnos faltan por marcar.
6. **Primer uso:** la invitación a instalar la app y activar avisos no se distingue lo bastante.

## Historias de usuario

### H1 — Una familia ve qué debe y actúa en segundos (P1)

Como tutor quiero abrir Pagos y entender de inmediato cuánto debo, qué está vencido y qué ya
pagué, para saber qué hacer sin leer cada tarjeta.

1. **Dado** que tengo pagos pendientes y vencidos, **cuando** abro Pagos, **entonces** veo arriba
   un resumen con el total pendiente y cuántos pagos están vencidos, antes de la lista.
2. **Dado** un pago vencido, **cuando** lo veo en la lista, **entonces** se distingue de uno
   pendiente por algo más que el color (texto o icono).
3. **Dado** un pago pendiente, **cuando** quiero adjuntar mi comprobante, **entonces** lo logro con
   no más de 2 toques desde que abro Pagos, con un botón cómodo para el pulgar.
4. **Dado** que no tengo pagos, **cuando** abro Pagos, **entonces** veo un mensaje vacío claro.

### H2 — Una familia lee sus avisos sin esfuerzo (P1)

Como tutor quiero distinguir los avisos nuevos de los leídos y leerlos cómodamente.

1. **Dado** avisos leídos y no leídos, **cuando** abro Notificaciones, **entonces** los no leídos
   se identifican a simple vista, también en modo oscuro.
2. **Dado** un aviso largo, **cuando** lo leo, **entonces** el texto tiene tamaño, interlineado y
   contraste cómodos y no se corta ni desborda.
3. **Dado** que toco "Marcar leídas", **cuando** termina, **entonces** recibo confirmación visible
   y el contador de la pestaña se actualiza.

### H3 — Una familia responde a un evento sin dudas (P2)

1. **Dado** un evento sin responder, **cuando** lo abro, **entonces** la pregunta y las dos
   respuestas son lo más prominente de la tarjeta.
2. **Dado** que confirmé asistencia, **cuando** vuelvo a la tarjeta, **entonces** veo que quedó
   confirmada y el paso siguiente (adjuntar comprobante).
3. **Dado** que decliné, **cuando** cambio de opinión, **entonces** lo revierto con un toque visible.

### H4 — Un instructor pasa lista con una mano (P2)

1. **Dado** la lista de un grupo, **cuando** marco a un alumno, **entonces** los cuatro estados
   tienen objetivos amplios y el elegido se ve inequívoco, también en modo oscuro.
2. **Dado** que voy marcando, **cuando** avanzo, **entonces** veo cuántos llevo del total.
3. **Dado** que me equivoco, **cuando** corrijo, **entonces** el cambio se refleja al instante.

### H5 — Una persona nueva instala la app y activa avisos (P3)

1. **Dado** un teléfono sin la app instalada o sin avisos activos, **cuando** abro Inicio,
   **entonces** veo una invitación destacada con el siguiente paso concreto.
2. **Dado** que ya instalé y activé los avisos, **cuando** abro Inicio, **entonces** la
   invitación ya no ocupa espacio.

### H6 — El staff atiende cobros y ve su estado de un vistazo (P2)

Como recepcionista o administrador quiero revisar pagos y reconocer pendientes, vencidos y
pagados sin esfuerzo, para dar seguimiento rápido.

1. **Dado** la lista de pagos, **cuando** la reviso, **entonces** el estado de cada pago se ve
   igual que en el portal (mismo texto, icono y color) y se distingue sin depender solo del color.
2. **Dado** el inicio del dashboard, **cuando** lo abro, **entonces** las cifras clave (cobrado
   del mes, vencidos, alumnos activos) destacan por encima del resto, con jerarquía clara.
3. **Dado** una pantalla de 768 px de ancho, **cuando** abro Pagos, **entonces** la tabla se
   puede leer y recorrer sin que la página entera haga scroll horizontal.

### H7 — El staff recorre listados con comodidad (P3)

Como staff quiero que Alumnos, Grupos, Instructores, Eventos y Comunicados tengan tablas y listas
consistentes y legibles.

1. **Dado** cualquier listado, **cuando** lo abro, **entonces** encabezados, filas, insignias y
   acciones usan el mismo estilo, tamaño y espaciado.
2. **Dado** un listado vacío o en carga, **cuando** lo abro, **entonces** veo el mismo estado vacío
   o de carga que en las demás pantallas.

### H8 — El staff captura datos en formularios y modales sin fricción (P3)

1. **Dado** un formulario, **cuando** lo lleno, **entonces** cada campo tiene etiqueta visible,
   errores junto al campo y un botón principal inequívoco.
2. **Dado** un modal en una pantalla de poca altura, **cuando** lo uso, **entonces** puedo hacer
   scroll y alcanzar todos los botones.

## Requisitos funcionales

- **RF-001** Todo texto informativo del portal y del dashboard debe medir al menos 12 px; títulos
  y montos mantienen una jerarquía clara por tamaño y peso.
- **RF-002** Todo elemento tocable del portal debe medir al menos 44 × 44 px de área táctil; en el
  dashboard, al menos 44 × 44 px en dispositivos táctiles y al menos 36 px de alto con puntero.
- **RF-003** Un mismo concepto (estado de pago o evento, tarjeta de cobro, estado vacío, de carga
  o de error, botón principal) debe verse y comportarse igual en todas las pantallas.
- **RF-004** El estado de un pago o evento se comunica con texto o icono, no solo con color.
- **RF-005** Pagos del portal muestra un resumen (total pendiente y número de vencidos) antes de la
  lista, y resalta lo vencido.
- **RF-006** Inicio del portal muestra primero lo accionable (pagos por atender, invitación a
  instalar o activar avisos) y después la información de los alumnos.
- **RF-007** El pase de lista muestra el avance (marcados de total) y objetivos amplios para los
  cuatro estados.
- **RF-008** Toda acción iniciada por el usuario da retroalimentación inmediata de éxito, error o
  progreso.
- **RF-009** Cada superficie conserva su color de marca actual (azul `#1D3557` en el portal, verde
  `#006241` en el dashboard) y su modo oscuro.
- **RF-010** Textos y mensajes permanecen en español (es-MX).
- **RF-011** Los colores semánticos (éxito, advertencia, peligro, neutro) se definen una sola vez
  y se reutilizan; no quedan equivalentes escritos a mano en pantallas nuevas o tocadas.
- **RF-012** Las tablas del dashboard se leen y recorren sin provocar scroll horizontal de la
  página entre 768 y 1920 px de ancho.

## Requisitos no funcionales (derivados de la constitución)

- **RNF-001** (V) Portal sin scroll horizontal ni recortes entre 360 y 430 px en vertical;
  dashboard sin scroll horizontal de página entre 768 y 1920 px.
- **RNF-002** (VI) Cada pantalla conserva su estado de carga inmediato; el JavaScript de cada
  ruta no crece más de 10 % respecto a hoy.
- **RNF-003** (IX) Contraste AA (4.5:1 texto, 3:1 componentes) en modo claro y oscuro.
- **RNF-004** (VII) Ningún cambio altera datos, API ni permisos; el trabajo se entrega por fases
  independientes y reversibles.
- **RNF-005** (VIII) La suite E2E actual sigue en verde y se agregan pruebas automáticas de
  tamaño mínimo de texto, tamaño de objetivos táctiles, accesibilidad y de los nuevos elementos
  (resumen de Pagos, avance del pase de lista).
- **RNF-006** (X) Se reutilizan y amplían los componentes compartidos existentes antes de crear
  otros.

## Fuera de alcance

- Cambiar la identidad de marca, el logotipo o los colores de marca de cada superficie.
- Unificar el azul del portal con el verde del dashboard (decisión de producto aparte).
- Nuevas funcionalidades de negocio; cambios de datos, permisos o notificaciones.
- Cambiar la estructura de navegación (pestañas, menú lateral) o el contenido de las pantallas
  más allá de lo indicado en los requisitos.
- Páginas de marketing y flujos de autenticación de Clerk.

## Criterios de éxito

1. Un barrido automático de las pantallas del portal y del dashboard no encuentra texto
   informativo menor de 12 px ni objetivos táctiles por debajo del mínimo (RF-001 y RF-002).
2. Una auditoría automática de accesibilidad no reporta violaciones de contraste ni de nombres
   accesibles en las pantallas del portal y en las 6 principales del dashboard.
3. En una prueba guiada en su teléfono, el dueño encuentra "cuánto debo" y adjunta un comprobante
   en menos de 20 segundos, y marca un grupo de 10 alumnos con una mano sin errores de dedo.
4. El dueño valida con capturas antes y después, en teléfono y escritorio, que la estética y la
   marca se conservan y la jerarquía mejora.
5. 25 de 25 pruebas E2E existentes en verde, más las nuevas.

## Supuestos

- Dispositivos de referencia: teléfonos de 360 a 430 px y pantallas de 768 a 1920 px.
- La validación con personas la hacen el dueño del proyecto y el asistente, con capturas y pruebas
  guiadas, no con grupos externos.
- La skill `frontend-design` se usa en el plan para revisar la propuesta visual dentro de los
  límites conservadores de esta especificación.

## Aclaraciones (resueltas el 2026-10-05)

- **Alcance:** portal móvil **y** dashboard del staff. → Se agregaron H6, H7, H8, RF-011, RF-012.
- **Margen creativo:** pulido **conservador** (misma estética y marca, mejor ejecución). → Se
  excluye cualquier cambio de identidad y se prioriza consistencia, jerarquía y legibilidad.
- **Prioridades:** el orden P1/P2/P3 es correcto; el dashboard entra como P2 (cobros) y P3.
- **Pruebas con personas:** las validan el dueño y el asistente.

## Lista de verificación de calidad de la especificación

- [x] Describe qué y por qué, sin decisiones técnicas ni de implementación.
- [x] Cada historia tiene escenarios de aceptación comprobables.
- [x] Los requisitos son medibles (12 px, 44 px, AA, 2 toques, 10 % de JS).
- [x] Alcance y exclusiones explícitos.
- [x] Compatible con la constitución v1.1.0.
- [x] Sin aclaraciones pendientes.
