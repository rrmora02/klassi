import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { TenantSwitcher } from "./tenant-switcher";

export async function TopBar() {
  const { userId } = auth(); // Clerk auth cacheado en layout
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
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        {user && <TenantSwitcher tenants={tenants} activeTenantId={user.activeTenantId} />}
      </div>
      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
