import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { StudentStatus } from "@prisma/client";
import { canAddStudent } from "@/server/services/tenant.service";

// ─── Schemas de validación ────────────────────────────────────────

export const studentCreateSchema = z.object({
  firstName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(60, "El nombre no puede exceder 60 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "El nombre solo puede contener letras"),

  lastName: z
    .string()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(60, "El apellido no puede exceder 60 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "El apellido solo puede contener letras"),

  birthDate: z
    .date()
    .max(new Date(), "La fecha no puede ser futura")
    .min(new Date("1990-01-01"), "Fecha de nacimiento inválida")
    .optional(),

  gender: z.enum(["M", "F", "otro"]).optional(),

  phone: z
    .string()
    .regex(/^[\d\s\+\-\(\)]{7,20}$/, "Teléfono inválido")
    .optional()
    .or(z.literal("")),

  email: z
    .string()
    .email("Correo electrónico inválido")
    .max(100, "El correo no puede exceder 100 caracteres")
    .toLowerCase()
    .optional()
    .or(z.literal("")),

  // Datos del tutor (se crean junto con el alumno)
  tutorName: z
    .string()
    .min(2, "El nombre del tutor debe tener al menos 2 caracteres")
    .max(120, "El nombre del tutor no puede exceder 120 caracteres")
    .optional()
    .or(z.literal("")),

  tutorPhone: z
    .string()
    .regex(/^[\d\s\+\-\(\)]{7,20}$/, "Teléfono del tutor inválido")
    .optional()
    .or(z.literal("")),

  tutorEmail: z
    .string()
    .email("Correo del tutor inválido")
    .toLowerCase()
    .optional()
    .or(z.literal("")),

  tutorRelationship: z
    .enum(["madre", "padre", "tutor", "abuelo", "otro"])
    .optional(),

  notes: z.string().max(500, "Las notas no pueden exceder 500 caracteres").optional(),
  avatarUrl: z.string().url("URL de avatar inválida").optional().or(z.literal("")),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  id: z.string().cuid("ID inválido"),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

// ─── Router ───────────────────────────────────────────────────────

export const studentsRouter = createTRPCRouter({

  // ── Listar con filtros, búsqueda y paginación ─────────────────

  list: tenantProcedure
    .input(z.object({
      search:       z.string().optional(),
      status:       z.nativeEnum(StudentStatus).optional(),
      disciplineId: z.string().optional(),
      page:         z.number().int().min(1).default(1),
      pageSize:     z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;
      const skip = (input.page - 1) * input.pageSize;

      const where: import("@prisma/client").Prisma.StudentWhereInput = {
        tenantId,
        ...(input.status && { status: input.status }),
        ...(input.search && {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" } },
            { lastName:  { contains: input.search, mode: "insensitive" } },
            { email:     { contains: input.search, mode: "insensitive" } },
            { phone:     { contains: input.search } },
          ],
        }),
        // Filtro por disciplina — busca inscripciones activas en esa disciplina
        ...(input.disciplineId && {
          enrollments: {
            some: {
              status: "ACTIVE",
              group:  { disciplineId: input.disciplineId },
            },
          },
        }),
      };

      const [students, total] = await Promise.all([
        db.student.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          include: {
            enrollments: {
              where:   { status: "ACTIVE" },
              include: { group: { include: { discipline: true } } },
            },
            _count: {
              select: { payments: true },
            },
          },
        }),
        db.student.count({ where }),
      ]);

      return {
        students,
        total,
        pages:   Math.ceil(total / input.pageSize),
        page:    input.page,
      };
    }),

  // ── Detalle completo de un alumno ─────────────────────────────

  byId: tenantProcedure
    .input(z.object({ id: z.string().cuid("ID inválido") }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          enrollments: {
            include: {
              group: {
                include: {
                  discipline: true,
                  instructor: { include: { user: true } },
                },
              },
            },
            orderBy: { startDate: "desc" },
          },
          payments: {
            orderBy: { dueDate: "desc" },
            take:    12,
          },
          parents: {
            include: { user: true },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code:    "NOT_FOUND",
          message: "Alumno no encontrado",
        });
      }

      return student;
    }),

  // ── Crear alumno ──────────────────────────────────────────────

  create: tenantProcedure
    .input(studentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      // Verificar límite del plan
      const allowed = await canAddStudent(tenantId);
      if (!allowed) {
        throw new TRPCError({
          code:    "FORBIDDEN",
          message: "Has alcanzado el límite de alumnos de tu plan. Actualiza tu suscripción para agregar más.",
        });
      }

      // Verificar email duplicado dentro del tenant
      if (input.email) {
        const dup = await db.student.findFirst({
          where: { tenantId, email: input.email, status: { not: "INACTIVE" } },
        });
        if (dup) {
          throw new TRPCError({
            code:    "CONFLICT",
            message: `Ya existe un alumno activo con el correo ${input.email}`,
          });
        }
      }

      const { tutorName, tutorPhone, tutorEmail, tutorRelationship, ...studentData } = input;

      const student = await db.student.create({
        data: {
          ...studentData,
          email:    studentData.email   || null,
          phone:    studentData.phone   || null,
          avatarUrl: studentData.avatarUrl || null,
          tenantId,
        },
      });

      // Crear o vincular tutor si se proporcionaron datos
      if (tutorName || tutorEmail || tutorPhone) {
        const contactEmail = tutorEmail || `tutor_${student.id}@klassi.local`;
        const contactName = tutorName || "Tutor de " + student.firstName;

        let parentUser = await db.user.findFirst({ where: { email: contactEmail } });
        if (!parentUser) {
          parentUser = await db.user.create({
            data: {
              clerkId: `pending_${Math.random().toString(36).substring(2, 10)}`,
              email: contactEmail,
              name: contactName,
              phone: tutorPhone || null,
            }
          });
        }

        await db.parentStudent.create({
          data: {
            userId: parentUser.id,
            studentId: student.id,
            relationship: tutorRelationship,
            isPrimary: true,
          }
        });
      }

      // Crear primera mensualidad automáticamente si tiene grupo
      // (se hace desde el módulo de inscripciones, no aquí)

      return student;
    }),

  // ── Actualizar alumno ─────────────────────────────────────────

  update: tenantProcedure
    .input(studentUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, tutorName, tutorPhone, tutorEmail, tutorRelationship, ...data } = input;
      const { tenantId, db } = ctx;

      const existing = await db.student.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new TRPCError({
          code:    "NOT_FOUND",
          message: "Alumno no encontrado",
        });
      }

      // Verificar email duplicado (excluyendo el alumno actual)
      if (data.email && data.email !== existing.email) {
        const dup = await db.student.findFirst({
          where: {
            tenantId,
            email:  data.email,
            id:     { not: id },
            status: { not: "INACTIVE" },
          },
        });
        if (dup) {
          throw new TRPCError({
            code:    "CONFLICT",
            message: `Ya existe un alumno activo con el correo ${data.email}`,
          });
        }
      }

      const updatedStudent = await db.student.update({
        where: { id },
        data:  {
          ...data,
          email:    data.email    || null,
          phone:    data.phone    || null,
          avatarUrl: data.avatarUrl || null,
        },
      });

      // Actualizar 1er tutor principal si se proporcionaron datos
      if (tutorName || tutorEmail || tutorPhone || tutorRelationship) {
        const existingParentLink = await db.parentStudent.findFirst({
          where: { studentId: id },
          include: { user: true },
          orderBy: { createdAt: "asc" }
        });

        if (existingParentLink) {
            // Update existiendo user y relationship
            await db.user.update({
              where: { id: existingParentLink.userId },
              data: {
                name: tutorName || existingParentLink.user.name,
                email: tutorEmail || existingParentLink.user.email,
                phone: tutorPhone || existingParentLink.user.phone,
              }
            });
            if (tutorRelationship) {
              await db.parentStudent.update({
                where: { id: existingParentLink.id },
                data: { relationship: tutorRelationship }
              });
            }
        } else if (tutorName || tutorEmail || tutorPhone) {
            // Crear nuevo tutor si hay datos
            const contactEmail = tutorEmail || `tutor_${id}@klassi.local`;
            const contactName = tutorName || "Tutor de " + existing.firstName;

            let parentUser = await db.user.findFirst({ where: { email: contactEmail } });
            if (!parentUser) {
              parentUser = await db.user.create({
                data: {
                  clerkId: `pending_${Math.random().toString(36).substring(2, 10)}`,
                  email: contactEmail,
                  name: contactName,
                  phone: tutorPhone || null,
                }
              });
            }
            await db.parentStudent.create({
              data: {
                userId: parentUser.id,
                studentId: id,
                relationship: tutorRelationship,
                isPrimary: true,
              }
            });
        }
      }

      return updatedStudent;
    }),

  // ── Cambiar estado (activar / desactivar / suspender) ─────────

  setStatus: tenantProcedure
    .input(z.object({
      id:     z.string().cuid("ID inválido"),
      status: z.nativeEnum(StudentStatus),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.student.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          enrollments: { where: { status: "ACTIVE" } },
        },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alumno no encontrado" });
      }

      // Al desactivar: cancelar inscripciones activas
      if (input.status === "INACTIVE" && existing.enrollments.length > 0) {
        await ctx.db.enrollment.updateMany({
          where:  { studentId: input.id, status: "ACTIVE" },
          data:   { status: "CANCELLED" },
        });
      }

      return ctx.db.student.update({
        where: { id: input.id },
        data:  { status: input.status },
      });
    }),

  // ── Eliminar permanentemente (solo sin historial) ─────────────

  delete: tenantProcedure
    .input(z.object({ id: z.string().cuid("ID inválido") }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          _count: {
            select: { payments: true, enrollments: true },
          },
        },
      });

      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alumno no encontrado" });
      }

      // No eliminar si tiene pagos o historial de asistencia
      if (student._count.payments > 0 || student._count.enrollments > 0) {
        throw new TRPCError({
          code:    "PRECONDITION_FAILED",
          message: "No se puede eliminar un alumno con pagos o inscripciones registradas. Usa 'Desactivar' en su lugar.",
        });
      }

      return ctx.db.student.delete({ where: { id: input.id } });
    }),

  // ── Estadísticas rápidas para el header de detalle ────────────

  stats: tenantProcedure
    .input(z.object({ id: z.string().cuid("ID inválido") }))
    .query(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const student = await db.student.findFirst({
        where: { id: input.id, tenantId },
      });
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      const [attendances, payments] = await Promise.all([
        db.attendance.findMany({
          where: { enrollment: { studentId: input.id } },
          select: { status: true },
        }),
        db.payment.aggregate({
          where:  { studentId: input.id },
          _sum:   { amount: true },
          _count: true,
        }),
      ]);

      const total      = attendances.length;
      const present    = attendances.filter(a => a.status === "PRESENT").length;
      const attendance = total > 0 ? Math.round((present / total) * 100) : null;

      return {
        attendanceRate: attendance,
        totalClasses:   total,
        totalPaid:      payments._sum.amount ?? 0,
        totalPayments:  payments._count,
      };
    }),

  // ── Generar enlace público compartible ───────────────────────────
  generateShareLink: tenantProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, tenantId } = ctx;

      const student = await db.student.findFirst({
        where: { id: input.id, tenantId },
        select: { id: true },
      });
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      // El CUID del alumno es el token — 25 chars aleatorios, imposible de adivinar
      return { shareToken: student.id };
    }),
});
