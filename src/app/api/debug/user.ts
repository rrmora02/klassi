import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "No authenticated" }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        activeTenant: true,
        memberships: {
          include: { tenant: true }
        }
      }
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Get role for active tenant
    let activeRole = null;
    if (user.activeTenantId) {
      const tenantUser = await db.tenantUser.findFirst({
        where: {
          userId: user.id,
          tenantId: user.activeTenantId
        }
      });
      activeRole = tenantUser?.role || "NOT FOUND";
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        clerkId: user.clerkId,
        activeTenantId: user.activeTenantId,
        activeTenant: user.activeTenant?.name || "None"
      },
      activeRole,
      allMemberships: user.memberships.map(m => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        role: m.role
      }))
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
