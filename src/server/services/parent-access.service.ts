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

type LocalUser = { id: string; name: string; email: string; clerkId: string };

/**
 * (Re)crea la cuenta de Clerk del tutor a partir de su correo y actualiza el
 * clerkId local. Si el correo ya existe en Clerk (mismo tutor en otra escuela)
 * se reutiliza; si no, se crea sin contraseña. Requiere correo real.
 */
async function provisionClerkAccount(user: LocalUser) {
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
 * Garantiza que el User local tenga una cuenta real en Clerk.
 * Si ya la tiene (clerkId no es "pending_"), se asume válida; la verificación
 * real ocurre al emitir el token (createPortalAccessLink reaprovisiona si está
 * obsoleta).
 */
export async function ensureParentClerkAccount(localUserId: string) {
  const user = await db.user.findUnique({ where: { id: localUserId } });
  if (!user) throw new Error("Usuario no encontrado");
  if (hasRealClerkAccount(user.clerkId)) return user;
  return provisionClerkAccount(user);
}

/**
 * Genera un enlace mágico al portal: un solo uso, expira en 7 días,
 * regenerable desde la ficha del alumno cuantas veces haga falta.
 */
export async function createPortalAccessLink(localUserId: string) {
  let user = await ensureParentClerkAccount(localUserId);

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();

  const mkToken = (clerkId: string) =>
    client.signInTokens.createSignInToken({
      userId:           clerkId,
      expiresInSeconds: LINK_EXPIRY_DAYS * 24 * 60 * 60,
    });

  let token;
  try {
    token = await mkToken(user.clerkId);
  } catch (err) {
    // El clerkId guardado puede estar obsoleto (la cuenta se borró en Clerk):
    // reaprovisionar por correo y reintentar una vez.
    console.warn(`[parent-access] clerkId obsoleto para user ${user.id}, reaprovisionando:`, err instanceof Error ? err.message : err);
    user  = await provisionClerkAccount(user);
    token = await mkToken(user.clerkId);
  }

  const app = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    url:           `${app}/portal/acceso?ticket=${encodeURIComponent(token.token)}`,
    expiresInDays: LINK_EXPIRY_DAYS,
  };
}
