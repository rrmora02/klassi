# Especificación: Pulido visual del portal móvil

**Rama:** `001-pulido-visual-portal` · **Creada:** 2026-10-05 · **Estado:** Borrador, con aclaraciones pendientes
**Constitución aplicable:** v1.1.0 (en especial V, VI, VII, VIII y IX)

## Resumen

El portal de familias e instructores funciona, pero su interfaz se construyó pantalla por pantalla
y se nota: textos muy pequeños, botones difíciles de tocar con el pulgar, la misma información
presentada de maneras distintas según la pantalla y poca jerarquía entre lo urgente (un pago
vencido) y lo informativo. Esta especificación pide **pulir la experiencia visual y táctil del
portal sin cambiar la marca ni la lógica de negocio**, para que una persona entienda su situación
de un vistazo y complete sus tareas con una mano, en un teléfono, sin pensar.

## Contexto y problemas observados

Inventario hecho leyendo las pantallas actuales (inicio, notificaciones, pagos, asistencia,
cuenta y los componentes de eventos, comprobantes y activación de avisos). Está pendiente
confirmarlo con capturas reales en un teléfono durante el plan.

1. **Legibilidad:** buena parte del texto informativo mide entre 10 y 12 px (etiquetas de estado,
   fechas, datos del alumno y de la escuela).
2. **Objetivos táctiles pequeños:** los botones de acción (confirmar asistencia, adjuntar
   comprobante, cambiar de opinión) son más bajos que el mínimo recomendado para dedos.
3. **Inconsistencia:** el estado de un pago ("Pendiente", "Vencido", "Pagado") y las tarjetas de
   cobro se dibujan de forma distinta en Inicio, Pagos y Eventos; los estados vacíos y de carga
   también varían entre pantallas.
4. **Poca jerarquía:** Pagos lista cargos sin resumir cuánto se debe ni destacar lo vencido;
   Inicio no pone primero lo accionable.
5. **Pase de lista del instructor:** cuatro botones por alumno compartiendo ancho, sin ver de un
   vistazo cuántos alumnos faltan por marcar.
6. **Primer uso:** la invitación a instalar la app y activar avisos no se distingue lo bastante
   del resto del contenido.

## Historias de usuario

### H1 — Una familia ve qué debe y actúa en segundos (Prioridad: P1)

Como tutor quiero abrir Pagos y entender de inmediato cuánto debo, qué está vencido y qué ya
pagué, para saber qué hacer sin leer cada tarjeta.

**Por qué P1:** es la tarea económica más frecuente y la que más impacta a las escuelas.

**Escenarios de aceptación**
1. **Dado** que tengo pagos pendientes y vencidos, **cuando** abro Pagos, **entonces** veo arriba un
   resumen con el total pendiente y cuántos pagos están vencidos, antes de la lista.
2. **Dado** un pago vencido, **cuando** lo veo en la lista, **entonces** se distingue de uno
   pendiente por algo más que el color (texto o icono).
3. **Dado** un pago pendiente, **cuando** quiero adjuntar mi comprobante, **entonces** lo logro
   con no más de 2 toques desde que abro Pagos y el botón se alcanza cómodamente con el pulgar.
4. **Dado** que no tengo pagos, **cuando** abro Pagos, **entonces** veo un mensaje vacío claro que
   me dice qué esperar, no una pantalla en blanco.

### H2 — Una familia lee sus avisos sin esfuerzo (Prioridad: P1)

Como tutor quiero distinguir los avisos nuevos de los ya leídos y leerlos cómodamente, para no
perderme un comunicado de la escuela.

**Escenarios de aceptación**
1. **Dado** avisos leídos y no leídos, **cuando** abro Notificaciones, **entonces** los no leídos
   se identifican a simple vista, también en modo oscuro.
2. **Dado** un aviso largo, **cuando** lo leo, **entonces** el texto tiene tamaño, interlineado y
   contraste cómodos y no se corta ni desborda.
3. **Dado** que toco "Marcar leídas", **cuando** termina la acción, **entonces** recibo una
   confirmación visible y el contador de pestañas se actualiza.

### H3 — Una familia responde a un evento sin dudas (Prioridad: P2)

Como tutor quiero confirmar o declinar la asistencia a un evento y luego, si asisto, adjuntar el
pago, viendo claramente en qué paso estoy.

**Escenarios de aceptación**
1. **Dado** un evento sin responder, **cuando** lo abro, **entonces** la pregunta y las dos
   respuestas ("Sí asistirá" / "No asistirá") son lo más prominente de la tarjeta.
2. **Dado** que confirmé asistencia, **cuando** vuelvo a la tarjeta, **entonces** veo el paso
   siguiente (adjuntar comprobante) y que la asistencia ya quedó confirmada.
3. **Dado** que declino, **cuando** cambio de opinión, **entonces** puedo revertirlo con un solo
   toque claramente visible.

### H4 — Un instructor pasa lista con una mano (Prioridad: P2)

Como instructor quiero marcar la asistencia de mi grupo rápido y saber cuántos alumnos me faltan,
para terminar al inicio de la clase sin errores de dedo.

**Escenarios de aceptación**
1. **Dado** la lista de un grupo, **cuando** marco el estado de un alumno, **entonces** los cuatro
   estados tienen objetivos táctiles amplios y el elegido se ve inequívoco, también en modo oscuro.
2. **Dado** que marco alumnos, **cuando** avanzo, **entonces** veo cuántos llevo marcados del total.
3. **Dado** que me equivoco, **cuando** corrijo un estado, **entonces** el cambio se refleja al
   instante, como hoy.

