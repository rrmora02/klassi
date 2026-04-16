import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { instructorFormSchema } from "@/lib/schemas/instructor.schema";

export const instructorsUpdateSchema = instructorFormSchema.partial().extend({
  id: z.string().cuid("ID inválido"),
});

export const instructorsRouter = createTRPCRouter({

  // ── Listar Instructores (Paginación + Buscador) ─────────────────
  list: tenantProcedure
    .input(z.object({
      search:   z.string().optional(),
      isActive: z.boolean().optional(),
      page:     z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;
      const skip = (input.page - 1) * input.pageSize;

      const where: import("@prisma/client").Prisma.InstructorWhereInput = {
        tenantId,
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.search && {
          OR: [
            { user: { name: { contains: input.search, mode: "insensitive" } } },
            { user: { email: { contains: input.search, mode: "insensitive" } } },
            { phone: { contains: input.search } },
          ],
        }),
      };

      const [instructors, total] = await Promise.all([
        db.instructor.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: { user: { name: "asc" } },
          include: {
            user: true,
            _count: {
              select: { groups: { where: { isActive: true } } },
            },
          },
        }),
        db.instructor.count({ where }),
      ]);

      return {
        instructors,
        total,
        pages: Math.ceil(total / input.pageSize),
        page:  input.page,
      };
    }),

  // ── Detalle específico de instructor ──────────────────────────────
  byId: tenantProcedure
    .input(z.object({ id: z.string().cuid("ID inválido") }))
    .query(async ({ ctx, input }) => {
      const instructor = await ctx.db.instructor.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          user: true,
          groups: {
            include: {
              discipline: true,
              _count: { select: { enrollments: { where: { status: "ACTIVE" } } } }
            },
            orderBy: { name: "asc" },
          },
        },
      });

      if (!instructor) {
        throw new TRPCError({
          code:    "NOT_FOUND",
          message: "Instructor no encontrado",
        });
      }

      return instructor;
    }),

  // ── Crear Instructor ─────────────────────────────────────────────
  create: tenantProcedure
    .input(instructorFormSchema)
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      // Buscar si el correo ya existe en sistema
      let user = await db.user.findFirst({
        where: { email: input.email }
      });

      if (!user) {
        // Crear usuario pendiente
        user = await db.user.create({
          data: {
            clerkId: `pending_${Math.random().toString(36).substring(2, 10)}`,
            email: input.email,
            name: input.name,
          }
        });
      } else {
        // Comprobar si ya existe como instructor en este tenant
        const existingInstructor = await db.instructor.findFirst({
          where: { tenantId, userId: user.id }
        });
        if (existingInstructor) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este usuario ya está registrado como instructor en esta escuela."
          });
        }
      }

      // Crear instructor y ligarlo al usuario
      const instructor = await db.instructor.create({
        data: {
          tenantId,
          userId: user.id,
          phone: input.phone || null,
          bio: input.bio || null,
          isActive: input.isActive,
        },
        include: { user: true },
      });

      return instructor;
    }),

  // ── Actualizar Instructor ────────────────────────────────────────
  update: tenantProcedure
    .input(instructorsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, name, email, ...data } = input;
      const { tenantId, db } = ctx;

      const existingInstructor = await db.instructor.findFirst({
        where: { id, tenantId },
        include: { user: true },
      });

      if (!existingInstructor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instructor no encontrado",
        });
      }

      // Si se intentó cambiar el email, verificamos si choca con otro existente (distinto ID)
      if (email && email !== existingInstructor.user.email) {
        const userConMismoNuevoEmail = await db.user.findFirst({
          where: { email }
        });
        
        if (userConMismoNuevoEmail) {
            // Este correo ya existe, es complicado migrar de user id. 
            // Mostramos alerta.
            throw new TRPCError({
                code: "CONFLICT",
                message: "Ya existe un usuario con este correo electrónico."
            });
        }

        // Actualizamos de todas formas el User si cambiaron nombre / email
        await db.user.update({
          where: { id: existingInstructor.userId },
          data: { email, name: name || existingInstructor.user.name },
        });
      } else if (name && name !== existingInstructor.user.name) {
         // O solo actualiza nombre
         await db.user.update({
            where: { id: existingInstructor.userId },
            data: { name },
         });
      }

      // Actualizar datos propios del instructor
      const updatedInstructor = await db.instructor.update({
        where: { id },
        data: {
          phone: data.phone ?? undefined,
          bio: data.bio ?? undefined,
          isActive: data.isActive ?? undefined,
        },
      });

      return updatedInstructor;
    }),

  // ── Modificar Status Rápidamente ─────────────────────────────────
  setStatus: tenantProcedure
    .input(z.object({
      id: z.string().cuid("ID inválido"),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.instructor.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Instructor no encontrado" });
      }

      return ctx.db.instructor.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  // ── Eliminar Instructor ──────────────────────────────────────────
  delete: tenantProcedure
    .input(z.object({ id: z.string().cuid("ID inválido") }))
    .mutation(async ({ ctx, input }) => {
      const instructor = await ctx.db.instructor.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          _count: { select: { groups: true } },
        },
      });

      if (!instructor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Instructor no encontrado" });
      }

      if (instructor._count.groups > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No se puede eliminar porque tiene grupos asignados. Desactívalo o reasigna sus grupos primero.",
        });
      }

      return ctx.db.instructor.delete({ where: { id: input.id } });
    }),
});
