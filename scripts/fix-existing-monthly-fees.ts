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
      console.log(`✅ No hay groups con monthlyFee en la unidad equivocada`);
      return;
    }

    console.log(`📋 Grupos encontrados: ${groupsToFix.length}`);
    console.log(`\nCorrecciones a realizar:`);

    for (const group of groupsToFix) {
      const oldValue = group.monthlyFee;
      const newValue = (oldValue || 0) * 100;
      console.log(`   ${group.name}`);
      console.log(`      Antes: ${oldValue} → Después: ${newValue}`);
    }

    console.log(`\n⚠️  Iniciando corrección...`);

    // Actualizar todos los grupos
    const result = await db.group.updateMany({
      where: {
        monthlyFee: {
          gte: 1,
          lt: 1000,
        },
      },
      data: {
        monthlyFee: {
          multiply: 100, // Multiplica el valor existente por 100
        },
      },
    });

    console.log(`\n✅ COMPLETADO:`);
    console.log(`   Groups actualizados: ${result.count}`);
    console.log(`\n🎉 Todos los monthlyFee fueron corregidos a centavos!\n`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

fixExistingMonthlyFees();
