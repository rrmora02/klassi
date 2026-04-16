import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const enrollmentsRouter = createTRPCRouter({

  getStudentsAvailableForGroup: tenantProcedure
    .input(z.object({ groupId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
       const group = await ctx.db.group.findFirst({
         where: { id: input.groupId, tenantId: ctx.tenantId },
         include: {
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
         orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
       });

       return { 
          students, 
          isFull: group._count.enrollments >= group.capacity,
          enrolledCount: group._count.enrollments,
          capacity: group.capacity 
       };
    }),

  getGroupsAvailableForStudent: tenantProcedure
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
         orderBy: [{ discipline: { name: "asc" } }, { name: "asc" }]
       });

       // Filtramos para enviar bandera visual de los que están llenos (opcional pero bueno que el frontend lo sepa)
       return groups.map(g => ({
          ...g,
          isFull: g._count.enrollments >= g.capacity
       }));
    }),

  enroll: tenantProcedure
    .input(z.object({
       studentId: z.string().cuid(),
       groupId: z.string().cuid(),
       discount: z.number().int().min(0).max(100).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
       // Validate that both belong to tenant
       const [group, student] = await Promise.all([
         ctx.db.group.findFirst({ where: { id: input.groupId, tenantId: ctx.tenantId } }),
         ctx.db.student.findFirst({ where: { id: input.studentId, tenantId: ctx.tenantId } })
       ]);

       if (!group || !student) throw new TRPCError({ code: "NOT_FOUND" });

       // Verify if already ACTIVE to prevent duplicate
       const existing = await ctx.db.enrollment.findFirst({
         where: { studentId: input.studentId, groupId: input.groupId }
       });

       if (existing?.status === "ACTIVE") {
         throw new TRPCError({ code: "CONFLICT", message: "El alumno ya está inscrito en este grupo." });
       }

       // Upsert (to handle CANCELLED turning into ACTIVE again)
       return ctx.db.enrollment.upsert({
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
    }),

  transfer: tenantProcedure
    .input(z.object({
       currentEnrollmentId: z.string().cuid(),
       studentId: z.string().cuid(),
       newGroupId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
       // Validate ownership
       const prevEnrollment = await ctx.db.enrollment.findFirst({
         where: { id: input.currentEnrollmentId, studentId: input.studentId, group: { tenantId: ctx.tenantId } }
       });
       
       const newGroup = await ctx.db.group.findFirst({ 
         where: { id: input.newGroupId, tenantId: ctx.tenantId } 
       });

       if (!prevEnrollment || !newGroup) throw new TRPCError({ code: "NOT_FOUND" });

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
