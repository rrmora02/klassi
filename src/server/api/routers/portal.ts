import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Portal de familias (PWA): consultas del padre/tutor autenticado.
// No usa tenantProcedure — un padre puede tener hijos en varias escuelas
// y su acceso se deriva siempre de ParentStudent, nunca del tenant activo.

export const portalRouter = createTRPCRouter({

  summary: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

    const links = await ctx.db.parentStudent.findMany({
      where:   { userId: ctx.dbUser.id },
      include: {
        student: {
          include: {
            tenant: { select: { id: true, name: true, slug: true, logo: true, primaryColor: true } },
            enrollments: {
              where:   { status: "ACTIVE" },
              include: { group: { select: { id: true, name: true, schedule: true, discipline: { select: { name: true, color: true, icon: true } } } } },
            },
          },
        },
      },
    });

    const students   = links.map(l => l.student);
    const studentIds = students.map(s => s.id);

    const pendingPayments = studentIds.length > 0
      ? await ctx.db.payment.findMany({
          where:   { studentId: { in: studentIds }, status: { in: ["PENDING", "OVERDUE"] } },
          orderBy: { dueDate: "asc" },
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        })
      : [];

    return {
      user:     { name: ctx.dbUser.name },
      students,
      pendingPayments,
    };
  }),

  myPayments: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

    const links = await ctx.db.parentStudent.findMany({
      where:  { userId: ctx.dbUser.id },
      select: { studentId: true },
    });
    const studentIds = links.map(l => l.studentId);
    if (studentIds.length === 0) return [];

    return ctx.db.payment.findMany({
      where:   { studentId: { in: studentIds } },
      orderBy: [{ status: "asc" }, { dueDate: "desc" }],
      take:    100,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        tenant:  { select: { name: true } },
      },
    });
  }),
});
