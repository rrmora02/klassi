import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { TenantSwitcher } from "./tenant-switcher";
import { ThemeToggle } from "./theme-toggle";

export async function TopBar() {
  const { userId } = await auth();
  let tenants: any[] = [];
  let user = null;

  if (userId) {
    user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        activeTenant: true,
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (user) {
      tenants = user.memberships.map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
      }));
    }
  }

  return (
    <div className="flex h-16 flex-1 items-center justify-between bg-white dark:bg-sb-uplift px-4 md:px-6">
      <div className="flex items-center gap-3">
        {user && <TenantSwitcher tenants={tenants} activeTenantId={user.activeTenantId} />}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
