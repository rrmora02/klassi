# Guía de despliegue por ambientes — Vercel + Supabase

Objetivo: tener **dev, QA, staging y producción** separados, empezando por **QA** para probar
(incluida la PWA y las notificaciones push). Esta guía separa lo que hace **el dueño** (cuentas, paneles,
DNS, tarjetas, secretos) de lo que ya está en el código.

> Precios: son los vigentes al **2026-10-09** según las páginas públicas y terceros. Verifícalos antes de
> pagar (enlaces en la sección 10). Nunca pegues claves ni tokens en chats ni en el repositorio.

---

## 1. Arquitectura recomendada

**Un proyecto de Vercel por ambiente**, los cuatro desde el mismo repositorio, cada uno con su rama de
producción, sus variables y su base de datos:

| Ambiente | Proyecto Vercel | Rama que despliega | Base de datos | Clerk | Dominio sugerido |
|---|---|---|---|---|---|
| **Dev** | `klassi-dev` | `develop` | Supabase `klassi-dev` (o Postgres local) | App «klassi-dev» (instancia de desarrollo) | `dev.klassi.io` o `*.vercel.app` |
| **QA** | `klassi-qa` | `qa` | Supabase `klassi-qa` | App «klassi-qa» (instancia de desarrollo) | `qa.klassi.io` o `*.vercel.app` |
| **Staging** | `klassi-staging` | `staging` | Supabase `klassi-staging` | App «klassi-staging» | `staging.klassi.io` |
| **Prod** | `klassi` | `main` | Supabase `klassi-prod` | App «klassi» (instancia de **producción**) | `klassi.io` |

Por qué proyectos separados y no un solo proyecto con «environments»:
- Vercel solo trae *Production* y *Preview*; los *Custom Environments* en Pro permiten **1 por proyecto**
  (Pro: 1, Enterprise: 12), así que no alcanzan para QA **y** staging.
- Cada proyecto tiene su propio *Production*: el dominio es público, **sin** la pantalla de login de
  Vercel que rompe webhooks, correos con enlaces y el `manifest` de la PWA en los *previews*.
- **Los crons de Vercel solo corren en el deployment de producción de cada proyecto.** Con proyectos
  separados, los tres crons de `vercel.json` (pagos, pruebas, notificaciones) también corren en QA y staging.
- Las variables `NEXT_PUBLIC_*` se «hornean» en el build: cada proyecto compila con las suyas.
- El plan Pro se cobra **por asiento**, no por proyecto: cuatro proyectos no cuestan más que uno.

Flujo de promoción (mediante merge): `feature/*` → `develop` → `qa` → `staging` → `main`.

---

## 2. Costos (qué pagas y qué no)

| Servicio | Plan | Costo | ¿Obligatorio? |
|---|---|---|---|
| **Vercel** | Hobby | gratis | **No sirve para producción**: es solo uso personal no comercial y los crons corren **una vez al día** máx. (tu cron de notificaciones es cada hora; el deploy fallaría) |
| **Vercel** | **Pro** | **$20 USD/mes por asiento** (incluye $20 de uso; 1 TB de transferencia) | **Sí**, para prod (y conviene para los 4 proyectos en la misma cuenta) |
| **Supabase** | Free | gratis: 2 proyectos activos, 500 MB BD, 1 GB archivos, **se pausa tras 1 semana sin actividad, sin backups** | Sirve para dev y QA |
| **Supabase** | **Pro** | **desde $25 USD/mes por proyecto** (sin pausa, backups diarios de 7 días) | **Sí para prod** (comprobantes de pago y datos de menores) |
| **Clerk** | Hobby | gratis hasta 50 000 usuarios retenidos al mes (instancias de desarrollo: tope de 100 usuarios) | No pagas al inicio |
| **Resend** | Free | gratis: 100 correos/día, 3 000/mes, 1 dominio | Lo notarás en cuanto envíes comunicados a muchas familias; Pro $20/mes (50 000/mes) |
| **Stripe** | — | sin mensualidad; modo prueba gratis; en vivo comisión por transacción | Solo si cobras suscripciones |
| **Sentry** | Developer | gratis | Opcional |
| **Dominio** | — | ~USD 10–15/año | **Sí** para prod (Clerk de producción, correos, PWA con nombre propio) |

