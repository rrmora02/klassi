import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar, TopBarSkeleton } from "@/components/layout/topbar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OnboardingTourWrapper } from "@/components/onboarding/onboarding-tour-wrapper";
import { SubscriptionBanner } from "@/components/billing/subscription-banner";
import { ReadOnlyBanner } from "@/components/billing/read-only-banner";
import { getCurrentContext } from "@/server/request-context";
import { db } from "@/server/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/sign-in");

  if (!ctx.user.activeTenantId) {
    redirect("/onboarding");
  }

  // Sin membresía real en la escuela activa (p. ej. fue removido del equipo)
  // no hay acceso al dashboard.
  if (!ctx.activeRole) {
    redirect("/onboarding");
  }

  const tenant = ctx.activeTenant;
  const userRole = ctx.activeRole;
  const studentCount = await db.student.count({ where: { tenantId: ctx.user.activeTenantId } });

  return (
    <>
      <OnboardingTourWrapper hasStudents={studentCount > 0} />
      <DashboardShell
        sidebar={<Sidebar userRole={userRole} plan={tenant?.plan} isChild={!!tenant?.parentTenantId} />}
        topbar={
          <Suspense fallback={<TopBarSkeleton />}>
            <TopBar />
          </Suspense>
        }
      >
        {tenant && (
          <div className="px-6 pt-4 space-y-2">
            {ctx.readOnly && <ReadOnlyBanner reason={ctx.readOnlyReason} />}
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
