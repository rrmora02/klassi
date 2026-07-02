# Klassi Connect — Análisis de arquitectura: PWA de mensajería y notificaciones

> **Objetivo:** sustituir WhatsApp como canal de comunicación entre la escuela (staff) y los
> padres/alumnos, mediante una PWA instalable en el teléfono, integrada con el SaaS Klassi,
> con una API REST pública que permita a otros sistemas integrarse en el futuro.

**Estado:** propuesta de arquitectura (v1) · **Fecha:** 2026-07-02

---

## 1. Contexto: qué existe hoy en Klassi

| Pieza | Estado actual | Relevancia para este proyecto |
|---|---|---|
| Framework | Next.js 14 App Router, desplegado en Vercel (`vercel.json` con crons) | La PWA puede vivir en el mismo monolito |
| API interna | tRPC 10 (`src/server/api`) con `tenantProcedure` multi-tenant | Se reutiliza para la UI; la API pública será REST aparte |
| Base de datos | PostgreSQL en Supabase vía Prisma 5 | Supabase también aporta **Realtime** y **Storage** (adjuntos) |
| Auth | Clerk, con rol `PARENT` ya definido en `UserRole` | Los padres ya tienen un modelo de identidad (`User` + `ParentStudent`) |
| Email | Resend (`src/server/services/email.service.ts`) | Se convierte en un *canal* más del despachador de notificaciones |
| Comunicados | Modelo `Announcement` + router `announcements` — **solo marca `sentAt`, no entrega nada** | Es el primer caso de uso a conectar al nuevo sistema de entrega |
| Redis | Cliente `redis` en dependencias | Útil para rate-limiting y caché de la API pública |
| Multitenancy | `tenantId` en todas las tablas, slug por escuela | Toda la mensajería hereda este aislamiento |

**Conclusión clave:** no hay que construir desde cero — hay que añadir una *capa de entrega*
(canales push/email/in-app), una *capa de conversación* (chat), y una *capa de exposición*
(API REST pública), todas montadas sobre la infraestructura multi-tenant existente.

---

## 2. Visión general de la solución

```mermaid
flowchart TB
    subgraph Clientes
        PWA["PWA Padres/Alumnos<br/>(instalable, offline-ready)"]
        DASH["Dashboard Escuela<br/>(ya existe)"]
        EXT["Sistemas externos<br/>(otros SaaS, ERPs, bots)"]
    end

    subgraph "Klassi (Next.js en Vercel)"
        TRPC["tRPC<br/>(UI interna)"]
        REST["API REST pública<br/>/api/v1 (API Keys)"]
        CORE["Núcleo de mensajería<br/>Conversaciones · Notificaciones · Preferencias"]
        DISPATCH["Despachador multicanal<br/>(outbox + reintentos)"]
    end

    subgraph Canales
        PUSH["Web Push<br/>(VAPID)"]
        MAIL["Email<br/>(Resend)"]
        INAPP["In-app / Realtime<br/>(Supabase Realtime)"]
        FUT["Futuros: SMS,<br/>WhatsApp Business API"]
    end

    DB[("PostgreSQL<br/>Supabase")]
    HOOKS["Webhooks salientes<br/>(HMAC firmado)"]

    PWA --> TRPC
    DASH --> TRPC
    EXT --> REST
    TRPC --> CORE
    REST --> CORE
    CORE --> DB
    CORE --> DISPATCH
    DISPATCH --> PUSH & MAIL & INAPP & FUT
    CORE --> HOOKS --> EXT
```

Tres principios de diseño:

1. **Canal-agnóstico:** el dominio genera *eventos de notificación*; el despachador decide por
   qué canales entregarlos (push, email, in-app, y mañana SMS o incluso WhatsApp Business API).
   Sustituir WhatsApp no significa cerrar la puerta a otros canales.
2. **API-first:** todo lo que hace la UI de mensajería pasa por el mismo núcleo que expone la
   API REST pública. Los sistemas externos son ciudadanos de primera clase, no un añadido.
3. **Multi-tenant desde el día 1:** cada conversación, mensaje, suscripción push, API key y
   webhook pertenece a un `tenantId`. El aislamiento es idéntico al del resto de Klassi.

---

## 3. La PWA: decisiones y tecnologías

### 3.1 ¿PWA en el mismo proyecto o app separada?

