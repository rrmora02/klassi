import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const enrollmentsRouter = createTRPCRouter({

  getStudentsAvailableForGroup: staffProcedure
    .input(z.object({ groupId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
       const group = await ctx.db.group.findFirst({
         where: { id: input.groupId, tenantId: ctx.tenantId },
         include: {
            discipline: true,
            _count: { select: { enrollments: { where: { status: "ACTIVE" } } } }
         }
       });
       if (!group) throw new TRPCError({ code: "NOT_FOUND" });

       // Limit capacity conceptually: if already full, we could throw, but returning the availability is better for UI.
       const students = await ctx.db.student.findMany({
         where: {
            tenantId: ctx.tenantId,
            status: "ACTIVE",
            NOT: {
               enrollments: {
                  some: { groupId: input.groupId, status: "ACTIVE" }
               }
            }
         },
         select: { id: true, firstName: true, lastName: true },
         orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
         take: 500
       });

       return {
          students,
          isFull: group._count.enrollments >= group.capacity,
          enrolledCount: group._count.enrollments,
          capacity: group.capacity,
          isKarate: group.discipline?.name.toLowerCase().includes("karate")
       };
    }),

  getGroupsAvailableForStudent: staffProcedure
    .input(z.object({ studentId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
       const student = await ctx.db.student.findFirst({
         where: { id: input.studentId, tenantId: ctx.tenantId }
       });
       if (!student) throw new TRPCError({ code: "NOT_FOUND" });

       const groups = await ctx.db.group.findMany({
         where: {
            tenantId: ctx.tenantId,
            isActive: true,
            NOT: {
               enrollments: {
                  some: { studentId: input.studentId, status: "ACTIVE" }
               }
            }
         },
         include: {
            discipline: { select: { name: true } },
            _count: { select: { enrollments: { where: { status: "ACTIVE" } } } }
         },
         orderBy: [{ discipline: { name: "asc" } }, { name: "asc" }],
         take: 500
       });

       // Filtramos para enviar bandera visual de los que están llenos (opcional pero bueno que el frontend lo sepa)
       return groups.map(g => ({
          ...g,
          isFull: g._count.enrollments >= g.capacity
       }));
    }),

  enroll: staffProcedure
    .input(z.object({
       studentId: z.string().cuid(),
       groupId: z.string().cuid(),
       discount: z.number().int().min(0).max(100).default(0),
       currentBeltColor: z.enum(["WHITE", "YELLOW", "ORANGE", "GREEN", "BLUE", "BROWN", "BLACK"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
       // Validate that both belong to tenant
       const [group, student] = await Promise.all([
         ctx.db.group.findFirst({ where: { id: input.groupId, tenantId: ctx.tenantId } }),
         ctx.db.student.findFirst({ where: { id: input.studentId, tenantId: ctx.tenantId } })
       ]);

       if (!group || !student) throw new TRPCError({ code: "NOT_FOUND" });

       if (!group.isActive) {
         throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El grupo está inactivo." });
       }
       if (student.status !== "ACTIVE") {
         throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El alumno no está activo. Actívalo antes de inscribirlo." });
       }

       // If Karate and belt provided, update student's belt
       if (input.currentBeltColor) {
         await ctx.db.student.update({
           where: { id: input.studentId },
           data: {
             currentBeltColor: input.currentBeltColor,
             beltUpdatedAt: new Date()
           }
         });
       }

       // Verify if already ACTIVE to prevent duplicate
       const existing = await ctx.db.enrollment.findFirst({
         where: { studentId: input.studentId, groupId: input.groupId }
       });

       if (existing?.status === "ACTIVE") {
         return { ...existing, _isIdempotent: true };
       }

       // Capacidad + upsert dentro de una transacción serializable: dos
       // inscripciones simultáneas ya no pueden rebasar el cupo del grupo.
       const enrollment = await ctx.db.$transaction(async (tx) => {
          const activeCount = await tx.enrollment.count({
             where: { groupId: input.groupId, status: "ACTIVE" },
          });
          if (activeCount >= group.capacity) {
             throw new TRPCError({ code: "PRECONDITION_FAILED", message: `El grupo está lleno (${group.capacity} lugares).` });
          }

          return tx.enrollment.upsert({
             where: { studentId_groupId: { studentId: input.studentId, groupId: input.groupId } },
             create: {
                studentId: input.studentId,
                groupId: input.groupId,
                status: "ACTIVE",
                discount: input.discount,
                startDate: new Date(),
             },
             update: {
                status: "ACTIVE",
                discount: input.discount,
                startDate: new Date(),
                endDate: null,
             }
          });
       }, { isolationLevel: "Serializable" });

       return { ...enrollment, _isIdempotent: false };
    }),

  transfer: staffProcedure
    .input(z.object({
       currentEnrollmentId: z.string().cuid(),
       studentId: z.string().cuid(),
       newGroupId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
       // Validate ownership — both queries are independent, run in parallel
       const [prevEnrollment, newGroup] = await Promise.all([
         ctx.db.enrollment.findFirst({
           where: { id: input.currentEnrollmentId, studentId: input.studentId, group: { tenantId: ctx.tenantId } }
         }),
         ctx.db.group.findFirst({
           where: { id: input.newGroupId, tenantId: ctx.tenantId }
         }),
       ]);

       if (!prevEnrollment || !newGroup) throw new TRPCError({ code: "NOT_FOUND" });

       // Idempotence: If transfer already completed, return the new enrollment
       if (prevEnrollment.status === "COMPLETED") {
         const completedTransfer = await ctx.db.enrollment.findFirst({
           where: { studentId: input.studentId, groupId: input.newGroupId }
         });
         if (completedTransfer) {
           return completedTransfer;
         }
       }

       // Verify if already enrolled in new group active
       const existingNew = await ctx.db.enrollment.findFirst({
         where: { studentId: input.studentId, groupId: input.newGroupId, status: "ACTIVE" }
       });
       if (existingNew) throw new TRPCError({ code: "CONFLICT", message: "Ya está en ese grupo." });

       // Atomic operation: complete old, create new
       return ctx.db.$transaction(async (tx) => {
         await tx.enrollment.update({
           where: { id: input.currentEnrollmentId },
           data: { status: "COMPLETED", endDate: new Date() }
         });

         return tx.enrollment.upsert({
            where: { studentId_groupId: { studentId: input.studentId, groupId: input.newGroupId } },
            create: {
               studentId: input.studentId,
               groupId: input.newGroupId,
               status: "ACTIVE",
               discount: prevEnrollment.discount, // Inherit discount
               startDate: new Date(),
            },
            update: {
               status: "ACTIVE",
               discount: prevEnrollment.discount,
               startDate: new Date(),
               endDate: null,
            }
         });
       });
    })
});
