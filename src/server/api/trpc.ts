import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/db";
import { loggingService } from "@/server/logging/loggingService";
import { formatErrorForLogging } from "@/server/logging/error-parser";

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

const errorHandler = t.middleware(async ({ next, ctx, path, type, rawInput }) => {
  try {
    return await next();
  } catch (err) {
    // No registrar errores de validación (ZodError)
    if (!(err instanceof ZodError) && !(err instanceof TRPCError && err.code === "BAD_REQUEST")) {
      const { errorType, message, stack, context } = formatErrorForLogging(err, {
        trpcPath: path,
        trpcType: type,
        userId: ctx.userId,
        tenantId: ctx.tenantId,
      });

      await loggingService.logError({
        tenantId: ctx.tenantId,
        errorType,
        message,
        stack,
        context,
        severity: err instanceof TRPCError ? "MEDIUM" : "HIGH",
      }).catch(e => {
        console.error("[ERROR LOGGING FAILED]", e);
      });
    }

    throw err;
  }
});

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId, dbUser: ctx.dbUser } });
});

const hasTenant = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (!ctx.tenantId) throw new TRPCError({ code: "FORBIDDEN", message: "No perteneces a ninguna escuela" });
  return next({ ctx: { ...ctx, userId: ctx.userId, tenantId: ctx.tenantId, dbUser: ctx.dbUser } });
});

const isSuperAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (!ctx.dbUser?.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Solo super admin puede acceder" });
  return next({ ctx: { ...ctx, userId: ctx.userId, dbUser: ctx.dbUser } });
});

// ─── Exports ─────────────────────────────────────────────────────

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure.use(errorHandler);
export const protectedProcedure = t.procedure.use(errorHandler).use(isAuthenticated);
export const tenantProcedure = t.procedure.use(errorHandler).use(hasTenant);
export const superAdminProcedure = t.procedure.use(errorHandler).use(isSuperAdmin);
