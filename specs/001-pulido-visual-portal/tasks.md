# Tareas: Pulido visual del portal móvil y del dashboard

**Rama:** `001-pulido-visual-portal` · **Especificación:** `spec.md` v2 · **Plan:** `plan.md`
**Convenciones:** `[P]` = puede hacerse en paralelo con otras `[P]` de la misma fase · `Hx/RFx` =
requisito que cubre · cada tarea termina con la verificación indicada. Una fase se integra solo si
`tsc --noEmit` (TypeScript del lockfile), `next build` y `npm run test:e2e` están en verde y
`MEMORY.md` está actualizado en el mismo commit.

## Fase 0 — Fundaciones (sin cambios visibles en pantallas)

| ID | Tarea | Cubre | Verificación |
|---|---|---|---|
| T001 ✅ | Script reproducible del entorno de verificación (Postgres local, `prisma db push`, seed, build y servidor) y documentarlo en `e2e/README.md` | RNF-005 | El script deja la app lista y `npm run test:e2e` pasa 25/25 |
| T002 ✅ | Barrido de capturas (`e2e/capture.spec.ts`, solo con `CAPTURE_DIR`) y tomar las capturas **antes** en 360/390/430 px (portal) y 768/1280 px (dashboard), claro y oscuro | Criterio 4 | Carpeta `evidencia/antes/` con todas las pantallas |
| T003 ✅ | Agregar `@axe-core/playwright` (devDependency) | RNF-003 | `npm ci` limpio |
| T004 ✅ | `e2e/ui-standards.spec.ts`: mide texto < 12 px y objetivos táctiles pequeños por ruta; compara contra `e2e/ui-baseline.json` (no puede empeorar; con `UI_STRICT=1` exige cero) | RF-001, RF-002 | Pasa con la línea base actual y falla si se introduce una infracción nueva |
| T005 ✅ [P] | `e2e/a11y.spec.ts` con axe (claro y oscuro), mismo esquema de línea base | RNF-003 | Ídem T004 |
| T006 ✅ [P] | Tokens en `globals.css`: escala tipográfica, `--tap-min`, colores semánticos (éxito, advertencia, peligro, neutro) con valores AA en claro y oscuro, `--brand` por superficie | RF-009, RF-011 | Tabla de contraste calculada (≥ 4.5:1) incluida en el commit |
| T007 ✅ [P] | Primitivas en `src/components/shared/`: `StatusBadge`, `Card`, `ActionButton`, `Skeleton`, ampliar `StatCard` → `SummaryCard`; modo oscuro desde su origen | RF-003, RF-004, RNF-006 | `tsc` y `build` verdes; sin pantallas migradas |
| T008 | Crítica de la propuesta visual (tokens y primitivas) con la skill `frontend-design`, dentro del límite conservador | Plan §5 | Ajustes registrados; **bloqueada hasta que la skill esté habilitada** (no se instaló al cierre de T009; se hace cuando aparezca) |
| T009 | Cierre de fase: línea base final de T004/T005, `MEMORY.md`, commit y push | RNF-004 | E2E 25/25 + pruebas nuevas en verde |

## Fase 1 — Portal P1: Pagos y Notificaciones (H1, H2)

| ID | Tarea | Cubre |
|---|---|---|
| T101 | Resumen de Pagos: total pendiente y número de vencidos antes de la lista (con `SummaryCard`) | H1.1, RF-005 |
| T102 [P] | Lista de pagos con `Card` y `StatusBadge` (icono + texto), lo vencido resaltado | H1.2, RF-003, RF-004 |
| T103 | Botón "Adjuntar comprobante" con `ActionButton` (44 px), ≤ 2 toques desde Pagos | H1.3, RF-002 |
| T104 [P] | Estado vacío de Pagos con `EmptyState` | H1.4 |
| T105 [P] | Notificaciones: no leídas inequívocas, texto cómodo, confirmación de "Marcar leídas" | H2, RF-008 |
| T106 | Pruebas: resumen de Pagos (total y vencidos), no leídas, tamaños; baseline del portal baja | RNF-005 |

