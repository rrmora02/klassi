import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

const statusTranslations: { [key: string]: string } = {
  // Student Status
  "ACTIVE": "Activo",
  "INACTIVE": "Inactivo",
  "SUSPENDED": "Suspendido",
  // Enrollment Status
  "ACTIVE": "Activo",
  "INACTIVE": "Inactivo",
  // Payment Status
  "PENDING": "Pendiente",
  "PAID": "Pagado",
  "OVERDUE": "Vencido",
  // Attendance Status
  "PRESENT": "Presente",
  "ABSENT": "Ausente",
  "JUSTIFIED": "Justificado",
  "LATE": "Tarde",
};

function translateStatus(value: string): string {
  return statusTranslations[value] || value;
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(h => `"${h}"`).join(",");

  const dataRows = data.map(row =>
    headers.map(header => {
      let value = row[header];
      if (value === null || value === undefined) return '""';

      // Traducir estados si es necesario
      if (header === "Estado") {
        value = translateStatus(String(value));
      }

      // Convertir todos los valores a string y encomillar
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(",")
  );

  // Agregar BOM de UTF-8 para que Excel interprete correctamente los acentos
  const csv = [headerRow, ...dataRows].join("\n");
  const utf8BOM = "﻿";
  return utf8BOM + csv;
}

export const exportsRouter = createTRPCRouter({

  exportStudents: protectedProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.dbUser?.activeTenantId) throw new Error("No tenant");
      const tenantId = ctx.dbUser.activeTenantId;

      const tenantUser = await db.tenantUser.findFirst({
        where: { tenantId, userId: ctx.dbUser.id }
      });
      if (tenantUser?.role !== "ADMIN") throw new Error("No permiso");

      const students = await db.student.findMany({
        where: { tenantId },
        include: {
          enrollments: {
            include: { group: true }
          }
        },
        orderBy: { firstName: "asc" }
      });

      const data = students.map(s => ({
        "Nombre": `${s.firstName} ${s.lastName}`,
        "Correo": s.email || "",
        "Teléfono": s.phone || "",
        "Grupos": s.enrollments.map(e => e.group.name).join("; "),
        "Estado": s.status,
        "Fecha Inscripción": s.createdAt.toISOString().split("T")[0],
      }));

      return {
        filename: `klassi-alumnos-${input.month}-${input.year}.csv`,
        content: convertToCSV(data)
      };
    }),

  exportInstructors: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.dbUser?.activeTenantId) throw new Error("No tenant");
      const tenantId = ctx.dbUser.activeTenantId;

      const tenantUser = await db.tenantUser.findFirst({
        where: { tenantId, userId: ctx.dbUser.id }
      });
      if (tenantUser?.role !== "ADMIN") throw new Error("No permiso");

      const instructors = await db.instructor.findMany({
        where: { tenantId },
        include: {
          user: true,
          groups: true
        },
        orderBy: { user: { name: "asc" } }
      });

      const data = instructors.map(i => ({
        "Nombre": i.user.name,
        "Correo": i.user.email,
        "Grupos": i.groups.map(g => g.name).join("; "),
        "Estado": i.isActive ? "Activo" : "Inactivo",
        "Fecha Inscripción": i.createdAt.toISOString().split("T")[0],
      }));

      return {
        filename: `klassi-instructores.csv`,
        content: convertToCSV(data)
      };
    }),

  exportGroups: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.dbUser?.activeTenantId) throw new Error("No tenant");
      const tenantId = ctx.dbUser.activeTenantId;

      const tenantUser = await db.tenantUser.findFirst({
        where: { tenantId, userId: ctx.dbUser.id }
      });
      if (tenantUser?.role !== "ADMIN") throw new Error("No permiso");

      const groups = await db.group.findMany({
        where: { tenantId },
        include: {
          instructor: {
            include: { user: true }
          },
          discipline: true,
          enrollments: true
        },
        orderBy: { name: "asc" }
      });

      const data = groups.map(g => ({
        "Nombre": g.name,
        "Instructor": g.instructor?.user.name || "Sin asignar",
        "Disciplina": g.discipline?.name || "",
        "Cantidad Alumnos": g.enrollments.length,
        "Nivel": g.level || "",
        "Estado": g.isActive ? "Activo" : "Inactivo",
        "Fecha Creación": g.createdAt.toISOString().split("T")[0],
      }));

      return {
        filename: `klassi-grupos.csv`,
        content: convertToCSV(data)
      };
    }),

  exportPayments: protectedProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.dbUser?.activeTenantId) throw new Error("No tenant");
      const tenantId = ctx.dbUser.activeTenantId;

      const tenantUser = await db.tenantUser.findFirst({
        where: { tenantId, userId: ctx.dbUser.id }
      });
      if (tenantUser?.role !== "ADMIN") throw new Error("No permiso");

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      const payments = await db.payment.findMany({
        where: {
          student: { tenantId },
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          student: true
        },
        orderBy: { createdAt: "desc" }
      });

      const data = payments.map(p => ({
        "Alumno": `${p.student.firstName} ${p.student.lastName}`,
        "Monto": (p.amount / 100).toFixed(2),
        "Concepto": p.concept,
        "Estado": p.status,
        "Fecha Vencimiento": p.dueDate?.toISOString().split("T")[0] || "",
        "Fecha Pago": p.paidAt?.toISOString().split("T")[0] || "",
        "Método": p.method || "",
      }));

      return {
        filename: `klassi-pagos-${input.month}-${input.year}.csv`,
        content: convertToCSV(data)
      };
    }),

  exportAttendance: protectedProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.dbUser?.activeTenantId) throw new Error("No tenant");
      const tenantId = ctx.dbUser.activeTenantId;

      const tenantUser = await db.tenantUser.findFirst({
        where: { tenantId, userId: ctx.dbUser.id }
      });
      if (tenantUser?.role !== "ADMIN") throw new Error("No permiso");

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      const attendance = await db.attendance.findMany({
        where: {
          session: {
            group: { tenantId }
          },
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          enrollment: {
            include: { student: true, group: true }
          },
          session: true
        },
        orderBy: { createdAt: "desc" }
      });

      const data = attendance.map(a => ({
        "Alumno": `${a.enrollment.student.firstName} ${a.enrollment.student.lastName}`,
        "Grupo": a.enrollment.group.name,
        "Fecha": a.createdAt.toISOString().split("T")[0],
        "Estado": a.status,
        "Justificacion": a.justification || "",
      }));

      return {
        filename: `klassi-asistencia-${input.month}-${input.year}.csv`,
        content: convertToCSV(data)
      };
    }),
});
