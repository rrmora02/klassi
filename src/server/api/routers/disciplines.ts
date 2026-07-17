import { z } from "zod";
import { createTRPCRouter, tenantProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Definición de un campo extendido de disciplina
const extraFieldDefSchema = z.object({
  key:      z.string(),
  label:    z.string(),
  type:     z.enum(["text", "number", "select", "date", "boolean"]),
  required: z.boolean().default(false),
  options:  z.array(z.string()).optional(), // para type = "select"
});

export const disciplinesRouter = createTRPCRouter({

  list: tenantProcedure
    .query(({ ctx }) =>
      ctx.db.discipline.findMany({
        where:   { tenantId: ctx.tenantId },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { groups: true } } },
      })
    ),

  byId: tenantProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const resp = await ctx.db.discipline.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      if (!resp) throw new TRPCError({ code: "NOT_FOUND", message: "Disciplina no encontrada" });
      return resp;
    }),

  create: adminProcedure
    .input(z.object({
      name:           z.string().min(1),
      description:    z.string().optional(),
      color:          z.string().optional(),
      extraFieldsDef: z.array(extraFieldDefSchema).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Idempotence: Check if discipline with same name already exists
      const exists = await ctx.db.discipline.findFirst({
        where: { tenantId: ctx.tenantId, name: input.name },
      });
      if (exists) {
        return exists;
      }

      return ctx.db.discipline.create({
        data: { ...input, tenantId: ctx.tenantId },
      });
    }),

  update: adminProcedure
    .input(z.object({
      id:             z.string().cuid(),
      name:           z.string().min(1).optional(),
      description:    z.string().optional(),
      color:          z.string().optional(),
      isActive:       z.boolean().optional(),
      extraFieldsDef: z.array(extraFieldDefSchema).optional(),
      sortOrder:      z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const exists = await ctx.db.discipline.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!exists) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.discipline.update({ where: { id }, data });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const groupCount = await ctx.db.group.count({
        where: { disciplineId: input.id, tenantId: ctx.tenantId },
      });
      if (groupCount > 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No se puede eliminar una disciplina con grupos activos" });
      return ctx.db.discipline.delete({ where: { id: input.id } });
    }),
});
