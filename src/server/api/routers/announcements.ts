import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const announcementsRouter = createTRPCRouter({

  list: tenantProcedure
    .input(z.object({
      page:     z.number().default(1),
      pageSize: z.number().default(20),
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

  create: tenantProcedure
    .input(z.object({
      title:        z.string().min(1, "El título es requerido"),
      body:         z.string().min(1, "El cuerpo es requerido"),
      targetAll:    z.boolean().default(true),
      targetGroups: z.array(z.string()).default([]),
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

  send: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.announcement.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      if (!announcement) throw new TRPCError({ code: "NOT_FOUND" });
      if (announcement.sentAt)  throw new TRPCError({ code: "BAD_REQUEST", message: "Este comunicado ya fue enviado" });

      return ctx.db.announcement.update({
        where: { id: input.id },
        data:  { sentAt: new Date() },
      });
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const announcement = await ctx.db.announcement.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      if (!announcement) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.announcement.delete({ where: { id: input.id } });
    }),
});
