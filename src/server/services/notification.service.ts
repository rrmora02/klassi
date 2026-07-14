import { db } from "@/server/db";
import { sendPushToUser } from "@/server/services/push.service";
import { sendAnnouncement } from "@/server/services/email.service";
import type { NotificationChannel } from "@prisma/client";

// ─── Creación (outbox) ────────────────────────────────────────────
// Notification + NotificationDelivery se crean en una transacción;
// la entrega física ocurre después (inline o vía cron) con reintentos.
// Ver docs/arquitectura-pwa-notificaciones.md §7

export interface NotifyInput {
  tenantId: string;
  userIds:  string[];
  type:     string; // "announcement" | "payment.reminder" | ...
  title:    string;
  body:     string;
  data?:    Record<string, unknown>;
}

export async function createNotifications(input: NotifyInput) {
  const userIds = Array.from(new Set(input.userIds));
  if (userIds.length === 0) return { created: 0 };

  const [users, prefs] = await Promise.all([
    db.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, email: true, pushSubscriptions: { select: { id: true }, take: 1 } },
    }),
    db.notificationPreference.findMany({
      where: {
        userId:   { in: userIds },
        tenantId: input.tenantId,
        type:     { in: [input.type, "*"] },
        enabled:  false,
      },
    }),
  ]);

  const optedOut = (userId: string, channel: NotificationChannel) =>
    prefs.some(p => p.userId === userId && p.channel === channel);

  await db.$transaction(users.map(user => {
    const channels: { channel: NotificationChannel; status: "PENDING" | "SKIPPED" }[] = [
      { channel: "IN_APP", status: "PENDING" },
      // Sin suscripción push o sin email, el canal queda SKIPPED (visible para debugging)
      { channel: "PUSH",  status: user.pushSubscriptions.length > 0 && !optedOut(user.id, "PUSH")  ? "PENDING" : "SKIPPED" },
      { channel: "EMAIL", status: user.email && !optedOut(user.id, "EMAIL") ? "PENDING" : "SKIPPED" },
    ];

    return db.notification.create({
      data: {
        tenantId: input.tenantId,
        userId:   user.id,
        type:     input.type,
        title:    input.title,
        body:     input.body,
        data:     (input.data ?? {}) as object,
        deliveries: { create: channels },
      },
    });
  }));

  return { created: users.length };
}

// ─── Despacho ─────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;

export async function dispatchPendingDeliveries(limit = 200) {
  const deliveries = await db.notificationDelivery.findMany({
    where: {
      OR: [
        { status: "PENDING" },
        { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } },
      ],
    },
    take:    limit,
    include: { notification: { include: { user: { select: { id: true, email: true } } } } },
  });
  if (deliveries.length === 0) return { processed: 0, sent: 0, failed: 0 };

  // Nombre de escuela para el remitente del email
  const tenantIds = Array.from(new Set(deliveries.map(d => d.notification.tenantId)));
  const tenants   = await db.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } });
  const tenantName = new Map(tenants.map(t => [t.id, t.name]));

  let sent = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    const { notification } = delivery;
    try {
      if (delivery.channel === "IN_APP") {
        // La fila Notification ya es visible en el centro de notificaciones
      } else if (delivery.channel === "PUSH") {
        const url = (notification.data as { url?: string })?.url ?? "/portal/notificaciones";
        const result = await sendPushToUser(notification.userId, {
          title: notification.title,
          body:  notification.body,
          data:  { url, notificationId: notification.id },
        });
        if (result.sent === 0 && (result.failed > 0 || result.skipped)) {
          throw new Error(result.skipped ? "VAPID no configurado" : "Todos los envíos push fallaron");
        }
      } else if (delivery.channel === "EMAIL") {
        if (!notification.user.email) throw new Error("Usuario sin email");
        await sendAnnouncement({
          to:         [notification.user.email],
          subject:    notification.title,
          body:       notification.body,
          schoolName: tenantName.get(notification.tenantId) ?? "Klassi",
        });
      }

      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data:  { status: "SENT", sentAt: new Date(), attempts: delivery.attempts + 1, lastError: null },
      });
      sent++;
    } catch (err) {
      failed++;
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status:    "FAILED",
          attempts:  delivery.attempts + 1,
          lastError: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
        },
      }).catch(() => {});
    }
  }

  return { processed: deliveries.length, sent, failed };
}

// ─── Resolución de destinatarios de comunicados ──────────────────
// targetGroups admite groupIds y entradas "student:<id>" (alumno específico)

export async function resolveAnnouncementRecipients(
  tenantId:  string,
  targetAll: boolean,
  targets:   string[],
): Promise<string[]> {
  let studentIds: string[];

  if (targetAll) {
    const students = await db.student.findMany({
      where:  { tenantId, status: "ACTIVE" },
      select: { id: true },
    });
    studentIds = students.map(s => s.id);
  } else {
    const explicitStudents = targets.filter(t => t.startsWith("student:")).map(t => t.slice("student:".length));
    const groupIds         = targets.filter(t => !t.startsWith("student:"));

    const enrollments = groupIds.length > 0
      ? await db.enrollment.findMany({
          where:  { status: "ACTIVE", group: { id: { in: groupIds }, tenantId } },
          select: { studentId: true },
        })
      : [];

    studentIds = Array.from(new Set([...explicitStudents, ...enrollments.map(e => e.studentId)]));
  }

  if (studentIds.length === 0) return [];

  const parents = await db.parentStudent.findMany({
    where:  { studentId: { in: studentIds }, student: { tenantId } },
    select: { userId: true },
  });

  return Array.from(new Set(parents.map(p => p.userId)));
}
