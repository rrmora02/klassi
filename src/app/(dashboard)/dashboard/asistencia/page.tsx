import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { AttendanceClient } from "@/components/asistencia/attendance-client";

interface AsistenciaPageProps {
  searchParams: Promise<{ groupId?: string }>;
}

export default async function AsistenciaPage({ searchParams }: AsistenciaPageProps) {
  const { userId } = await auth();
  if (!userId) return null;

  // Garantizamos acceso
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user?.activeTenantId) return null;

  const params = await searchParams;
  const preselectedGroupId = params.groupId;

  return (
    <div>
       <AttendanceClient initialGroupId={preselectedGroupId} />
    </div>
  );
}
