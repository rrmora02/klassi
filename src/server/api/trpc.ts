import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import superjson from "superjson";
import { ZodError } from "zod";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/server/db";
import { loggingService } from "@/server/logging/loggingService";
import { formatErrorForLogging } from "@/server/logging/error-parser";
import { getUserByClerkId } from "@/server/cache/userAuthCache";
import { createCacheInvalidationMiddleware } from "@/server/cache/cacheInvalidationMiddleware";
import { metricsCollector } from "@/server/metrics/metricsCollector";

// ─── Contexto ────────────────────────────────────────────────────

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { userId } = await auth();

  let tenantId = null;
  let dbUser = null;
  if (userId) {
    const user = await getUserByClerkId(userId, db);
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

// ─── Helpers ─────────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set(["password", "token", "secret", "cardNumber", "cvv", "pin", "authorization"]);

function sanitizeForLogging(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(sanitizeForLogging);
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : sanitizeForLogging(v),
    ])
  );
}

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

      // Capture to Sentry
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(err, {
          contexts: {
            trpc: {
              path,
              type,
              rawInput: rawInput ? JSON.stringify(sanitizeForLogging(rawInput)).substring(0, 1000) : undefined,
            },
            user: {
              id: ctx.userId,
              tenant_id: ctx.tenantId,
            },
          },
          level: err instanceof TRPCError ? "warning" : "error",
        });
      }
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

const cacheInvalidation = createCacheInvalidationMiddleware(t);

const metricsEnabled = process.env.ENABLE_METRICS === "true";

const performanceMetrics = metricsEnabled
  ? t.middleware(async ({ next, path, type }) => {
      const startTime = Date.now();
      const result = await next();
      const duration = Date.now() - startTime;

      try {
        const responseSize = JSON.stringify(result).length;
        const hasCacheHit = path.includes("list") || path.includes("get");
        metricsCollector.recordProcedure(
          `${path} (${type})`,
          duration,
          responseSize,
          hasCacheHit
        );
      } catch (e) {
        // Silently fail if metrics recording fails
      }

      return result;
    })
  : t.middleware(async ({ next }) => next());

// ─── Exports ─────────────────────────────────────────────────────

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure.use(errorHandler).use(performanceMetrics);
export const protectedProcedure = t.procedure.use(errorHandler).use(performanceMetrics).use(isAuthenticated);
export const tenantProcedure = t.procedure.use(errorHandler).use(performanceMetrics).use(hasTenant).use(cacheInvalidation);
export const superAdminProcedure = t.procedure.use(errorHandler).use(performanceMetrics).use(isSuperAdmin);
