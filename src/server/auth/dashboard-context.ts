import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";

export const getDashboardContext = cache(async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      clerkId: true,
      activeTenantId: true,
      isSuperAdmin: true,
      activeTenant: true,
      memberships: {
        select: {
          role: true,
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { tenant: { name: "asc" } },
      },
    },
  });

  if (!user || !user.activeTenantId || !user.activeTenant) {
    redirect("/onboarding");
  }

  const activeMembership = user.memberships.find(
    (membership) => membership.tenant.id === user.activeTenantId
  );

  return {
    userId,
    user,
    tenant: user.activeTenant,
    tenantId: user.activeTenantId,
    userRole: activeMembership?.role || "RECEPTIONIST",
    tenants: user.memberships.map((membership) => membership.tenant),
  };
});
