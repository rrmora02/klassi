import { UserButton } from "@clerk/nextjs";
import { TenantSwitcher } from "./tenant-switcher";
import { ThemeToggle } from "./theme-toggle";
import { TourButton } from "./tour-button";
import type { UserRole } from "@prisma/client";

export const revalidate = 0;
export const dynamic = "force-dynamic";

interface TopBarProps {
  tenants: Array<{ id: string; name: string }>;
  activeTenantId: string | null;
  userRole: UserRole;
}

export async function TopBar({ tenants, activeTenantId, userRole }: TopBarProps) {
  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    RECEPTIONIST: "Recepcionista",
    INSTRUCTOR: "Instructor",
    SUPER_ADMIN: "Super admin",
    PARENT: "Tutor",
  };

  return (
    <div className="flex h-16 flex-1 items-center justify-between bg-white dark:bg-sb-uplift px-4 md:px-6">
      <div className="flex items-center gap-3">
        <TenantSwitcher tenants={tenants} activeTenantId={activeTenantId} userRole={userRole} />
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
