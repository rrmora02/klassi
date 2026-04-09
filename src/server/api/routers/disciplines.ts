import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
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

  create: tenantProcedure
    .input(z.object({
      name:           z.string().min(1),
      description:    z.string().optional(),
      color:          z.string().optional(),
      extraFieldsDef: z.array(extraFieldDefSchema).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.discipline.findFirst({
        where: { tenantId: ctx.tenantId, name: input.name },
      });
      if (exists) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una disciplina con ese nombre" });
      return ctx.db.discipline.create({
        data: { ...input, tenantId: ctx.tenantId },
      });
    }),

  update: tenantProcedure
    .input(z.object({
      id:             z.string(),
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

  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const groupCount = await ctx.db.group.count({
        where: { disciplineId: input.id, tenantId: ctx.tenantId },
      });
      if (groupCount > 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No se puede eliminar una disciplina con grupos activos" });
      return ctx.db.discipline.delete({ where: { id: input.id } });
    }),
});
