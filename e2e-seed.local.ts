// Seed local para la corrida de QA en vivo (sandbox): crea una escuela de
// prueba ligada a los clerkId de los usuarios E2E de la instancia de
// DESARROLLO de Clerk. Correr con:
//   DATABASE_URL=... npx tsx e2e-seed.local.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const STAFF_CLERK_ID = "user_3GbsH1Br4WTvoOcIdVDx0Q8r1li"; // raul.remo02@gmail.com
const PARENT_CLERK_ID = "user_3GbzfrRgJfRb4mjEUGvwyYimYTf"; // rrmora02@icloud.com
const INSTRUCTOR_CLERK_ID = "user_3HFfpdBp3sIW02HvavQVRmD4aRN"; // rrmora02@gmail.com

const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => ({
  day,
  startTime: "16:00",
  endTime: "17:00",
}));

async function main() {
  const tenant = await db.tenant.create({
    data: {
      name: "Escuela Demo E2E",
      slug: "escuela-demo-e2e",
      status: "ACTIVE",
      plan: "PRO",
    },
  });

  const staff = await db.user.create({
    data: {
      clerkId: STAFF_CLERK_ID,
      email: "raul.remo02@gmail.com",
      name: "Raul Reyes Mora",
      activeTenantId: tenant.id,
      memberships: { create: { tenantId: tenant.id, role: "ADMIN" } },
    },
  });

  const parent = await db.user.create({
    data: {
      clerkId: PARENT_CLERK_ID,
      email: "rrmora02@icloud.com",
      name: "Raul Reyes",
      // Sin membresía ni activeTenantId: tutor puro (caso del bug de onboarding)
    },
  });

  const discipline = await db.discipline.create({
    data: { tenantId: tenant.id, name: "Karate", color: "#E63946" },
  });

  const group = await db.group.create({
    data: {
      tenantId: tenant.id,
      disciplineId: discipline.id,
      name: "Karate Infantil",
      schedule: ALL_DAYS,
      monthlyFee: 50000,
      billingDay: 1,
    },
  });

  const thiago = await db.student.create({
    data: {
      tenantId: tenant.id,
      firstName: "Thiago",
      lastName: "Reyes",
      currentBeltColor: "WHITE",
      parents: { create: { userId: parent.id, relationship: "padre", isPrimary: true } },
      enrollments: { create: { groupId: group.id } },
    },
  });

  await db.student.create({
    data: {
      tenantId: tenant.id,
      firstName: "Valentina",
      lastName: "Reyes",
      parents: { create: { userId: parent.id, relationship: "padre" } },
      enrollments: { create: { groupId: group.id } },
    },
  });

  await db.payment.createMany({
    data: [
      {
        tenantId: tenant.id,
        studentId: thiago.id,
        groupId: group.id,
        concept: "Mensualidad Julio 2026",
        amount: 50000,
        status: "PENDING",
        dueDate: new Date("2026-07-01T00:00:00Z"),
      },
      {
        tenantId: tenant.id,
        studentId: thiago.id,
        groupId: group.id,
        concept: "Mensualidad Junio 2026",
        amount: 50000,
        status: "PAID",
        dueDate: new Date("2026-06-01T00:00:00Z"),
        paidAt: new Date("2026-06-03T12:00:00Z"),
        method: "CASH",
      },
    ],
  });

  await db.announcement.create({
    data: {
      tenantId: tenant.id,
      title: "Bienvenidos al nuevo ciclo",
      body: "Las clases del nuevo ciclo comienzan la próxima semana.",
      sentAt: new Date(),
    },
  });

  await db.notification.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: parent.id,
        type: "announcement",
        title: "Bienvenidos al nuevo ciclo",
        body: "Las clases del nuevo ciclo comienzan la próxima semana.",
        data: { url: "/portal/notificaciones" },
      },
      {
        tenantId: tenant.id,
        userId: parent.id,
        type: "payment.received",
        title: "Pago recibido",
        body: "Recibimos el pago de la Mensualidad Junio 2026.",
        data: { url: "/portal/pagos" },
        readAt: new Date("2026-06-03T13:00:00Z"),
      },
    ],
  });

  const instructorUser = await db.user.create({
    data: {
      clerkId: INSTRUCTOR_CLERK_ID,
      email: "rrmora02@gmail.com",
      name: "Raul Mora",
      activeTenantId: tenant.id,
      memberships: { create: { tenantId: tenant.id, role: "INSTRUCTOR" } },
    },
  });
  const instructor = await db.instructor.create({
    data: { tenantId: tenant.id, userId: instructorUser.id },
  });
  await db.group.update({ where: { id: group.id }, data: { instructorId: instructor.id } });

  await db.event.create({
    data: {
      tenantId: tenant.id,
      name: "Convivio de verano",
      description: "Convivio familiar de cierre de curso",
      date: new Date("2026-08-15T18:00:00Z"),
      isSchoolWide: true,
      amount: 15000,
    },
  });

  console.log("Seed OK:", { tenant: tenant.id, staff: staff.id, parent: parent.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
