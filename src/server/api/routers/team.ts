import { z } from "zod";
import { createTRPCRouter, adminProcedure, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { invalidateUserCache } from "@/server/cache/userAuthCache";
import { invalidateTenantMembership } from "@/server/cache/tenantMembershipCache";

export const teamRouter = createTRPCRouter({
  
  getMembers: adminProcedure
    .query(async ({ ctx }) => {
      return ctx.db.tenantUser.findMany({
        where: { tenantId: ctx.tenantId },
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    }),

  getInvitations: adminProcedure
    .query(async ({ ctx }) => {
      return ctx.db.teamInvitation.findMany({
        where: { tenantId: ctx.tenantId, status: "PENDING" },
        orderBy: { createdAt: "desc" }
      });
    }),

  inviteMember: adminProcedure
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

       // Idempotence: Check if invitation already exists
       const existingInvitation = await ctx.db.teamInvitation.findFirst({
         where: { tenantId: ctx.tenantId, email: input.email }
       });

       // If invitation exists and not expired, return it (idempotent)
       if (existingInvitation && existingInvitation.expiresAt > new Date()) {
         return existingInvitation;
       }

       // Generate new token only for new invitations or expired ones
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

  revokeInvitation: adminProcedure
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

  removeMember: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
       // Cannot remove yourself basically
       const member = await ctx.db.tenantUser.findFirst({
         where: { id: input.id, tenantId: ctx.tenantId },
         include: { user: { select: { clerkId: true } } }
       });
       if (!member) throw new TRPCError({ code: "NOT_FOUND" });
       if (member.userId === ctx.dbUser!.id) {
         throw new TRPCError({ code: "FORBIDDEN", message: "No puedes eliminarte a ti mismo de tu propio Tenant." });
       }

       // If removing an INSTRUCTOR, check if they have groups assigned
       if (member.role === "INSTRUCTOR") {
         const instructor = await ctx.db.instructor.findFirst({
           where: { tenantId: ctx.tenantId, userId: member.userId },
           include: {
             _count: { select: { groups: true } }
           }
         });

         if (instructor && instructor._count.groups > 0) {
           throw new TRPCError({
             code: "PRECONDITION_FAILED",
             message: "No se puede revocar porque el instructor tiene grupos asignados. Desasígnalos antes de revocar el acceso."
           });
         }

         // Delete instructor record
         await ctx.db.instructor.deleteMany({
           where: { tenantId: ctx.tenantId, userId: member.userId }
         });
       }

       const deleted = await ctx.db.tenantUser.delete({
         where: { id: input.id }
       });

       // Si esta escuela era su tenant activo, desvincularlo para que no
       // conserve acceso residual, e invalidar sus cachés de auth y membresía.
       await ctx.db.user.updateMany({
         where: { id: member.userId, activeTenantId: ctx.tenantId },
         data:  { activeTenantId: null }
       });
       invalidateUserCache(member.user.clerkId);
       invalidateTenantMembership(ctx.tenantId, member.userId);

       return deleted;
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

  acceptInvitation: protectedProcedure
    .input(z.object({
      token: z.string()
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

       // Identidad SIEMPRE derivada de la sesión de Clerk, nunca del input:
       // quien posea el link no puede aceptar la invitación a nombre de otro.
       const clerkId = ctx.userId;
       let email = ctx.dbUser?.email ?? null;
       let name  = ctx.dbUser?.name ?? null;

       if (!email) {
         const { clerkClient } = await import("@clerk/nextjs/server");
         const client    = await clerkClient();
         const clerkUser = await client.users.getUser(clerkId);
         email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
              ?? clerkUser.emailAddresses[0]?.emailAddress
              ?? null;
         name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email;
       }

       if (!email) {
         throw new TRPCError({ code: "BAD_REQUEST", message: "Tu cuenta no tiene un correo verificado." });
       }

       // Validate that the session email matches the invitation (case-insensitive, trimmed)
       const invitationEmail = invitation.email.toLowerCase().trim();
       const sessionEmail    = email.toLowerCase().trim();

       if (invitationEmail !== sessionEmail) {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "El correo de tu sesión no coincide con el de la invitación."
         });
       }

       // Get or create user
       // First, try to find by clerkId (already registered)
       let user = await ctx.db.user.findUnique({
         where: { clerkId }
       });

       if (!user) {
         // If not found by clerkId, search by email (might be pending instructor)
         const userByEmail = await ctx.db.user.findFirst({
           where: { email }
         });

         if (userByEmail) {
           // Update existing pending user with real clerkId
           const oldClerkId = userByEmail.clerkId;
           user = await ctx.db.user.update({
             where: { id: userByEmail.id },
             data: { clerkId, name: name ?? userByEmail.name }
           });
           invalidateUserCache(oldClerkId);
         } else {
           // Create new user
           user = await ctx.db.user.create({
             data: {
               clerkId,
               email,
               name: name ?? email
             }
           });
         }
       }

       // Add user to tenant
       const existingMember = await ctx.db.tenantUser.findFirst({
         where: { tenantId: invitation.tenantId, userId: user.id }
       });

       if (existingMember) {
         throw new TRPCError({ code: "CONFLICT", message: "Ya eres miembro de este equipo." });
       }

       // Membresía + instructor + activeTenant + invitación en una transacción:
       // un fallo a medias dejaría al invitado en un estado inconsistente.
       await ctx.db.$transaction(async (tx) => {
         await tx.tenantUser.create({
           data: {
             tenantId: invitation.tenantId,
             userId: user.id,
             role: invitation.role
           }
         });

         // If role is INSTRUCTOR, create the instructor record (if not already exists)
         if (invitation.role === "INSTRUCTOR") {
           const existingInstructor = await tx.instructor.findFirst({
             where: { tenantId: invitation.tenantId, userId: user.id }
           });

           if (!existingInstructor) {
             await tx.instructor.create({
               data: {
                 tenantId: invitation.tenantId,
                 userId: user.id
               }
             });
           }
         }

         // Set this tenant as the user's active tenant
         await tx.user.update({
           where: { id: user.id },
           data: { activeTenantId: invitation.tenantId }
         });

         // Mark invitation as accepted
         await tx.teamInvitation.update({
           where: { id: invitation.id },
           data: { status: "ACCEPTED" }
         });
       });

       // El contexto tRPC cachea el usuario (TTL 10 min); sin esto el recién
       // invitado seguiría viendo "No perteneces a ninguna escuela".
       invalidateUserCache(clerkId);

       return { success: true, tenantId: invitation.tenantId };
    })
});
