import { PrismaClient, SubscriptionPlan, TenantStatus, GroupLevel, StudentStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando inserción de datos dummy...");

  // Buscar el primer tenant (la escuela que acaba de crear el usuario)
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error("No se encontró ninguna organización. Asegúrate de iniciar sesión y seleccionar una en la web primero.");
    process.exit(1);
  }

  console.log(`Insertando datos para el tenant: ${tenant.name} (${tenant.id})`);

  // Crear una disciplina
  const disciplina = await prisma.discipline.create({
    data: {
      tenantId: tenant.id,
      name: "Tae Kwon Do",
      color: "blue",
      icon: "activity",
      sortOrder: 1,
    }
  });

  // Crear un grupo
  const grupo = await prisma.group.create({
    data: {
      tenantId: tenant.id,
      disciplineId: disciplina.id,
      name: "Principiantes Infantiles",
      level: GroupLevel.BEGINNER,
      capacity: 25,
      room: "Tatami 1",
      schedule: [{ day: "MON", startTime: "16:00", endTime: "17:00" }, { day: "WED", startTime: "16:00", endTime: "17:00" }]
    }
  });

  // Crear algunos alumnos
  const alumnos = await Promise.all([
    prisma.student.create({
      data: {
        tenantId: tenant.id,
        firstName: "Carlos",
        lastName: "García",
        status: StudentStatus.ACTIVE,
        phone: "555-1234",
        enrollments: {
          create: {
            groupId: grupo.id,
            discount: 0
          }
        }
      }
    }),
    prisma.student.create({
      data: {
        tenantId: tenant.id,
        firstName: "Ana",
        lastName: "López",
        status: StudentStatus.ACTIVE,
        phone: "555-5678",
        enrollments: {
          create: {
            groupId: grupo.id,
            discount: 10
          }
        }
      }
    }),
    prisma.student.create({
      data: {
        tenantId: tenant.id,
        firstName: "María",
        lastName: "Pérez",
        status: StudentStatus.ACTIVE,
      }
    })
  ]);

  // Crear pagos
  await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      studentId: alumnos[0].id,
      concept: "Mensualidad Mayo",
      amount: 80000,
      status: PaymentStatus.PAID,
      paidAt: new Date()
    }
  });

  await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      studentId: alumnos[1].id,
      concept: "Mensualidad Mayo",
      amount: 72000,
      status: PaymentStatus.OVERDUE,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days overdue
    }
  });

  console.log("¡Datos insertados correctamente!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
