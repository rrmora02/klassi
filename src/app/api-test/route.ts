import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

// Simple test endpoint for k6 load testing
export async function POST(req: NextRequest) {
  try {
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
      endpoint: "/api-test",
      req,
      router: appRouter,
      createContext: async () => ({
        headers: req.headers,
        session: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      }),
      onError:
        process.env.NODE_ENV === "development"
          ? ({ path, error }) => console.error(`tRPC error on ${path}:`, error)
          : undefined,
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
