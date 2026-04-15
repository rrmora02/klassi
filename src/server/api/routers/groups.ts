import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { GroupLevel, type Prisma } from "@prisma/client";

export enum DayOfWeek {
  MON = "MON",
  TUE = "TUE",
  WED = "WED",
  THU = "THU",
  FRI = "FRI",
  SAT = "SAT",
  SUN = "SUN",
}
import { canAddGroup } from "@/server/services/tenant.service";

// ─── Tipos locales ────────────────────────────────────────────────

type ScheduleSlot = { day: DayOfWeek; startTime: string; endTime: string };

// ─── Schemas de validación ────────────────────────────────────────

const scheduleSlotSchema = z.object({
  day:       z.nativeEnum(DayOfWeek),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
}).refine((s) => s.startTime < s.endTime, {
  message: "La hora de fin debe ser mayor a la de inicio",
  path: ["endTime"],
});

const groupCreateSchema = z.object({
  name:         z.string().min(2).max(80),
  disciplineId: z.string().min(1),
  instructorId: z.string().optional().or(z.literal("")),
  level:        z.nativeEnum(GroupLevel),
  capacity:     z.number().int().min(1).max(200),
  room:         z.string().max(60).optional().or(z.literal("")),
  schedule:     z.array(scheduleSlotSchema).min(1),
});

const groupUpdateSchema = groupCreateSchema.partial().extend({
  id: z.string().cuid("ID inválido"),
});

// ─── Router ───────────────────────────────────────────────────────

export const groupsRouter = createTRPCRouter({

  // ── Helpers para dropdowns ─────────────────────────────────────

  getDisciplines: tenantProcedure
    .query(async ({ ctx }) => {
      return ctx.db.discipline.findMany({
        where:   { tenantId: ctx.tenantId, isActive: true },
        orderBy: { sortOrder: "asc" },
        select:  { id: true, name: true, color: true },
      });
    }),

  getInstructors: tenantProcedure
    .query(async ({ ctx }) => {
      return ctx.db.instructor.findMany({
        where:   { tenantId: ctx.tenantId, isActive: true },
        include: { user: { select: { name: true } } },
        orderBy: { user: { name: "asc" } },
      });
    }),

  // ── Listar grupos con filtros y paginación ────────────────────

  list: tenantProcedure
    .input(z.object({
      search:       z.string().optional(),
      disciplineId: z.string().optional(),
      level:        z.nativeEnum(GroupLevel).optional(),
      isActive:     z.boolean().optional(),
      page:         z.number().int().min(1).default(1),
      pageSize:     z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;
      const skip = (input.page - 1) * input.pageSize;

      const where: Prisma.GroupWhereInput = {
        tenantId,
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.level && { level: input.level }),
        ...(input.disciplineId && { disciplineId: input.disciplineId }),
        ...(input.search && {
          name: { contains: input.search, mode: "insensitive" },
        }),
      };

      const [groups, total] = await Promise.all([
        db.group.findMany({
          where,
          skip,
          take:    input.pageSize,
          orderBy: { name: "asc" },
          include: {
            discipline: { select: { name: true, color: true } },
            instructor: { include: { user: { select: { name: true } } } },
            _count: {
              select: { enrollments: { where: { status: "ACTIVE" } } },
            },
          },
        }),
        db.group.count({ where }),
      ]);

      return {
        groups,
        total,
        pages: Math.ceil(total / input.pageSize),
        page:  input.page,
      };
    }),

  // ── Detalle de un grupo ───────────────────────────────────────

  byId: tenantProcedure
    .input(z.object({
      id:           z.string().cuid("ID inválido"),
      enrollmentPage: z.number().int().min(1).default(1),
    }))
    .query(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;
      const enrollPageSize = 20;

      const group = await db.group.findFirst({
        where: { id: input.id, tenantId },
        include: {
          discipline: true,
          instructor: { include: { user: true } },
          enrollments: {
            skip:    (input.enrollmentPage - 1) * enrollPageSize,
            take:    enrollPageSize,
            orderBy: { startDate: "desc" },
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true, status: true },
              },
            },
          },
          _count: {
            select: {
              enrollments: { where: { status: "ACTIVE" } },
              sessions:    true,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
      }

      const enrollmentTotal = await db.enrollment.count({
        where: { groupId: input.id },
      });

      return { ...group, enrollmentTotal };
    }),

  // ── Crear grupo ───────────────────────────────────────────────

  create: tenantProcedure
    .input(groupCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx;

      // Verificar límite del plan
      const allowed = await canAddGroup(tenantId);
      if (!allowed) {
        throw new TRPCError({
          code:    "FORBIDDEN",
          message: "Has alcanzado el límite de grupos de tu plan. Actualiza tu suscripción para agregar más.",
        });
      }

      // Validar que la disciplina pertenece al tenant
      const discipline = await db.discipline.findFirst({
        where: { id: input.disciplineId, tenantId },
      });
      if (!discipline) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Disciplina no encontrada" });
      }

      // Validar instructor si se proporcionó
      if (input.instructorId) {
        const instructor = await db.instructor.findFirst({
          where: { id: input.instructorId, tenantId, isActive: true },
        });
        if (!instructor) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Instructor no encontrado" });
        }
      }

      return db.group.create({
        data: {
          tenantId,
          name:         input.name,
          disciplineId: input.disciplineId,
          instructorId: input.instructorId || null,
          level:        input.level,
          capacity:     input.capacity,
          room:         input.room || null,
          schedule:     input.schedule as unknown as Prisma.InputJsonValue,
        },
      });
    }),

  // ── Actualizar grupo ──────────────────────────────────────────

  update: tenantProcedure
    .input(groupUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const { tenantId, db } = ctx;

      const existing = await db.group.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
      }

      // Validar disciplina si se está cambiando
      if (data.disciplineId) {
        const discipline = await db.discipline.findFirst({
          where: { id: data.disciplineId, tenantId },
        });
        if (!discipline) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Disciplina no encontrada" });
        }
      }

      // Validar instructor si se está cambiando
      if (data.instructorId) {
        const instructor = await db.instructor.findFirst({
          where: { id: data.instructorId, tenantId, isActive: true },
        });
        if (!instructor) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Instructor no encontrado" });
        }
      }

      return db.group.update({
        where: { id },
        data: {
          ...data,
          instructorId: data.instructorId !== undefined ? (data.instructorId || null) : undefined,
          room:         data.room !== undefined ? (data.room || null) : undefined,
          schedule:     data.schedule
            ? (data.schedule as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });
    }),

  // ── Activar / Desactivar grupo ────────────────────────────────

  setActive: tenantProcedure
    .input(z.object({
      id:       z.string().cuid("ID inválido"),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.group.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
      }

      // TODO: cuando el módulo de inscripciones esté listo,
      // cancelar automáticamente las inscripciones activas al desactivar.

      return ctx.db.group.update({
        where: { id: input.id },
        data:  { isActive: input.isActive },
      });
    }),

  // ── Eliminar grupo (solo sin inscripciones) ───────────────────

  delete: tenantProcedure
    .input(z.object({ id: z.string().cuid("ID inválido") }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
      }

      const enrollmentCount = await ctx.db.enrollment.count({
        where: { groupId: input.id },
      });
      if (enrollmentCount > 0) {
        throw new TRPCError({
          code:    "PRECONDITION_FAILED",
          message: "No se puede eliminar un grupo con inscripciones registradas. Usa 'Desactivar' en su lugar.",
        });
      }

      return ctx.db.group.delete({ where: { id: input.id } });
    }),
});

export type GroupsRouter = typeof groupsRouter;
