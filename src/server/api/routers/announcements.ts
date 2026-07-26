import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  createNotifications,
  dispatchPendingDeliveries,
  resolveAnnouncementRecipients,
} from "@/server/services/notification.service";

export const announcementsRouter = createTRPCRouter({

  list: staffProcedure
    .input(z.object({
      page:     z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const [announcements, total] = await Promise.all([
        ctx.db.announcement.findMany({
          where:   { tenantId: ctx.tenantId },
          skip,
          take:    input.pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.announcement.count({ where: { tenantId: ctx.tenantId } }),
      ]);
      return { announcements, total, pages: Math.ceil(total / input.pageSize) };
    }),

  create: staffProcedure
    .input(z.object({
      title:        z.string().min(1, "El título es requerido").max(200),
      body:         z.string().min(1, "El cuerpo es requerido").max(5000),
      targetAll:    z.boolean().default(true),
      // Admite groupIds y alumnos específicos con prefijo "student:<id>"
      targetGroups: z.array(
        z.string().refine(
          (v) => z.string().cuid().safeParse(v.replace(/^student:/, "")).success,
          "Destinatario inválido",
        ),
      ).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.announcement.create({
        data: {
          tenantId:     ctx.tenantId,
          title:        input.title,
          body:         input.body,
          targetAll:    input.targetAll,
          targetGroups: input.targetGroups,
        },
      });
    }),

  send: staffProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.announcement.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      if (!announcement) throw new TRPCError({ code: "NOT_FOUND" });
      if (announcement.sentAt)  throw new TRPCError({ code: "BAD_REQUEST", message: "Este comunicado ya fue enviado" });

      // Fan-out: padres de los alumnos destinatarios reciben la notificación
      // por los canales disponibles (in-app, push, email). Outbox + despacho inline.
      const recipientIds = await resolveAnnouncementRecipients(
        ctx.tenantId,
        announcement.targetAll,
        (announcement.targetGroups as string[]) ?? [],
      );

      const { created } = await createNotifications({
        tenantId: ctx.tenantId,
        userIds:  recipientIds,
        type:     "announcement",
        title:    announcement.title,
        body:     announcement.body,
        data:     { url: "/portal/notificaciones", announcementId: announcement.id },
      });

      const updated = await ctx.db.announcement.update({
        where: { id: input.id },
        data:  { sentAt: new Date() },
      });

      // Entrega inline; si algo falla, el cron dispatch-notifications reintenta
      await dispatchPendingDeliveries().catch((err) => {
        console.error("[announcements.send] dispatch error:", err);
      });

      return { ...updated, recipients: created };
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.announcement.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      if (!announcement) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.announcement.delete({ where: { id: input.id } });
    }),
});
