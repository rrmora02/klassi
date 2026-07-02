import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const announcementsRouter = createTRPCRouter({

  list: staffProcedure
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

  create: staffProcedure
    .input(z.object({
      title:        z.string().min(1, "El título es requerido").max(200),
      body:         z.string().min(1, "El cuerpo es requerido").max(5000),
      targetAll:    z.boolean().default(true),
      targetGroups: z.array(z.string().cuid()).default([]),
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

      return ctx.db.announcement.update({
        where: { id: input.id },
        data:  { sentAt: new Date() },
      });
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