**Recomendación: mismo monolito Next.js, route group propio** (p. ej. `src/app/(portal)/portal/...`).

- Reutiliza Clerk, tRPC, Prisma, diseño y despliegue en Vercel — cero infraestructura nueva.
- Un solo `manifest.json` con `start_url: /portal` hace que lo instalado en el teléfono sea
  directamente el portal de padres, no el dashboard.
- Si algún día se quiere separar (app nativa con Capacitor, subdominio `app.klassi.io`), la API
  REST pública ya existirá como frontera limpia.

### 3.2 Stack técnico de la PWA

| Necesidad | Tecnología recomendada | Por qué |
|---|---|---|
| Service Worker + precaché | **Serwist** (`@serwist/next`) | Sucesor mantenido de `next-pwa`, integración de primera clase con App Router de Next.js 14 |
| Manifest / instalabilidad | Manifest nativo de Next (`app/manifest.ts`) | Soporte built-in, tipado, sin dependencias |
| Push en el navegador | **Web Push API + VAPID** con la librería `web-push` en el servidor | Estándar W3C, **gratuito**, sin cuenta de Firebase; funciona en Chrome/Edge/Firefox/Safari |
| UI reactiva / estado | React Query (ya presente vía tRPC) | Ya está en el stack |
| Tiempo real (chat) | **Supabase Realtime** (Postgres Changes / Broadcast) | Ya pagan Supabase; evita un vendor extra (Pusher/Ably) |
| Offline | Serwist: `NetworkFirst` para datos, `CacheFirst` para estáticos + cola de mensajes salientes en IndexedDB (Background Sync donde exista) | La PWA debe abrir y mostrar lo último aunque no haya red |

### 3.3 Realidad de las notificaciones push por plataforma (importante)

| Plataforma | Soporte Web Push | Condición |
|---|---|---|
| Android (Chrome, Samsung, Firefox) | ✅ Completo | Funciona incluso sin instalar la PWA |
| iOS / iPadOS ≥ 16.4 (Safari) | ✅ | **Solo si el usuario instala la PWA en la pantalla de inicio** ("Compartir → Añadir a pantalla de inicio") |
| Escritorio (Chrome/Edge/Firefox/Safari) | ✅ | Normal |

Implicaciones de producto:

- El **onboarding de la PWA debe guiar activamente la instalación en iOS** (detectar
  `navigator.standalone` / `display-mode: standalone` y mostrar instrucciones si no está instalada).
  En Android usar el evento `beforeinstallprompt` para un botón "Instalar app".
- El **email queda como canal de respaldo garantizado**: si un padre no otorga permiso de push
  (o su navegador no lo soporta), el despachador degrada a email automáticamente.
- No se necesita FCM/Firebase para la web: `web-push` + VAPID habla directamente con los push
  services de Google/Apple/Mozilla. FCM solo sería necesario si más adelante se empaqueta una
  app nativa (Capacitor) — el diseño del despachador lo deja previsto (campo `channel`).

---

## 4. Modelo de dominio (nuevas tablas Prisma)

Dos subsistemas: **Conversaciones** (chat bidireccional escuela ↔ familia) y
**Notificaciones** (unidireccional: avisos, recordatorios de pago, asistencia, comunicados).

