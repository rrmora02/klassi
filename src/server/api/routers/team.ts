import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const teamRouter = createTRPCRouter({
  
  getMembers: tenantProcedure
    .query(async ({ ctx }) => {
      return ctx.db.tenantUser.findMany({
        where: { tenantId: ctx.tenantId },
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    }),

  getInvitations: tenantProcedure
    .query(async ({ ctx }) => {
      return ctx.db.teamInvitation.findMany({
        where: { tenantId: ctx.tenantId, status: "PENDING" },
        orderBy: { createdAt: "desc" }
      });
    }),

  inviteMember: tenantProcedure
    .input(z.object({
       email: z.string().email("Correo inválido"),
       role:  z.enum(["ADMIN", "RECEPTIONIST"]),
    }))
    .mutation(async ({ ctx, input }) => {
       // Validate not already active
       const existingUser = await ctx.db.user.findUnique({ where: { email: input.email } });
       if (existingUser) {
         const isMember = await ctx.db.tenantUser.findFirst({
           where: { tenantId: ctx.tenantId, userId: existingUser.id }
         });
         if (isMember) {
           throw new TRPCError({ code: "CONFLICT", message: "Este correo ya es miembro del equipo." });
         }
       }

       // Upsert invitation (token is generated uniquely)
       const crypto = require("crypto");
       const token = crypto.randomBytes(32).toString("hex");

       const expiration = new Date();
       expiration.setDate(expiration.getDate() + 7); // Expires in 7 days

       return ctx.db.teamInvitation.upsert({
         where: { tenantId_email: { tenantId: ctx.tenantId, email: input.email } },
         create: {
           tenantId: ctx.tenantId,
           email: input.email,
           role: input.role,
           token: token,
           expiresAt: expiration,
           invitedBy: ctx.dbUser!.id,
           status: "PENDING"
         },
         update: {
           role: input.role,
           token: token,
           expiresAt: expiration,
           status: "PENDING"
         }
       });
    }),

  revokeInvitation: tenantProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
       const invite = await ctx.db.teamInvitation.findFirst({
         where: { id: input.id, tenantId: ctx.tenantId }
       });
       if (!invite) throw new TRPCError({ code: "NOT_FOUND" });

       return ctx.db.teamInvitation.delete({
         where: { id: input.id }
       });
    }),

  removeMember: tenantProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
       // Cannot remove yourself basically
       const member = await ctx.db.tenantUser.findFirst({
         where: { id: input.id, tenantId: ctx.tenantId }
       });
       if (!member) throw new TRPCError({ code: "NOT_FOUND" });
       if (member.userId === ctx.dbUser!.id) {
         throw new TRPCError({ code: "FORBIDDEN", message: "No puedes eliminarte a ti mismo de tu propio Tenant." });
       }

       return ctx.db.tenantUser.delete({
         where: { id: input.id }
       });
    })
});
