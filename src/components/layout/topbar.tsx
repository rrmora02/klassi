import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { TenantSwitcher } from "./tenant-switcher";
import { ThemeToggle } from "./theme-toggle";
import { TourButton } from "./tour-button";
import { canAddSchool as checkCanAddSchool } from "@/server/services/tenant.service";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function TopBar() {
  const { userId } = await auth();
  let tenants: { id: string; name: string; isOwned: boolean; isChild: boolean; isBlocked?: boolean; blockReason?: string; parentName?: string }[] = [];
  let user     = null;
  let userRole = "RECEPTIONIST";
  let canAddSchool = false;

  if (userId) {
    user = await db.user.findUnique({
      where:  { clerkId: userId },
      include: { activeTenant: true },
    });

    if (user && user.activeTenantId) {
      const memberships = await db.tenantUser.findMany({
        where:   { userId: user.id },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              parentTenantId: true,
              createdByUserId: true,
              blockChildWrites: true,
              blockChildWritesReason: true,
              parentTenant: { select: { name: true } },
            },
          },
        },
      });

      tenants = memberships.map(m => ({
        id:      m.tenant.id,
        name:    m.tenant.name,
        isOwned: m.tenant.createdByUserId === user!.id,
        isChild: m.tenant.parentTenantId !== null,
        isBlocked: m.tenant.blockChildWrites ?? false,
        blockReason: m.tenant.blockChildWritesReason || undefined,
        parentName: m.tenant.parentTenant?.name || undefined,
      }));

      const tenantUser = await db.tenantUser.findFirst({
        where: { userId: user.id, tenantId: user.activeTenantId },
      });
      userRole = tenantUser?.role ?? "RECEPTIONIST";

      if (userRole === "ADMIN") {
        const check  = await checkCanAddSchool(user.id);
        canAddSchool = check.allowed;
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
