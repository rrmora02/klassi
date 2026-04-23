import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { TenantSwitcher } from "./tenant-switcher";
import { ThemeToggle } from "./theme-toggle";

export async function TopBar() {
  const { userId } = await auth();
  let tenants: any[] = [];
  let user = null;
  let userRole = "RECEPTIONIST";

  if (userId) {
    user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        activeTenant: true,
      },
    });

    console.log("[TopBar Debug] User:", { id: user?.id, activeTenantId: user?.activeTenantId });

    if (user && user.activeTenantId) {
      const memberships = await db.tenantUser.findMany({
        where: { userId },
        include: { tenant: true },
      });

      tenants = memberships.map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
      }));

      const tenantUser = await db.tenantUser.findFirst({
        where: {
          userId,
          tenantId: user.activeTenantId,
        },
      });

      console.log("[TopBar Debug] TenantUser:", { tenantId: user.activeTenantId, role: tenantUser?.role });

      userRole = tenantUser?.role || "RECEPTIONIST";
    }
  }

  console.log("[TopBar Debug] Final userRole:", userRole);

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    RECEPTIONIST: "Recepcionista",
    INSTRUCTOR: "Instructor",
  };

  return (
    <div className="flex h-16 flex-1 items-center justify-between bg-white dark:bg-sb-uplift px-4 md:px-6">
      <div className="flex items-center gap-3">
        {user && <TenantSwitcher tenants={tenants} activeTenantId={user.activeTenantId} userRole={userRole} />}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <ThemeToggle />
          <p className="text-xs text-gray-500 dark:text-sb-light/60 mt-1">{roleLabels[userRole]}</p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
