import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/db";

// ─── Contexto ────────────────────────────────────────────────────

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { userId } = await auth();

  let tenantId = null;
  let dbUser = null;
  if (userId) {
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    tenantId = user?.activeTenantId ?? null;
    dbUser = user;
  }

  return {
    db,
    userId,
    tenantId,
    dbUser,
    ...opts,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ─── tRPC init ───────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ─── Middlewares ─────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

const hasTenant = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN", message: "No perteneces a ninguna escuela" });
  return next({ ctx: { ...ctx, userId: ctx.userId, tenantId: ctx.tenantId } });
});

// ─── Exports ─────────────────────────────────────────────────────

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const tenantProcedure = t.procedure.use(hasTenant);
