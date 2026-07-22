import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  createReceiptUploadUrl,
  createReceiptViewUrl,
  RECEIPT_CONTENT_TYPES,
  RECEIPT_MAX_BYTES,
} from "@/server/services/storage.service";
import { createNotifications, dispatchPendingDeliveries } from "@/server/services/notification.service";
import type { TRPCContext } from "@/server/api/trpc";

// ─── Comprobantes: helpers ───────────────────────────────────────
// El tutor solo puede tocar pagos PENDING/OVERDUE de sus propios hijos.
// receiptUrl guarda la RUTA en el bucket privado; la lectura siempre
// es por URL firmada de corta vida.

const receiptTarget = z.object({
  kind: z.enum(["payment", "event"]),
  id:   z.string().cuid(),
});

async function findParentPayment(ctx: TRPCContext, kind: "payment" | "event", id: string) {
  if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (kind === "payment") {
    const payment = await ctx.db.payment.findFirst({
      where: {
        id,
        student: { parents: { some: { userId: ctx.dbUser.id } } },
      },
      include: { student: { select: { firstName: true, lastName: true } } },
    });
    if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
    return {
      tenantId:   payment.tenantId,
      status:     payment.status as string,
      receiptUrl: payment.receiptUrl,
      concept:    payment.concept,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
    };
  }

  const eventPayment = await ctx.db.eventPayment.findFirst({
    where: {
      id,
      student: { parents: { some: { userId: ctx.dbUser.id } } },
    },
    include: {
      event:   { select: { tenantId: true, name: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  });
  if (!eventPayment) throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
  return {
    tenantId:   eventPayment.event.tenantId,
    status:     eventPayment.status,
    receiptUrl: eventPayment.receiptUrl,
    concept:    eventPayment.event.name,
    studentName: `${eventPayment.student.firstName} ${eventPayment.student.lastName}`,
  };
}

const UPLOADABLE_STATUSES = ["PENDING", "OVERDUE"];

// Portal de familias (PWA): consultas del padre/tutor autenticado.
// No usa tenantProcedure — un padre puede tener hijos en varias escuelas
// y su acceso se deriva siempre de ParentStudent, nunca del tenant activo.

export const portalRouter = createTRPCRouter({

  summary: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

    const links = await ctx.db.parentStudent.findMany({
      where:   { userId: ctx.dbUser.id },
      include: {
        student: {
          include: {
            tenant: { select: { id: true, name: true, slug: true, logo: true, primaryColor: true } },
            enrollments: {
              where:   { status: "ACTIVE" },
              include: { group: { select: { id: true, name: true, schedule: true, discipline: { select: { name: true, color: true, icon: true } } } } },
            },
          },
        },
      },
    });

    const students   = links.map(l => l.student);
    const studentIds = students.map(s => s.id);

    const pendingPayments = studentIds.length > 0
      ? await ctx.db.payment.findMany({
          where:   { studentId: { in: studentIds }, status: { in: ["PENDING", "OVERDUE"] } },
          orderBy: { dueDate: "asc" },
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        })
      : [];

    return {
      user:     { name: ctx.dbUser.name },
      students,
      pendingPayments,
    };
  }),

  myPayments: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

    const links = await ctx.db.parentStudent.findMany({
      where:  { userId: ctx.dbUser.id },
      select: { studentId: true },
    });
    const studentIds = links.map(l => l.studentId);
    if (studentIds.length === 0) return [];

    return ctx.db.payment.findMany({
      where:   { studentId: { in: studentIds } },
      orderBy: [{ status: "asc" }, { dueDate: "desc" }],
      take:    100,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        tenant:  { select: { name: true } },
      },
    });
  }),

  myEventPayments: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

    const links = await ctx.db.parentStudent.findMany({
      where:  { userId: ctx.dbUser.id },
      select: { studentId: true },
    });
    const studentIds = links.map(l => l.studentId);
    if (studentIds.length === 0) return [];

    return ctx.db.eventPayment.findMany({
      where:   { studentId: { in: studentIds }, status: { in: ["PENDING", "PAID", "NOT_ATTENDING"] } },
      orderBy: [{ status: "asc" }, { dueDate: "desc" }],
      take:    50,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        event:   { select: { name: true, description: true, tenant: { select: { name: true } } } },
      },
    });
  }),

  // Confirmar (o rechazar) asistencia a un evento desde la app.
  // Reemplaza el flujo del enlace público de WhatsApp: aquí el tutor está
  // autenticado y solo puede confirmar por sus propios hijos.
  confirmEventAttendance: protectedProcedure
    .input(z.object({ eventPaymentId: z.string().cuid(), willAttend: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

      const eventPayment = await ctx.db.eventPayment.findFirst({
        where: {
          id:      input.eventPaymentId,
          student: { parents: { some: { userId: ctx.dbUser.id } } },
        },
      });
      if (!eventPayment) throw new TRPCError({ code: "NOT_FOUND", message: "Evento no encontrado" });

      // Nunca degradar un pago ya realizado; solo actualizar la confirmación
      const newStatus = eventPayment.status === "PAID"
        ? "PAID"
        : input.willAttend ? "PENDING" : "NOT_ATTENDING";

      await ctx.db.eventPayment.update({
        where: { id: input.eventPaymentId },
        data: {
          willAttend:   input.willAttend,
          status:       newStatus,
          confirmedAt:  new Date(),
          confirmedVia: "portal",
        },
      });

      return { ok: true, willAttend: input.willAttend };
    }),

  // ── Comprobantes de pago ────────────────────────────────────────

  getReceiptUploadUrl: protectedProcedure
    .input(receiptTarget.extend({
      contentType: z.string(),
      fileSize:    z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const payment = await findParentPayment(ctx, input.kind, input.id);

      if (!UPLOADABLE_STATUSES.includes(payment.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este pago ya no admite comprobantes" });
      }
      const ext = RECEIPT_CONTENT_TYPES[input.contentType];
      if (!ext) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Formato no permitido. Usa una foto (JPG/PNG/WebP) o un PDF." });
      }
      if (input.fileSize > RECEIPT_MAX_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo supera el límite de 10 MB" });
      }

      try {
        const path = `${payment.tenantId}/${input.kind}/${input.id}/${Date.now()}.${ext}`;
        return await createReceiptUploadUrl(path);
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Error de almacenamiento" });
      }
    }),

  attachReceipt: protectedProcedure
    .input(receiptTarget.extend({ path: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const payment = await findParentPayment(ctx, input.kind, input.id);

      if (!UPLOADABLE_STATUSES.includes(payment.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este pago ya no admite comprobantes" });
      }
      // La ruta debe ser la emitida para ESTE pago (evita apuntar a archivos ajenos)
      if (!input.path.startsWith(`${payment.tenantId}/${input.kind}/${input.id}/`)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ruta de comprobante inválida" });
      }

      if (input.kind === "payment") {
        await ctx.db.payment.update({ where: { id: input.id }, data: { receiptUrl: input.path } });
      } else {
        await ctx.db.eventPayment.update({ where: { id: input.id }, data: { receiptUrl: input.path } });
      }

      // Avisar al staff de la escuela para que lo verifique y marque pagado
      const staff = await ctx.db.tenantUser.findMany({
        where:  { tenantId: payment.tenantId, role: { in: ["ADMIN", "RECEPTIONIST"] } },
        select: { userId: true },
      });
      if (staff.length > 0) {
        await createNotifications({
          tenantId: payment.tenantId,
          userIds:  staff.map(s => s.userId),
          type:     "payment.receipt",
          title:    "Comprobante de pago recibido",
          body:     `${payment.studentName} — ${payment.concept}. Revísalo y marca el pago como pagado.`,
          data:     { url: input.kind === "payment" ? "/dashboard/pagos" : "/dashboard/eventos" },
        }).catch((err) => console.error("[portal.attachReceipt] notify error:", err));
        await dispatchPendingDeliveries().catch(() => {});
      }

      return { ok: true };
    }),

  getReceiptViewUrl: protectedProcedure
    .input(receiptTarget)
    .query(async ({ ctx, input }) => {
      const payment = await findParentPayment(ctx, input.kind, input.id);
      if (!payment.receiptUrl) throw new TRPCError({ code: "NOT_FOUND", message: "Este pago no tiene comprobante" });
      try {
        return { url: await createReceiptViewUrl(payment.receiptUrl) };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Error de almacenamiento" });
      }
    }),
});
