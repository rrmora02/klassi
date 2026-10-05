# MEMORY.md — Memoria del proyecto Klassi

Contexto vivo del proyecto para quien (persona o agente) empiece una sesión sin historial.
Se lee al iniciar y **se actualiza en cada cambio** (ver "Cómo mantener este archivo").
Las reglas de fondo están en `.specify/memory/constitution.md`; aquí está el estado y el
conocimiento práctico. Si este archivo y el código discrepan, gana el código: corrige el archivo.

**Última actualización:** 2026-10-05 · **`main` en:** `a6f5438`

## 1. Qué es Klassi

SaaS multi-escuela para escuelas deportivas y de artes. Dos superficies:

- **Dashboard** (`/dashboard`, escritorio): staff (ADMIN, RECEPTIONIST) gestiona alumnos, grupos,
  instructores, pagos, eventos, comunicados, reportes y suscripción.
- **Portal PWA** (`/portal`, móvil): familias e instructores. Reemplaza a WhatsApp: avisos,
  pagos con comprobante, confirmación de eventos y, para instructores, pase de lista.

Roles (`UserRole`): `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST`, `INSTRUCTOR`, `PARENT`. El rol por
escuela vive en `TenantUser`; una familia no tiene membresía: su acceso sale de `ParentStudent`.

## 2. Stack y comandos

Next.js 14 (App Router) · React 18 · tRPC 10 (superjson) · Prisma 5 + PostgreSQL (Supabase) ·
Clerk (auth) · Supabase Storage (comprobantes) · Resend (correo) · `web-push` (VAPID) · Stripe ·
Sentry · Vercel (crons en `vercel.json`) · TypeScript estricto (`noUncheckedIndexedAccess`).

```bash
npm run dev | build | start | typecheck        # typecheck = tsc --noEmit
npm run db:generate | db:push | db:migrate | db:studio
npm run test:e2e | test:e2e:ui | test:e2e:report   # Playwright, solo lectura
scripts/e2e-local.sh all|setup|build|start|stop       # entorno de verificación (base desechable + semilla + build)
```

