# Guía de QA — Klassi

Documento maestro para que un QA profesional pruebe Klassi de punta a punta
**sin conocimiento previo del proyecto**. Contiene: qué es el producto, cómo
montar el entorno, cuentas y datos de prueba, cómo correr la suite
automatizada, los casos de prueba manuales con pasos y resultados esperados,
y cómo reportar defectos.

Documentos complementarios:

- `docs/plan-pruebas-qa.md` — checklist manual resumido (misma cobertura, formato corto).
- `docs/qa-run-2026-07-31.md` — última corrida automatizada (25/25 ✅) y hallazgos.
- `e2e/README.md` — detalles operativos de la suite Playwright.

---

## 1. Qué es Klassi

Klassi es una aplicación web (Next.js) para administrar escuelas de artes
marciales/deportes: alumnos, grupos, asistencia, pagos, comunicados y
eventos. Tiene dos caras:

- **Dashboard** (`/dashboard/...`): para el personal de la escuela (escritorio).
- **Portal de familias** (`/portal/...`): PWA instalable pensada para el
  teléfono del tutor, con notificaciones push.

Es **multi-tenant**: varias escuelas conviven en la misma base y **jamás**
deben ver datos ajenos entre sí.

### Roles

| Rol | Acceso | Notas |
|---|---|---|
| ADMIN / RECEPTIONIST ("staff") | Dashboard completo | Administra alumnos, pagos, comunicados, eventos, equipo |
| INSTRUCTOR | Dashboard restringido: solo Inicio + Asistencia (+ "Abrir portal") | Rebotado de pagos, alumnos, reportes, etc. |
| Tutor (padre/madre) | Solo el portal | Entra por enlace mágico o correo+contraseña; **nunca** debe ver el dashboard ni el onboarding |
| SUPER_ADMIN | `/dashboard/super-admin` | Fuera del alcance de esta guía |

### Mapa de rutas principales

| Ruta | Qué es | Quién |
|---|---|---|
| `/` | Landing pública | Todos |
| `/sign-in`, `/sign-up` | Autenticación (Clerk) | Todos |
| `/onboarding` | Crear escuela (primer uso del staff) | Staff nuevo |
| `/dashboard` | Inicio del staff | Staff / instructor |
| `/dashboard/alumnos`, `/grupos`, `/pagos`, `/comunicados`, `/asistencia`, `/eventos`, `/instructores`, `/reportes`, `/configuracion`, `/billing` | Módulos del staff | Staff (instructor solo asistencia) |
| `/portal` | Inicio del portal de familias | Tutor / instructor |
| `/portal/pagos`, `/portal/asistencia`, `/portal/notificaciones`, `/portal/cuenta` | Módulos del portal | Tutor |
| `/portal/acceso?token=...` | Canje del enlace mágico (un solo uso) | Tutor |
| `/alumno/[token]` | Ficha pública del alumno vía QR | Quien tenga el QR |
| `/evento/[eventId]/responder` | Confirmación de asistencia a evento | Tutor |
| `/api/cron/*` | Tareas programadas (protegidas por header) | Solo el cron |

---

## 2. Entorno de pruebas

### 2.1 Requisitos

- Node 20+, npm, Postgres 14+ local (o el connection string de una BD de prueba).
- Llaves de la instancia de **desarrollo** de Clerk (nunca producción).
- `.env` completo: `DATABASE_URL`, llaves de Clerk, llaves VAPID
  (`npx web-push generate-vapid-keys`), `NEXT_PUBLIC_APP_URL`. Stripe,
  Resend y Supabase pueden llevar placeholders para pruebas de solo lectura;
  para probar comprobantes (subida de archivos) y correos sí se necesitan
  Supabase y Resend reales de prueba.

### 2.2 Levantar la app (siempre build de producción)

El modo dev distorsiona tiempos y el comportamiento del service worker.

```bash
npm install
npx prisma db push            # aplica el esquema a la BD de prueba
DATABASE_URL=... npx tsx e2e-seed.local.ts   # datos semilla (ver 2.3)
npm run build && npm start    # http://localhost:3000
```

### 2.3 Datos semilla (`e2e-seed.local.ts`)

El script crea un tenant reproducible ligado a los usuarios de prueba de
Clerk dev. Si la BD ya tiene datos, límpiala antes (el script hace `create`,
no `upsert`). Lo que deja creado:

- **Escuela**: "Escuela Demo E2E" (slug `escuela-demo-e2e`), estado ACTIVE, plan PRO.
- **Disciplina** Karate y **grupo** "Karate Infantil" (clase diaria 16:00–17:00,
  mensualidad $500.00, día de cobro 1) con el instructor asignado.
