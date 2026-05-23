import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest, NextResponse } from "next/server";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

// Test endpoint - allows k6 load testing without Clerk auth
export async function POST(req: NextRequest) {
  // Get TENANT_ID from headers
  const tenantId = req.headers.get('x-tenant-id');

  if (!tenantId) {
    return NextResponse.json(
      { error: 'TENANT_ID required in x-tenant-id header' },
      { status: 400 }
    );
  }

  // Verify tenant exists
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    );
  }

  // Clone request for tRPC handler
  const clonedReq = req.clone();

  // Call tRPC with mock context (no auth required for testing)
  return fetchRequestHandler({
    endpoint: "/api/test-trpc",
    req: clonedReq,
    router: appRouter,
    createContext: async () => ({
      headers: req.headers,
      session: {
        user: {
          id: 'test-user-k6',
          email: 'k6@test.example.com',
          name: 'k6 Test User',
        },
      },
      // Add tenantId for queries that need it
      tenantId,
    }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => console.error(`tRPC error on ${path}:`, error)
        : undefined,
  });
}
