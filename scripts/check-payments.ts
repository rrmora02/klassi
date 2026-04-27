import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function checkGimnasiusPayments() {
  try {
    // Buscar el grupo de Gimnasia
    const gymnastics = await db.group.findFirst({
      where: {
        name: { contains: "Gimnasia", mode: "insensitive" },
      },
      include: {
        tenant: { select: { name: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!gymnastics) {
      console.log("❌ No se encontró grupo de Gimnasia");
      return;
    }

    console.log(`\n📋 Grupo encontrado: ${gymnastics.name}`);
    console.log(`   Tenant: ${gymnastics.tenant.name}`);
    console.log(`   billingDay: ${gymnastics.billingDay}`);
    console.log(`   monthlyFee: ${gymnastics.monthlyFee}`);
    console.log(`   Alumnos activos: ${gymnastics.enrollments.length}`);

    console.log(`\n👥 Alumnos inscritos:`);
    gymnastics.enrollments.forEach((e) => {
      console.log(`   - ${e.student.firstName} ${e.student.lastName} (ID: ${e.studentId})`);
    });

    // Buscar pagos pendientes/overdue para estos alumnos en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(`\n💰 Pagos generados (últimos 30 días):`);
    for (const enrollment of gymnastics.enrollments) {
      const payments = await db.payment.findMany({
        where: {
          studentId: enrollment.studentId,
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
      });

      if (payments.length === 0) {
        console.log(`   ❌ ${enrollment.student.firstName} ${enrollment.student.lastName}: SIN PAGOS`);
      } else {
        payments.forEach((p) => {
          console.log(
            `   ✅ ${enrollment.student.firstName} ${enrollment.student.lastName}: ${p.concept} (${p.status}) - ${p.amount / 100} MXN`
          );
        });
      }
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkGimnasiusPayments();