**Mínimo realista para salir a producción: ≈ $45 USD/mes** (Vercel Pro $20 + Supabase Pro $25) + dominio.
Dev, QA y staging pueden vivir en planes gratuitos (Supabase Free, Clerk Hobby, Resend Free).
Con Resend Pro: ≈ $65/mes. Activa en Vercel **Spend Management** para que el gasto no se dispare solo.

Límites del plan gratuito de Supabase que debes conocer: los proyectos Free se **pausan a la semana sin
tráfico** (hay que reactivarlos a mano antes de probar QA) y no tienen backups.

---

## 3. Antes de empezar (solo una vez)

1. **GitHub:** el repo `rrmora02/klassi` ya existe. Crea las ramas desde `main`:
   ```bash
   git fetch origin && git checkout main && git pull
   for b in develop qa staging; do git push origin main:refs/heads/$b; done
   ```
   En GitHub → *Settings → Branches* protege `main` (PR obligatorio, CI en verde) y, si quieres, `staging` y `qa`.
2. **Dominio** (para staging/prod): cómpralo y anota dónde administras el DNS.
3. **Vercel:** crea cuenta con GitHub y suscríbete a **Pro** (*Settings → Billing*). Activa *Spend Management*.
4. **Genera los secretos propios por ambiente** (distintos en cada uno; guárdalos en un gestor de contraseñas):
   ```bash
   openssl rand -hex 32     # CRON_SECRET
   openssl rand -hex 32     # ATTENDANCE_TOKEN_SECRET
   npx web-push generate-vapid-keys   # NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY
   ```
   Cada ambiente necesita **su propio par VAPID**: una suscripción push queda atada a la clave pública que
   la creó; si la cambias, las familias deben volver a activar las notificaciones.

---

## 4. Configurar QA — paso a paso

### 4.1 Supabase (proyecto `klassi-qa`)
1. supabase.com → *New project* → nombre `klassi-qa`, región cercana a tus usuarios, contraseña de BD fuerte
   (guárdala).
2. *Project Settings → API*: anota **Project URL** (`SUPABASE_URL`, solo el origen
   `https://<ref>.supabase.co`, sin `/rest/v1`) y la clave **service_role** (`SUPABASE_SERVICE_ROLE_KEY`;
   es secreta, solo va en Vercel).
3. *Project Settings → Database → Connection string*:
   - `DATABASE_URL` → **Transaction pooler** (puerto **6543**), añade al final
     `?pgbouncer=true&connection_limit=1`. Es la que usa la app en Vercel (serverless).
   - `DIRECT_URL` → conexión directa (5432) o *session pooler*. La usa Prisma para cambiar el esquema.
4. *Storage*: el bucket privado `comprobantes` **se crea solo** la primera vez que alguien sube un comprobante
   (con tope de 10 MB y solo JPEG/PNG/WebP/PDF). Opcional: créalo tú antes con esos límites.

### 4.2 Base de datos de QA
> **Importante:** el repositorio **no tiene migración inicial** (las carpetas de `prisma/migrations` parten de
> tablas ya existentes) y los modelos de notificaciones/push no tienen migración. Por eso `prisma migrate
> deploy` **falla en una BD vacía**. Para ambientes nuevos se usa `db push`, que lee `schema.prisma`.

Desde tu máquina, con las variables de **QA** solo en esa terminal (no las guardes en archivos del repo):
```bash
export DATABASE_URL='...'  DIRECT_URL='...'   # las de klassi-qa
npx prisma db push                             # crea las ~27 tablas
```
Después, en el *SQL Editor* de Supabase (o `psql`), ejecuta el contenido de
`prisma/migrations/security_rls_deny_all/migration.sql` (activa RLS en todas las tablas; la app no se afecta
porque Prisma usa el rol `postgres`). Comprueba en *Advisors → Security* que no queden tablas sin RLS.