- **Alumnos**: Thiago Reyes (cinta blanca) y Valentina Reyes, ambos inscritos
  al grupo y vinculados al tutor.
- **Pagos** de Thiago: "Mensualidad Julio 2026" **PENDIENTE** y
  "Mensualidad Junio 2026" **PAGADA** (efectivo).
- **Comunicado** enviado ("Bienvenidos al nuevo ciclo") y 2 notificaciones
  del tutor (una no leída → el contador del portal debe mostrar **1**).
- **Evento** próximo: "Convivio de verano" (2026-08-15, costo $150.00, toda la escuela).

> Nota: los `clerkId` del script corresponden a los usuarios de la instancia
> Clerk dev de este proyecto. Si pruebas contra otra instancia, reemplázalos
> por los IDs reales de tus usuarios de prueba (Clerk Dashboard → Users).

### 2.4 Cuentas de prueba

| Rol | Correo | En la BD semilla |
|---|---|---|
| Staff (ADMIN) | `raul.remo02@gmail.com` | Miembro ADMIN de Escuela Demo E2E |
| Instructor | `rrmora02@gmail.com` | Rol INSTRUCTOR con el grupo Karate Infantil asignado |
| Tutor | `rrmora02@icloud.com` | Sin membresía de escuela; tutor de Thiago y Valentina |

Las contraseñas viven en `.env.e2e` (copiar de `.env.e2e.example`; está en
`.gitignore` y no se commitea).

> ⚠️ **Trampa conocida**: la instancia de Clerk dev pide un **código por
> correo** como segundo factor en navegadores nuevos. Para pruebas manuales
> simplemente ingresa el código. La suite automatizada lo evita usando
> sign-in tokens del Backend API (ya resuelto en `e2e/helpers.ts`).
>
> ⚠️ Verifica que `E2E_INSTRUCTOR_EMAIL=rrmora02@gmail.com` (hubo un entorno
> donde estaba mal configurado con el correo del staff).

---

## 3. Suite automatizada (Playwright)

Correr **primero** la suite: si algo básico está roto, lo detecta en ~1 minuto.

```bash
# con la app ya corriendo (sección 2.2):
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
npm run test:e2e:report   # reporte HTML de la última corrida
```

Cobertura actual (25 pruebas, todas de **solo lectura**):

| Suite | Pruebas | Qué valida |
|---|---|---|
| `smoke.spec.ts` | 11 | Manifest y service worker de la PWA, rutas públicas, redirecciones de rutas protegidas, cabeceras CSP/HSTS/X-Frame-Options, cron sin auth → 401 |
| `staff.spec.ts` | 5 | Dashboard, alumnos, pagos (tabs con contador), comunicados, asistencia |
| `portal.spec.ts` | 5 | Portal del tutor en viewport móvil: inicio, pagos, notificaciones (contador de no leídas), cuenta; tutor rebotado de `/dashboard` |
| `instructor.spec.ts` | 4 | Menú restringido, rebote de rutas administrativas, pase de lista de su grupo |

**Resultado esperado: 25/25 en verde.** Cualquier falla es un hallazgo (de
la app o del entorno): investígala antes de seguir con lo manual.

Lo que la suite **no** cubre y por eso existe la parte manual: escrituras
(crear/marcar/enviar), push real en teléfono, correos, subida de archivos,
flujos entre dos personas y aislamiento multi-tenant.

---

## 4. Casos de prueba manuales

Convenciones: cada caso tiene ID, prioridad (**P1** = bloqueante para
liberar, **P2** = importante, **P3** = deseable), pasos y resultado
esperado. Ejecutar en el orden de las secciones: los casos de staff generan
los datos que consumen los del tutor.

### 4.1 Staff — dashboard (escritorio, Chrome)

