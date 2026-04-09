import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export const paymentsRouter = createTRPCRouter({

  list: tenantProcedure
    .input(z.object({
      studentId: z.string().optional(),
      status:    z.nativeEnum(PaymentStatus).optional(),
      from:      z.date().optional(),
      to:        z.date().optional(),
      page:      z.number().default(1),
      pageSize:  z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const where = {
        tenantId: ctx.tenantId,
        ...(input.studentId && { studentId: input.studentId }),
        ...(input.status    && { status: input.status }),
        ...(input.from || input.to ? {
          dueDate: {
            ...(input.from && { gte: input.from }),
            ...(input.to   && { lte: input.to }),
          },
        } : {}),
      };

      const [payments, total] = await Promise.all([
        ctx.db.payment.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: { dueDate: "desc" },
          include: { student: { select: { firstName: true, lastName: true } } },
        }),
        ctx.db.payment.count({ where }),
      ]);

      return { payments, total, pages: Math.ceil(total / input.pageSize) };
    }),

  overdueList: tenantProcedure
    .query(({ ctx }) =>
      ctx.db.payment.findMany({
        where: {
          tenantId: ctx.tenantId,
          status:   "OVERDUE",
        },
        include: { student: { select: { firstName: true, lastName: true, phone: true, email: true } } },
        orderBy: { dueDate: "asc" },
      })
    ),

  create: tenantProcedure
    .input(z.object({
      studentId: z.string(),
      concept:   z.string().min(1),
      amount:    z.number().int().positive(), // en centavos
      currency:  z.string().default("MXN"),
      method:    z.nativeEnum(PaymentMethod).default("CASH"),
      dueDate:   z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.studentId, tenantId: ctx.tenantId },
      });
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.payment.create({
        data: { ...input, tenantId: ctx.tenantId, status: "PENDING" },
      });
    }),

  markAsPaid: tenantProcedure
    .input(z.object({
      id:        z.string(),
      method:    z.nativeEnum(PaymentMethod),
      reference: z.string().optional(),
      paidAt:    z.date().default(() => new Date()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const payment = await ctx.db.payment.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.payment.update({
        where: { id },
        data:  { ...data, status: "PAID" },
      });
    }),

  summary: tenantProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year:  z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1);
      const to   = new Date(input.year, input.month, 0, 23, 59, 59);

      const [paid, pending, overdue] = await Promise.all([
        ctx.db.payment.aggregate({ where: { tenantId: ctx.tenantId, status: "PAID",    paidAt: { gte: from, lte: to } }, _sum: { amount: true }, _count: true }),
        ctx.db.payment.aggregate({ where: { tenantId: ctx.tenantId, status: "PENDING", dueDate: { gte: from, lte: to } }, _sum: { amount: true }, _count: true }),
        ctx.db.payment.aggregate({ where: { tenantId: ctx.tenantId, status: "OVERDUE"                                 }, _sum: { amount: true }, _count: true }),
      ]);

      return {
        paid:    { total: paid._sum.amount    ?? 0, count: paid._count },
        pending: { total: pending._sum.amount ?? 0, count: pending._count },
        overdue: { total: overdue._sum.amount ?? 0, count: overdue._count },
      };
    }),
});
