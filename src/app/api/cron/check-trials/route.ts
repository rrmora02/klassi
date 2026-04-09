import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { sendTrialExpiredEmail } from "@/server/services/email.service";

/**
 * Cron job que verifica trials vencidos.
 * Configurar en vercel.json para correr diario a las 8am.
 *
 * vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/check-trials", "schedule": "0 8 * * *" }]
 * }
 */
export async function GET(req: NextRequest) {
  // Verificar que la llamada viene de Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Trials que vencen HOY (alertar 1 día antes)
  const trialExpiringSoon = await db.tenant.findMany({
    where: {
      status:      "TRIAL",
      trialEndsAt: {
        gte: now,
        lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    },
  });

  for (const tenant of trialExpiringSoon) {
    // Obtener email del admin
    const admin = await db.user.findFirst({
      where: { tenantId: tenant.id, role: "ADMIN" },
      select: { email: true, name: true },
    });
    if (admin?.email) {
      await sendTrialExpiredEmail(admin.email, tenant.name, /* expiring soon */ false);
    }
  }

  // 2. Trials ya vencidos → suspender
  const expired = await db.tenant.findMany({
    where: {
      status:      "TRIAL",
      trialEndsAt: { lt: now },
    },
  });

  const suspendedIds: string[] = [];

  for (const tenant of expired) {
    await db.tenant.update({
      where: { id: tenant.id },
      data:  { status: "SUSPENDED" },
    });
    suspendedIds.push(tenant.id);

    const admin = await db.user.findFirst({
      where: { tenantId: tenant.id, role: "ADMIN" },
      select: { email: true, name: true },
    });
    if (admin?.email) {
      await sendTrialExpiredEmail(admin.email, tenant.name, /* already expired */ true);
    }
  }

  console.log(`[cron/check-trials] Expirando pronto: ${trialExpiringSoon.length} | Suspendidos: ${expired.length}`);

  return NextResponse.json({
    expiringSoon: trialExpiringSoon.length,
    suspended:    suspendedIds,
  });
}
