import { db } from "@/server/db";

async function fixCronPayments() {
  try {
    console.log(`\n🔧 Corrigiendo pagos generados por el cron...\n`);

    // Buscar pagos que contienen "Mensualidad" en el concepto (generados por cron)
    const cronPayments = await db.payment.findMany({
      where: {
        concept: {
          contains: "Mensualidad",
        },
        amount: {
          lt: 1000,  // Monto incorrecto (< 1000 centavos)
        },
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
      },
    });

    if (cronPayments.length === 0) {
      console.log(`✅ No hay pagos del cron con monto incorrecto`);
      return;
    }

    console.log(`📋 Pagos encontrados: ${cronPayments.length}`);
    console.log(`\nCorrecciones a realizar:`);

    let updatedCount = 0;

    for (const payment of cronPayments) {
      const oldAmount = payment.amount;
      const newAmount = oldAmount * 100;

      console.log(`   ${payment.student.firstName} ${payment.student.lastName}`);
      console.log(`      Concepto: ${payment.concept}`);
      console.log(`      Antes: ${oldAmount} centavos = ${(oldAmount / 100).toFixed(2)} MXN`);
      console.log(`      Después: ${newAmount} centavos = ${(newAmount / 100).toFixed(2)} MXN`);

      // Actualizar el pago
      await db.payment.update({
        where: { id: payment.id },
        data: {
          amount: newAmount,
        },
      });

      updatedCount++;
    }

    console.log(`\n✅ COMPLETADO:`);
    console.log(`   Pagos actualizados: ${updatedCount}`);
    console.log(`\n🎉 Los pagos del cron fueron corregidos!\n`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

fixCronPayments();
