import { z } from "zod";
import { createTRPCRouter, tenantProcedure, adminProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";
import { loggingService } from "@/server/logging/loggingService";
import { validateAttendanceToken } from "@/server/utils/attendanceToken";

// ─── Validación ───────────────────────────────────────────────────

const createEventSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  date: z.date(),
  isSchoolWide: z.boolean().default(false),
  groupIds: z.array(z.string()).min(1), // Mínimo 1 grupo si no es school wide
  amount: z.number().int().min(1).max(10_000_000),
  dueDate: z.date(),
});

// ─── Router ────────────────────────────────────────────────────────

export const eventsRouter = createTRPCRouter({
  // Crear evento
  create: adminProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      // Validar grupos si no es school wide
      if (!input.isSchoolWide && input.groupIds.length > 0) {
        const groups = await db.group.findMany({
          where: {
            id: { in: input.groupIds },
            tenantId,
          },
        });

        if (groups.length !== input.groupIds.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Uno o más grupos no fueron encontrados",
          });
        }
      }

      // Idempotence: Check if event with same name and date already exists
      const existingEvent = await db.event.findFirst({
        where: {
          tenantId,
          name: input.name,
          date: input.date,
        },
        include: {
          groups: { select: { id: true, name: true } },
        },
      });

      if (existingEvent) {
        return { ...existingEvent, _isIdempotent: true };
      }

      // Crear evento
      const event = await db.event.create({
        data: {
          tenantId,
          name: input.name,
          description: input.description,
          date: input.date,
          isSchoolWide: input.isSchoolWide,
          amount: input.amount,
          paymentDueDate: input.dueDate,
          status: "PENDING",
          groups: !input.isSchoolWide
            ? {
                connect: input.groupIds.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          groups: { select: { id: true, name: true } },
        },
      });

      // Obtener alumnos afectados
      let studentIds: string[] = [];

      if (input.isSchoolWide) {
        // Todos los alumnos activos de la escuela
        const students = await db.student.findMany({
          where: {
            tenantId,
            status: "ACTIVE",
          },
          select: { id: true },
        });
        studentIds = students.map((s) => s.id);
      } else {
        // Alumnos de los grupos seleccionados (sin duplicados)
        const enrollments = await db.enrollment.findMany({
          where: {
            groupId: { in: input.groupIds },
            status: "ACTIVE",
          },
          distinct: ["studentId"],
          select: { studentId: true },
        });
        studentIds = enrollments.map((e) => e.studentId);
      }

      // Crear EventPayment para cada alumno
      if (studentIds.length > 0) {
        const eventPayments = studentIds.map((studentId) => ({
          eventId: event.id,
          studentId,
          amount: input.amount,
          status: "PENDING",
          dueDate: input.dueDate,
        }));

        await db.eventPayment.createMany({
          data: eventPayments,
        });

        await loggingService.logAudit({
          tenantId,
          userId: ctx.userId,
          action: "CREATE",
          entity: "Event",
          entityId: event.id,
          newValues: event as any,
        });

        await loggingService.logBusinessEvent({
          tenantId,
          userId: ctx.userId,
          eventType: "EVENT_CREATED",
          entityType: "Event",
          entityId: event.id,
          metadata: {
            name: event.name,
            studentCount: studentIds.length,
            amount: input.amount,
          },
        });
      }

      return { ...event, _isIdempotent: false };
    }),

  // Obtener evento con detalles
  getById: tenantProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      const event = await db.event.findFirst({
        where: {
          id: input.id,
          tenantId,
        },
        include: {
          groups: { select: { id: true, name: true } },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento no encontrado",
        });
      }

      return event;
    }),

  // Listar eventos
  list: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;
      const skip = (input.page - 1) * input.pageSize;

      const [events, total] = await Promise.all([
        db.event.findMany({
          where: { tenantId },
          skip,
          take: input.pageSize,
          orderBy: { date: "desc" },
          include: {
            groups: { select: { id: true, name: true } },
            _count: {
              select: { eventPayments: true },
            },
          },
        }),
        db.event.count({ where: { tenantId } }),
      ]);

      return {
        events,
        total,
        pages: Math.ceil(total / input.pageSize),
        page: input.page,
      };
    }),

  // Obtener estadísticas del evento
  getStats: tenantProcedure
    .input(z.object({ eventId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      const event = await db.event.findFirst({
        where: {
          id: input.eventId,
          tenantId,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento no encontrado",
        });
      }

      const payments = await db.eventPayment.findMany({
        where: { eventId: input.eventId },
      });

      const stats = {
        total: payments.length,
        willAttend: payments.filter((p) => p.willAttend === true).length,
        notAttending: payments.filter((p) => p.willAttend === false).length,
        unconfirmed: payments.filter((p) => p.willAttend === null).length,

        paid: payments.filter((p) => p.status === "PAID").length,
        pending: payments.filter(
          (p) => p.status === "PENDING" && p.willAttend === true
        ).length,
        notAttendingCount: payments.filter(
          (p) => p.status === "NOT_ATTENDING"
        ).length,

        // totalExpected: Sum considering discounts already applied on paid payments
        totalExpected: payments
          .filter((p) => p.willAttend === true)
          .reduce((sum, p) => {
            if (p.status === "PAID") {
              return sum + (p.amount - (p.discountAmount || 0));
            }
            return sum + p.amount;
          }, 0),
        // totalCollected: Sum of actual amounts paid minus discounts
        totalCollected: payments
          .filter((p) => p.status === "PAID")
          .reduce((sum, p) => sum + (p.amount - (p.discountAmount || 0)), 0),
      };

      return stats;
    }),

  // Obtener pagos del evento con paginación
  getPayments: tenantProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: z
          .enum(["PENDING", "PAID", "NOT_ATTENDING", "CANCELLED"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;
      const skip = (input.page - 1) * input.pageSize;

      // Verificar que el evento pertenece al tenant
      const event = await db.event.findFirst({
        where: {
          id: input.eventId,
          tenantId,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento no encontrado",
        });
      }

      const where: Prisma.EventPaymentWhereInput = {
        eventId: input.eventId,
        ...(input.status && { status: input.status }),
      };

      const [payments, total] = await Promise.all([
        db.eventPayment.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        }),
        db.eventPayment.count({ where }),
      ]);

      return {
        payments,
        total,
        pages: Math.ceil(total / input.pageSize),
        page: input.page,
      };
    }),

  // Marcar asistencia (admin)
  markAttendance: adminProcedure
    .input(
      z.object({
        paymentId: z.string().cuid(),
        willAttend: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      const payment = await db.eventPayment.findFirst({
        where: {
          id: input.paymentId,
          event: { tenantId },
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pago de evento no encontrado",
        });
      }

      const oldPayment = payment;
      const newStatus = input.willAttend
        ? "PENDING"
        : "NOT_ATTENDING";

      const updatedPayment = await db.eventPayment.update({
        where: { id: input.paymentId },
        data: {
          willAttend: input.willAttend,
          status: newStatus,
          confirmedAt: new Date(),
          confirmedVia: "admin",
        },
      });

      await loggingService.logAudit({
        tenantId,
        userId: ctx.userId,
        action: "UPDATE",
        entity: "EventPayment",
        entityId: input.paymentId,
        oldValues: oldPayment as any,
        newValues: updatedPayment as any,
      });

      return updatedPayment;
    }),

  // Marcar como pagado
  markAsPaid: adminProcedure
    .input(z.object({
      paymentId: z.string().cuid(),
      method: z.enum(["CASH", "TRANSFER", "CARD", "OXXO", "SPEI"]).optional(),
      discountAmount: z.number().int().min(0).default(0), // descuento en centavos
    }))
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      const payment = await db.eventPayment.findFirst({
        where: {
          id: input.paymentId,
          event: { tenantId },
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pago de evento no encontrado",
        });
      }

      // Validar que el descuento no sea mayor al monto del pago
      if (input.discountAmount > payment.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El descuento no puede ser mayor al monto del pago",
        });
      }

      const oldPayment = payment;
      const updatedPayment = await db.eventPayment.update({
        where: { id: input.paymentId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          discountAmount: input.discountAmount,
        },
      });

      await Promise.all([
        loggingService.logAudit({
          tenantId,
          userId: ctx.userId,
          action: "UPDATE",
          entity: "EventPayment",
          entityId: input.paymentId,
          oldValues: oldPayment as any,
          newValues: updatedPayment as any,
        }),
        loggingService.logBusinessEvent({
          tenantId,
          userId: ctx.userId,
          eventType: "PAYMENT_MARKED_AS_PAID",
          entityType: "EventPayment",
          entityId: input.paymentId,
          metadata: {
            method: input.method,
            discountAmount: input.discountAmount,
            paidAmount: payment.amount - input.discountAmount,
          },
        }),
      ]);

      if (input.discountAmount > 0) {
        await loggingService.logBusinessEvent({
          tenantId,
          userId: ctx.userId,
          eventType: "DISCOUNT_APPLIED",
          entityType: "EventPayment",
          entityId: input.paymentId,
          metadata: {
            discountAmount: input.discountAmount,
            originalAmount: payment.amount,
            finalAmount: payment.amount - input.discountAmount,
          },
        });
      }

      return updatedPayment;
    }),

  // Confirmar asistencia desde link de WhatsApp (público)
  confirmAttendanceFromLink: publicProcedure
    .input(
      z.object({
        eventPaymentId: z.string().cuid(),
        willAttend: z.boolean(),
        token: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      if (!validateAttendanceToken(input.token, input.eventPaymentId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Token inválido o expirado" });
      }

      const payment = await db.eventPayment.findUnique({
        where: { id: input.eventPaymentId },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registro no encontrado",
        });
      }

      const oldPayment = payment;

      // Nunca degradar un pago ya realizado: si el papá re-clickea el link
      // después de pagar, solo se actualiza su confirmación de asistencia.
      const newStatus = payment.status === "PAID"
        ? "PAID"
        : input.willAttend ? "PENDING" : "NOT_ATTENDING";

      const updatedPayment = await db.eventPayment.update({
        where: { id: input.eventPaymentId },
        data: {
          willAttend: input.willAttend,
          status: newStatus,
          confirmedAt: new Date(),
          confirmedVia: "whatsapp_link",
        },
      });

      const event = await db.event.findUnique({
        where: { id: payment.eventId },
      });

      if (event) {
        await loggingService.logAudit({
          tenantId: event.tenantId,
          userId: null,
          action: "UPDATE",
          entity: "EventPayment",
          entityId: input.eventPaymentId,
          oldValues: oldPayment as any,
          newValues: updatedPayment as any,
        });
      }

      return updatedPayment;
    }),

  // Actualizar evento
  update: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        date: z.date().optional(),
        amount: z.number().int().min(1).optional(),
        paymentDueDate: z.date().optional().nullable(),
        dueDate: z.date().optional(),
        status: z.enum(["PENDING", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;
      const { id, ...data } = input;

      const event = await db.event.findFirst({
        where: { id, tenantId },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento no encontrado",
        });
      }

      // If amount is being increased, generate additional charges for students who already paid
      if (data.amount && data.amount > event.amount) {
        const priceDifference = data.amount - event.amount;

        // Find all students who have already paid
        const paidPayments = await db.eventPayment.findMany({
          where: {
            eventId: id,
            status: "PAID",
          },
          select: { studentId: true, willAttend: true },
        });

        // Create additional charge for each student who paid
        if (paidPayments.length > 0) {
          await db.eventPayment.createMany({
            data: paidPayments.map((payment) => ({
              eventId: id,
              studentId: payment.studentId,
              amount: priceDifference,
              status: "PENDING",
              dueDate: data.paymentDueDate || data.date || event.date,
              willAttend: payment.willAttend, // Inherit attendance status
            })),
            skipDuplicates: true, // Avoid duplicates if run multiple times
          });
        }
      }

      return db.event.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          date: data.date,
          amount: data.amount,
          paymentDueDate: data.paymentDueDate !== undefined ? data.paymentDueDate : undefined,
          status: data.status,
        },
      });
    }),

  // Eliminar evento
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      const event = await db.event.findFirst({
        where: { id: input.id, tenantId },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento no encontrado",
        });
      }

      // Eliminar el evento (cascade elimina los pagos)
      return db.event.delete({ where: { id: input.id } });
    }),

  // Generar pagos faltantes para nuevos alumnos
  generateMissingPayments: adminProcedure
    .input(z.object({ eventId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      // Obtener el evento
      const event = await db.event.findFirst({
        where: { id: input.eventId, tenantId },
        include: { groups: { select: { id: true } } },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento no encontrado",
        });
      }

      // Obtener alumnos que deberían tener pago
      let studentIds: string[] = [];

      if (event.isSchoolWide) {
        // Todos los alumnos activos de la escuela
        const students = await db.student.findMany({
          where: { tenantId, status: "ACTIVE" },
          select: { id: true },
        });
        studentIds = students.map((s) => s.id);
      } else {
        // Alumnos de los grupos del evento
        const enrollments = await db.enrollment.findMany({
          where: {
            group: {
              id: { in: event.groups.map(g => g.id) },
            },
            status: "ACTIVE",
          },
          distinct: ["studentId"],
          select: { studentId: true },
        });
        studentIds = enrollments.map((e) => e.studentId);
      }

      // Idempotence: Use transaction to safely create missing payments
      return db.$transaction(async (tx) => {
        // Get existing payments within transaction for consistency
        const existingPayments = await tx.eventPayment.findMany({
          where: { eventId: input.eventId },
          select: { studentId: true },
        });
        const existingStudentIds = new Set(existingPayments.map((p) => p.studentId));

        // Find students without payment
        const missingStudentIds = studentIds.filter(
          (id) => !existingStudentIds.has(id)
        );

        if (missingStudentIds.length === 0) {
          return { created: 0, message: "No hay alumnos nuevos sin pago" };
        }

        // missingStudentIds already excludes existing payments — batch create
        const { count } = await tx.eventPayment.createMany({
          data: missingStudentIds.map((studentId) => ({
            eventId: input.eventId,
            studentId,
            amount: event.amount,
            status: "PENDING" as const,
            dueDate: event.paymentDueDate || event.date,
          })),
          skipDuplicates: true,
        });

        return { created: count, message: `Se crearon ${count} pago(s) para nuevo(s) alumno(s)` };
      });
    }),

  // Obtener estadísticas de pagos de eventos del mes
  getMonthlyEventStats: tenantProcedure
    .input(z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { tenantId, db } = ctx;

        const monthStart = new Date(input.year, input.month - 1, 1);
        const monthEnd = new Date(input.year, input.month, 1);

        // Agregación en la BD: antes se traía cada EventPayment del mes
        // (una fila por alumno por evento) solo para sumarlo en JS.
        const [filteredEvents, paymentGroups] = await Promise.all([
          db.event.findMany({
            where: {
              tenantId,
              date: { gte: monthStart, lt: monthEnd }
            },
            select: { id: true, name: true, date: true },
          }),
          db.eventPayment.groupBy({
            by: ["eventId", "status"],
            where: {
              event: { tenantId, date: { gte: monthStart, lt: monthEnd } },
            },
            _count: { _all: true },
            _sum:   { amount: true, discountAmount: true },
          }),
        ]);

        const summary = filteredEvents.map((event) => {
          const rows    = paymentGroups.filter(g => g.eventId === event.id);
          const paid    = rows.find(g => g.status === "PAID");
          const pending = rows.find(g => g.status === "PENDING");

          const paidAmount    = (paid?._sum.amount ?? 0) - (paid?._sum.discountAmount ?? 0);
          const pendingAmount = pending?._sum.amount ?? 0;

          return {
            eventId: event.id,
            eventName: event.name,
            eventDate: event.date,
            totalPayments: rows.reduce((sum, g) => sum + g._count._all, 0),
            paidPayments: paid?._count._all ?? 0,
            pendingPayments: pending?._count._all ?? 0,
            paidAmount,
            expectedAmount: paidAmount + pendingAmount,
          };
        });

        const totalPaidAmount = summary.reduce((sum, s) => sum + s.paidAmount, 0);
        const totalExpectedAmount = summary.reduce(
          (sum, s) => sum + s.expectedAmount,
          0
        );

        return {
          events: summary,
          totalPaidAmount,
          totalExpectedAmount,
          eventCount: filteredEvents.length,
        };
      } catch (error) {
        console.error("[getMonthlyEventStats] Error:", error);
        throw error;
      }
    }),

  // Marcar evento como completado
  markAsCompleted: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      const event = await db.event.findFirst({
        where: { id: input.id, tenantId },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evento no encontrado",
        });
      }

      if (event.status === "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este evento ya está marcado como completado",
        });
      }

      const oldEvent = event;
      const updatedEvent = await db.event.update({
        where: { id: input.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await loggingService.logAudit({
        tenantId,
        userId: ctx.userId,
        action: "UPDATE",
        entity: "Event",
        entityId: input.id,
        oldValues: oldEvent as any,
        newValues: updatedEvent as any,
      });

      await loggingService.logBusinessEvent({
        tenantId,
        userId: ctx.userId,
        eventType: "EVENT_CREATED",
        entityType: "Event",
        entityId: input.id,
        metadata: {
          action: "marked_as_completed",
          name: updatedEvent.name,
        },
      });

      return updatedEvent;
    }),
});

export type EventsRouter = typeof eventsRouter;
