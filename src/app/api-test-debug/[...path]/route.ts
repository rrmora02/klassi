import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

export const POST = async (req: NextRequest) => {
  const reqStartTime = Date.now();
  const tenantId = req.headers.get('x-tenant-id');

  if (!tenantId) {
    return Response.json(
      { error: 'TENANT_ID required in x-tenant-id header' },
      { status: 400 }
    );
  }

  // Log: Check tenant
  const tenantCheckStart = Date.now();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId }
  });
  const tenantCheckTime = Date.now() - tenantCheckStart;

  if (!tenant) {
    return Response.json(
      { error: 'Tenant not found' },
      { status: 404 }
    );
  }

  // Log: Find tenant user
  const tenantUserStart = Date.now();
  const tenantUser = await db.tenantUser.findFirst({
    where: { tenantId },
    include: { user: true },
  });
  const tenantUserTime = Date.now() - tenantUserStart;

  if (!tenantUser) {
    return Response.json(
      { error: 'No users found in tenant' },
      { status: 403 }
    );
  }

  try {
    const pathname = req.nextUrl.pathname;
    const procedurePath = pathname.replace('/api-test-debug/', '');

    const bodyStart = Date.now();
    const body = await req.json();
    const bodyTime = Date.now() - bodyStart;

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

    const procStart = Date.now();
    const result = await procedure(body);
    const procTime = Date.now() - procStart;

    const totalTime = Date.now() - reqStartTime;

    // Add timing info to response
    const responseWithTiming = {
      ...result,
      _timing: {
        total: totalTime,
        tenantCheck: tenantCheckTime,
        tenantUser: tenantUserTime,
        bodyParse: bodyTime,
        procedure: procTime,
      }
    };

    console.log(`[${procedurePath}] Total: ${totalTime}ms (tenantCheck: ${tenantCheckTime}ms, tenantUser: ${tenantUserTime}ms, procedure: ${procTime}ms)`);

    return Response.json(responseWithTiming);
  } catch (error: any) {
    console.error(`Error calling procedure:`, error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
};
