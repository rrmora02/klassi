# Constitución de Klassi

Klassi es un SaaS multi-escuela para escuelas deportivas y de artes: el staff gestiona alumnos,
grupos, pagos y eventos desde un dashboard, y las familias e instructores usan un portal PWA
(que reemplaza a WhatsApp) para avisos, pagos y asistencia. Este documento fija las reglas que
toda especificación, plan y cambio de código debe respetar. Cuando algo lo contradiga, gana la
constitución.

## Principios fundamentales

### I. Aislamiento entre escuelas (NO NEGOCIABLE)

Todo dato de negocio pertenece a una escuela (`tenantId`). Ninguna consulta, escritura ni
archivo puede cruzar escuelas.

- Toda consulta del dashboard filtra por el `tenantId` del contexto autenticado; nunca por un
  identificador recibido del cliente sin verificar su pertenencia.
- En el portal, el acceso de una familia se deriva siempre del vínculo `ParentStudent`, no del
  tenant activo (una familia puede tener hijos en varias escuelas).
- La identidad (usuario, correo, rol) se deriva de la sesión en el servidor; nunca de la entrada.
- Toda funcionalidad que lea o escriba datos incluye una prueba o caso de QA con dos escuelas
  que demuestre que no hay fuga.

*Motivo:* un solo cruce de datos entre escuelas destruye la confianza en el producto.

### II. La autorización vive en el servidor

La interfaz solo oculta opciones; el servidor decide.

- Todo procedimiento tRPC usa el nivel mínimo necesario: `protectedProcedure`, `tenantProcedure`,
  `staffProcedure` (ADMIN/RECEPTIONIST), `adminProcedure` o `superAdminProcedure`.
- Las reglas por recurso se validan además del rol (ej. un instructor solo toca sus grupos
  asignados; una inscripción debe pertenecer al grupo de la sesión).
- No se crean endpoints HTTP fuera de tRPC sin autenticación explícita. Los crons y webhooks
  rechazan la petición si falta su secreto configurado (fallar cerrado, nunca abierto).

*Motivo:* en esta base ya apareció un caso real (asistencia entre grupos) donde la UI protegía
y el servidor no.

### III. Secretos y datos sensibles

- Ningún secreto, token o contraseña entra al repositorio, a los logs, a los commits ni a los
  mensajes de sesión. Se usan variables de entorno; las credenciales de prueba son solo de la
  instancia de desarrollo.
- Los comprobantes de pago viven en un bucket privado y se leen con URLs firmadas de corta vida.
  Los archivos se validan en el servidor (tipo y tamaño).
- Todo texto de usuario que llegue a HTML o correo se escapa.
- El staff nunca conoce ni fija la contraseña de una familia o instructor; el acceso inicial es
  por enlace de un solo uso con expiración.

### IV. Notificaciones confiables

- Una notificación se registra primero (outbox: `Notification` + `NotificationDelivery` en una
  transacción) y se entrega después; la entrega se reintenta con límite y es idempotente (el
  mismo mensaje no se envía dos veces aunque corran el despacho en línea y el cron).
- Se respetan las preferencias del usuario y un canal que falla no bloquea a los demás.
- El fallo al notificar nunca revierte la acción de negocio que lo originó.

### V. Portal móvil primero

El portal se diseña y se prueba a 390 px de ancho en un teléfono real, no como adaptación del
dashboard.

- Sin scroll horizontal, modales con scroll interno, campos que no provoquen zoom en iOS.
- Cada sección tiene estado de carga inmediato (`loading.tsx` o esqueleto) y estado vacío claro.
- La PWA es instalable y su caché offline no debe exponer datos de una sesión cerrada.

### VI. Rendimiento por diseño

- La identidad y la escuela se obtienen una sola vez por petición con `getCurrentContext()`
  (`React.cache`); las páginas no repiten esas consultas.
- Las consultas independientes se ejecutan en paralelo; no se admiten N+1.
- Toda lista tiene paginación con tope; toda consulta frecuente por `tenantId` + filtro tiene
  índice.
- Una caché en memoria define su TTL e **invalida explícitamente** en las escrituras que la
  afectan; nunca se cachea la ausencia de un registro.
- Ninguna sección nueva se entrega sin respuesta visible inmediata al hacer clic.

*Motivo:* el rendimiento percibido ya fue un problema crítico con una sola instancia; la meta
operativa es sostener 20–50 escuelas concurrentes.

### VII. Cambios aditivos y reversibles

- No se rompe lo que ya funciona: las migraciones de base de datos son compatibles hacia atrás
  (agregar, deprecar, y solo después retirar) y se pueden aplicar antes del código que las usa.
- Toda funcionalidad nueva puede revertirse sin perder datos.
- El historial de `main` no se reescribe.

