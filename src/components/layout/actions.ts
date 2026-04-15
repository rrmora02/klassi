"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";

export async function switchTenantAction(tenantId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("Usuario no encontrado en BD");

  // Verificar que el usuario pertenezca a este tenant
  const membership = await db.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId: user.id } }
  });

  if (!membership) throw new Error("No perteneces a esta escuela");

  // Actualizar el tenant activo
  await db.user.update({
    where: { id: user.id },
    data: { activeTenantId: tenantId }
  });
}
