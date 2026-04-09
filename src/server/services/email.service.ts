import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM_EMAIL ?? "noreply@klassi.io";
const APP    = process.env.NEXT_PUBLIC_APP_URL ?? "https://klassi.io";

async function send(opts: { to: string | string[]; subject: string; html: string }) {
  return resend.emails.send({ from: FROM, ...opts });
}

export async function sendWelcomeEmail(to: string, schoolName: string) {
  return send({
    to,
    subject: `Bienvenido a Klassi, ${schoolName}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">Bienvenido a Klassi</h2>
      <p>Tu escuela <strong>${schoolName}</strong> está lista. Tienes <strong>14 días de prueba gratuita</strong>.</p>
      <a href="${APP}/dashboard" style="background:#1D3557;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Ir al dashboard</a>
    </div>`,
  });
}

export async function sendTrialExpiredEmail(to: string, schoolName: string, expired: boolean) {
  const subject = expired ? "Tu período de prueba en Klassi ha terminado" : "Tu período de prueba termina mañana";
  const body    = expired
    ? `El trial de <strong>${schoolName}</strong> ha terminado. Tu acceso está suspendido.`
    : `El trial de <strong>${schoolName}</strong> termina mañana.`;
  return send({
    to, subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1D3557;">${subject}</h2>
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
      <p>Pago pendiente en <strong>${opts.schoolName}</strong> para <strong>${opts.studentName}</strong>.</p>
      <p><strong>${opts.concept}</strong> · ${opts.amount} · vence ${opts.dueDate}</p>
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
      <h2 style="color:#1D3557;">${opts.subject}</h2>
      <p>${opts.body.replace(/\n/g, "<br>")}</p>
      <p style="font-size:12px;color:#999;margin-top:32px;">${opts.schoolName} · Klassi</p>
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
      <h2 style="color:#1D3557;">Hola${opts.parentName ? `, ${opts.parentName}` : ""}!</h2>
      <p><strong>${opts.schoolName}</strong> te invita al portal de Klassi para seguir el progreso de <strong>${opts.studentName}</strong>.</p>
      <a href="${opts.inviteUrl}" style="background:#1D3557;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Aceptar invitación</a>
      <p style="font-size:12px;color:#999;margin-top:16px;">Este enlace expira en 7 días.</p>
    </div>`,
  });
}