**Precondición:** sesión iniciada como `raul.remo02@gmail.com` en `/dashboard`.

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| ST-01 | P1 | Alta de alumno con tutor | Alumnos → Nuevo alumno → llenar datos + tutor (nombre, correo, teléfono) → guardar | Alumno en la lista; en su ficha el tutor aparece con "Sin cuenta aún" |
| ST-02 | P1 | Generar acceso de la familia | Ficha del alumno → Acceso de la familia → Generar enlace | QR + URL en una sola tarjeta, sin scroll horizontal; botón Copiar funciona |
| ST-03 | P2 | Tutor sin correo | Repetir ST-02 con un alumno cuyo tutor no tiene correo | Botón deshabilitado con explicación (no error) |
| ST-04 | P2 | clerkId roto se autorepara | Generar enlace para un alumno cuyo tutor tiene clerkId inválido en BD | NO da "Not found"; reaprovisiona y genera el enlace |
| ST-05 | P1 | Crear y enviar comunicado | Comunicados → Nuevo → destinatarios "toda la escuela" → Crear y enviar | Toast de confirmación (no `alert()` del navegador); el comunicado queda listado |
| ST-06 | P2 | Comunicado dirigido | Enviar uno a un grupo y otro a un alumno específico (`student:`) | Solo los tutores correctos lo reciben (verificar en portal/push del tutor) |
| ST-07 | P1 | Marcar pago como pagado | Pagos → tab Pendientes → "Mensualidad Julio 2026" de Thiago → marcar pagada | Pasa a Pagados; el tutor recibe notificación "pago recibido" (TU-09) |
| ST-08 | P2 | Ver comprobante del tutor | Tras TU-07: Pagos → abrir el comprobante subido | La URL firmada abre la imagen/PDF |
| ST-09 | P2 | Crear evento | Eventos → Nuevo (con costo) → guardar | Los tutores reciben la invitación en su portal |
| ST-10 | P2 | Pase de lista del staff | Asistencia → elegir grupo/fecha → marcar estados → recargar | Los estados persisten; coincide con lo que ve el instructor (IN-04) |
| ST-11 | P3 | Modales en pantalla chica | Ventana ≤ 667 px de alto → abrir modal de pago | El modal tiene scroll interno; los botones son alcanzables |
| ST-12 | P3 | Rendimiento percibido | Navegar entre secciones; filtrar tabs de Pagos | Esqueleto de carga inmediato al primer clic, nunca pantalla congelada |

### 4.2 Tutor — portal PWA (teléfono REAL)

**Precondición:** enlace mágico generado en ST-02 para el tutor
`rrmora02@icloud.com`; probar en Android/Chrome y iPhone/Safari.

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| TU-01 | P1 | Enlace mágico | Abrir el enlace en el teléfono | Entra directo a `/portal` sin contraseña |
| TU-02 | P1 | Enlace de un solo uso | Abrir el mismo enlace en otro navegador | Error amable; no da acceso |
| TU-03 | P1 | Instalar PWA Android | Chrome → Instalar app | Abre standalone en `/portal` con el ícono correcto |
| TU-04 | P1 | Instalar PWA iPhone | Safari → Compartir → Agregar a inicio | Abre standalone (iOS 16.4+ requiere instalarla para recibir push) |
| TU-05 | P1 | Opt-in de notificaciones | Activar notificaciones en el portal → conceder permiso | Mensaje "dispositivo registrado" |
| TU-06 | P1 | Push con app cerrada | Staff envía comunicado (ST-05) con la app cerrada | Llega push al teléfono; tocarla abre `/portal/notificaciones`; el contador de no leídas coincide; "Marcar leídas" lo limpia; el aviso también llega por correo si el tutor tiene email real |
| TU-07 | P1 | Subir comprobante | Pagos → mensualidad pendiente → adjuntar foto y luego PDF | Ambos suben; >10 MB rechazado con mensaje claro; el staff recibe "comprobante recibido" |
| TU-08 | P2 | Responder a evento | Abrir invitación del evento → confirmar Sí; repetir con No | Con Sí aparece opción de subir comprobante; con No queda "No asistirá" |
| TU-09 | P1 | Notificación de pago | Tras ST-07 | El tutor recibe push/notificación "pago recibido" |
| TU-10 | P1 | Crear contraseña y re-entrar | Cuenta → crear contraseña → cerrar sesión → `/sign-in` con correo+contraseña | **Aterriza en `/portal`**, jamás en "crea tu escuela" (onboarding); sin desbordes en pantalla chica |
| TU-11 | P2 | Recuperar contraseña | `/sign-in` → "¿Olvidaste tu contraseña?" | Envía código y permite restablecer |
| TU-12 | P2 | Cambiar contraseña | Cuenta → cambiar contraseña con la actual incorrecta; luego con la correcta | Error claro en el primer caso; éxito en el segundo |

### 4.3 Instructor

