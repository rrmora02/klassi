import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { TenantSwitcher } from "./tenant-switcher";
import { ThemeToggle } from "./theme-toggle";
import { TourButton } from "./tour-button";
import { PLANS } from "@/config/plans";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function TopBar() {
  const { userId } = await auth();
  let tenants: any[] = [];
  let user = null;
  let userRole = "RECEPTIONIST";
  let canAddSchool = false;

  if (userId) {
    user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { activeTenant: true },
    });

    if (user && user.activeTenantId) {
      const memberships = await db.tenantUser.findMany({
        where: { userId: user.id },
        include: { tenant: true },
      });

      tenants = memberships.map((m) => ({ id: m.tenant.id, name: m.tenant.name }));

      const tenantUser = await db.tenantUser.findFirst({
        where: { userId: user.id, tenantId: user.activeTenantId },
      });
      userRole = tenantUser?.role ?? "RECEPTIONIST";

      // Verificar si el plan permite agregar más escuelas
      if (userRole === "ADMIN" && user.activeTenant) {
        const plan      = user.activeTenant.plan;
        const maxSchools = PLANS[plan].schools;
        canAddSchool    = tenants.length < maxSchools;
      }
    }
  }

  const roleLabels: Record<string, string> = {
    ADMIN:        "Administrador",
    RECEPTIONIST: "Recepcionista",
    INSTRUCTOR:   "Instructor",
  };

  return (
    <div className="flex h-16 flex-1 items-center justify-between bg-white dark:bg-sb-uplift px-4 md:px-6">
      <div className="flex items-center gap-3">
        {user && (
          <TenantSwitcher
            tenants={tenants}
            activeTenantId={user.activeTenantId}
            userRole={userRole}
            canAddSchool={canAddSchool}
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        <TourButton />
        <div className="flex flex-col items-center justify-center">
          <ThemeToggle />
          <p className="text-xs text-gray-500 dark:text-sb-light/60 mt-1">{roleLabels[userRole]}</p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