## Fase 2 — Portal P2: Eventos, pase de lista, Inicio (H3, H4)

| ID | Tarea | Cubre |
|---|---|---|
| T201 | Tarjeta de evento: pregunta y respuestas prominentes, paso siguiente visible, revertir con un toque | H3, RF-002 |
| T202 [P] | Pase de lista: objetivos amplios, estado elegido inequívoco (claro y oscuro) | H4.1, RF-002 |
| T203 | Pase de lista: avance "marcados de total" | H4.2, RF-007 |
| T204 [P] | Inicio: primero lo accionable, después los alumnos | RF-006 |
| T205 | Pruebas: avance del pase de lista y orden de Inicio | RNF-005 |

## Fase 3 — Portal P3: primer uso y Cuenta (H5)

| ID | Tarea | Cubre |
|---|---|---|
| T301 | Invitación a instalar y activar avisos destacada; desaparece al completarse | H5, RF-006 |
| T302 [P] | Cuenta: formulario y mensajes con las primitivas | RF-003, RF-008 |
| T303 | Barrido del portal completo: baseline a cero en `UI_STRICT=1`; quitar `maximumScale:1` del viewport del portal cuando todo campo mida ≥ 16 px (axe `meta-viewport`) | RF-001, RF-002, RNF-001 |

## Fase 4 — Dashboard P2: cobros e inicio (H6)

| ID | Tarea | Cubre |
|---|---|---|
| T401 | `PaymentStatusBadge` pasa a envolver `StatusBadge`; reemplazar las copias propias (reportes, ficha pública, detalle de evento) | H6.1, RF-003, RF-004 |
| T402 [P] | Pagos del staff: tabla legible a 768 px sin scroll horizontal de página | H6.3, RF-012 |
| T403 [P] | Inicio del dashboard: cifras con jerarquía (`SummaryCard`) | H6.2 |
| T404 | Pruebas de tamaños y accesibilidad de Pagos e Inicio | RNF-005 |

## Fase 5 — Dashboard P3: listados, formularios y modales (H7, H8)

| ID | Tarea | Cubre |
|---|---|---|
| T501 | Estilo único de tablas y listas (encabezados, filas, acciones) en Alumnos, Grupos, Instructores, Eventos y Comunicados | H7.1 |
| T502 [P] | Estados vacío y de carga unificados en los listados | H7.2, RF-003 |
| T503 [P] | Formularios: etiqueta visible, error junto al campo, botón principal inequívoco | H8.1 |
| T504 [P] | Modales: scroll y botones alcanzables en pantallas bajas (revisión de todos) | H8.2 |
| T505 | Tamaños táctiles del dashboard bajo `pointer: coarse` | RF-002 |

## Fase 6 — Cierre

| ID | Tarea | Cubre |
|---|---|---|
| T601 | Capturas **después** y comparativo con las de antes | Criterio 4 |
| T602 | Presupuesto de JS: comparar la tabla de `next build` (≤ +10 % por ruta) | RNF-002 |
| T603 | Línea base en cero (`UI_STRICT=1`) y 6 pantallas del dashboard sin violaciones de axe | Criterios 1 y 2 |
| T604 | Prueba guiada del dueño en su teléfono (criterio 3) y validación de capturas | Criterios 3 y 4 |
| T605 | Actualizar `docs/guia-qa.md` y `MEMORY.md`; retirar los puntos resueltos de la deuda | Constitución, flujo 9 |

## Dependencias

T001 → T002, T004, T005 · T003 → T005 · T006 → T007 → T008 · T004/T005 → T009 · Fase 0 → Fases 1 a 5 ·
Fases 1 a 5 → Fase 6. Las fases 1 a 3 (portal) pueden integrarse sin esperar a las 4 y 5.
