import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Notificaciones del usuario autenticado (staff o padre) — no requieren
// tenant activo: un padre puede tener hijos en varias escuelas.

export const notificationsRouter = createTRPCRouter({

  list: protectedProcedure
    .input(z.object({
      page:       z.number().default(1),
      pageSize:   z.number().max(50).default(20),
      unreadOnly: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });
      const where = {
        userId: ctx.dbUser.id,
        ...(input.unreadOnly ? { readAt: null } : {}),
      };
      const [notifications, total, unread] = await Promise.all([
        ctx.db.notification.findMany({
          where,
          skip:    (input.page - 1) * input.pageSize,
          take:    input.pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.notification.count({ where }),
        ctx.db.notification.count({ where: { userId: ctx.dbUser.id, readAt: null } }),
      ]);
      return { notifications, total, unread, pages: Math.ceil(total / input.pageSize) };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.dbUser) return 0;
    return ctx.db.notification.count({ where: { userId: ctx.dbUser.id, readAt: null } });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });
      return ctx.db.notification.updateMany({
        where: { id: input.id, userId: ctx.dbUser.id, readAt: null },
        data:  { readAt: new Date() },
      });
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });
    return ctx.db.notification.updateMany({
      where: { userId: ctx.dbUser.id, readAt: null },
      data:  { readAt: new Date() },
    });
  }),

  // ── Suscripciones Web Push ──────────────────────────────────────

  subscribePush: protectedProcedure
    .input(z.object({
      endpoint:  z.string().url(),
      p256dh:    z.string().min(1),
      auth:      z.string().min(1),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });
      return ctx.db.pushSubscription.upsert({
        where:  { endpoint: input.endpoint },
        update: { userId: ctx.dbUser.id, p256dh: input.p256dh, auth: input.auth, userAgent: input.userAgent },
        create: {
          userId:    ctx.dbUser.id,
          endpoint:  input.endpoint,
          p256dh:    input.p256dh,
          auth:      input.auth,
          userAgent: input.userAgent,
        },
      });
    }),

  unsubscribePush: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });
      return ctx.db.pushSubscription.deleteMany({
        where: { endpoint: input.endpoint, userId: ctx.dbUser.id },
      });
    }),

  pushStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.dbUser) return { devices: 0 };
    const devices = await ctx.db.pushSubscription.count({ where: { userId: ctx.dbUser.id } });
    return { devices };
  }),
});