```prisma
// ─── Mensajería (chat) ───────────────────────────────────────────

enum ConversationType {
  DIRECT      // escuela ↔ familia (sobre un alumno)
  GROUP       // grupo/clase (ej. "Fútbol Infantil B")
  BROADCAST   // solo-lectura: comunicados de la escuela
}

model Conversation {
  id         String            @id @default(cuid())
  tenantId   String
  type       ConversationType  @default(DIRECT)
  title      String?           // para GROUP/BROADCAST
  studentId  String?           // ancla DIRECT a un alumno
  groupId    String?           // ancla GROUP a un Group existente
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
  lastMessageAt DateTime?

  participants ConversationParticipant[]
  messages     Message[]

  @@index([tenantId, lastMessageAt])
  @@index([tenantId, studentId])
}

model ConversationParticipant {
  id             String   @id @default(cuid())
  conversationId String
  userId         String
  role           String   @default("MEMBER") // MEMBER | ADMIN | READONLY
  lastReadAt     DateTime?
  muted          Boolean  @default(false)
  joinedAt       DateTime @default(now())

  @@unique([conversationId, userId])
  @@index([userId])
}

model Message {
  id             String    @id @default(cuid())
  conversationId String
  senderId       String?   // null = mensaje de sistema
  body           String
  attachments    Json      @default("[]") // [{url, name, mime, size}] en Supabase Storage
  externalRef    String?   // id idempotente para integraciones (API pública)
  createdAt      DateTime  @default(now())
  editedAt       DateTime?
  deletedAt      DateTime? // borrado suave

  @@index([conversationId, createdAt])
}

// ─── Notificaciones (outbox multicanal) ─────────────────────────

enum NotificationChannel { PUSH EMAIL IN_APP } // futuro: SMS, WHATSAPP
enum DeliveryStatus { PENDING SENT DELIVERED FAILED SKIPPED }

model Notification {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String            // destinatario
  type      String            // "announcement" | "payment.reminder" | "message.new" | "attendance.absent" ...
  title     String
  body      String
  data      Json     @default("{}") // deep-link: {url, conversationId, paymentId...}
  readAt    DateTime?
  createdAt DateTime @default(now())

  deliveries NotificationDelivery[]

  @@index([userId, readAt])
  @@index([tenantId, createdAt])
}

model NotificationDelivery {
  id             String              @id @default(cuid())
  notificationId String
  channel        NotificationChannel
  status         DeliveryStatus      @default(PENDING)
  attempts       Int                 @default(0)
  lastError      String?
  sentAt         DateTime?

  @@index([status])          // el worker consume PENDING/FAILED
  @@index([notificationId])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  endpoint  String   @unique   // URL del push service del navegador
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())
  lastUsedAt DateTime?

  @@index([userId])
}

model NotificationPreference {
  id       String  @id @default(cuid())
  userId   String
  tenantId String
  type     String            // mismo vocabulario que Notification.type, o "*"
  channel  NotificationChannel
  enabled  Boolean @default(true)

  @@unique([userId, tenantId, type, channel])
}

// ─── Plataforma de integración (API pública) ────────────────────

model ApiKey {
  id         String    @id @default(cuid())
  tenantId   String
  name       String              // "Integración ERP contable"
  keyHash    String    @unique   // SHA-256; el secreto solo se muestra al crearla
  prefix     String              // "klassi_pk_Ab3d" visible para identificarla
  scopes     Json      @default("[]") // ["messages:write","notifications:send","students:read"]
  lastUsedAt DateTime?
  expiresAt  DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  @@index([tenantId])
}

model WebhookEndpoint {
  id        String   @id @default(cuid())
  tenantId  String
  url       String
  secret    String            // para firma HMAC-SHA256
  events    Json     @default("[]") // ["message.created","payment.paid", ...]
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  deliveries WebhookDelivery[]

  @@index([tenantId])
}

model WebhookDelivery {
  id         String   @id @default(cuid())
  endpointId String
  event      String
  payload    Json
  status     Int?              // HTTP status de respuesta
  attempts   Int      @default(0)
  nextRetryAt DateTime?
  createdAt  DateTime @default(now())

  @@index([endpointId, createdAt])
  @@index([nextRetryAt])
}
```

Notas de diseño:

- **`Announcement` no se elimina**: `announcements.send` pasa a crear una `Conversation`
  tipo `BROADCAST` (opcional) y sobre todo a generar `Notification` + `NotificationDelivery`
  por destinatario. Hoy ese endpoint solo marca `sentAt` — este es el primer hueco a cerrar.
- **Outbox pattern**: crear el mensaje/notificación y sus filas de entrega es una única
  transacción en Postgres; la entrega física ocurre después, con reintentos. Nada se pierde si
  falla el push service.
- **`externalRef` en `Message`** da idempotencia a las integraciones (un ERP que reintenta un
  POST no duplica el mensaje).

---

## 5. Despachador multicanal (el corazón del sistema)

```
Evento de dominio ──► NotificationService.notify()
   (comunicado,           │ 1. resuelve destinatarios (targetGroups → enrollments → parents)
    pago vencido,         │ 2. aplica NotificationPreference de cada usuario
    mensaje nuevo,        │ 3. crea Notification + NotificationDelivery (transacción única)
    falta de asistencia)  ▼
                    Cola de entrega
                          │  worker consume PENDING
                          ├─► PUSH  → web-push (VAPID) → si 404/410: borrar PushSubscription
                          ├─► EMAIL → Resend (servicio existente)
                          └─► IN_APP→ insert ya visible + Supabase Realtime lo empuja al cliente
```

