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
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
       <AttendanceClient initialGroupId={preselectedGroupId} />
    </div>
  );
}
