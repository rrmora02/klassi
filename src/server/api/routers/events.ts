import { z } from "zod";
import { createTRPCRouter, tenantProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Prisma } from "@prisma/client";

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
  create: tenantProcedure
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

      // Crear evento
      const event = await db.event.create({
        data: {
          tenantId,
          name: input.name,
          description: input.description,
          date: input.date,
          isSchoolWide: input.isSchoolWide,
          amount: input.amount,
          status: "ACTIVE",
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
        await db.eventPayment.createMany({
          data: studentIds.map((studentId) => ({
            eventId: event.id,
            studentId,
            amount: input.amount,
            status: "PENDING",
            dueDate: input.dueDate,
          })),
        });
      }

      return event;
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

        totalExpected:
          payments.filter((p) => p.willAttend === true).length * event.amount,
        totalCollected: payments
          .filter((p) => p.status === "PAID")
          .reduce((sum, p) => sum + p.amount, 0),
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
  markAttendance: tenantProcedure
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

      const newStatus = input.willAttend
        ? "PENDING"
        : "NOT_ATTENDING";

      return db.eventPayment.update({
        where: { id: input.paymentId },
        data: {
          willAttend: input.willAttend,
          status: newStatus,
          confirmedAt: new Date(),
          confirmedVia: "admin",
        },
      });
    }),

  // Marcar como pagado
  markAsPaid: tenantProcedure
    .input(z.object({ paymentId: z.string().cuid() }))
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

      return db.eventPayment.update({
        where: { id: input.paymentId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });
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

      // TODO: Validar token (implementar después)
      // const isValid = await validateToken(input.token, input.eventPaymentId);
      // if (!isValid) throw new TRPCError({ code: "FORBIDDEN", message: "Token inválido" });

      const payment = await db.eventPayment.findUnique({
        where: { id: input.eventPaymentId },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registro no encontrado",
        });
      }

      const newStatus = input.willAttend ? "PENDING" : "NOT_ATTENDING";

      return db.eventPayment.update({
        where: { id: input.eventPaymentId },
        data: {
          willAttend: input.willAttend,
          status: newStatus,
          confirmedAt: new Date(),
          confirmedVia: "whatsapp_link",
        },
      });
    }),

  // Actualizar evento
  update: tenantProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        date: z.date().optional(),
        amount: z.number().int().min(1).optional(),
        dueDate: z.date().optional(),
        status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
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

      return db.event.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          date: data.date,
          amount: data.amount,
          status: data.status,
        },
      });
    }),

  // Eliminar evento
  delete: tenantProcedure
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

  // Obtener estadísticas de pagos de eventos del mes
  getMonthlyEventStats: tenantProcedure
    .input(z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      const monthStart = new Date(input.year, input.month - 1, 1);
      const monthEnd = new Date(input.year, input.month, 1);

      const events = await db.event.findMany({
        where: { tenantId, date: { gte: monthStart, lt: monthEnd } },
        include: {
          eventPayments: {
            where: {
              paidAt: { not: null },
            },
          },
        },
        orderBy: { date: "desc" },
      });

      const summary = events.map((event) => {
        const payments = event.eventPayments;
        const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

        return {
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date,
          totalPayments: payments.length,
          paidPayments: payments.length,
          pendingPayments: 0,
          paidAmount,
          expectedAmount: event.amount * payments.length,
        };
      });

      const totalPaidAmount = summary.reduce((sum, s) => sum + s.paidAmount, 0);
      const totalExpectedAmount = summary.reduce((sum, s) => sum + s.expectedAmount, 0);

      return {
        events: summary,
        totalPaidAmount,
        totalExpectedAmount,
        eventCount: events.length,
      };
    }),
});

export type EventsRouter = typeof eventsRouter;
