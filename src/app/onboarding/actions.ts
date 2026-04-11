"use server";

import { auth } from "@clerk/nextjs/server";

/**
 * Pregunta al servidor si ya ve el orgId en el JWT cookie.
 * Usado para confirmar que setActive() propagó el cookie antes de navegar.
 */
export async function getSessionOrgId(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}
