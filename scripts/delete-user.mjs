import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function deleteUserCompletely(email) {
  console.log(`🗑️  Iniciando eliminación del usuario: ${email}`);

  try {
    await db.$transaction(async (tx) => {
      // 1. Obtener el usuario
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true, clerkId: true }
      });

      if (!user) {
        console.log(`❌ Usuario no encontrado: ${email}`);
        return;
      }

      console.log(`ℹ️  Usuario encontrado: ID=${user.id}, ClerkID=${user.clerkId}`);

      // 2. Borrar invitaciones enviadas por este usuario
      const invitationsDeleted = await tx.teamInvitation.deleteMany({
        where: { invitedBy: user.id }
      });
      console.log(`✓ Invitaciones eliminadas: ${invitationsDeleted.count}`);

      // 3. Borrar logs de asistencia
      const attendanceDeleted = await tx.attendance.deleteMany({
        where: { userId: user.id }
      });
      console.log(`✓ Registros de asistencia eliminados: ${attendanceDeleted.count}`);

      // 4. Borrar relaciones padre-estudiante
      const parentStudentDeleted = await tx.parentStudent.deleteMany({
        where: { parentId: user.id }
      });
      console.log(`✓ Relaciones padre-estudiante eliminadas: ${parentStudentDeleted.count}`);

      // 5. Borrar instructores asociados
      const instructorsDeleted = await tx.instructor.deleteMany({
        where: { userId: user.id }
      });
      console.log(`✓ Registros de instructor eliminados: ${instructorsDeleted.count}`);

      // 6. Borrar membresías (TenantUser)
      const tenantUsersDeleted = await tx.tenantUser.deleteMany({
        where: { userId: user.id }
      });
      console.log(`✓ Membresías de tenant eliminadas: ${tenantUsersDeleted.count}`);

      // 7. Finalmente, borrar el usuario
      const userDeleted = await tx.user.delete({
        where: { id: user.id }
      });
      console.log(`✓ Usuario eliminado: ${userDeleted.email}`);

      console.log(`\n✅ Eliminación completada exitosamente`);
    });
  } catch (error) {
    console.error(`❌ Error durante la eliminación:`, error.message);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar
deleteUserCompletely("rrmora02@icloud.com").catch((error) => {
  console.error(error);
  process.exit(1);
});