**Precondición:** `rrmora02@gmail.com` con rol INSTRUCTOR y el grupo
"Karate Infantil" asignado.

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| IN-01 | P1 | Invitación | Staff invita al instructor → aceptar desde el correo | Aterriza en el dashboard con menú SOLO Inicio + Asistencia + "Abrir portal" |
| IN-02 | P2 | Acceso al portal del instructor | Como admin: ficha del instructor → tarjeta "Acceso al portal" → QR; abrirlo en el teléfono | La tarjeta solo aparece si NO es admin; el portal muestra pestaña Asistencia, sin Pagos |
| IN-03 | P1 | Pase de lista | Asistencia → verificar grupos → marcar Presente/Ausente/Tarde/Justificado → recargar | Solo aparecen SUS grupos; los estados persisten |
| IN-04 | P1 | Consistencia con dashboard | Comparar la asistencia de IN-03 en el dashboard del staff | Misma sesión, mismos estados, sin duplicados |
| IN-05 | P2 | Admin autoasignado como instructor | Admin que también es instructor revisa su propia ficha | NO ve la tarjeta de acceso al portal ni "Abrir portal" |

### 4.4 Seguridad y aislamiento (intentos que DEBEN fallar)

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| SE-01 | P1 | Tutor a dashboard | Con sesión de tutor, navegar a `/dashboard` | Rebota a `/portal` |
| SE-02 | P1 | Instructor a rutas admin | Con sesión de instructor: `/dashboard/pagos`, `/dashboard/alumnos`, `/dashboard/reportes` | Rebota a `/dashboard` en las tres |
| SE-03 | P1 | Aislamiento entre escuelas | Crear una segunda escuela de prueba; con el staff de A revisar alumnos, pagos y comunicados | Nada de la escuela B es visible, en ninguna lista ni búsqueda |
| SE-04 | P1 | Aislamiento entre tutores | Con el tutor A revisar pagos y notificaciones | Solo ve lo propio; nunca datos del tutor B |
| SE-05 | P1 | Enlace mágico caducado/usado | Abrir un enlace ya canjeado o con >7 días | Error, sin acceso |
| SE-06 | P1 | Cron sin autorización | `curl -i http://localhost:3000/api/cron/dispatch-notifications` (sin header) | HTTP 401 |
| SE-07 | P2 | Revocación de acceso | Quitar a un miembro del equipo → esa persona recarga | Pierde acceso (la caché de membresía se invalida) |

### 4.5 Matriz de dispositivos mínima

| Dispositivo | Navegador | Foco |
|---|---|---|
| iPhone real | Safari | Instalación PWA, push (iOS 16.4+), formularios sin zoom |
| Android real | Chrome | Instalación PWA, push, cámara para comprobante |
| Laptop | Chrome | Dashboard del staff completo |
| Laptop, ventana angosta | Chrome | Modales y tablas con scroll correcto |

---

## 5. Reporte de defectos

### Severidades

- **S1 — Bloqueante**: pérdida/filtración de datos, no se puede entrar,
  fallo de aislamiento multi-tenant (cualquier SE-* en rojo es S1).
- **S2 — Grave**: una función principal no sirve y no hay rodeo (push no
  llega, no se puede marcar un pago).
- **S3 — Media**: funciona con rodeo o falla en un solo dispositivo.
- **S4 — Menor**: cosmético, textos, desalineados.

### Plantilla de reporte

```
Título: [módulo] resumen en una línea
Caso relacionado: ST-07 (o "exploratorio")
Severidad: S2
Entorno: build local f742e3a / dispositivo / navegador+versión
Cuenta usada: rol + correo
Pasos: 1) ... 2) ... 3) ...
Resultado actual: ...
Resultado esperado: ...
Evidencia: captura o video; errores de consola/red si los hay
Reproducibilidad: siempre / intermitente (x de y intentos)
```

### Criterios de salida (para dar el visto bueno)

1. Suite automatizada 25/25 en verde sobre el build a liberar.
2. Todos los casos P1 ejecutados y en verde en la matriz de dispositivos.
3. Cero defectos S1/S2 abiertos; S3 con rodeo documentado.
4. Registro de resultados llenado (tabla siguiente) con evidencia de cada ❌.

### Registro de resultados

| Fecha | ID caso | Dispositivo | Resultado | Evidencia/Notas |
|---|---|---|---|---|
| | | | | |

---

## 6. Estado conocido al escribir esta guía (2026-08-04)

- Última corrida automatizada: **25/25 ✅** sobre `13c267b` + arreglos de la
  suite (`f742e3a`), build de producción real. Detalle en `docs/qa-run-2026-07-31.md`.
- Sin bugs de producto conocidos. Observación menor pendiente: `/sign-in`
  registra un 404 de un recurso en la consola (no afecta el flujo).
- Todo lo de las secciones 4.1–4.5 está **pendiente de ejecución manual**:
  esta guía existe precisamente para esa pasada.
