import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";

// Usuarios de prueba (instancia de DESARROLLO de Clerk, ver e2e/README.md):
// - staff:      ADMIN o RECEPTIONIST de una escuela de prueba
// - parent:     tutor con al menos un alumno vinculado y SIN membresía de escuela
// - instructor: rol INSTRUCTOR con al menos un grupo asignado

export const creds = {
  staff: {
    email:    process.env.E2E_STAFF_EMAIL,
    password: process.env.E2E_STAFF_PASSWORD,
  },
  parent: {
    email:    process.env.E2E_PARENT_EMAIL,
    password: process.env.E2E_PARENT_PASSWORD,
  },
  instructor: {
    email:    process.env.E2E_INSTRUCTOR_EMAIL,
    password: process.env.E2E_INSTRUCTOR_PASSWORD,
  },
} as const;

export type Role = keyof typeof creds;

export function hasCreds(role: Role): boolean {
  return Boolean(creds[role].email && process.env.CLERK_SECRET_KEY);
}

// ─── Sign-in por ticket (Backend API) ────────────────────────────
// El login con contraseña se queda en `needs_second_factor` cuando la
// instancia pide verificación de dispositivo nuevo (email_code) o el usuario
// tiene MFA. Un sign-in token del Backend API completa la sesión directo,
// sin depender del correo, así que es lo único estable para automatizar.

const ticketCache = new Map<string, string>(); // email -> userId

async function clerkApi(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Clerk API ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getSignInTicket(email: string): Promise<string> {
  let userId = ticketCache.get(email);
  if (!userId) {
    const users = await clerkApi(`/users?email_address=${encodeURIComponent(email)}`);
    userId = users[0]?.id;
    if (!userId) throw new Error(`No existe usuario de Clerk con correo ${email}`);
    ticketCache.set(email, userId);
  }
  const { token } = await clerkApi("/sign_in_tokens", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 300 }),
  });
  return token;
}

/** Inicia sesión con un sign-in token (estrategia ticket, inmune a MFA). */
export async function signIn(page: Page, role: Role) {
  const { email } = creds[role];
  const ticket = await getSignInTicket(email!);
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await page.waitForFunction(() => (window as any).Clerk?.loaded, null, { timeout: 30_000 });
  await page.evaluate(async (t) => {
    const Clerk = (window as any).Clerk;
    const res = await Clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    if (res.status !== "complete") throw new Error(`Sign-in no completado: ${res.status}`);
    await Clerk.setActive({ session: res.createdSessionId });
  }, ticket);
}

export async function signOut(page: Page) {
  await clerk.signOut({ page });
}
