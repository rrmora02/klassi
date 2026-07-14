import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function deleteUser(email: string) {
  try {
    console.log(`🔍 Buscando usuario con email: ${email}`);

    // Find user
    const user = await db.user.findFirst({
      where: { email },
      include: {
        memberships: true,
        instructors: true,
      },
    });

    if (!user) {
      console.log(`❌ Usuario no encontrado con email: ${email}`);
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.name} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Memberships: ${user.memberships.length}`);
    console.log(`   Instructores: ${user.instructors.length}`);

    // Delete in order (respecting cascades)
    console.log(`\n🗑️  Eliminando registros asociados...`);

    // Delete team invitations sent by this user
    const invitationsDeleted = await db.teamInvitation.deleteMany({
      where: { invitedBy: user.id },
    });
    console.log(`   ✓ Invitaciones enviadas: ${invitationsDeleted.count}`);

    // Delete parent-student relationships
    const parentStudentDeleted = await db.parentStudent.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ Relaciones padre-estudiante: ${parentStudentDeleted.count}`);

    // Delete attendance records
    const attendanceDeleted = await db.attendance.deleteMany({
      where: { recordedById: user.id },
    });
    console.log(`   ✓ Registros de asistencia: ${attendanceDeleted.count}`);

    // Delete instructors (this will cascade delete to groups)
    const instructorsDeleted = await db.instructor.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ Registros de instructor: ${instructorsDeleted.count}`);

    // Delete tenant memberships
    const membershipsDeleted = await db.tenantUser.deleteMany({
      where: { userId: user.id },
    });
    console.log(`   ✓ Membresías de tenant: ${membershipsDeleted.count}`);

    // Finally delete the user
    const deletedUser = await db.user.delete({
      where: { id: user.id },
    });
    console.log(`\n✅ Usuario eliminado correctamente: ${deletedUser.name}`);

  } catch (error) {
    console.error("❌ Error al eliminar usuario:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log("❌ Uso: npm run delete-user <email>");
  console.log("Ejemplo: npm run delete-user rathinacell@example.com");
  process.exit(1);
}

deleteUser(email).catch((error) => {
  console.error(error);
  process.exit(1);
});
