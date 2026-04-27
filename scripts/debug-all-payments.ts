import { db } from "@/server/db";

async function debugAllPayments() {
  try {
    console.log(`\n🔍 Listando TODOS los pagos en la BD...\n`);

    const allPayments = await db.payment.findMany({
      include: {
        student: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    console.log(`📋 Total de pagos encontrados: ${allPayments.length}\n`);

    for (const payment of allPayments) {
      console.log(`${payment.student.firstName} ${payment.student.lastName}`);
      console.log(`   Concepto: ${payment.concept}`);
      console.log(`   Monto BD: ${payment.amount} centavos = ${(payment.amount / 100).toFixed(2)} MXN`);
      console.log(`   Estado: ${payment.status}`);
      console.log(`   Fecha vencimiento: ${payment.dueDate?.toISOString().split('T')[0]}`);
      console.log();
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

debugAllPayments();
