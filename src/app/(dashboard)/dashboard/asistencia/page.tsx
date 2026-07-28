import { getCurrentContext } from "@/server/request-context";
import { AttendanceClient } from "@/components/asistencia/attendance-client";

interface AsistenciaPageProps {
  searchParams: Promise<{ groupId?: string }>;
}

export default async function AsistenciaPage({ searchParams }: AsistenciaPageProps) {
  // Garantizamos acceso (identidad compartida del request, React.cache)
  const ctx = await getCurrentContext();
  if (!ctx?.user.activeTenantId) return null;

  const params = await searchParams;
  const preselectedGroupId = params.groupId;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
       <AttendanceClient initialGroupId={preselectedGroupId} />
    </div>
  );
}
