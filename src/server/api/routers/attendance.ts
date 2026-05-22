import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { loggingService } from "@/server/logging/loggingService";

export const attendanceRouter = createTRPCRouter({

  getGroups: tenantProcedure
    .input(z.object({
       dateString: z.string().optional(), // "YYYY-MM-DD"
    }))
    .query(async ({ ctx, input }) => {
       // Obtener el rol del usuario en el tenant
       const tenantUser = await ctx.db.tenantUser.findFirst({
          where: { tenantId: ctx.tenantId, userId: ctx.dbUser!.id }
       });

       const userRole = tenantUser?.role || "RECEPTIONIST";

       // Determinar día de la semana si se proporciona fecha
       let dayOfWeek: string | undefined;
       if (input.dateString) {
          const dateObj = new Date(input.dateString + "T00:00:00Z");
          const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
          dayOfWeek = dayMap[dateObj.getUTCDay()];
       }

       // Obtener todos los grupos
       let groups = await ctx.db.group.findMany({
          where: {
             tenantId: ctx.tenantId,
             isActive: true,
             ...(userRole === "INSTRUCTOR" && {
                instructor: { userId: ctx.dbUser!.id }
             })
          },
          orderBy: { name: "asc" },
       });

       // Si se proporciona una fecha, filtrar solo grupos con clase ese día
       if (dayOfWeek && Array.isArray(groups)) {
          groups = groups.filter(group => {
             const schedule = Array.isArray(group.schedule) ? group.schedule : [];
             return schedule.some((slot: any) => slot.day === dayOfWeek);
          });
       }

       return groups;
    }),

  getSessionRoster: tenantProcedure
    .input(z.object({
       groupId: z.string().cuid(),
       dateString: z.string(), // "YYYY-MM-DD" originado del input local
    }))
    .query(async ({ ctx, input }) => {
       const group = await ctx.db.group.findFirst({
         where: { id: input.groupId, tenantId: ctx.tenantId },
         include: { discipline: true }
       });
       if (!group) throw new TRPCError({ code: "NOT_FOUND" });

       // Generar Date objeto al medianoche UTC
       const dateObj = new Date(input.dateString + "T00:00:00Z");

       const session = await ctx.db.classSession.findFirst({
          where: { groupId: input.groupId, date: dateObj }
       });

       // Traer a los alumnos ACTIVOS
       const enrollments = await ctx.db.enrollment.findMany({
          where: { groupId: input.groupId, status: "ACTIVE" },
          include: {
            student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            ...(session && { attendances: { where: { sessionId: session.id } } })
          },
          orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }]
       });

       // Detectar si es Karate (case-insensitive)
       const isKarate = group.discipline?.name.toLowerCase().includes("karate") ?? false;

       return {
         session,
         isKarate,
         groupName: group.discipline?.name || group.name,
         enrollments: enrollments.map(e => ({
            enrollmentId: e.id,
            student: e.student,
            attendance: session ? (e.attendances[0] || null) : null
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
       let session = await ctx.db.classSession.findUnique({
         where: { id: input.sessionId },
         include: { group: { select: { name: true, tenantId: true, schedule: true } } },
       });

       // Verificar que la sesión pertenece al tenant correcto
       if (session && session.group.tenantId !== ctx.tenantId) {
         throw new TRPCError({ code: "FORBIDDEN" });
       }

       // Si la sesión no existe, crearla on-demand (lazy creation)
       if (!session) {
         const groupCheck = await ctx.db.group.findFirst({
           where: { id: enrollment.groupId, tenantId: ctx.tenantId },
           select: { schedule: true }
         });
         if (!groupCheck) throw new TRPCError({ code: "NOT_FOUND" });

         // Obtener horarios de la sesión de la fecha
         const dateObj = new Date(input.sessionId.slice(0, 10)); // Parse date from sessionId if possible
         const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
         const dayEnum = dayMap[dateObj.getUTCDay()];

         let st = "00:00", et = "00:00";
         if (Array.isArray(groupCheck.schedule)) {
            const slot = (groupCheck.schedule as any[]).find((s: any) => s.day === dayEnum);
            if (slot) {
               st = slot.startTime || "00:00";
               et = slot.endTime || "00:00";
            }
         }

         session = await ctx.db.classSession.create({
           data: {
             id: input.sessionId,
             groupId: enrollment.groupId,
             date: dateObj,
             startTime: st,
             endTime: et,
           },
           include: { group: { select: { name: true, tenantId: true } } }
         });
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
