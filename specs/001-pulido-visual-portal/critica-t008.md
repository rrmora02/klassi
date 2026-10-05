# Crítica de diseño (T008) — spec 001

**Fecha:** 2026-10-05 · **Insumo:** skill `frontend-design` (oficial de Anthropic; texto leído del repositorio
`anthropics/claude-plugins-official`, porque la sesión ya estaba abierta cuando se habilitó el plugin) y las
pantallas de la fase 1 (Pagos y Notificaciones) en claro y oscuro.

## Cómo se aplicó la skill

La skill empuja a tomar riesgos estéticos, pero también dice que **"donde el brief fija una dirección
visual, se sigue exactamente"**. Nuestro brief la fija: pulido conservador, marca azul en el portal y
verde en el dashboard, sin cambiar estructura. Por eso se descartó todo lo que cambie identidad
(tipografía, paleta, maquetación) y se usó la parte que sí aplica: **contención, escritura de interfaz,
señales de diseño genérico y piso de calidad**.

## Qué está bien y se conserva

- **Tipografía:** Plus Jakarta Sans es una elección deliberada y reconocible; se mantiene. No se añade una
  segunda familia.
- **Un solo elemento memorable:** la cifra "Por pagar" es lo importante de Pagos y el resto queda en
  segundo plano. La skill llama "tratamiento por defecto" a la cifra grande con etiqueta pequeña; aquí es
  justo lo que la persona necesita (cuánto debo), así que se queda por decisión y no por costumbre.
- **Movimiento:** solo responde a una acción (estado presionado, spinner al subir) y respeta
  `prefers-reduced-motion`. No hay animaciones de entrada ni efectos al pasar el cursor.
- **Piso de calidad:** foco visible en los botones, contraste AA medido, 44 px táctiles, sin scroll
  horizontal a 360 px.
- **Estructura como información:** la barra de color en una tarjeta significa algo (no leída, vencido); no
  decora.

## Ajustes aplicados ahora (fase 1)

| Hallazgo | Ajuste |
|---|---|
| **Quitar un accesorio.** Dos tarjetas de resumen compitiendo ("Por pagar" y "Vencidos"); con 0 vencidos la segunda era ruido | Una sola tarjeta. Los vencidos entran como insignia de peligro **solo cuando existen**; si no, la frase dice "ninguno vencido" |
| **Cadenas con puntos medios** ("A · B") son una marca de plantilla; además repetían la escuela en cada tarjeta | La tarjeta muestra el alumno; la escuela solo aparece si la familia tiene alumnos en más de una |
| **Un mismo nombre para una acción.** "Marcar leídas" y un aviso que decía "Marcaste todos tus avisos…" | Botón "Marcar todas como leídas" → aviso "Marcadas como leídas" |
| **Error vago** ("No se pudo completar") | "No se pudieron marcar como leídas. Revisa tu conexión e intenta de nuevo." |
| **Tokens muertos:** `--fs-*` no los usaba nadie (0 usos) y duplicaban la escala de Tailwind | Se eliminan. La escala es la de Tailwind (12/14/16/20/24) y el piso de 12 px lo hace cumplir `ui-standards` |

## Registrado para las fases siguientes

> Resuelto en la fase 2 (2026-10-05): etiqueta "FECHA" en mayúsculas y texto de 11,5 px del pase de lista; flechas y puntos
> medios de Inicio y de la tarjeta de evento; estados vacíos con siguiente paso. Pendiente: Cuenta, clases `.portal-*`.

| Dónde | Hallazgo | Fase |
|---|---|---|
| Pase de lista (`asistencia`) | Etiqueta "FECHA" en mayúsculas, texto de 11,5 px | 2 |
| Inicio del portal | Flecha en "Ver todos →"; punto medio entre disciplina y grupo y entre alumno y fecha; lo accionable debe ir primero | 2 |
| Tarjeta de evento | Flecha en "¿Cambió de opinión? Sí asistirá →"; texto pequeño | 2 |
| Cuenta y avisos | Revisar los textos del formulario con el criterio de "decir qué hacer, no solo qué falló" | 3 |
| Clases `.portal-*` de `globals.css` | Colores de marca escritos a mano que duplican `--brand*`; migrar y retirar al terminar el portal | 3 |
| Estados vacíos y errores | Cada uno debe indicar el siguiente paso; hoy los vacíos son correctos pero los errores genéricos | 2–5 |

## Lo que se decidió NO hacer

- Cambiar paleta, familia tipográfica o radio de las tarjetas: contradice la spec (pulido conservador).
- Introducir animaciones de entrada o un "momento" de carga: la skill las desaconseja y el brief no las pide.
- Reinterpretar el dashboard con otra identidad: sigue su propia fase (4 y 5) bajo las mismas reglas.
