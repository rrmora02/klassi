# Plan de implementación: Pulido visual del portal móvil y del dashboard

**Rama:** `001-pulido-visual-portal` · **Especificación:** `spec.md` (v2) · **Estado:** Borrador para revisión

## 1. Resumen técnico

El problema es de **sistema**, no de pantallas sueltas: la interfaz está escrita casi toda con
estilos en línea y valores escritos a mano. Se aplica entonces la estrategia
**tokens → primitivas → migración por pantallas → verificación automática**:

1. Definir una sola vez los **tokens** (escala tipográfica, colores semánticos, tamaños táctiles)
   como variables CSS con valores para modo claro y oscuro.
2. Ampliar los **componentes compartidos que ya existen** (`StatCard`, `PageHeader`, `Badge`,
   `EmptyState`, `Spinner` en `src/components/shared/`) con las primitivas que faltan, en vez de
   crear una biblioteca nueva.
3. **Migrar pantalla por pantalla**, en el orden de prioridad de la especificación, cada fase
   entregable y reversible por separado.
4. **Medir** con pruebas automáticas (tamaño de texto, objetivos táctiles, accesibilidad) para que
   los requisitos RF-001, RF-002 y RNF-003 se comprueben y no se opinen.

No hay cambios de datos, de API ni de permisos: no se generan `data-model.md` ni `contracts/`.

## 2. Contexto técnico

- Next.js 14 (App Router), React 18, Tailwind 3 más estilos en línea, `lucide-react` para iconos,
  variables CSS `--color-*` con modo oscuro por clase `.dark` (`src/app/globals.css`).
- Pruebas: Playwright (25 pruebas, solo lectura) con login por sign-in tokens; datos de prueba con
  `e2e-seed.local.ts`.
- Dependencia nueva propuesta (solo desarrollo): `@axe-core/playwright`, para la auditoría de
  accesibilidad (ver sección 8).

## 3. Verificación contra la constitución

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I Aislamiento entre escuelas | Cumple | No se tocan consultas ni datos |
| II Autorización en el servidor | Cumple | No se tocan procedimientos ni rutas |
| III Secretos y datos sensibles | Cumple | Sin cambios; los comprobantes siguen con URL firmada |
| IV Notificaciones confiables | Cumple | No se toca el despacho; solo su presentación |
| V Portal móvil primero | Refuerza | Tamaños mínimos, objetivos táctiles y sin scroll horizontal, verificados |
| VI Rendimiento por diseño | Cumple con control | Presupuesto de +10 % de JS por ruta; los `loading.tsx` se conservan |
| VII Cambios aditivos y reversibles | Cumple | Fases independientes; tokens nuevos no rompen los usos existentes |
| VIII Verificación antes de integrar | Refuerza | E2E en verde por fase, más pruebas de tamaño y accesibilidad |
| IX Producto en español y consistente | Refuerza | Colores semánticos únicos y variables de diseño, modo oscuro incluido |
| X Simplicidad y consistencia | Cumple con una justificación | Se amplía `shared/`; una devDependency (sección 8) |

## 4. Diagnóstico (cifras del código actual)

| Hallazgo | Dato |
|---|---|
| Texto menor de 12 px | 138 usos (11 px: 100; 11,5 px: 10; 10 px: 17; 10,5 px: 6; 9 px: 3; 7–8 px: 2) |
| Estilos en línea frente a clases | 1.472 frente a 1.002 |
| Insignia de estado de pago propia | 5 archivos con versión propia (reportes, ficha pública del alumno, Pagos y tarjeta de evento del portal, detalle de evento) más el componente compartido `PaymentStatusBadge` |
| Colores equivalentes a mano | 3 rojos (`#ef4444`, `#b91c1c`, `#dc2626`), 2 ámbares, 3 verdes de éxito |
| Marcas | dashboard verde `#006241` / `#00754A`; portal y correos azul `#1D3557` |
| Componentes compartidos | 5 (`StatCard`, `PageHeader`, `Badge`, `EmptyState`, `Spinner`); el portal no usa ninguno |
| Variables de diseño | `--color-text-*`, `--color-background-*`, `--color-border-*` (claro y oscuro) |

## 5. Dirección visual (conservadora)

La skill `frontend-design` se usa en la fase 0 para criticar y afinar esta propuesta, nunca para
cambiar la marca ni la estructura.

- **Tipografía:** se conserva la fuente actual (Plus Jakarta Sans). Escala = la de Tailwind, con piso de
  12 px: *leyenda* `text-xs` 12, *cuerpo* `text-sm` 14, *subtítulo* `text-base` 16, *título de pantalla*
  `text-xl` 20, *cifra destacada* `text-2xl` 24 con números tabulares. No se duplica como variables CSS
  (se probó y quedaron sin uso, ver `critica-t008.md`). Fechas y datos secundarios pasan de 10–11 a 12 px.
- **Objetivos táctiles:** variable `--tap-min: 44px`. Portal: todo botón y enlace de acción la usa.
  Dashboard: se aplica bajo `@media (pointer: coarse)`; con puntero se mantienen 36 px.
- **Color:** cuatro **tokens semánticos** (éxito, advertencia, peligro, neutro), cada uno con
  fondo, texto y borde que cumplen AA en claro y oscuro. La marca no cambia: `--brand` vale azul
  en el portal y verde en el dashboard.
