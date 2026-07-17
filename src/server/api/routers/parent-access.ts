import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createPortalAccessLink, hasRealClerkAccount } from "@/server/services/parent-access.service";

// Acceso de la familia al portal: estado de los tutores de un alumno
// y generación de enlaces mágicos (ver parent-access.service).

export const parentAccessRouter = createTRPCRouter({

  list: staffProcedure
    .input(z.object({ studentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where:   { id: input.studentId, tenantId: ctx.tenantId },
        include: { parents: { include: { user: true } } },
      });
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Alumno no encontrado" });

      return student.parents.map((p) => ({
        userId:       p.userId,
        name:         p.user.name,
        email:        p.user.email.endsWith("@klassi.local") ? null : p.user.email,
        phone:        p.user.phone,
        relationship: p.relationship,
        isPrimary:    p.isPrimary,
        hasAccount:   hasRealClerkAccount(p.user.clerkId),
      }));
    }),

  generateLink: staffProcedure
    .input(z.object({ studentId: z.string().cuid(), userId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // El tutor debe estar vinculado a un alumno de ESTA escuela
      const link = await ctx.db.parentStudent.findFirst({
        where: {
          userId:  input.userId,
          student: { id: input.studentId, tenantId: ctx.tenantId },
        },
      });
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Tutor no encontrado para este alumno" });

      try {
        return await createPortalAccessLink(input.userId);
      } catch (err) {
        throw new TRPCError({
          code:    "BAD_REQUEST",
          message: err instanceof Error ? err.message : "No se pudo generar el enlace de acceso",
        });
      }
    }),
});