### 4.3 Clerk (aplicación `klassi-qa`)
1. dashboard.clerk.com → *Create application* → nombre `klassi-qa`. Usa la **instancia de desarrollo**
   (no exige dominio propio; sirve en `*.vercel.app`).
2. *API Keys*: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_test_…`) y `CLERK_SECRET_KEY` (`sk_test_…`).
3. Métodos de acceso: correo + código (el portal de familias usa enlaces mágicos que genera la app).
4. El **webhook** se crea en el paso 5 (necesita la URL de Vercel).

### 4.4 Resend
1. resend.com → *API Keys* → crea una para QA (`RESEND_API_KEY`).
2. Sin dominio verificado, normalmente solo puedes enviar al correo de tu cuenta: sirve para QA. Para
   staging/prod verifica tu dominio (*Domains*: añade los registros DNS que te indique) y usa
   `RESEND_FROM_EMAIL="Klassi <avisos@tudominio>"`.

### 4.5 Proyecto de Vercel `klassi-qa`
1. vercel.com → *Add New → Project* → importa `rrmora02/klassi`. Nombre `klassi-qa`.
2. Framework: Next.js (automático). Install/Build por defecto (`postinstall` ya corre `prisma generate`).
3. *Settings → Git → Production Branch*: **`qa`**.
4. *Settings → Environment Variables*: añade **todas** las de la tabla siguiente en el entorno
   **Production** de este proyecto (en este diseño Production = QA). **`NEXT_PUBLIC_*` van antes del primer
   build** porque se incrustan al compilar.
5. *Settings → Deployment Protection*: deja *Vercel Authentication* solo para *Preview* (los *deployments*
   por rama); el dominio de producción del proyecto es público, que es lo que necesitan webhooks y la PWA.
6. *Settings → Domains* (opcional): `qa.klassi.io`. Si usas el `*.vercel.app`, anótalo.
7. Haz el primer deploy: crea la rama `qa` (paso 3.1) y Vercel compila al detectarla, o pulsa *Deploy*.

#### Variables de entorno (valores **distintos por ambiente**)

| Variable | ¿Secreta? | De dónde sale | Notas |
|---|---|---|---|
| `DATABASE_URL` | sí | Supabase pooler 6543 | `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | sí | Supabase directa 5432 | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | no | Clerk | `pk_test_…` en dev/QA/staging; `pk_live_…` en prod |
| `CLERK_SECRET_KEY` | sí | Clerk | |
| `CLERK_WEBHOOK_SECRET` | sí | Clerk → Webhooks (`whsec_…`) | tras crear el endpoint |
| `SUPABASE_URL` | no | Supabase → API | solo el origen |
| `SUPABASE_SERVICE_ROLE_KEY` | **sí (crítica)** | Supabase → API | nunca con prefijo `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | no | URL del ambiente | **Obligatoria**: si falta, los correos y enlaces apuntan a `https://klassi.io` (producción) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | no | `web-push generate-vapid-keys` | un par por ambiente |
| `VAPID_PRIVATE_KEY` | sí | ídem | |
| `VAPID_SUBJECT` | no | `mailto:soporte@tudominio` | |
| `CRON_SECRET` | sí | `openssl rand -hex 32` | Vercel lo envía solo como `Authorization: Bearer …` a los crons |
| `ATTENDANCE_TOKEN_SECRET` | sí | `openssl rand -hex 32` | firma los enlaces de confirmación de asistencia |
| `RESEND_API_KEY` | sí | Resend | |
| `RESEND_FROM_EMAIL` | no | tu dominio verificado | |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/PRO/ENTERPRISE` | sí / no | Stripe (modo **prueba** salvo prod) | solo si pruebas cobros |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | parcial | Sentry | opcional; el token solo para subir *source maps* |
| `LOG_LEVEL` | no | `info` | |
| `ENABLE_METRICS` | no | `false` | `/api/metrics` solo para superadmin |
| `PLAN_TEST_MODE` | no | **no definir** (o `true` solo en dev) | baja los límites de los planes; **jamás en staging/prod** |

### 4.6 Después del primer deploy (con la URL real de QA)
1. **Clerk → Webhooks → Add endpoint:** `https://<url-qa>/api/webhooks/clerk`, eventos `user.created`,
   `user.updated`, `user.deleted`. Copia el *Signing secret* a `CLERK_WEBHOOK_SECRET` en Vercel y haz
   **Redeploy**.
