import { z } from "zod";
import { createTRPCRouter, tenantProcedure, publicProcedure } from "@/server/api/trpc";
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
       role:  z.enum(["ADMIN", "RECEPTIONIST", "INSTRUCTOR"]),
    }))
    .mutation(async ({ ctx, input }) => {
       // Validate not already active
       const existingUser = await ctx.db.user.findFirst({ where: { email: input.email } });
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
    }),

  getInvitationByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
       const invitation = await ctx.db.teamInvitation.findFirst({
         where: { token: input.token, status: "PENDING" },
         include: {
           tenant: { select: { id: true, name: true } }
         }
       });

       if (!invitation) {
         throw new TRPCError({ code: "NOT_FOUND", message: "Invitación no válida o expirada." });
       }

       if (new Date() > invitation.expiresAt) {
         throw new TRPCError({ code: "BAD_REQUEST", message: "La invitación ha expirado." });
       }

       return {
         email: invitation.email,
         role: invitation.role,
         tenantName: invitation.tenant.name,
         tenantId: invitation.tenant.id,
         invitationId: invitation.id
       };
    }),

  acceptInvitation: publicProcedure
    .input(z.object({
      token: z.string(),
      clerkId: z.string(),
      email: z.string().email(),
      name: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
       const invitation = await ctx.db.teamInvitation.findFirst({
         where: { token: input.token, status: "PENDING" }
       });

       if (!invitation) {
         throw new TRPCError({ code: "NOT_FOUND", message: "Invitación no válida." });
       }

       if (new Date() > invitation.expiresAt) {
         throw new TRPCError({ code: "BAD_REQUEST", message: "La invitación ha expirado." });
       }

       // Validate that the email matches the invitation (case-insensitive)
       if (invitation.email.toLowerCase() !== input.email.toLowerCase()) {
         throw new TRPCError({ code: "FORBIDDEN", message: "El correo no coincide con la invitación. Esta invitación fue dirigida a " + invitation.email });
       }

       // Get or create user
       let user = await ctx.db.user.findUnique({
         where: { clerkId: input.clerkId }
       });

       if (!user) {
         user = await ctx.db.user.create({
           data: {
             clerkId: input.clerkId,
             email: input.email,
             name: input.name
           }
         });
       }

       // Add user to tenant
       const existingMember = await ctx.db.tenantUser.findFirst({
         where: { tenantId: invitation.tenantId, userId: user.id }
       });

       if (existingMember) {
         throw new TRPCError({ code: "CONFLICT", message: "Ya eres miembro de este equipo." });
       }

       await ctx.db.tenantUser.create({
         data: {
           tenantId: invitation.tenantId,
           userId: user.id,
           role: invitation.role
         }
       });

       // Mark invitation as accepted
       await ctx.db.teamInvitation.update({
         where: { id: invitation.id },
         data: { status: "ACCEPTED" }
       });

       return { success: true, tenantId: invitation.tenantId };
    })
});
