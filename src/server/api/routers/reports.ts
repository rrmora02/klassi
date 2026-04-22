import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";

export const reportsRouter = createTRPCRouter({

  monthlyRevenue: tenantProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const from = new Date(input.year, i, 1);
          const to   = new Date(input.year, i + 1, 0, 23, 59, 59);
          return ctx.db.payment.aggregate({
            where: { tenantId: ctx.tenantId, status: "PAID", paidAt: { gte: from, lte: to } },
            _sum: { amount: true }, _count: true,
          }).then(r => ({ month: i + 1, total: r._sum.amount ?? 0, count: r._count }));
        })
      );
      return results;
    }),

  byDiscipline: tenantProcedure
    .input(z.object({ year: z.number(), month: z.number().min(1).max(12).optional() }))
    .query(async ({ ctx, input }) => {
      const from = input.month
        ? new Date(input.year, input.month - 1, 1)
        : new Date(input.year, 0, 1);
      const to = input.month
        ? new Date(input.year, input.month, 0, 23, 59, 59)
        : new Date(input.year, 11, 31, 23, 59, 59);

      const disciplines = await ctx.db.discipline.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        select: {
          id: true, name: true, color: true,
          groups: {
            where: { tenantId: ctx.tenantId },
            select: {
              enrollments: {
                where: { status: "ACTIVE" },
                select: { _count: true },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      return disciplines.map(d => ({
        id:       d.id,
        name:     d.name,
        color:    d.color,
        students: d.groups.reduce((acc, g) => acc + g.enrollments.length, 0),
      }));
    }),

  attendanceSummary: tenantProcedure
    .input(z.object({ from: z.date(), to: z.date() }))
    .query(async ({ ctx, input }) => {
      const [present, absent, justified, late] = await Promise.all([
        ctx.db.attendance.count({ where: { enrollment: { group: { tenantId: ctx.tenantId } }, status: "PRESENT",   session: { date: { gte: input.from, lte: input.to } } } }),
        ctx.db.attendance.count({ where: { enrollment: { group: { tenantId: ctx.tenantId } }, status: "ABSENT",    session: { date: { gte: input.from, lte: input.to } } } }),
        ctx.db.attendance.count({ where: { enrollment: { group: { tenantId: ctx.tenantId } }, status: "JUSTIFIED", session: { date: { gte: input.from, lte: input.to } } } }),
        ctx.db.attendance.count({ where: { enrollment: { group: { tenantId: ctx.tenantId } }, status: "LATE",      session: { date: { gte: input.from, lte: input.to } } } }),
      ]);
      const total = present + absent + justified + late;
      return { present, absent, justified, late, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    }),

  paymentCollectionRate: tenantProcedure
    .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1);
      const to   = new Date(input.year, input.month,     0, 23, 59, 59);

      const [paid, total] = await Promise.all([
        ctx.db.payment.count({ where: { tenantId: ctx.tenantId, status: "PAID",    paidAt:  { gte: from, lte: to } } }),
        ctx.db.payment.count({ where: { tenantId: ctx.tenantId, status: { in: ["PAID", "PENDING", "OVERDUE"] }, dueDate: { gte: from, lte: to } } }),
      ]);
      return { paid, total, rate: total > 0 ? Math.round((paid / total) * 100) : 0 };
    }),
});
