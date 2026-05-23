import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

export const POST = async (req: NextRequest) => {
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

  try {
    const pathname = req.nextUrl.pathname;
    const procedurePath = pathname.replace('/api-test-simple/', '');

    const body = await req.json();

    const context = {
      headers: req.headers,
      db,
      userId: tenantUser.user.clerkId,
      tenantId,
      dbUser: tenantUser.user,
    };

    const caller = appRouter.createCaller(context);
    const parts = procedurePath.split('.');

    let procedure: any = caller;
    for (const part of parts) {
      procedure = procedure[part];
    }

    const result = await procedure(body);
    return Response.json(result);
  } catch (error: any) {
    console.error(`Error calling procedure:`, error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
};
