import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { loggingService } from "@/server/logging/loggingService";

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
      dueDate:   z.date(),
      force:     z.boolean().default(false), // ignorar validación de duplicados
    }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.studentId, tenantId: ctx.tenantId },
      });
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      // Idempotence: Check if exact payment already exists (same concept, amount, dueDate)
      const dueDate = input.dueDate || new Date();
      const existingExactPayment = await ctx.db.payment.findFirst({
        where: {
          studentId: input.studentId,
          tenantId: ctx.tenantId,
          concept: input.concept,
          amount: input.amount,
          dueDate,
          status: { not: "CANCELLED" },
        },
      });

      if (existingExactPayment) {
        return { ...existingExactPayment, _isIdempotent: true };
      }

      // Check for duplicate payments in the same month (unless force is true)
      if (!input.force) {
        const monthStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
        const monthEnd = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0, 23, 59, 59);

        const existingPaymentInMonth = await ctx.db.payment.findFirst({
          where: {
            studentId: input.studentId,
            tenantId: ctx.tenantId,
            dueDate: { gte: monthStart, lte: monthEnd },
            status: { in: ["PENDING", "PAID"] },
          },
        });

        if (existingPaymentInMonth) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Ya existe un pago registrado para este estudiante en ${monthStart.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}`,
          });
        }
      }

      const { force, ...paymentData } = input;
      const newPayment = await ctx.db.payment.create({
        data: { ...paymentData, tenantId: ctx.tenantId, status: "PENDING", dueDate },
      });

      await Promise.all([
        loggingService.logAudit({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: "CREATE",
          entity: "Payment",
          entityId: newPayment.id,
          newValues: newPayment as any,
        }),
        loggingService.logBusinessEvent({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          eventType: "PAYMENT_CREATED",
          entityType: "Payment",
          entityId: newPayment.id,
          metadata: { concept: newPayment.concept, amount: newPayment.amount, studentId: newPayment.studentId },
        }),
      ]);

      return { ...newPayment, _isIdempotent: false };
    }),

  markAsPaid: tenantProcedure
    .input(z.object({
      id:        z.string(),
      method:    z.nativeEnum(PaymentMethod),
      reference: z.string().optional(),
      paidAt:    z.date().default(() => new Date()),
      discountAmount: z.number().int().min(0).default(0), // descuento en centavos
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, discountAmount, ...data } = input;
      const payment = await ctx.db.payment.findFirst({
        where: { id, tenantId: ctx.tenantId },
        select: { id: true, amount: true },
      });
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });

      // Validar que el descuento no sea mayor al monto del pago
      if (discountAmount > payment.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El descuento no puede ser mayor al monto del pago",
        });
      }

      const oldPayment = await ctx.db.payment.findFirst({
        where: { id },
      });

      const updatedPayment = await ctx.db.payment.update({
        where: { id },
        data:  { ...data, status: "PAID", discountAmount },
      });

      const loggingPromises = [
        loggingService.logAudit({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: "UPDATE",
          entity: "Payment",
          entityId: id,
          oldValues: oldPayment as any,
          newValues: updatedPayment as any,
        }),
        loggingService.logBusinessEvent({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          eventType: "PAYMENT_MARKED_AS_PAID",
          entityType: "Payment",
          entityId: id,
          metadata: {
            method: data.method,
            discountAmount: discountAmount,
            paidAmount: payment.amount - discountAmount,
          },
        }),
      ];

      if (discountAmount > 0) {
        loggingPromises.push(
          loggingService.logBusinessEvent({
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            eventType: "DISCOUNT_APPLIED",
            entityType: "Payment",
            entityId: id,
            metadata: {
              discountAmount: discountAmount,
              originalAmount: payment.amount,
              finalAmount: payment.amount - discountAmount,
            },
          })
        );
      }

      await Promise.all(loggingPromises);

      return updatedPayment;
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
        ctx.db.payment.findMany({ where: { tenantId: ctx.tenantId, status: "PAID",    paidAt: { gte: from, lte: to } }, select: { amount: true, discountAmount: true } }),
        ctx.db.payment.findMany({ where: { tenantId: ctx.tenantId, status: "PENDING", dueDate: { gte: from, lte: to } }, select: { amount: true } }),
        ctx.db.payment.findMany({ where: { tenantId: ctx.tenantId, status: "OVERDUE"                                 }, select: { amount: true } }),
      ]);

      return {
        paid:    { total: paid.reduce((sum, p) => sum + (p.amount - (p.discountAmount || 0)), 0), count: paid.length },
        pending: { total: pending.reduce((sum, p) => sum + p.amount, 0), count: pending.length },
        overdue: { total: overdue.reduce((sum, p) => sum + p.amount, 0), count: overdue.length },
      };
    }),

  checkMonthlyPaymentExists: tenantProcedure
    .input(z.object({
      studentId: z.string(),
      month: z.number().min(1).max(12),
      year: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.year, input.month - 1, 1);
      const to = new Date(input.year, input.month, 0, 23, 59, 59);

      const existingPayment = await ctx.db.payment.findFirst({
        where: {
          studentId: input.studentId,
          tenantId: ctx.tenantId,
          dueDate: { gte: from, lte: to },
          status: { in: ["PENDING", "PAID"] },
        },
        select: { id: true, concept: true, amount: true, status: true, dueDate: true },
        orderBy: { dueDate: "desc" },
      });

      return { exists: !!existingPayment, payment: existingPayment };
    }),
});
