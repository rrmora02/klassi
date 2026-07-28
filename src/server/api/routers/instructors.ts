import { z } from "zod";
import { createTRPCRouter, tenantProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { instructorFormSchema } from "@/lib/schemas/instructor.schema";
import { sendInstructorInvitation } from "@/server/services/email.service";
import { canAddInstructor } from "@/server/services/tenant.service";
import { createPortalAccessLink } from "@/server/services/parent-access.service";
import { invalidateTenantMembership } from "@/server/cache/tenantMembershipCache";
import { randomBytes, randomUUID } from "crypto";

export const instructorsUpdateSchema = instructorFormSchema.partial().extend({
  id: z.string().cuid("ID inválido"),
});

export const instructorsRouter = createTRPCRouter({

  // ── Listar Instructores (Paginación + Buscador) ─────────────────
  list: tenantProcedure
    .input(z.object({
      search:   z.string().max(100).optional(),
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
            user: { select: { id: true, name: true, email: true, avatar: true } },
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
          user: { select: { id: true, name: true, email: true, avatar: true } },
          groups: {
            include: {
              discipline: { select: { name: true, color: true } },
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
  create: adminProcedure
    .input(instructorFormSchema)
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      // Check if this tenant is a blocked child tenant
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { blockChildWrites: true, blockChildWritesReason: true, name: true },
      });

      if (tenant?.blockChildWrites) {
        throw new TRPCError({
          code:    "FORBIDDEN",
          message: tenant.blockChildWritesReason || `No puedes agregar instructores a "${tenant?.name}" porque su plan no soporta múltiples escuelas. Cambia a tu escuela principal o actualiza el plan a Enterprise.`,
        });
      }

      // Verificar límite de plan
      const allowed = await canAddInstructor(tenantId);
      if (!allowed) {
        throw new TRPCError({
          code:    "FORBIDDEN",
          message: "Has alcanzado el límite de instructores de tu plan. Actualiza tu suscripción para agregar más.",
        });
      }

      // Idempotence: Check if instructor already exists by email in this tenant
      const existingInstructorByEmail = await db.instructor.findFirst({
        where: {
          tenantId,
          user: { email: input.email }
        },
        include: { user: true }
      });
      if (existingInstructorByEmail) {
        return { ...existingInstructorByEmail, _isIdempotent: true };
      }

      // Buscar si el correo ya existe en sistema
      let user = await db.user.findFirst({
        where: { email: input.email }
      });

      if (!user) {
        // Crear usuario pendiente (UUID criptográfico: clerkId es unique)
        user = await db.user.create({
          data: {
            clerkId: `pending_${randomUUID()}`,
            email: input.email,
            name: input.name,
          }
        });
      } else {
        // Comprobar si ya existe como instructor en este tenant (double-check)
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

      // Crear invitación y enviar email
      try {
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

        await db.teamInvitation.upsert({
          where: { tenantId_email: { tenantId, email: input.email } },
          create: {
            tenantId,
            email: input.email,
            role: "INSTRUCTOR",
            status: "PENDING",
            token,
            invitedBy: ctx.dbUser?.id,
            expiresAt,
          },
          update: {
            role: "INSTRUCTOR",
            status: "PENDING",
            token,
            invitedBy: ctx.dbUser?.id,
            expiresAt,
          },
        });

        const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/aceptar-invitacion?token=${token}`;

        await sendInstructorInvitation({
          to: input.email,
          instructorName: input.name,
          schoolName: tenant?.name || "tu escuela",
          inviteUrl,
        });
      } catch (emailError) {
        console.error("Error creating invitation or sending email:", emailError);
        // No lanzamos error aquí - el instructor se creó exitosamente
        // pero no se pudo enviar la invitación. El admin puede intentar reinvitar después.
      }

      return { ...instructor, _isIdempotent: false };
    }),

  // ── Actualizar Instructor ────────────────────────────────────────
  update: adminProcedure
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
  setStatus: adminProcedure
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

      // Reactivar cuenta contra el límite del plan igual que crear
      if (input.isActive && !existing.isActive) {
        const allowed = await canAddInstructor(ctx.tenantId);
        if (!allowed) {
          throw new TRPCError({
            code:    "FORBIDDEN",
            message: "Has alcanzado el límite de instructores de tu plan. Actualiza tu suscripción para activar más.",
          });
        }
      }

      return ctx.db.instructor.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  // ── Eliminar Instructor ──────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid("ID inválido") }))
    .mutation(async ({ ctx, input }) => {
      const instructor = await ctx.db.instructor.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          user: true,
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

      // Retirar la membresía SOLO si su rol es INSTRUCTOR y no es uno mismo:
      // un ADMIN/RECEPTIONIST que además daba clases no debe perder su acceso
      // a la escuela al borrar su registro de instructor.
      if (instructor.userId !== ctx.dbUser!.id) {
        await ctx.db.tenantUser.deleteMany({
          where: { tenantId: ctx.tenantId, userId: instructor.userId, role: "INSTRUCTOR" },
        });
        invalidateTenantMembership(ctx.tenantId, instructor.userId);
      }

      return ctx.db.instructor.delete({ where: { id: input.id } });
    }),

  // ── Enlace de acceso al portal (PWA) del instructor ──────────────
  // Igual que el enlace mágico del tutor: el instructor entra sin
  // contraseña y luego puede crear una en el portal (pestaña Cuenta).
  // Solo para instructores con rol INSTRUCTOR: un ADMIN que se autoasignó
  // ya entra por el panel y no necesita el portal.
  generatePortalLink: adminProcedure
    .input(z.object({ id: z.string().cuid("ID inválido") }))
    .mutation(async ({ ctx, input }) => {
      const instructor = await ctx.db.instructor.findFirst({
        where:  { id: input.id, tenantId: ctx.tenantId },
        select: { userId: true },
      });
      if (!instructor) throw new TRPCError({ code: "NOT_FOUND", message: "Instructor no encontrado" });

      const membership = await ctx.db.tenantUser.findUnique({
        where:  { tenantId_userId: { tenantId: ctx.tenantId, userId: instructor.userId } },
        select: { role: true },
      });

      if (membership?.role === "ADMIN") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este instructor es administrador y entra desde el panel; no necesita el portal." });
      }
      if (membership?.role !== "INSTRUCTOR") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El instructor debe aceptar su invitación por correo antes de acceder al portal." });
      }

      try {
        return await createPortalAccessLink(instructor.userId);
      } catch (err) {
        throw new TRPCError({ code: "BAD_REQUEST", message: err instanceof Error ? err.message : "No se pudo generar el enlace de acceso" });
      }
    }),

  // ── Admin se registra como Instructor ────────────────────────────
  registerAdminAsInstructor: adminProcedure
    .mutation(async ({ ctx }) => {
      // Verify user is ADMIN
      const adminUser = await ctx.db.tenantUser.findFirst({
        where: { tenantId: ctx.tenantId, userId: ctx.dbUser!.id }
      });

      if (adminUser?.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden registrarse como instructores"
        });
      }

      // Idempotence: Check if already registered as instructor
      const existingInstructor = await ctx.db.instructor.findFirst({
        where: { tenantId: ctx.tenantId, userId: ctx.dbUser!.id },
        include: { user: true }
      });

      if (existingInstructor) {
        return existingInstructor;
      }

      // Respetar el límite de instructores del plan también por esta vía
      const allowed = await canAddInstructor(ctx.tenantId);
      if (!allowed) {
        throw new TRPCError({
          code:    "FORBIDDEN",
          message: "Has alcanzado el límite de instructores de tu plan. Actualiza tu suscripción para agregar más.",
        });
      }

      // Create instructor record
      return ctx.db.instructor.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.dbUser!.id
        },
        include: { user: true }
      });
    }),
});
