import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const attendanceRouter = createTRPCRouter({

  getGroups: tenantProcedure
    .query(async ({ ctx }) => {
       // Obtener el rol del usuario en el tenant
       const tenantUser = await ctx.db.tenantUser.findFirst({
          where: { tenantId: ctx.tenantId, userId: ctx.dbUser!.id }
       });

       const userRole = tenantUser?.role || "RECEPTIONIST";

       // Si es INSTRUCTOR, solo mostrar sus grupos
       if (userRole === "INSTRUCTOR") {
          const instructor = await ctx.db.instructor.findFirst({
             where: { userId: ctx.dbUser!.id, tenantId: ctx.tenantId }
          });

          if (!instructor) {
             throw new TRPCError({
                code: "FORBIDDEN",
                message: "No tienes grupos asignados como instructor"
             });
          }

          return ctx.db.group.findMany({
             where: { tenantId: ctx.tenantId, isActive: true, instructorId: instructor.id },
             orderBy: { name: "asc" },
          });
       }

       // ADMIN y RECEPTIONIST ven todos los grupos
       return ctx.db.group.findMany({
          where: { tenantId: ctx.tenantId, isActive: true },
          orderBy: { name: "asc" },
       });
    }),

  getSessionRoster: tenantProcedure
    .input(z.object({
       groupId: z.string().cuid(),
       dateString: z.string(), // "YYYY-MM-DD" originado del input local
    }))
    .query(async ({ ctx, input }) => {
       const group = await ctx.db.group.findFirst({
         where: { id: input.groupId, tenantId: ctx.tenantId }
       });
       if (!group) throw new TRPCError({ code: "NOT_FOUND" });

       // Generar Date objeto al medianoche UTC
       const dateObj = new Date(input.dateString + "T00:00:00Z");

       let session = await ctx.db.classSession.findFirst({
          where: { groupId: input.groupId, date: dateObj }
       });

       if (!session) {
          const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
          const dayEnum = dayMap[dateObj.getUTCDay()];
          
          let st = "00:00", et = "00:00";
          if (Array.isArray(group.schedule)) {
             const slot = (group.schedule as any[]).find((s: any) => s.day === dayEnum);
             if (slot) {
                st = slot.startTime || "00:00";
                et = slot.endTime || "00:00";
             }
          }

          session = await ctx.db.classSession.create({
             data: {
               groupId: input.groupId,
               date: dateObj,
               startTime: st,
               endTime: et,
             }
          });
       }

       // Traer a los alumnos ACTIVOS
       const enrollments = await ctx.db.enrollment.findMany({
          where: { groupId: input.groupId, status: "ACTIVE" },
          include: { 
            student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            attendances: { where: { sessionId: session.id } }
          },
          orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }]
       });

       return {
         session,
         enrollments: enrollments.map(e => ({
            enrollmentId: e.id,
            student: e.student,
            attendance: e.attendances[0] || null
         }))
       };
    }),

  markAttendance: tenantProcedure
    .input(z.object({
       sessionId: z.string().cuid(),
       enrollmentId: z.string().cuid(),
       status: z.enum(["PRESENT", "ABSENT", "JUSTIFIED", "LATE"]),
    }))
    .mutation(async ({ ctx, input }) => {
       const check = await ctx.db.enrollment.findFirst({
         where:  { id: input.enrollmentId, group: { tenantId: ctx.tenantId } },
         select: { id: true },
       });
       if (!check) throw new TRPCError({ code: "FORBIDDEN" });

       return ctx.db.attendance.upsert({
         where: {
            enrollmentId_sessionId: {
               enrollmentId: input.enrollmentId,
               sessionId: input.sessionId,
            }
         },
         create: {
            enrollmentId: input.enrollmentId,
            sessionId: input.sessionId,
            status: input.status,
         },
         update: {
            status: input.status,
         }
       });
    })
});
