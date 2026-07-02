import { UserButton } from "@clerk/nextjs";
import { db } from "@/server/db";
import { getCurrentContext } from "@/server/request-context";
import { PLANS } from "@/config/plans";
import { TenantSwitcher } from "./tenant-switcher";
import { ThemeToggle } from "./theme-toggle";
import { TourButton } from "./tour-button";

const roleLabels: Record<string, string> = {
  ADMIN:        "Administrador",
  RECEPTIONIST: "Recepcionista",
  INSTRUCTOR:   "Instructor",
};

/** Placeholder mientras el TopBar resuelve sus datos (streaming del shell). */
export function TopBarSkeleton() {
  return (
    <div className="flex h-16 flex-1 items-center justify-between bg-white dark:bg-sb-uplift px-4 md:px-6">
      <div className="h-9 w-40 animate-pulse rounded-lg bg-gray-100 dark:bg-sb-house" />
      <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-100 dark:bg-sb-house" />
    </div>
  );
}

export async function TopBar() {
  // Identidad compartida del request — misma consulta que layout/página
  // gracias a React.cache(), sin round-trips duplicados.
  const ctx = await getCurrentContext();

  let tenants: { id: string; name: string; isOwned: boolean; isChild: boolean; isBlocked?: boolean; blockReason?: string; parentName?: string }[] = [];
  let userRole = "RECEPTIONIST";
  let canAddSchool = false;

  if (ctx) {
    userRole = ctx.activeRole ?? "RECEPTIONIST";

    tenants = ctx.user.memberships.map(m => ({
      id:      m.tenant.id,
      name:    m.tenant.name,
      isOwned: m.tenant.createdByUserId === ctx.user.id,
      isChild: m.tenant.parentTenantId !== null,
      isBlocked: m.tenant.blockChildWrites ?? false,
      blockReason: m.tenant.blockChildWritesReason || undefined,
      parentName: m.tenant.parentTenant?.name || undefined,
    }));

    // Regla de canAddSchool con los datos ya cargados: solo cuesta un count.
    if (userRole === "ADMIN" && ctx.activeTenant?.plan === "ENTERPRISE" && ctx.activeTenant.status === "ACTIVE") {
      const count  = await db.tenant.count({ where: { createdByUserId: ctx.user.id } });
      canAddSchool = count < PLANS.ENTERPRISE.schools;
    }
  }

  return (
    <div className="flex h-16 flex-1 items-center justify-between bg-white dark:bg-sb-uplift px-4 md:px-6">
      <div className="flex items-center gap-3">
        {ctx && (
          <TenantSwitcher
            tenants={tenants}
            activeTenantId={ctx.user.activeTenantId}
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
