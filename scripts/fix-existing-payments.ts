import { db } from "@/server/db";

async function fixExistingPayments() {
  try {
    console.log(`\n🔧 Corrigiendo pagos con monto incorrecto...\n`);

    // Buscar pagos con monto entre 1 y 999 centavos (asumiendo que están mal)
    const paymentsToFix = await db.payment.findMany({
      where: {
        amount: {
          gte: 1,
          lt: 1000,
        },
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
      },
    });

    if (paymentsToFix.length === 0) {
      console.log(`✅ No hay pagos con monto incorrecto`);
      return;
    }

    console.log(`📋 Pagos encontrados: ${paymentsToFix.length}`);
    console.log(`\nCorrecciones a realizar:`);

    let updatedCount = 0;

    for (const payment of paymentsToFix) {
      const oldAmount = payment.amount;
      const newAmount = oldAmount * 100;
      console.log(`   ${payment.student.firstName} ${payment.student.lastName}`);
      console.log(`      Concepto: ${payment.concept}`);
      console.log(`      Antes: ${(oldAmount / 100).toFixed(2)} MXN → Después: ${(newAmount / 100).toFixed(2)} MXN`);

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
    console.log(`\n🎉 Todos los pagos fueron corregidos a montos correctos!\n`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

fixExistingPayments();
