import { db } from "@/server/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const todayDay = today.getUTCDate();
  const year  = today.getUTCFullYear();
  const month = today.getUTCMonth(); // 0-indexed

  let paymentsGenerated = 0;
  let paymentsOverdue   = 0;

  // ── 1. Generar mensualidades automáticas ─────────────────────────
  // Buscar grupos activos con billingDay = hoy y monthlyFee configurado
  const groups = await db.group.findMany({
    where: {
      isActive:   true,
      billingDay: todayDay,
      monthlyFee: { not: null },
    },
    include: {
      tenant: { select: { id: true, status: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { student: { select: { id: true, firstName: true } } },
      },
    },
  });

  for (const group of groups) {
    // No generar pagos para tenants suspendidos o cancelados
    if (group.tenant.status === "SUSPENDED" || group.tenant.status === "CANCELLED") {
      continue;
    }

    const dueDate = new Date(Date.UTC(year, month, group.billingDay!));
    const monthLabel = dueDate.toLocaleString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
    const concept = `Mensualidad ${monthLabel} — ${group.name}`;

    for (const enrollment of group.enrollments) {
      // Verificar que no exista ya un pago para este mes y concepto
      const existing = await db.payment.findFirst({
        where: {
          tenantId:  group.tenant.id,
          studentId: enrollment.studentId,
          concept,
        },
        select: { id: true },
      });

      if (existing) continue;

      // Aplicar descuento de la inscripción si existe
      const base    = group.monthlyFee!;
      const amount  = enrollment.discount > 0
        ? Math.round(base * (1 - enrollment.discount / 100))
        : base;

      await db.payment.create({
        data: {
          tenantId:  group.tenant.id,
          studentId: enrollment.studentId,
          concept,
          amount,
          currency:  "MXN",
          method:    "CASH",
          status:    "PENDING",
          dueDate,
        },
      });

      paymentsGenerated++;
    }
  }

  // ── 2. Marcar pagos vencidos como OVERDUE ─────────────────────────
  const overdueResult = await db.payment.updateMany({
    where: {
      status:  "PENDING",
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });

  paymentsOverdue = overdueResult.count;

  console.log(`[cron/generate-payments] Generated: ${paymentsGenerated}, Marked overdue: ${paymentsOverdue}`);

  return NextResponse.json({
    ok: true,
    paymentsGenerated,
    paymentsOverdue,
    date: today.toISOString(),
  });
}
