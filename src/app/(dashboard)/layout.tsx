import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OnboardingTourWrapper } from "@/components/onboarding/onboarding-tour-wrapper";
import { SubscriptionBanner } from "@/components/billing/subscription-banner";
import { db } from "@/server/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, activeTenantId: true },
  });

  if (!user || !user.activeTenantId) {
    redirect("/onboarding");
  }

  const [tenantUser, tenant, studentCount] = await Promise.all([
    db.tenantUser.findFirst({
      where: { userId: user.id, tenantId: user.activeTenantId },
    }),
    db.tenant.findUnique({
      where:  { id: user.activeTenantId },
      select: { plan: true, status: true, trialEndsAt: true, pendingPlan: true, pendingPlanAt: true },
    }),
    db.student.count({ where: { tenantId: user.activeTenantId } }),
  ]);

  const userRole = tenantUser?.role ?? "RECEPTIONIST";

  return (
    <>
      <OnboardingTourWrapper hasStudents={studentCount > 0} />
      <DashboardShell sidebar={<Sidebar userRole={userRole} plan={tenant?.plan} />} topbar={<TopBar />}>
        {userRole === "ADMIN" && tenant && (
          <div className="px-6 pt-4">
            <SubscriptionBanner
              status={tenant.status}
              trialEndsAt={tenant.trialEndsAt}
              pendingPlan={tenant.pendingPlan}
              pendingPlanAt={tenant.pendingPlanAt}
            />
          </div>
        )}
        {children}
      </DashboardShell>
    </>
  );
}