### 5.1 ¿Qué usar como cola en Vercel (serverless)?

BullMQ no encaja bien en serverless (necesita workers de larga vida). Opciones reales:

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **Upstash QStash** | HTTP-nativo, reintentos/backoff incluidos, DLQ, encaja perfecto con Vercel; ya usan Upstash-style Redis | Vendor adicional (barato) | ✅ **Recomendado** |
| Vercel Cron + tabla outbox | Cero vendors nuevos: un cron cada minuto procesa `NotificationDelivery PENDING` (patrón ya usado en `api/cron/*`) | Latencia de hasta 1 min; lotes limitados por timeout de función | ✅ **Plan B perfectamente válido para el MVP** |
| Inngest / Trigger.dev | DX excelente, pasos duraderos | Otro vendor, más superficie | Solo si crecen los flujos |
| Supabase Queues (pgmq) + pg_cron | Todo dentro de Supabase | Workers = Edge Functions (otro runtime a mantener) | Alternativa razonable |

**Recomendación:** empezar con **cron + outbox** (patrón que el equipo ya domina) y migrar el
disparo a **QStash** cuando la latencia de 1 minuto sea insuficiente (p. ej. para chat, donde
la notificación push debe salir en segundos, se puede invocar el worker inline tras el POST y
dejar el cron como red de seguridad).

### 5.2 Tiempo real del chat

**Supabase Realtime (Broadcast)**: al insertar un `Message`, el servidor publica en el canal
`tenant:{tenantId}:conversation:{id}`. La PWA suscrita lo pinta al instante; si la app está
cerrada, la `NotificationDelivery` PUSH despierta al usuario. Autorización mediante RLS o
tokens de canal firmados — nunca exponer el `service_role` al cliente.

Alternativas (Pusher, Ably) solo si Supabase Realtime diera problemas de escala; a miles de
conexiones concurrentes por escuela no se llegará pronto.

---

## 6. API REST pública (`/api/v1`) — Klassi como plataforma

### 6.1 Principios

- **Versionada por URL** (`/api/v1/...`), JSON, errores con formato consistente
  (`{ "error": { "code", "message" } }`).
- **Autenticación por API Key** (`Authorization: Bearer klassi_sk_...`), una o varias por tenant,
  con **scopes** granulares y revocables. La key se guarda hasheada (SHA-256); solo se muestra
  completa al crearla. El tenant se deriva de la key — imposible cruzar tenants.
- **Rate limiting** por key con Redis existente (`@upstash/ratelimit` o equivalente) +
  cabeceras `X-RateLimit-*`.
- **Idempotencia**: cabecera `Idempotency-Key` en los POST de envío (mapea a `externalRef`).
- **OpenAPI 3.1** publicado en `/api/v1/openapi.json` + docs navegables. Opciones:
  - `zod-openapi` / `@asteasolutions/zod-to-openapi` reutilizando los schemas Zod existentes ✅
  - `trpc-openapi` para exponer routers tRPC como REST (atajo válido, menos control del contrato)

### 6.2 Superficie mínima v1

```
# Notificaciones (el caso de uso estrella para integradores)
POST   /api/v1/notifications            # enviar a userId(s), studentId(s) o groupId(s)
GET    /api/v1/notifications/{id}       # estado de entrega por canal

# Mensajería
GET    /api/v1/conversations
POST   /api/v1/conversations            # crear/obtener conversación (p.ej. DIRECT por studentId)
GET    /api/v1/conversations/{id}/messages
POST   /api/v1/conversations/{id}/messages

# Directorio (solo-lectura para integraciones)
GET    /api/v1/students · /api/v1/groups · /api/v1/payments

# Plataforma
GET/POST/DELETE /api/v1/webhooks        # gestión de endpoints salientes
```

### 6.3 Webhooks salientes (la otra mitad de "que otro sistema se integre")

- Eventos: `message.created`, `notification.delivered`, `payment.paid`, `attendance.recorded`,
  `student.enrolled`, …
