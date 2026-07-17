import { db } from "@/server/db";

// Acceso de tutores al portal de familias.
// El alta del alumno crea el User local con clerkId "pending_...";
// aquí se le da cuenta real en Clerk (sin contraseña) y se generan
// enlaces mágicos de un solo inicio de sesión (sign-in tokens).
// Nadie del staff conoce nunca una contraseña del tutor.

const LINK_EXPIRY_DAYS = 7;

function isPlaceholderEmail(email: string) {
  return email.endsWith("@klassi.local");
}

export function hasRealClerkAccount(clerkId: string) {
  return !clerkId.startsWith("pending_");
}

/**
 * Garantiza que el User local tenga una cuenta real en Clerk.
 * Si el correo ya existe en Clerk (p. ej. el tutor ya usa Klassi en otra
 * escuela) se reutiliza esa cuenta; si no, se crea sin contraseña —
 * el tutor entra por enlace mágico y decide después si crea una.
 */
export async function ensureParentClerkAccount(localUserId: string) {
  const user = await db.user.findUnique({ where: { id: localUserId } });
  if (!user) throw new Error("Usuario no encontrado");
  if (hasRealClerkAccount(user.clerkId)) return user;
  if (isPlaceholderEmail(user.email)) {
    throw new Error("El tutor no tiene correo registrado. Agrega su correo en la ficha del alumno para generar el acceso.");
  }

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();

  const existing = await client.users.getUserList({ emailAddress: [user.email] });
  const existingList = Array.isArray(existing) ? existing : existing.data;
  let clerkUser = existingList?.[0];

  if (!clerkUser) {
    const [firstName, ...rest] = user.name.split(" ");
    clerkUser = await client.users.createUser({
      emailAddress:            [user.email],
      firstName:               firstName || user.name,
      lastName:                rest.join(" ") || undefined,
      skipPasswordRequirement: true,
    });
  }

  // Si el webhook user.created llegó primero y ya reclamó este clerkId
  // en otra fila local, consolidar en la fila del tutor (tiene los vínculos).
  const claimed = await db.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (claimed && claimed.id !== user.id) {
    await db.user.delete({ where: { id: claimed.id } });
  }

  return db.user.update({
    where: { id: user.id },
    data:  { clerkId: clerkUser.id },
  });
}

/**
 * Genera un enlace mágico al portal: un solo uso, expira en 7 días,
 * regenerable desde la ficha del alumno cuantas veces haga falta.
 */
export async function createPortalAccessLink(localUserId: string) {
  const user = await ensureParentClerkAccount(localUserId);

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();

  const token = await client.signInTokens.createSignInToken({
    userId:           user.clerkId,
    expiresInSeconds: LINK_EXPIRY_DAYS * 24 * 60 * 60,
  });

  const app = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    url:           `${app}/portal/acceso?ticket=${encodeURIComponent(token.token)}`,
    expiresInDays: LINK_EXPIRY_DAYS,
  };
}
