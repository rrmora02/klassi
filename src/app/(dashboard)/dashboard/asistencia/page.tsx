import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { AttendanceClient } from "@/components/asistencia/attendance-client";

export default async function AsistenciaPage() {
  const { userId } = await auth();
  if (!userId) return null;

  // Garantizamos acceso
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user?.activeTenantId) return null;

  return (
    <div>
       <AttendanceClient />
    </div>
  );
}
