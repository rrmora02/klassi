import { db } from "@/server/db";

async function fixExistingMonthlyFees() {
  try {
    console.log(`\n🔧 Corrigiendo monthlyFee existentes...\n`);

    // Buscar grupos con monthlyFee entre 1 y 999 (asumiendo que están en pesos)
    const groupsToFix = await db.group.findMany({
      where: {
        monthlyFee: {
          gte: 1,
          lt: 1000,
        },
      },
      select: {
        id: true,
        name: true,
        monthlyFee: true,
      },
    });

    if (groupsToFix.length === 0) {
      console.log(`✅ No hay grupos con monthlyFee en la unidad equivocada`);
      return;
    }

    console.log(`📋 Grupos encontrados: ${groupsToFix.length}`);
    console.log(`\nCorrecciones a realizar:`);

    let updatedCount = 0;

    for (const group of groupsToFix) {
      const oldValue = group.monthlyFee;
      const newValue = (oldValue || 0) * 100;
      console.log(`   ${group.name}: ${oldValue} → ${newValue}`);

      // Actualizar cada grupo individualmente
      await db.group.update({
        where: { id: group.id },
        data: {
          monthlyFee: newValue,
        },
      });

      updatedCount++;
    }

    console.log(`\n✅ COMPLETADO:`);
    console.log(`   Grupos actualizados: ${updatedCount}`);
    console.log(`\n🎉 Todos los monthlyFee fueron corregidos a centavos!\n`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

fixExistingMonthlyFees();

