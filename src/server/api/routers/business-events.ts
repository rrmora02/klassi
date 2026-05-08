import { z } from "zod";
import { createTRPCRouter, tenantProcedure, superAdminProcedure } from "@/server/api/trpc";
import { loggingService } from "@/server/logging/loggingService";
import type { BusinessEventType } from "@prisma/client";

const BUSINESS_EVENT_TYPES = [
  "PAYMENT_CREATED",
  "PAYMENT_MARKED_AS_PAID",
  "PAYMENT_CANCELLED",
  "DISCOUNT_APPLIED",
  "STUDENT_ENROLLED",
  "STUDENT_UNENROLLED",
  "STUDENT_CREATED",
  "STUDENT_UPDATED",
  "STUDENT_DELETED",
  "ATTENDANCE_RECORDED",
  "USER_INVITED",
  "USER_ROLE_CHANGED",
  "GROUP_CREATED",
  "GROUP_UPDATED",
  "EVENT_CREATED",
  "EVENT_CANCELLED",
] as const;

export const businessEventsRouter = createTRPCRouter({
  list: tenantProcedure
    .input(
      z.object({
        eventType: z.enum(BUSINESS_EVENT_TYPES).optional(),
        entityType: z.string().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return loggingService.getBusinessEvents(ctx.tenantId, {
        eventType: input.eventType as BusinessEventType | undefined,
        entityType: input.entityType,
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
        eventType: z.enum(BUSINESS_EVENT_TYPES).optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const events = await ctx.db.businessEvent.findMany({
        where: {
          ...(input.tenantId && { tenantId: input.tenantId }),
          ...(input.eventType && { eventType: input.eventType }),
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

      const total = await ctx.db.businessEvent.count({
        where: {
          ...(input.tenantId && { tenantId: input.tenantId }),
          ...(input.eventType && { eventType: input.eventType }),
        },
      });

      return {
        events,
        total,
        pages: Math.ceil(total / input.pageSize),
      };
    }),

  getMetrics: tenantProcedure
    .input(z.object({
      days: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const from = new Date();
      from.setDate(from.getDate() - input.days);

      const where = {
        tenantId: ctx.tenantId,
        createdAt: { gte: from },
      };

      const metrics = await ctx.db.businessEvent.groupBy({
        by: ["eventType"],
        where,
        _count: true,
      });

      const byDay = await ctx.db.businessEvent.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      const eventsByDay: Record<string, number> = {};
      byDay.forEach((event) => {
        const day = event.createdAt.toISOString().split("T")[0];
        eventsByDay[day] = (eventsByDay[day] || 0) + 1;
      });

      return {
        byEventType: metrics,
        byDay: eventsByDay,
        total: byDay.length,
      };
    }),
});