2. *(Si pruebas cobros)* **Stripe (modo prueba) → Developers → Webhooks:** `https://<url-qa>/api/webhooks/stripe`,
   eventos `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
   `customer.subscription.updated`, `customer.subscription.trial_will_end`, `customer.subscription.deleted`.
3. **Crear el primer usuario y escuela:** entra a la URL de QA, regístrate y completa el *onboarding*.
4. **Crons:** `vercel.json` los programa a las 08:00, 09:00 y cada hora (UTC) solo en el *Production* del
   proyecto. Para forzarlos ahora:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://<url-qa>/api/cron/dispatch-notifications
   ```
   Respuesta 200 = bien; 401 = `CRON_SECRET` mal puesto.

---

## 5. Probar la PWA y las notificaciones en QA

Requisitos: HTTPS (Vercel ya lo da) y la URL final del proyecto (la PWA queda atada a su origen: instalar
QA y producción son apps distintas).

**En el computador (Chrome):**
1. Abre `https://<url-qa>/portal` → DevTools → *Application* → *Manifest*: sin errores, íconos 192/512 y
   `start_url: /portal`.
2. *Application → Service Workers*: `sw.js` en estado *activated*.
3. Ícono de instalar en la barra de direcciones → instálala; debe abrir en ventana propia en `/portal`.

**En el teléfono:**
- **Android (Chrome):** menú → *Instalar app*. Acepta el permiso de notificaciones cuando la app lo pida.
- **iPhone (iOS 16.4 o superior):** Safari → Compartir → **Añadir a pantalla de inicio**; abre **desde el
  ícono** (no desde Safari) y activa las notificaciones desde la app. En iOS el push **solo** funciona así.

**Flujo de extremo a extremo:**
1. Como administrador: crea disciplina, grupo, alumno y vincula a un tutor (enlace mágico al portal).
2. El tutor entra al portal, instala la PWA y activa notificaciones.
3. El administrador envía un comunicado → debe llegar el push al teléfono y aparecer en *Notificaciones*.
4. Pago: el tutor sube un comprobante (se guarda en el bucket privado; el staff lo ve con enlace firmado).
5. Evento: invitar, confirmar asistencia desde el portal y por el enlace de WhatsApp.
6. Rol instructor: pase de lista desde el portal.
7. Revisa en Vercel → *Logs* que no haya errores y, si lo configuraste, que lleguen eventos a Sentry.

Si el service worker «se queda pegado» tras un deploy: sube `CACHE` en `public/sw.js` (hoy `klassi-v2`) y
limpia datos del sitio en el navegador.

---

## 6. Replicar para Dev, Staging y Producción

Repite la sección 4 cambiando lo siguiente:

- **Dev:** rama `develop`; puede usar Supabase Free o Postgres local; `PLAN_TEST_MODE` solo aquí si lo necesitas.
- **Staging:** réplica de producción (mismos planes, mismos límites). Clerk: otra **aplicación** (`klassi-staging`;
  Clerk no ofrece una instancia «staging» propia). Resend con dominio verificado. Stripe en modo prueba.
- **Producción:**
  - **Supabase Pro** (backups); `db push` solo la primera vez, después cambios controlados (ver sección 8).
  - **Clerk instancia de producción:** pide un dominio propio; Clerk te dará registros DNS (CNAME) que
    agregas donde administras el dominio. Claves `pk_live_…` / `sk_live_…`. La CSP de `next.config.mjs` ya
    permite `https://clerk.klassi.io`; **si tu dominio es otro, cámbialo ahí**.
  - **Stripe en vivo** (claves, productos/precios y webhook nuevos).
  - **Dominio:** *Settings → Domains* en Vercel + registros DNS (A/CNAME) que te indique.
  - **Resend:** dominio verificado (SPF/DKIM) para que los correos no caigan en spam.
  - Si ya tienes una BD de producción en uso, **no** ejecutes `db push` contra ella sin revisar el diff
    (`prisma migrate diff`) y sin un respaldo.

