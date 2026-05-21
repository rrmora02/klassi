import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OnboardingTourWrapper } from "@/components/onboarding/onboarding-tour-wrapper";
import { db } from "@/server/db";
import { getDashboardContext } from "@/server/auth/dashboard-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tenantId, tenants, userRole } = await getDashboardContext();

  const firstStudent = await db.student.findFirst({
    where: { tenantId },
    select: { id: true },
  });

  return (
    <>
      <OnboardingTourWrapper hasStudents={Boolean(firstStudent)} />
      <DashboardShell
        sidebar={<Sidebar userRole={userRole} />}
        topbar={
          <TopBar
            tenants={tenants}
            activeTenantId={tenantId}
            userRole={userRole}
          />
        }
      >
        {children}
      </DashboardShell>
    </>
  );
}
