import { db } from "@/server/db";
import { NextResponse } from "next/server";
import { createNotifications, dispatchPendingDeliveries } from "@/server/services/notification.service";
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
    const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const targetDay = billingWeekOfMonth === 1 ? 15 : lastDayOfMonth(year, month);
    const dueDate = new Date(Date.UTC(year, month, targetDay));
    if (dueDate <= today) {
      // Construir la fecha del mes siguiente directamente: mutar con
      // setUTCMonth sobre un día 31 puede saltarse un mes, y el "último día"
      // debe ser el del MES SIGUIENTE, no el del actual.
      const nextTarget = billingWeekOfMonth === 1 ? 15 : lastDayOfMonth(year, month + 1);
      return new Date(Date.UTC(year, month + 1, nextTarget));
    }
    return dueDate;
  }

  return today; // fallback
}

// Verifica si toca generar pagos: dentro de la ventana de 2 días antes de la
// fecha de vencimiento. Ventana (no día exacto) para que un cron caído un día
// no pierda el ciclo completo — el dedupe evita duplicados en días siguientes.
function shouldGeneratePayments(frequency: BillingFrequency, billingDay?: number | null, billingDayOfWeek?: string | null, billingWeekOfMonth?: number | null): boolean {
  const today = new Date();
  const dueDate = getNextDueDate(frequency, billingDay, billingDayOfWeek, billingWeekOfMonth);
  const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return daysUntilDue >= 0 && daysUntilDue <= 2;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // In production, only accept requests from Vercel's cron infrastructure
  if (process.env.NODE_ENV === "production") {
    const vercelEnv = (req as Request & { headers: Headers }).headers.get("x-vercel-deployment-url");
    const userAgent = (req as Request & { headers: Headers }).headers.get("user-agent") ?? "";
    if (!vercelEnv && !userAgent.includes("vercel-cron")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
      // Dedupe por (alumno, grupo, fecha de vencimiento) — renombrar el grupo
      // ya no re-cobra a todos. Se conserva el match por concepto como
      // compatibilidad con pagos generados antes de que existiera groupId.
      const existing = await db.payment.findFirst({
        where: {
          tenantId:  group.tenant.id,
          studentId: enrollment.studentId,
          OR: [
            { groupId: group.id, dueDate },
            { concept },
          ],
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
          groupId:   group.id,
          concept,
          amount,
          currency:  "MXN",
          method:    "CASH",
          status:    "PENDING",
          dueDate,
        },
      });

      paymentsGenerated++;

      // Recordatorio a los padres del alumno por push/email/in-app
      const parents = await db.parentStudent.findMany({
        where:  { studentId: enrollment.studentId },
        select: { userId: true },
      });
      if (parents.length > 0) {
        await createNotifications({
          tenantId: group.tenant.id,
          userIds:  parents.map(p => p.userId),
          type:     "payment.reminder",
          title:    "Nueva mensualidad por pagar",
          body:     `${concept} de ${enrollment.student.firstName} — $${(amount / 100).toFixed(2)} MXN`,
          data:     { url: "/portal/pagos" },
        }).catch((err) => console.error("[cron/generate-payments] notify error:", err));
      }
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

  // Entregar las notificaciones recién creadas (el cron horario reintenta fallos)
  if (paymentsGenerated > 0) {
    await dispatchPendingDeliveries().catch((err) =>
      console.error("[cron/generate-payments] dispatch error:", err)
    );
  }

  console.log(`[cron/generate-payments] Generated: ${paymentsGenerated}, Marked overdue: ${paymentsOverdue}`);

  return NextResponse.json({
    ok: true,
    paymentsGenerated,
    paymentsOverdue,
    date: today.toISOString(),
  });
}

