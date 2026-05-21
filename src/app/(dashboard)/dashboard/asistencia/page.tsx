import { AttendanceClient } from "@/components/asistencia/attendance-client";
import { getDashboardContext } from "@/server/auth/dashboard-context";

interface AsistenciaPageProps {
  searchParams: Promise<{ groupId?: string }>;
}

export default async function AsistenciaPage({ searchParams }: AsistenciaPageProps) {
  await getDashboardContext();

  const params = await searchParams;
  const preselectedGroupId = params.groupId;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
       <AttendanceClient initialGroupId={preselectedGroupId} />
    </div>
  );
}
