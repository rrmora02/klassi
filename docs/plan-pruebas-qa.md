# Plan de pruebas QA — Klassi (portal PWA + dashboard)

Checklist manual que complementa la suite automatizada (`e2e/`, ver
`e2e/README.md`). Cubre lo que Playwright no puede: dispositivos reales,
push, correos, escrituras y flujos entre dos personas.

Convención: marca ✅/❌ y anota evidencia (captura + pasos) en cada ❌.

---

## 0. Preparación del entorno

- [ ] Escuela de prueba con: 2+ alumnos (uno con tutor CON correo y uno SIN correo), 2 grupos, 1 instructor invitado (no admin), 1 evento con costo, mensualidades generadas.
- [ ] `.env` completo: Clerk dev, Supabase de prueba (URL/service role), VAPID generadas, `NEXT_PUBLIC_APP_URL` correcto.
- [ ] Probar sobre build real: `npm run build && npm start` (el modo dev distorsiona tiempos).

## 1. Staff — gestión desde el dashboard

- [ ] Crear alumno con tutor (nombre, correo, teléfono). El tutor aparece en la ficha con "Sin cuenta aún".
- [ ] **Acceso de la familia**: generar enlace → aparece QR + URL en una sola tarjeta, sin scroll horizontal. Copiar funciona.
- [ ] Tutor SIN correo: el botón queda deshabilitado con explicación.
- [ ] Alumno con clerkId roto (caso Thiago): generar enlace NO da "Not found" (se reaprovisiona solo).
- [ ] Crear comunicado → "Crear y enviar" → toast de confirmación (no alert del navegador).
- [ ] Comunicado dirigido a un grupo y a un alumno específico (prefijo student:) — ambos llegan solo a los tutores correctos.
- [ ] Pagos: marcar mensualidad como pagada → el tutor recibe notificación "pago recibido" (ver §2).
- [ ] Pagos: ver comprobante subido por el tutor (URL firmada abre la imagen/PDF).
- [ ] Evento nuevo → tutores reciben invitación en el portal.
- [ ] Modales de pago en resolución chica (≤ 667px de alto): se puede hacer scroll y los botones son alcanzables.

## 2. Tutor — portal PWA (en teléfono REAL)

### Acceso e instalación
- [ ] Abrir el enlace mágico desde el teléfono → entra directo al portal sin contraseña.
- [ ] El enlace es de un solo uso: abrirlo de nuevo (otro navegador) muestra error amable.
- [ ] **Android/Chrome**: instalar PWA → abre standalone en /portal, ícono correcto.
- [ ] **iPhone/Safari**: Compartir → Agregar a inicio → abre standalone. (iOS requiere instalarla para push.)
- [ ] Activar notificaciones (opt-in) → permiso concedido → "dispositivo registrado".

### Notificaciones
- [ ] Staff envía comunicado → llega push al teléfono (app cerrada) → tocarla abre /portal/notificaciones.
- [ ] El contador de no-leídas del tab coincide; "Marcar leídas" lo limpia.
- [ ] El mismo aviso llega por correo (si el tutor tiene email real).

### Pagos y eventos
- [ ] Mensualidad pendiente → adjuntar comprobante (foto y PDF; >10 MB rechazado con mensaje claro).
- [ ] El staff recibe notificación "comprobante recibido".
- [ ] Evento: confirmar asistencia Sí → aparece opción de subir comprobante. Confirmar No → estado "No asistirá".
- [ ] Marcado como pagado por el staff → notificación "pago recibido" al tutor.

### Cuenta y sesión
- [ ] Cuenta: crear contraseña (primera vez) → éxito. En pantalla chica no hay desbordes.
- [ ] Cerrar sesión → entrar por /sign-in con correo+contraseña → **aterriza en /portal** (nunca en "crea tu escuela").
- [ ] "¿Olvidaste tu contraseña?" en /sign-in envía código y permite restablecer (requiere toggle activo en Clerk).
- [ ] Cambiar contraseña (segunda vez): pide la actual; con actual incorrecta → error claro.

## 3. Instructor

- [ ] Invitación por correo → aceptar → aterriza en dashboard con menú solo Inicio + Asistencia + Abrir portal.
- [ ] Ficha del instructor (como admin): tarjeta "Acceso al portal" visible SOLO si no es admin; genera QR.
- [ ] Instructor entra por el enlace/QR en su teléfono → portal con pestaña Asistencia (sin Pagos).
- [ ] Pase de lista: solo aparecen SUS grupos; marcar Presente/Ausente/Tarde/Justificado persiste al recargar.
- [ ] La asistencia marcada en el portal se ve igual en el dashboard (misma sesión, sin duplicados).
- [ ] Admin autoasignado como instructor: NO ve la tarjeta de acceso al portal ni "Abrir portal".

## 4. Seguridad y aislamiento (intentos que DEBEN fallar)

- [ ] Tutor logueado intenta /dashboard directo → termina en /portal.
- [ ] Instructor intenta /dashboard/pagos, /alumnos, /reportes → rebotado a /dashboard.
- [ ] Con dos escuelas de prueba: el staff de la escuela A no ve datos de la B (alumnos, pagos, comunicados).
- [ ] Tutor A no ve pagos/notificaciones del tutor B (revisar que la lista solo trae lo propio).
- [ ] Enlace mágico ya usado o >7 días → error, no acceso.
- [ ] `GET /api/cron/dispatch-notifications` sin header de autorización → 401.

## 5. Rendimiento percibido (tras las optimizaciones)

- [ ] Primer clic entre secciones muestra esqueleto INMEDIATO (no pantalla congelada).
- [ ] Tabs de Pagos responden con esqueleto al filtrar.
- [ ] Quitar a un miembro del equipo → pierde acceso al recargar (caché de membresía invalidado).

## 6. Matriz de dispositivos mínima

| Dispositivo | Navegador | Foco |
|---|---|---|
| iPhone (real) | Safari | Instalación PWA, push (iOS 16.4+), formularios sin zoom |
| Android (real) | Chrome | Instalación PWA, push, cámara para comprobante |
| Laptop | Chrome | Dashboard staff completo |
| Laptop | ventana angosta | Modales y tablas con scroll correcto |

## 7. Registro de resultados

| Fecha | Sección | Resultado | Evidencia/Notas |
|---|---|---|---|
| | | | |