- Firma **HMAC-SHA256** en cabecera (`Klassi-Signature: t=...,v1=...`, estilo Stripe — el equipo
  ya consume webhooks de Stripe y Clerk, el patrón es familiar).
- Reintentos con backoff exponencial (mismo worker/cron del despachador) y registro en
  `WebhookDelivery` para debugging del integrador.

Con **API Keys + REST versionado + webhooks firmados**, cualquier sistema externo puede tanto
*empujar* mensajes hacia las familias como *reaccionar* a lo que ocurre en Klassi. Ese es el
contrato de plataforma SaaS que se pide.

---

## 7. Seguridad y multi-tenant

- **Padres/alumnos**: Clerk (rol `PARENT` ya existe). Un padre solo ve conversaciones donde es
  `ConversationParticipant`, y estas siempre están ancladas a sus hijos vía `ParentStudent`.
  El acceso actual por token (`/alumno/[token]`) puede convivir, pero el chat exige sesión real.
- **Staff**: mismos roles actuales (`ADMIN`, `RECEPTIONIST`, `INSTRUCTOR`); un instructor solo
  accede a conversaciones de sus grupos.
- **API pública**: scopes por key, rate limit, key hasheada, rotación y revocación desde el
  dashboard (`/dashboard/configuracion/integraciones`).
- **Push**: las claves VAPID (par público/privado) van en variables de entorno; las
  suscripciones caducadas (HTTP 404/410 del push service) se purgan automáticamente.
- **Contenido**: adjuntos en Supabase Storage con URLs firmadas de corta vida, bucket por tenant.
- **Privacidad**: borrado suave de mensajes, retención configurable por tenant (requisito
  frecuente al tratar datos de menores).

---

## 8. Plan de implementación por fases

| Fase | Alcance | Entregable verificable |
|---|---|---|
| **1. PWA base** (1ª iteración) | `manifest.ts` + Serwist + route group `(portal)` con login Clerk para padres, vista de comunicados e historial de pagos del alumno | La app se instala en Android/iOS y abre el portal |
| **2. Push + centro de notificaciones** | Tablas `Notification*` y `PushSubscription`, claves VAPID, opt-in de permiso, campana in-app, preferencias | Un comunicado dispara push real al teléfono con fallback a email |
| **3. Comunicados conectados** | `announcements.send` → despachador (fan-out a padres por `targetGroups`), recordatorios de pago del cron `generate-payments` → push | El flujo existente deja de ser "solo `sentAt`" |
| **4. Chat** | Tablas `Conversation*`/`Message`, UI de chat en PWA y dashboard, Supabase Realtime, adjuntos | Escuela y padre conversan en tiempo real; push si la app está cerrada |
| **5. Plataforma** | `/api/v1` + API Keys + scopes + rate limit + OpenAPI + webhooks salientes | Un sistema externo envía una notificación con `curl` y recibe webhooks firmados |

Las fases 1–3 sustituyen el 80 % del uso real de WhatsApp (avisos y recordatorios) sin
necesidad de chat; conviene lanzar eso primero y medir la adopción de instalación/permiso de
push antes de invertir en la fase 4.

---

## 9. Resumen de decisiones tecnológicas

| Área | Decisión | Alternativa descartada y por qué |
|---|---|---|
| Arquitectura app | Mismo monolito Next.js, route group `(portal)` | App separada: duplica auth/deploy sin beneficio actual |
| Service worker | Serwist | `next-pwa` (sin mantenimiento activo), SW manual (más error-prone) |
| Push | Web Push estándar + VAPID (`web-push`) | FCM: innecesario para web, añade Firebase; se reconsidera solo si hay app nativa |
| Tiempo real | Supabase Realtime | Pusher/Ably: vendor y coste extra sin necesidad de escala hoy |
| Cola de entrega | Cron + outbox en Postgres (MVP) → QStash al necesitar latencia baja | BullMQ: requiere workers persistentes, incompatible con Vercel serverless |
| Email | Resend (existente) como canal de fallback | — |
| API pública | REST `/api/v1` + Zod→OpenAPI + API Keys con scopes | GraphQL: peor DX para integradores pequeños; exponer tRPC: acopla el contrato interno |
| Webhooks | HMAC-SHA256 estilo Stripe con reintentos | Polling: traslada el coste al integrador |
