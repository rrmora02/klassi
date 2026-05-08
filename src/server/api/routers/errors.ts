import { z } from "zod";
import { createTRPCRouter, tenantProcedure, superAdminProcedure } from "@/server/api/trpc";
import { loggingService } from "@/server/logging/loggingService";
import { TRPCError } from "@trpc/server";
import type { LogSeverity } from "@prisma/client";

export const errorsRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.object({
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).optional(),
        resolved: z.boolean().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return loggingService.getErrorLogs(ctx.tenantId, {
        severity: input.severity as LogSeverity | undefined,
        resolved: input.resolved,
        from: input.from,
        to: input.to,
        page: input.page,
        pageSize: input.pageSize,
      });
    }),

  listAll: superAdminProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).optional(),
        resolved: z.boolean().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.errorLog.findMany({
        where: {
          ...(input.tenantId ? { tenantId: input.tenantId } : { tenantId: null }),
          ...(input.severity && { severity: input.severity }),
          ...(input.resolved !== undefined && { resolved: input.resolved }),
          ...(input.from || input.to
            ? {
                createdAt: {
                  ...(input.from && { gte: input.from }),
                  ...(input.to && { lte: input.to }),
                },
              }
            : {}),
        },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      const total = await ctx.db.errorLog.count({
        where: {
          ...(input.tenantId ? { tenantId: input.tenantId } : { tenantId: null }),
          ...(input.severity && { severity: input.severity }),
          ...(input.resolved !== undefined && { resolved: input.resolved }),
        },
      });

      return {
        logs,
        total,
        pages: Math.ceil(total / input.pageSize),
      };
    }),

  resolve: superAdminProcedure
    .input(z.object({ errorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const errorLog = await ctx.db.errorLog.findUnique({
        where: { id: input.errorId },
      });

      if (!errorLog) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Error log not found" });
      }

      return loggingService.resolveErrorLog(input.errorId, ctx.userId);
    }),

  getSummary: superAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      days: z.number().default(7),
    }))
    .query(async ({ ctx, input }) => {
      const from = new Date();
      from.setDate(from.getDate() - input.days);

      const where = {
        createdAt: { gte: from },
        ...(input.tenantId ? { tenantId: input.tenantId } : { tenantId: null }),
      };

      const [critical, high, medium, low, total] = await Promise.all([
        ctx.db.errorLog.count({ where: { ...where, severity: "CRITICAL" } }),
        ctx.db.errorLog.count({ where: { ...where, severity: "HIGH" } }),
        ctx.db.errorLog.count({ where: { ...where, severity: "MEDIUM" } }),
        ctx.db.errorLog.count({ where: { ...where, severity: "LOW" } }),
        ctx.db.errorLog.count({ where }),
      ]);

      return {
        critical,
        high,
        medium,
        low,
        total,
        byType: await ctx.db.errorLog.groupBy({
          by: ["errorType"],
          where,
          _count: true,
        }),
      };
    }),
});
