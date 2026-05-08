import { z } from "zod";
import { createTRPCRouter, tenantProcedure, superAdminProcedure } from "@/server/api/trpc";
import { loggingService } from "@/server/logging/loggingService";
import { TRPCError } from "@trpc/server";
import type { AuditAction } from "@prisma/client";

export const auditRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        entity: z.string().optional(),
        action: z.enum(["CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT"] as const).optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return loggingService.getAuditLogs(ctx.tenantId, {
        userId: input.userId,
        entity: input.entity,
        action: input.action as AuditAction | undefined,
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
        userId: z.string().optional(),
        entity: z.string().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.auditLog.findMany({
        where: {
          ...(input.tenantId && { tenantId: input.tenantId }),
          ...(input.userId && { userId: input.userId }),
          ...(input.entity && { entity: input.entity }),
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

      const total = await ctx.db.auditLog.count({
        where: {
          ...(input.tenantId && { tenantId: input.tenantId }),
          ...(input.userId && { userId: input.userId }),
          ...(input.entity && { entity: input.entity }),
        },
      });

      return {
        logs,
        total,
        pages: Math.ceil(total / input.pageSize),
      };
    }),

  export: tenantProcedure
    .input(z.object({
      from: z.date().optional(),
      to: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.auditLog.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.from || input.to
            ? {
                createdAt: {
                  ...(input.from && { gte: input.from }),
                  ...(input.to && { lte: input.to }),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      });

      return logs;
    }),
});