- **Forma y espacio:** se conserva el radio de 12 px y las tarjetas actuales; se unifica la escala
  de espaciado (4/8/12/16/24).
- **Estados:** toda insignia lleva **icono + texto**. Un solo estado vacío, uno de carga y uno de
  error para todo el producto.
- **Movimiento:** estado "presionado" (escala 0,98) y transiciones de 150 ms, con respeto a
  `prefers-reduced-motion`.

## 6. Primitivas compartidas (en `src/components/shared/`)

| Primitiva | Origen | Uso |
|---|---|---|
| `StatusBadge` | nueva; `PaymentStatusBadge` y las copias locales pasan a envolverla | H1, H3, H6 |
| `SummaryCard` | amplía `StatCard` | resumen de Pagos, cifras del inicio |
| `Card` | nueva, mínima (superficie + radio + borde) | tarjetas de cobro, avisos |
| `ActionButton` | nueva (variantes principal/secundaria/peligro; tamaño táctil) | portal y modales |
| `EmptyState` | existente, se usa también en el portal | H1, H7 |
| `Skeleton` | extraída de los `loading.tsx` actuales | cargas |

Reglas: la primitiva se crea solo cuando la usan al menos dos pantallas; cada una nace con su
versión de modo oscuro; los estilos nuevos van en clases y variables, no en más estilos en línea.

## 7. Fases de entrega

Cada fase es un conjunto de commits que compila, pasa `typecheck`, `build` y las pruebas E2E, y se
puede integrar o revertir sola.

| Fase | Contenido | Historias |
|---|---|---|
| **0 Fundaciones** | Tokens en `globals.css`; primitivas; pruebas automáticas (tamaño de texto, objetivos táctiles, accesibilidad); capturas "antes" en 360/390/430 y 768/1280 px | — |
| **1 Portal P1** | Pagos (resumen, lista, comprobante) y Notificaciones | H1, H2 |
| **2 Portal P2** | Eventos; pase de lista del instructor con avance; Inicio con lo accionable | H3, H4 |
| **3 Portal P3** | Invitación a instalar y activar avisos; Cuenta | H5 |
| **4 Dashboard P2** | Pagos del staff, inicio con cifras y jerarquía | H6 |
| **5 Dashboard P3** | Alumnos, grupos, instructores, eventos y comunicados; formularios y modales | H7, H8 |
| **6 Cierre** | Capturas "después", validación del dueño, actualización de `MEMORY.md` y de la guía de QA | Criterios de éxito |

## 8. Estrategia de pruebas

- **Se conservan** las 25 pruebas E2E. Los nombres accesibles que usan (por ejemplo los tabs de
  Pagos con contador, "Abrir portal", "Asistencia" del menú) no deben cambiar.
- **Nuevo `e2e/ui-standards.spec.ts`:** recorre las pantallas del portal y del dashboard y falla si
  encuentra texto visible menor de 12 px o un elemento tocable menor de 44 px (portal) o 36 px
  (dashboard con puntero). Es la medición directa de RF-001 y RF-002.
- **Nuevo `e2e/a11y.spec.ts`** con `@axe-core/playwright`: sin violaciones de contraste ni de
  nombre accesible, en claro y oscuro. Justificación de la dependencia nueva (principio X): axe es
  el estándar para comprobar WCAG y escribirlo a mano sería peor y más frágil.
- **Pruebas por elemento nuevo:** resumen de Pagos (total y vencidos) y avance del pase de lista.
- **Capturas antes y después** con Playwright en los anchos de referencia, para la validación del
  dueño (criterio de éxito 4).
- **Presupuesto de rendimiento:** se compara la tabla de tamaños de `next build` antes y después;
  ninguna ruta supera +10 %.
- **Entorno:** build de producción con Postgres local y los datos de `e2e-seed.local.ts`.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Superficie enorme (más de 1.400 estilos en línea) | Migrar solo lo que cada fase toca; tokens primero; sin reescrituras masivas |
| Romper el modo oscuro | Cada token y primitiva nace con su valor oscuro; las pruebas de accesibilidad corren en ambos modos |
| Pruebas E2E dependientes de textos | No se renombran elementos con pruebas asociadas; se revisan los selectores antes de cada fase |
| Cambio visual no deseado | Capturas antes y después; pulido conservador como regla; el dueño aprueba cada fase |
| Crecimiento de JavaScript | Presupuesto de +10 %; primitivas pequeñas y reutilizadas |
| Dos colores de marca (azul y verde) | Se respeta cada uno (RF-009); unificarlos es una decisión de producto fuera de alcance |

## 10. Seguimiento de complejidad

| Elemento | Por qué hace falta | Alternativa descartada |
|---|---|---|
| `@axe-core/playwright` (devDependency) | Comprobar WCAG de forma estándar y automática | Revisión manual de contraste: no repetible ni medible |
| `ui-standards.spec.ts` | Hacer medibles RF-001 y RF-002 | Revisar a ojo: ya fue la causa del problema |

## 11. Decisiones abiertas (no bloquean la fase 0)

- ¿Se quiere en el futuro **unificar la marca** (azul/verde) entre portal, dashboard y correos? Se
  trataría en una especificación propia.
- ¿Se desea conservar o retirar la inspiración visual de `DESIGN.md` (Starbucks) como referencia del
  dashboard? Esta especificación la conserva.
