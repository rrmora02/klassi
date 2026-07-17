import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { loggingService } from "@/server/logging/loggingService";

export const attendanceRouter = createTRPCRouter({

  getGroups: tenantProcedure
    .input(z.object({
       dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }))
    .query(async ({ ctx, input }) => {
       // Obtener el rol del usuario en el tenant
       const tenantUser = await ctx.db.tenantUser.findFirst({
          where: { tenantId: ctx.tenantId, userId: ctx.dbUser!.id }
       });

       const userRole = tenantUser?.role || "RECEPTIONIST";

       // Obtener todos los grupos (usar índice idx_group_tenant_active para rapidez)
       const groups = await ctx.db.group.findMany({
          where: {
             tenantId: ctx.tenantId,
             isActive: true,
             ...(userRole === "INSTRUCTOR" && {
                instructor: { userId: ctx.dbUser!.id }
             })
          },
          orderBy: { name: "asc" },
       });

       // Si se proporciona una fecha, filtrar solo grupos con clase ese día (en memoria es OK con índices en BD)
       if (input.dateString) {
          const dateObj = new Date(input.dateString + "T00:00:00Z");
          const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
          const dayOfWeek = dayMap[dateObj.getUTCDay()];

          return groups.filter(group => {
             const schedule = Array.isArray(group.schedule) ? group.schedule : [];
             return schedule.some((slot: any) => slot.day === dayOfWeek);
          });
       }

       return groups;
    }),

  createSession: tenantProcedure
    .input(z.object({
       groupId: z.string().cuid(),
       dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .mutation(async ({ ctx, input }) => {
       const group = await ctx.db.group.findFirst({
         where: { id: input.groupId, tenantId: ctx.tenantId },
         select: { schedule: true }
       });
       if (!group) throw new TRPCError({ code: "NOT_FOUND" });

       const dateObj = new Date(input.dateString + "T00:00:00Z");
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

       // Upsert sobre el unique [groupId, date]: si dos usuarios abren la
       // asistencia a la vez, ambos obtienen la MISMA sesión.
       const session = await ctx.db.classSession.upsert({
          where: { groupId_date: { groupId: input.groupId, date: dateObj } },
          create: {
            groupId: input.groupId,
            date: dateObj,
            startTime: st,
            endTime: et,
          },
          update: {},
       });

       return session;
    }),

  getSessionRoster: tenantProcedure
    .input(z.object({
       groupId: z.string().cuid(),
       dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ ctx, input }) => {
       const dateObj = new Date(input.dateString + "T00:00:00Z");

       // Parallelizar queries 1 y 3 (group + enrollments sin attendances primero)
       const [group, enrollmentsBase, session] = await Promise.all([
         ctx.db.group.findFirst({
           where: { id: input.groupId, tenantId: ctx.tenantId },
           include: { discipline: true }
         }),
         ctx.db.enrollment.findMany({
           where: { groupId: input.groupId, status: "ACTIVE" },
           include: {
             student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
           },
           orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }]
         }),
         ctx.db.classSession.findFirst({
           where: { groupId: input.groupId, date: dateObj }
         })
       ]);

       if (!group) throw new TRPCError({ code: "NOT_FOUND" });

       // Si hay session, obtener attendances para los enrollments
       let enrollments = enrollmentsBase;
       if (session) {
         const attendancesMap = await ctx.db.attendance.findMany({
           where: {
             sessionId: session.id,
             enrollmentId: { in: enrollmentsBase.map(e => e.id) }
           },
           select: { enrollmentId: true, status: true, createdAt: true }
         }).then(attendances =>
           Object.fromEntries(attendances.map(a => [a.enrollmentId, a]))
         );

         enrollments = enrollmentsBase.map(e => ({
           ...e,
           attendance: attendancesMap[e.id] || null
         }));
       }

       // Detectar si es Karate (case-insensitive)
       const isKarate = group.discipline?.name.toLowerCase().includes("karate") ?? false;

       return {
         session,
         isKarate,
         groupName: group.discipline?.name || group.name,
         enrollments: enrollments.map(e => ({
            enrollmentId: e.id,
            student: e.student,
            attendance: (e as any).attendance || null
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
       const enrollment = await ctx.db.enrollment.findFirst({
         where:  { id: input.enrollmentId, group: { tenantId: ctx.tenantId } },
         include: { student: { select: { id: true, firstName: true, lastName: true } } },
       });
       if (!enrollment) throw new TRPCError({ code: "FORBIDDEN" });

       // Obtener la asistencia anterior si existe
       const oldAttendance = await ctx.db.attendance.findUnique({
         where: {
            enrollmentId_sessionId: {
               enrollmentId: input.enrollmentId,
               sessionId: input.sessionId,
            }
         },
       });

       // Obtener información de la sesión (debe existir para marcar asistencia)
       const session = await ctx.db.classSession.findUnique({
         where: { id: input.sessionId },
         include: { group: { select: { name: true, tenantId: true } } },
       });

       // Verificar que la sesión existe y pertenece al tenant correcto
       if (!session) {
         throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
       }
       if (session.group.tenantId !== ctx.tenantId) {
         throw new TRPCError({ code: "FORBIDDEN" });
       }

       const newAttendance = await ctx.db.attendance.upsert({
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

       // Log asincronously in background (don't block response)
       Promise.all([
         loggingService.logAudit({
           tenantId: ctx.tenantId,
           userId: ctx.userId,
           action: oldAttendance ? "UPDATE" : "CREATE",
           entity: "Attendance",
           entityId: newAttendance.id,
           oldValues: oldAttendance ? {
             status: oldAttendance.status,
             studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
             groupName: session?.group.name,
           } : undefined,
           newValues: {
             status: newAttendance.status,
             studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
             groupName: session?.group.name,
             sessionDate: session?.date,
           } as any,
         }),
         loggingService.logBusinessEvent({
           tenantId: ctx.tenantId,
           userId: ctx.userId,
           eventType: "ATTENDANCE_RECORDED",
           entityType: "Attendance",
           entityId: newAttendance.id,
           metadata: {
             studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
             studentId: enrollment.student.id,
             status: input.status,
             groupName: session?.group.name,
             sessionDate: session?.date,
             enrollmentId: input.enrollmentId,
           },
         }),
       ]).catch(err => {
         console.error("Background logging failed:", err);
       });

       return newAttendance;
    })
});
