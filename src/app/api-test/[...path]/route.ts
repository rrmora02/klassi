import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

async function handler(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');

  if (!tenantId) {
    return Response.json(
      { error: 'TENANT_ID required in x-tenant-id header' },
      { status: 400 }
    );
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    return Response.json(
      { error: 'Tenant not found' },
      { status: 404 }
    );
  }

  // Get a user from the tenant for context (use the tenant owner or any user)
  const tenantUser = await db.tenantUser.findFirst({
    where: { tenantId },
    include: { user: true },
  });

  if (!tenantUser) {
    return Response.json(
      { error: 'No users found in tenant' },
      { status: 403 }
    );
  }

  return fetchRequestHandler({
    endpoint: "/api-test",
    req,
    router: appRouter,
    createContext: async () => ({
      headers: req.headers,
      db,
      userId: tenantUser.user.clerkId,
      tenantId: tenantId,
      dbUser: tenantUser.user,
    }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => console.error(`tRPC error on ${path}:`, error)
        : undefined,
  });
}

export { handler as GET, handler as POST };