### VIII. Verificación antes de integrar

Un cambio está "hecho" solo con evidencia, no con intención:

- `tsc --noEmit` limpio con la versión de TypeScript fijada en el lockfile, y `next build` verde.
- La suite E2E (`npm run test:e2e`, de solo lectura) en verde; todo flujo nuevo de usuario añade
  su prueba E2E o, si escribe datos, su caso en la guía de QA.
- Todo bug corregido añade una prueba de regresión o un caso explícito de QA.
- Los informes de avance describen lo verificado y lo no verificado, sin matices a favor.

### IX. Producto en español, claro y consistente

- La interfaz y los mensajes de error están en español (es-MX) y dicen qué hacer, no solo qué
  falló. Se usan toasts, no `alert()` del navegador.
- Montos con `formatCurrency` y fechas/meses en zona horaria de México.
- Estilos con las variables de diseño del proyecto (`--color-*`), con soporte de modo oscuro;
  el portal usa el azul de marca `#1D3557`. `DESIGN.md` es la referencia visual del dashboard.

### X. Simplicidad y consistencia con lo existente

- Se reutilizan los patrones y servicios existentes (`createNotifications`,
  `createPortalAccessLink`, `getCurrentContext`, componentes de acceso familiar) antes de crear
  otros.
- TypeScript estricto (`strict` y `noUncheckedIndexedAccess`); no se agregan `any` nuevos sin
  justificación escrita.
- Una dependencia nueva requiere justificar por qué no basta lo que ya hay.

## Restricciones técnicas

- **Stack:** Next.js 14 (App Router), React 18, tRPC 10, Prisma 5 sobre PostgreSQL (Supabase),
  Clerk para autenticación, Supabase Storage para comprobantes, Resend para correo, Web Push
  (VAPID) para notificaciones, despliegue en Vercel con crons en `vercel.json`.
- **Entornos:** desarrollo y producción usan instancias, bases de datos y llaves separadas. Las
  pruebas automatizadas y los datos semilla nunca apuntan a producción.
- **API pública (futura):** versionada, REST, autenticada con llaves por escuela y con límite de
  tasa; debe cumplir los principios I, II y III sin excepción.
- **Suscripción:** las mutaciones respetan el estado de la escuela (prueba vencida, suspendida o
  en solo lectura); una funcionalidad nueva no puede saltarse ese control.

## Flujo de trabajo (Spec-Driven Development)

1. **Constitución → especificación → aclaración → plan → tareas → implementación.**
2. Las especificaciones viven en `specs/NNN-nombre/` (`spec.md`, `plan.md`, `tasks.md` y, según
   haga falta, `research.md`, `data-model.md`, `contracts/`).
3. La especificación describe **qué** y **por qué** para el usuario, sin decisiones técnicas, con
   criterios de aceptación comprobables y las ambigüedades marcadas como `[NECESITA ACLARACIÓN]`
   hasta resolverse.
4. El plan incluye una **Verificación contra la constitución**: cada principio queda en "cumple"
   o en una excepción justificada en la sección de complejidad.
5. Cada tarea se traza a un requisito y a su criterio de aceptación; las pruebas se definen antes
   de implementar.
6. **Exención:** correcciones de errores pequeñas y cambios de texto no requieren especificación
   completa, pero sí cumplen los principios y llevan su prueba de regresión.
7. Ramas de funcionalidad: `NNN-nombre`. Commits en español con prefijo convencional
   (`feat`, `fix`, `perf`, `test`, `docs`, `chore`) y alcance entre paréntesis.
8. La integración a `main` se hace por solicitud explícita del dueño del proyecto, de preferencia
   mediante pull request.

## Deuda conocida

Estos puntos incumplen principios vigentes y deben tener su propia especificación:

- La caché offline del service worker conserva páginas del portal tras cerrar sesión (V).
- El envío de comunicados despacha en serie y puede agotar el tiempo de la función con muchas
  familias (IV, VI).
- No hay límite de tasa en las mutaciones del portal (II).
- Al reemplazar un comprobante, el archivo anterior queda huérfano en el bucket (III).
- La CSP permite `unsafe-eval` (III).
- El modelo `ParentInvitation` no se usa y debe retirarse de forma compatible (VII, X).

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica o documento del repositorio.
- Una enmienda se propone por pull request con su motivo y su plan de adopción; el número de
  versión sigue semver: **MAYOR** al eliminar o redefinir un principio, **MENOR** al agregar uno
  o ampliar su alcance, **PARCHE** al aclarar redacción.
- Toda revisión de plan y de código comprueba el cumplimiento; las excepciones se documentan con
  su justificación y fecha de revisión.

**Versión:** 1.0.0 · **Ratificada:** 2026-10-05 · **Última enmienda:** 2026-10-05
