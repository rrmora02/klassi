import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

// Only available outside production — used for k6 load testing
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

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

  return fetchRequestHandler({
    endpoint: "/api/test-trpc",
    req,
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
    }),
    onError: ({ path, error }) => console.error(`tRPC error on ${path}:`, error),
  });
}
