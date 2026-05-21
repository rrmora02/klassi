import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OnboardingTourWrapper } from "@/components/onboarding/onboarding-tour-wrapper";
import { db } from "@/server/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      activeTenantId: true,
      memberships: {
        select: {
          role: true,
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { tenant: { name: "asc" } },
      },
    },
  });

  if (!user || !user.activeTenantId) {
    redirect("/onboarding");
  }

  const activeMembership = user.memberships.find(
    (membership) => membership.tenant.id === user.activeTenantId
  );
  const userRole = activeMembership?.role || "RECEPTIONIST";
  const tenants = user.memberships.map((membership) => membership.tenant);

  const firstStudent = await db.student.findFirst({
    where: { tenantId: user.activeTenantId },
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
            activeTenantId={user.activeTenantId}
            userRole={userRole}
          />
        }
      >
        {children}
      </DashboardShell>
    </>
  );
}
