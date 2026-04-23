import { z } from "zod";
import { createTRPCRouter, tenantProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const tenantsRouter = createTRPCRouter({

  createTenant: protectedProcedure
    .input(z.object({
      name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create new tenant
      const tenant = await ctx.db.tenant.create({
        data: {
          name: input.name,
          slug: input.name.toLowerCase().replace(/\s+/g, "-"),
          primaryColor: "#00754A",
        }
      });

      // Add user as ADMIN to the tenant
      await ctx.db.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: ctx.dbUser!.id,
          role: "ADMIN"
        }
      });

      // Set as active tenant for the user
      await ctx.db.user.update({
        where: { id: ctx.dbUser!.id },
        data: { activeTenantId: tenant.id }
      });

      return tenant;
    }),

  getMyTenant: tenantProcedure
    .query(async ({ ctx }) => {
      const tenant = await ctx.db.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          primaryColor: true,
          phone: true,
          email: true,
          address: true,
        }
      });
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
      return tenant;
    }),

  updateMyTenant: tenantProcedure
    .input(z.object({
      name:         z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
      primaryColor: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Debe ser código hexadecimal ej. #1D3557").optional().or(z.literal("")),
      logo:         z.string().url("Debe ser URL válida").optional().or(z.literal("")),
      phone:        z.string().optional().or(z.literal("")),
      email:        z.string().email("Correo inválido").optional().or(z.literal("")),
      address:      z.string().optional().or(z.literal("")),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tenant.update({
        where: { id: ctx.tenantId },
        data: {
          name:         input.name,
          primaryColor: input.primaryColor || null,
          logo:         input.logo || null,
          phone:        input.phone || null,
          email:        input.email || null,
          address:      input.address || null,
        }
      });
    })
});
