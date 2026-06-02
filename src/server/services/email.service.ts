import { Resend } from "resend";
import { escapeHtml } from "@/server/utils/escapeHtml";

let resend: Resend | null = null;

try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch (error) {
  console.warn("[EMAIL] Failed to initialize Resend:", error);
  resend = null;
}

const FROM   = process.env.RESEND_FROM_EMAIL ?? "noreply@klassi.io";
const APP    = process.env.NEXT_PUBLIC_APP_URL ?? "https://klassi.io";

async function send(opts: { to: string | string[]; subject: string; html: string }) {
  if (!resend) {
    console.log(`[EMAIL-DEV] To: ${Array.isArray(opts.to) ? opts.to.join(", ") : opts.to}`);
    console.log(`[EMAIL-DEV] Subject: ${opts.subject}`);
    console.log(`[EMAIL-DEV] Body: ${opts.html.substring(0, 200)}...`);
    return { id: "dev-" + Math.random().toString(36).substring(7) };
  }

  return resend.emails.send({ from: FROM, ...opts });
}

export async function sendWelcomeEmail(to: string, schoolName: string) {
  const name = escapeHtml(schoolName);
  return send({
    to,
    subject: `Bienvenido a Klassi, ${schoolName}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">Bienvenido a Klassi</h2>
      <p>Tu escuela <strong>${name}</strong> está lista. Tienes <strong>14 días de prueba gratuita</strong>.</p>
      <a href="${APP}/dashboard" style="background:#1D3557;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Ir al dashboard</a>
    </div>`,
  });
}