---

## 7. Cómo desplegar (rutina)

```text
feature/x ──PR──► develop ──PR──► qa ──PR──► staging ──PR──► main
              (Dev)         (QA prueba)   (ensayo general)   (Producción)
```

1. Trabaja en `feature/*`; el CI (`typecheck` + ESLint) debe pasar.
2. PR a `develop` → se despliega en Dev. Revisa.
3. PR de `develop` a `qa` → se despliega en **QA**; ejecuta la sección 5.
4. Si QA está bien, PR de `qa` a `staging`; repite las pruebas con datos parecidos a producción.
5. PR de `staging` a `main` → Producción. Revisa Logs y Sentry los primeros minutos.
6. **Rollback:** Vercel → *Deployments* → el anterior → **Instant Rollback** (el código vuelve al momento; los
   cambios de base de datos **no** se revierten solos).

---

## 8. Riesgos y pendientes a resolver antes de producción

1. **Migraciones:** no hay migración inicial; los ambientes nuevos usan `db push`. Conviene una especificación
   SDD que cree una migración *baseline* para poder usar `prisma migrate deploy` de forma segura.
2. **RLS en producción:** `security_rls_deny_all` está en `main` pero no se aplica sola. Comprueba el rol de
   `DATABASE_URL` (`SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = current_user;`) antes.
3. **Next.js 14.2.35 con avisos abiertos** (`npm audit`): la solución es migrar a Next ≥ 15.5 (y Clerk).
   Especificación aparte.
4. **Anti-bots:** actívalo en el panel de Clerk (protección en el registro).
5. **QA público:** el dominio de QA/staging es público; restringe el registro en Clerk (lista de correos
   permitidos o invitación) y considera `noindex` para que no aparezca en buscadores.
6. **Nombre de la PWA por ambiente:** hoy todas se llaman «Klassi»; en un teléfono con QA y prod instaladas
   se confunden. Puede resolverse con una variable `NEXT_PUBLIC_APP_ENV` en `src/app/manifest.ts`.
7. **Límite de tasa** es por instancia (mejor esfuerzo); para uno global habría que usar Upstash/Redis.

---

## 9. Lista rápida para el día del primer deploy a QA

- [ ] Rama `qa` creada en GitHub
- [ ] Supabase `klassi-qa`: URL, service_role, pooler 6543 y directa 5432 anotadas
- [ ] `prisma db push` ejecutado + SQL de RLS aplicado
- [ ] Clerk `klassi-qa`: claves `pk_test`/`sk_test`
- [ ] Secretos generados: `CRON_SECRET`, `ATTENDANCE_TOKEN_SECRET`, par VAPID
- [ ] Resend: API key de QA
- [ ] Proyecto Vercel `klassi-qa`: Production Branch = `qa`, todas las variables (¡`NEXT_PUBLIC_APP_URL` incluida!)
- [ ] Primer deploy OK → webhook de Clerk creado → `CLERK_WEBHOOK_SECRET` en Vercel → redeploy
- [ ] Registro + onboarding + cron manual con 200
- [ ] PWA instalada en Android e iPhone, push recibido, comprobante subido

---

## 10. Fuentes de precios y documentación (verifica antes de pagar)

- Vercel: [precios](https://vercel.com/pricing), [límites y precios de cron](https://vercel.com/docs/cron-jobs/usage-and-pricing),
  [custom environments](https://vercel.com/docs/custom-environments),
  [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
- Supabase: [precios](https://supabase.com/pricing)
- Clerk: [explicación de precios](https://clerk.com/articles/clerk-pricing-explained),
  [entornos](https://clerk.com/docs/guides/development/managing-environments),
  [staging](https://clerk.com/docs/deployments/set-up-staging)
- Resend: [precios](https://resend.com/pricing)
