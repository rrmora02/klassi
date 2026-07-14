import webpush from "web-push";
import { db } from "@/server/db";

// Claves VAPID: generar una vez con `npx web-push generate-vapid-keys`
// NEXT_PUBLIC_VAPID_PUBLIC_KEY se expone al navegador para suscribirse.
const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:soporte@klassi.io";

let configured = false;

function ensureConfigured(): boolean {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  if (!configured) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body:  string;
  data?: Record<string, unknown>; // { url: "/portal/notificaciones", ... }
}

/**
 * Envía un push a todos los dispositivos suscritos de un usuario.
 * Las suscripciones caducadas (404/410 del push service) se eliminan.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) {
    return { sent: 0, failed: 0, skipped: true as const };
  }

  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return { sent: 0, failed: 0, skipped: false as const };

  let sent = 0;
  let failed = 0;

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
      sent++;
      await db.pushSubscription.update({
        where: { id: sub.id },
        data:  { lastUsedAt: new Date() },
      }).catch(() => {});
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // El navegador revocó la suscripción — purgarla
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        failed++;
      }
    }
  }));

  return { sent, failed, skipped: false as const };
}