export async function sendTrialExpiredEmail(to: string, schoolName: string, expired: boolean) {
  const name    = escapeHtml(schoolName);
  const subject = expired ? "Tu período de prueba en Klassi ha terminado" : "Tu período de prueba termina mañana";
  const body    = expired
    ? `El trial de <strong>${name}</strong> ha terminado. Tu acceso está suspendido.`
    : `El trial de <strong>${name}</strong> termina mañana.`;
  return send({
    to, subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">${escapeHtml(subject)}</h2>
      <p>${body}</p>
      <a href="${APP}/precios" style="background:#1D3557;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Ver planes</a>
    </div>`,
  });
}

export async function sendPaymentReminder(opts: {
  to: string; studentName: string; concept: string; amount: string; dueDate: string; schoolName: string;
}) {
  return send({
    to: opts.to,
    subject: `Recordatorio de pago — ${opts.schoolName}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">Recordatorio de pago</h2>
      <p>Pago pendiente en <strong>${escapeHtml(opts.schoolName)}</strong> para <strong>${escapeHtml(opts.studentName)}</strong>.</p>
      <p><strong>${escapeHtml(opts.concept)}</strong> · ${escapeHtml(opts.amount)} · vence ${escapeHtml(opts.dueDate)}</p>
    </div>`,
  });
}

export async function sendAnnouncement(opts: {
  to: string[]; subject: string; body: string; schoolName: string;
}) {
  return send({
    to: opts.to,
    subject: `${opts.schoolName} — ${opts.subject}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">${escapeHtml(opts.subject)}</h2>
      <p>${escapeHtml(opts.body).replace(/\n/g, "<br>")}</p>
      <p style="font-size:12px;color:#999;margin-top:32px;">${escapeHtml(opts.schoolName)} · Klassi</p>
    </div>`,
  });
}

export async function sendParentInvitation(opts: {
  to: string; parentName: string; studentName: string; schoolName: string; inviteUrl: string;
}) {
  return send({
    to: opts.to,
    subject: `Invitación al portal de ${opts.schoolName}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">Hola${opts.parentName ? `, ${escapeHtml(opts.parentName)}` : ""}!</h2>
      <p><strong>${escapeHtml(opts.schoolName)}</strong> te invita al portal de Klassi para seguir el progreso de <strong>${escapeHtml(opts.studentName)}</strong>.</p>
      <a href="${escapeHtml(opts.inviteUrl)}" style="background:#1D3557;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Aceptar invitación</a>
      <p style="font-size:12px;color:#999;margin-top:16px;">Este enlace expira en 7 días.</p>
    </div>`,
  });
}

export async function sendInstructorInvitation(opts: {
  to: string; instructorName: string; schoolName: string; inviteUrl: string;
}) {
  return send({
    to: opts.to,
    subject: `Invitación como instructor en ${opts.schoolName}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">¡Bienvenido, ${escapeHtml(opts.instructorName)}!</h2>
      <p>Has sido invitado como instructor en <strong>${escapeHtml(opts.schoolName)}</strong> en Klassi.</p>
      <p>Haz clic en el botón de abajo para crear tu cuenta y acceder al sistema.</p>
      <a href="${escapeHtml(opts.inviteUrl)}" style="background:#1D3557;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Aceptar invitación y crear cuenta</a>
      <p style="font-size:12px;color:#999;margin-top:16px;">Este enlace expira en 30 días.</p>
    </div>`,
  });
}

// ── Emails de billing/suscripción ────────────────────────────────────────────

export async function sendTrialEndingEmail(
  to: string,
  opts: { schoolName: string; daysLeft: number; billingUrl: string }
) {
  const name = escapeHtml(opts.schoolName);
  const url  = escapeHtml(opts.billingUrl);
  return send({
    to,
    subject: `Tu prueba de Klassi termina en ${opts.daysLeft} día${opts.daysLeft === 1 ? "" : "s"}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">Tu prueba gratuita está por terminar</h2>
      <p>La prueba de <strong>${name}</strong> vence en <strong>${opts.daysLeft} día${opts.daysLeft === 1 ? "" : "s"}</strong>.</p>
      <p>Elige un plan para seguir usando Klassi sin interrupciones.</p>
      <a href="${url}" style="background:#1D3557;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Ver planes y suscribirme</a>
      <p style="font-size:12px;color:#999;margin-top:32px;">Klassi · Gestión de academias deportivas</p>
    </div>`,
  });
}

export async function sendSubscriptionUpdatedEmail(
  to: string,
  opts: { schoolName: string; newPlan: string; billingUrl: string }
) {
  const name = escapeHtml(opts.schoolName);
  const plan = escapeHtml(opts.newPlan);
  const url  = escapeHtml(opts.billingUrl);
  return send({
    to,
    subject: `Tu suscripción de Klassi fue actualizada a ${opts.newPlan}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">Suscripción actualizada</h2>
      <p>La suscripción de <strong>${name}</strong> fue cambiada al plan <strong>${plan}</strong>.</p>
      <a href="${url}" style="background:#1D3557;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Ver mi suscripción</a>
      <p style="font-size:12px;color:#999;margin-top:32px;">Klassi · Si no reconoces este cambio, contáctanos.</p>
    </div>`,
  });
}

export async function sendPaymentFailedEmail(
  to: string,
  opts: { schoolName: string; billingUrl: string }
) {
  const name = escapeHtml(opts.schoolName);
  const url  = escapeHtml(opts.billingUrl);
  return send({
    to,
    subject: "Problema con el pago de tu suscripción Klassi",
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#c0392b;">No pudimos procesar tu pago</h2>
      <p>El cobro de la suscripción de <strong>${name}</strong> falló. Tu acceso estará suspendido hasta regularizar el pago.</p>
      <a href="${url}" style="background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Actualizar método de pago</a>
      <p style="font-size:12px;color:#999;margin-top:32px;">Klassi · Gestión de academias deportivas</p>
    </div>`,
  });
}

export async function sendDowngradeScheduledEmail(
  to: string,
  opts: { schoolName: string; newPlan: string; effectiveDate: string; billingUrl: string }
) {
  const name = escapeHtml(opts.schoolName);
  const plan = escapeHtml(opts.newPlan);
  const date = escapeHtml(opts.effectiveDate);
  const url  = escapeHtml(opts.billingUrl);
  return send({
    to,
    subject: `Tu plan de Klassi cambiará a ${opts.newPlan} el ${opts.effectiveDate}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">Cambio de plan programado</h2>
      <p>La cuenta <strong>${name}</strong> cambiará al plan <strong>${plan}</strong> el <strong>${date}</strong>.</p>
      <p>Si tienes datos que excedan los límites del nuevo plan (alumnos, grupos, instructores), tendrás <strong>7 días de gracia</strong> para organizarlos antes de que se suspendan.</p>
      <a href="${url}" style="background:#1D3557;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Ver mi suscripción</a>
      <p style="font-size:12px;color:#999;margin-top:32px;">Klassi · ¿Cambiaste de opinión? Puedes cancelar el cambio desde tu portal de suscripción.</p>
    </div>`,
  });
}
