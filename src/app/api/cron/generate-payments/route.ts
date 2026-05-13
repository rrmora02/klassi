import { db } from "@/server/db";
import { NextResponse } from "next/server";
import type { BillingFrequency } from "@prisma/client";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Calcula la próxima fecha de vencimiento basada en la frecuencia
function getNextDueDate(frequency: BillingFrequency, billingDay?: number | null, billingDayOfWeek?: string | null, billingWeekOfMonth?: number | null): Date {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const date = today.getUTCDate();
  const dayOfWeek = today.getUTCDay();

  if (frequency === "MONTHLY" && billingDay) {
    // Próximo día del mes (puede ser este mes o el próximo)
    const dueDate = new Date(Date.UTC(year, month, billingDay));
    if (dueDate <= today) {
      dueDate.setUTCMonth(month + 1);
    }
    return dueDate;
  }

  if (frequency === "WEEKLY" && billingDayOfWeek) {
    const targetDay = DAY_NAMES.indexOf(billingDayOfWeek);
    let daysUntilTarget = (targetDay - dayOfWeek + 7) % 7;
    if (daysUntilTarget === 0) daysUntilTarget = 7; // Si es hoy, es para la próxima semana
    const dueDate = new Date(today);
    dueDate.setUTCDate(date + daysUntilTarget);
    return dueDate;
  }

  if (frequency === "BIWEEKLY" && billingWeekOfMonth) {
    // Primera quincena: día 15, Segunda quincena: último día del mes
    const targetDay = billingWeekOfMonth === 1 ? 15 : new Date(year, month + 1, 0).getUTCDate();
    const dueDate = new Date(Date.UTC(year, month, targetDay));
    if (dueDate <= today) {
      dueDate.setUTCMonth(month + 1);
      dueDate.setUTCDate(billingWeekOfMonth === 1 ? 15 : new Date(year, month + 1, 0).getUTCDate());
    }
    return dueDate;
  }

  return today; // fallback
}

// Verifica si hoy es el día para generar pagos (2 días antes de la fecha de vencimiento)
function shouldGeneratePayments(frequency: BillingFrequency, billingDay?: number | null, billingDayOfWeek?: string | null, billingWeekOfMonth?: number | null): boolean {
  const today = new Date();
  const dueDate = getNextDueDate(frequency, billingDay, billingDayOfWeek, billingWeekOfMonth);
  const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Generar pagos exactamente 2 días antes
  return daysUntilDue === 2;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  let paymentsGenerated = 0;
  let paymentsOverdue   = 0;

  // ── 1. Generar cobros automáticos según frecuencia ─────────────────────────
  const groups = await db.group.findMany({
    where: {
      isActive:   true,
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

    // Verificar si hoy es el día para generar pagos (2 días antes de la fecha límite)
    const frequency = group.billingFrequency as BillingFrequency;
    const shouldGenerate = shouldGeneratePayments(
      frequency,
      group.billingDay,
      group.billingDayOfWeek,
      group.billingWeekOfMonth
    );

    if (!shouldGenerate) {
      continue;
    }

    // Calcular la fecha de vencimiento
    const dueDate = getNextDueDate(frequency, group.billingDay, group.billingDayOfWeek, group.billingWeekOfMonth);

    // Crear concepto según la frecuencia
    let concept = "";
    if (frequency === "MONTHLY" && group.billingDay) {
      const monthLabel = dueDate.toLocaleString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
      concept = `Mensualidad ${monthLabel} — ${group.name}`;
    } else if (frequency === "WEEKLY" && group.billingDayOfWeek) {
      const weekLabel = dueDate.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
      concept = `Cuota semanal ${weekLabel} — ${group.name}`;
    } else if (frequency === "BIWEEKLY" && group.billingWeekOfMonth) {
      const fortnight = group.billingWeekOfMonth === 1 ? "primera quincena" : "segunda quincena";
      const monthLabel = dueDate.toLocaleString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
      concept = `Cuota ${fortnight} de ${monthLabel} — ${group.name}`;
    }

    for (const enrollment of group.enrollments) {
      // Verificar que no exista ya un pago para este concepto y estudiante
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

