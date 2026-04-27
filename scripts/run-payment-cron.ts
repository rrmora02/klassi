import { db } from "@/server/db";

export const dynamic = "force-dynamic";

async function runPaymentCron() {
  const today = new Date();
  const todayDay = today.getUTCDate();
  const year  = today.getUTCFullYear();
  const month = today.getUTCMonth(); // 0-indexed

  let paymentsGenerated = 0;
  let paymentsOverdue   = 0;

  console.log(`\n🔄 Ejecutando cron de pagos...`);
  console.log(`📅 Fecha: ${today.toISOString()}`);
  console.log(`📆 Día: ${todayDay}, Mes: ${month + 1}, Año: ${year}`);

  // ── 1. Generar mensualidades automáticas ─────────────────────────
  const groups = await db.group.findMany({
    where: {
      isActive:   true,
      billingDay: { lte: todayDay },
      monthlyFee: { not: null },
    },
    include: {
      tenant: { select: { id: true, status: true, name: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  console.log(`\n📋 Grupos encontrados: ${groups.length}`);

  for (const group of groups) {
    // No generar pagos para tenants suspendidos o cancelados
    if (group.tenant.status === "SUSPENDED" || group.tenant.status === "CANCELLED") {
      console.log(`⏭️  ${group.name} (Tenant: ${group.tenant.name}) - SUSPENDIDO/CANCELADO`);
      continue;
    }

    console.log(`\n✅ Procesando: ${group.name} (Tenant: ${group.tenant.name})`);
    console.log(`   Alumnos activos: ${group.enrollments.length}`);
    console.log(`   billingDay: ${group.billingDay}, monthlyFee: ${group.monthlyFee}`);

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

      if (existing) {
        console.log(`   ⏭️  ${enrollment.student.firstName} ${enrollment.student.lastName} - YA EXISTE PAGO`);
        continue;
      }

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

      console.log(`   ✅ ${enrollment.student.firstName} ${enrollment.student.lastName} - ${(amount / 100).toFixed(2)} MXN`);
      paymentsGenerated++;
    }
  }

  // ── 2. Marcar pagos vencidos como OVERDUE ─────────────────────────
  console.log(`\n📊 Marcando pagos vencidos...`);
  const overdueResult = await db.payment.updateMany({
    where: {
      status:  "PENDING",
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });

  paymentsOverdue = overdueResult.count;

  console.log(`\n✨ RESULTADO:`);
  console.log(`   Pagos generados: ${paymentsGenerated}`);
  console.log(`   Pagos marcados como vencidos: ${paymentsOverdue}`);
  console.log(`\n✅ Cron completado!\n`);
}

runPaymentCron()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