### H5 — Una persona nueva instala la app y activa avisos (Prioridad: P3)

Como tutor o instructor que entra por primera vez quiero que me quede claro cómo instalar la app y
activar las notificaciones, para recibir avisos sin pedir ayuda.

**Escenarios de aceptación**
1. **Dado** un teléfono donde la app no está instalada o los avisos no están activos, **cuando**
   abro Inicio, **entonces** veo una invitación destacada con el siguiente paso concreto.
2. **Dado** que ya instalé y activé los avisos, **cuando** abro Inicio, **entonces** la invitación
   ya no ocupa espacio.

## Requisitos funcionales

- **RF-001** Todo texto informativo del portal debe medir al menos 12 px; los títulos y los montos
  mantienen una jerarquía clara por tamaño y peso.
- **RF-002** Todo elemento tocable debe medir al menos 44 × 44 px de área táctil.
- **RF-003** Un mismo concepto (estado de pago, tarjeta de cobro, estado vacío, estado de carga,
  mensaje de error) debe verse y comportarse igual en todas las pantallas donde aparezca.
- **RF-004** El estado de un pago o evento debe comunicarse con texto o icono, no solo con color.
- **RF-005** Pagos debe mostrar un resumen (total pendiente y número de pagos vencidos) antes de la
  lista, y ordenar o resaltar lo vencido.
- **RF-006** Inicio debe mostrar primero lo accionable (pagos por atender, invitación a instalar o
  activar avisos) y después la información de los alumnos.
- **RF-007** El pase de lista debe mostrar el avance (marcados de total) y objetivos táctiles
  amplios para los cuatro estados.
- **RF-008** Toda acción que el usuario inicia (marcar leídas, confirmar asistencia, subir
  comprobante, guardar contraseña) debe dar retroalimentación inmediata de éxito, error o progreso.
- **RF-009** La paleta debe conservar el azul de marca `#1D3557` y el modo oscuro vigente.
- **RF-010** Textos y mensajes permanecen en español (es-MX).

## Requisitos no funcionales (derivados de la constitución)

- **RNF-001** (V) Sin scroll horizontal ni recortes entre 360 y 430 px de ancho, en vertical.
- **RNF-002** (VI) Cada pantalla conserva su estado de carga inmediato; el tamaño de JavaScript de
  cada ruta del portal no crece más de 10 % respecto a hoy.
- **RNF-003** (IX) Contraste mínimo AA (4.5:1 para texto, 3:1 para componentes) en modo claro y oscuro.
- **RNF-004** (VII) Ningún cambio altera datos, API ni permisos: es una mejora de presentación.
- **RNF-005** (VIII) La suite E2E actual sigue en verde y se agregan pruebas para los nuevos
  elementos verificables (resumen de Pagos, avance del pase de lista).

## Fuera de alcance

- Cambiar la identidad de marca, el logotipo o la tipografía de la marca.
- Nuevas funcionalidades de negocio, cambios de datos, de permisos o de notificaciones.
- Rediseñar el dashboard del staff (sería una especificación aparte).
- Cambiar la estructura de navegación (pestañas) del portal.

## Criterios de éxito

1. En una revisión con capturas reales (iPhone y Android), ningún texto informativo queda por
   debajo de 12 px ni ningún elemento tocable por debajo de 44 px.
2. Una auditoría automática de accesibilidad de las 5 pantallas del portal no reporta
   violaciones de contraste ni de nombres accesibles.
3. Un tutor sin explicación previa encuentra "cuánto debo" y adjunta un comprobante en menos de
   20 segundos en una prueba con 3 personas.
4. Un instructor marca un grupo de 10 alumnos con una sola mano sin errores de dedo, en una
   prueba con 2 personas.
5. 25 de 25 pruebas E2E existentes en verde, más las nuevas.

## Supuestos

- Alcance limitado al portal móvil (Inicio, Notificaciones, Pagos, Asistencia, Cuenta).
- Se conserva la marca actual y se mejora su ejecución; la skill `frontend-design` se usará en el
  plan para proponer la dirección visual dentro de esos límites.
- Los dispositivos de referencia son teléfonos de 360 a 430 px de ancho.

## Aclaraciones pendientes

- [NECESITA ACLARACIÓN] **Alcance:** ¿solo el portal móvil, o también el dashboard del staff en
  esta misma especificación? (Se asumió solo el portal.)
- [NECESITA ACLARACIÓN] **Margen creativo:** ¿pulido conservador (misma estética, mejor
  ejecución) o se permite una evolución visible (formas, iconografía, microanimaciones) siempre
  con el azul de marca? (Se asumió pulido con evolución moderada.)
- [NECESITA ACLARACIÓN] **Pantallas prioritarias:** ¿el orden P1/P2/P3 de las historias refleja lo
  que más te importa?
- [NECESITA ACLARACIÓN] **Pruebas con personas:** ¿puedes conseguir 3 tutores y 2 instructores
  para los criterios de éxito 3 y 4, o los validamos tú y yo?

## Lista de verificación de calidad de la especificación

- [x] Describe qué y por qué, sin decisiones técnicas ni de implementación.
- [x] Cada historia tiene escenarios de aceptación comprobables.
- [x] Los requisitos son medibles (12 px, 44 px, AA, 2 toques, 10 % de JS).
- [x] Alcance y exclusiones explícitos.
- [x] Compatible con la constitución v1.1.0.
- [ ] Aclaraciones resueltas (4 abiertas).