Build local sin credenciales reales:
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_… CLERK_SECRET_KEY=sk_test_dummy npx next build`
(`typecheck` exige `npx prisma generate` antes y las dependencias del lockfile: `npm ci`).

## 3. Mapa del código

- `src/app/(dashboard)/dashboard/**` páginas del staff (Server Components, dinámicas).
- `src/app/(portal)/portal/**` portal: `/` inicio, `notificaciones`, `pagos`, `asistencia`
  (instructor), `cuenta`. `src/app/(acceso)/portal/acceso` recibe el enlace mágico.
- `src/app/entrar` despachador post-login; `onboarding` crea escuela; `aceptar-invitacion`;
  `evento/[eventId]/responder` (respuesta a invitación por enlace) y `alumno/[token]` (ficha
  pública de un alumno por `shareToken`) son rutas públicas.
- `src/server/api/routers/` 20 routers tRPC (`root.ts` los une). `trpc.ts` define los niveles:
  `publicProcedure`, `protectedProcedure`, `tenantProcedure`, `staffProcedure` (ADMIN/RECEPTIONIST),
  `adminProcedure`, `superAdminProcedure`.
- `src/server/services/` `notification`, `push`, `email`, `storage` (Supabase), `parent-access`
  (enlaces mágicos), `subscription`, `tenant`, PDF de eventos.
- `src/server/request-context.ts` → `getCurrentContext()` (`React.cache`): usuario + escuela
  activa + rol, una consulta por petición. Las páginas del dashboard deben usarlo.
- `src/server/cache/` cachés en memoria con TTL: usuario por `clerkId` (10 min) y membresía
  tenant↔usuario (60 s, `tenantMembershipCache`; se invalida al quitar miembros).
- `src/components/` por dominio (`portal/`, `alumnos/`, `pagos/`, `instructores/`, `pwa/`…).
- `src/components/shared/` primitivas del sistema de diseño (spec 001): `StatusBadge`/`PaymentStatus`,
  `Card`, `ActionButton`/`ActionLink`, `Skeleton`, `SummaryCard` (más `StatCard`, `PageHeader`, `Badge`,
  `EmptyState`, `Spinner` previos). Tokens en `src/app/globals.css` (escala `--fs-*`, `--tap-min`, colores
  semánticos `--success/warning/danger/neutral-*`, `--brand*` por superficie con `data-surface="portal"`).
- `public/sw.js` service worker (push + caché básica; no cachea en localhost).
- `e2e/` suite Playwright · `docs/` arquitectura PWA, guía y plan de QA · `.specify/` SDD.

## 4. Modelo de datos (Prisma)

Núcleo: `Tenant`, `User`, `TenantUser`, `Student`, `ParentStudent`, `Group`, `Instructor`,
`Discipline`, `Enrollment`, `ClassSession`, `Attendance`, `Payment`, `Event`, `EventPayment`,
`Announcement`, `Subscription`. Notificaciones: `Notification`, `NotificationDelivery`,
`PushSubscription`, `NotificationPreference`. Soporte: `AuditLog`, `ErrorLog`, `BusinessEvent`,
`TeamInvitation`, `StripeEvent`. `ParentInvitation` existe pero **no se usa**.

Todo dato de negocio lleva `tenantId`. `Payment.receiptUrl` y `EventPayment.receiptUrl` guardan la
**ruta** en el bucket privado `comprobantes`, nunca una URL pública.

## 5. Flujos clave

- **Acceso de familia/instructor:** el staff genera un enlace mágico (token de inicio de sesión
  de Clerk, un solo uso, 7 días) desde la ficha del alumno (`FamilyAccessCard`) o del instructor
  (`InstructorAccessCard`, solo si su rol NO es ADMIN). Si el `clerkId` guardado está obsoleto,
  `createPortalAccessLink` reaprovisiona la cuenta por correo y reintenta. Dentro, la pestaña
  Cuenta permite crear o cambiar contraseña (`user.updatePassword`). El enlace no reemplaza ni
  borra la contraseña.
- **Login por `/sign-in`:** `fallbackRedirectUrl="/entrar"` → miembro de escuela a `/dashboard`,
  tutor con hijos a `/portal`, nadie a `/onboarding`. `/onboarding` redirige a `/portal` si es tutor.
- **Notificaciones:** `createNotifications` (outbox transaccional, respeta preferencias, marca
  `SKIPPED` canales sin destino) → `dispatchPendingDeliveries` (reclamo optimista para no duplicar,
  máx. 3 intentos) inline y por cron horario. Tipos usados: `announcement`, `payment.paid`,
  `payment.receipt`, `event.invitation`.
- **Comprobantes:** el navegador sube directo a Supabase con URL firmada; el servidor valida tipo
  (JPG/PNG/WebP/PDF) y 10 MB, y la ruta debe corresponder a ese pago. Staff y tutor leen con URL
  firmada de 5 min. Solo pagos `PENDING`/`OVERDUE`.
- **Eventos:** el tutor confirma asistencia en la app (`portal.confirmEventAttendance`); recién
  entonces puede adjuntar comprobante. Estado `NOT_ATTENDING` si declina.
- **Asistencia:** `attendance.*` valida en servidor que un instructor solo toque sus grupos y que
  la inscripción pertenezca al grupo de la sesión.

## 6. Entornos y variables

Nombres (los valores van en Vercel / `.env`, nunca en el repo): `DATABASE_URL`, `DIRECT_URL`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
`NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STRIPE_*`,
`ATTENDANCE_TOKEN_SECRET`, `SENTRY_*`, `LOG_LEVEL`, `ENABLE_METRICS`.
**`.env.example` está incompleto** (le faltan Supabase, VAPID, `DIRECT_URL`, `CRON_SECRET`,
`NEXT_PUBLIC_APP_URL`, entre otras).

Pruebas E2E: `.env.e2e` (ignorado por git; plantilla `.env.e2e.example`). Login por sign-in tokens
del Backend API de Clerk (la instancia pide `email_code` a navegadores nuevos). El instructor de
prueba es `rrmora02@gmail.com`; el staff `raul.remo02@gmail.com`.

## 7. Aprendizajes (no repetir estos errores)

- `SUPABASE_URL` debe ser solo el origen (`https://<proyecto>.supabase.co`); un sufijo de ruta
  hace fallar Storage con "Invalid path". La CSP necesita `https://*.supabase.co` en `connect-src`.
- El service worker no debe cachear en desarrollo: sirvió JS viejo y rompió la hidratación.
  Tras cambiar `sw.js`, subir `CACHE` y pedir limpiar el service worker.
- Modales sobre pantallas bajas: overlay con `overflowY:auto` y tarjeta con `maxHeight` en `dvh`.
- URLs largas en tarjetas: `overflowWrap:"anywhere"` + `wordBreak:"break-all"`, o se desborda el ancho.
- `<UserProfile>` de Clerk no sirve en móvil (y ocultar su barra esconde Seguridad): usar formulario propio.
- 16 páginas que consultaban usuario/escuela por su cuenta se migraron a `getCurrentContext()`
  (`onboarding` no: crea el usuario si no existe).
- En contenedores efímeros puede haber TypeScript 6 (avisa de `baseUrl`): usar `npm ci` (lockfile fija 5.9.3).
- La integración de GitHub de las sesiones no escribe (403); se empuja con token personal. Los
  commits salen "Unverified" por falta de firma. Cualquier token pegado en un chat se considera comprometido.
- Tras reconstruir con `next build`, reiniciar SIEMPRE el servidor: un `next-server` viejo vivo sirve HTML
  de un build reemplazado (su CSS da 404 y todo sale sin estilos); mediciones tomadas así son inválidas.
  `scripts/e2e-local.sh stop` mata también los `next-server` huérfanos.
- axe NO evalúa texto sobre fondos translúcidos (insignias `rgba`): `e2e/ui-standards.spec.ts` calcula
  el contraste por su cuenta. Los textos terciarios globales no cumplían AA (2,6:1 claro, 3,5:1 oscuro);
  subidos a .55 / .62 de alfa en `globals.css`.
- Pruebas de navegador en sandbox con proxy: importar TODAS las CAs de `/root/.ccr/ca-bundle.crt` al NSS
  (ver `e2e/README.md`); `pkill -f` con el patrón dentro del mismo comando se mata a sí mismo.
- Las mediciones de UI deben esperar a la carga y fallar si la pantalla se rompe: `settle()` (e2e/helpers.ts) espera
  a que no quede `aria-busy` y lanza error si ve "Algo salió mal". Con Postgres caído (el contenedor lo detiene) el
  dashboard mostraba el error y las métricas bajaban a 0 "mejorando" falsamente. Antes de medir: `pg_isready` y
  `service postgresql start`; después, reiniciar el servidor.
- `Skeleton` debe usar `--neutral-bg`: con `--color-background-secondary` es del mismo color que el fondo de página
  y queda invisible.
- Un plugin habilitado en claude.ai NO se carga en una sesión de la nube ya abierta (`Skill` responde "Unknown skill"):
  abrir sesión nueva, o leer el SKILL.md del repositorio del plugin. `/plugin` solo existe en terminal local.
- Tintas translúcidas de marca (`rgba` claro sobre la tarjeta verde en oscuro) bajan el contraste del texto de la insignia
  (3,75:1): en oscuro usar tinta sólida (`--brand-tint`). Calcular antes de elegir (alfa o sólido).
- Interfaz: 138 usos de texto < 12 px, 1.472 estilos en línea vs 1.002 clases, insignia de estado
  duplicada en 5 archivos y dos colores de marca (verde `#006241` dashboard, azul `#1D3557` portal y
  correos). Se aborda en la especificación 001.

## 8. Deuda conocida

1. **Los modelos de notificaciones/push/preferencias/`ParentInvitation` no tienen migración**: solo
   están en `schema.prisma`. Hay que generar la migración o aplicar `prisma db push` en producción
   antes de desplegar (si no, `/portal/notificaciones` falla).
2. `.env.example` incompleto (sección 6).
3. La caché offline del service worker conserva páginas tras cerrar sesión.
4. Envío de comunicados en serie: riesgo de agotar el tiempo de la función con muchas familias.
5. Sin límite de tasa en mutaciones del portal; la CSP permite `unsafe-eval`.
6. Al reemplazar un comprobante, el archivo anterior queda huérfano en el bucket.
7. `ParentInvitation` sin uso. Hay un 404 en consola en `/sign-in` sin identificar.
8. Falta validación manual en iPhone/Android reales (instalación PWA y push) y con dos escuelas.
9. El portal bloquea el zoom (`maximumScale:1`; axe `meta-viewport`): quitarlo cuando todo campo mida ≥ 16 px (spec 001, T303).
10. Pendiente confirmar en producción: `DATABASE_URL` por el pooler de Supabase (puerto 6543) y el
   restablecimiento de contraseña activo en Clerk.

## 9. Estado y trabajo en curso

- `main` = `a6f5438`: PWA, portal, notificaciones, comprobantes, instructor en portal, auditoría,
  rendimiento y suite E2E (25/25 en verde el 2026-07-31).
- Rama `sdd/constitution`: constitución v1.1.0, este archivo y `CLAUDE.md` (lo carga cada sesión).
- Rama `001-pulido-visual-portal` (sale de `sdd/constitution`): `specs/001-pulido-visual-portal/` con
  `spec.md` v2, `plan.md` y `tasks.md` aprobados. **Fase 0 hecha** (salvo T008) y **fase 1 hecha**
  (portal: Pagos con resumen y lo vencido primero, Notificaciones con "Nueva", botón de comprobante y
  pestañas inferiores; todo con las primitivas de `shared/`). Pagos y Notificaciones están en cero en
  todas las métricas de `e2e/ui-baseline.json`; portal completo: 4 textos < 12 px, 6 objetivos pequeños,
  contraste 1/1 (claro/oscuro). Total producto: 164 textos < 12 px, 62 objetivos, contraste 61/155
  (el resto es dashboard y fases 2–5). **T008 hecha** (`critica-t008.md`): plugin `frontend-design`
  habilitado el 2026-10-05; una sesión ya abierta no lo carga (hay que abrir una nueva), así que se leyó
  su SKILL.md del repo oficial. Siguiente: fase 2 (eventos, pase de lista con avance, Inicio con lo accionable).
- Documentos de referencia: `docs/arquitectura-pwa-notificaciones.md`, `docs/guia-qa.md`,
  `docs/plan-pruebas-qa.md`, `docs/qa-run-2026-07-31.md`, `DESIGN.md` (dashboard).

## 10. Bitácora (más reciente primero)

| Fecha | Commit | Cambio |
|---|---|---|
| 2026-10-05 | rama `001-pulido-visual-portal` | T008: crítica de diseño; Pagos con un solo resumen, textos consistentes; tokens `--fs-*` sin uso eliminados; Skeleton visible; mediciones con `settle()` y guarda contra pantallas rotas |
| 2026-10-05 | rama `001-pulido-visual-portal` | Fase 1: portal Pagos y Notificaciones, botón de comprobante, pestañas; tokens `--danger-solid`, tinta de marca sólida en oscuro |
| 2026-10-05 | rama `001-pulido-visual-portal` | Fase 0: entorno reproducible, capturas antes, pruebas ui-standards/a11y con línea base, tokens y primitivas |
| 2026-10-05 | rama `001-pulido-visual-portal` | Plan aprobado y `tasks.md` (fases 0–6) |
| 2026-10-05 | rama `001-pulido-visual-portal` | Spec 001 v2 (alcance portal + dashboard, aclaraciones resueltas) y plan técnico |
| 2026-10-05 | rama `sdd/constitution` | Se crean la constitución (v1.1.0), `MEMORY.md` y `CLAUDE.md`; actualizar la memoria pasa a ser obligatorio |
| 2026-10-05 | `a6f5438` | `main` recibe todo el trabajo PWA (fast-forward) |
| 2026-08-05 | `a6f5438` | Guía de QA manual completa |
| 2026-07-31 | `f742e3a` | E2E con sign-in tokens; corrida en vivo 25/25 |
| 2026-07-28 | `13c267b` | Suite E2E Playwright y plan de QA |
| 2026-07-28 | `670ae92` | `/entrar`: el tutor aterriza en el portal, no en "crea tu escuela" |
| 2026-07-28 | `a1342d3` | Rendimiento: `loading.tsx`, `getCurrentContext` en 16 páginas, caché de membresía |
| 2026-07-26 | `a705052` | Auditoría: asistencia entre grupos, crons fail-closed, despacho idempotente, paginación |
| 2026-07-23 | `bf61fa3`…`246bdb6` | Pestaña Cuenta, pase de lista del instructor en portal, acceso del instructor, "Abrir portal" |
| 2026-07-22 | `06b296b`…`b3182b0` | Confirmación de eventos en la app, aviso de pago, scroll de modales, enlace con `clerkId` obsoleto |
| 2026-07-20/21 | `ee4a1b1`…`7ba24c4` | Comprobantes de pago y correcciones de Storage/CSP/service worker |

## Cómo mantener este archivo

1. **Al terminar cualquier cambio** (funcionalidad, corrección, migración, configuración) y antes
   del commit, actualiza lo que corresponda: secciones 3–9 si cambió algo estructural y una fila
   nueva en la bitácora (sección 10). Sube "Última actualización" y "`main` en".
2. Los cambios van en el **mismo commit** que el código que describen.
3. Registra hechos verificables (rutas, nombres, comportamiento), no intenciones. Sin secretos ni
   credenciales, jamás.
4. Al resolver un punto de la deuda (sección 8), bórralo; al descubrir uno, agrégalo.
5. Un aprendizaje nuevo y reutilizable va a la sección 7; no lo dejes solo en la bitácora.
6. Mantén el archivo breve: si una sección crece demasiado, mueve el detalle a `docs/` y enlázalo.
