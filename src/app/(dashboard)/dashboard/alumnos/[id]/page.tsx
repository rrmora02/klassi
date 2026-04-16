import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fullName, formatDate, calcAge, formatCurrency } from "@/lib/utils";
import { StudentStatusBadge } from "@/components/alumnos/student-status-badge";
import { StudentActions } from "@/components/alumnos/student-actions";
import { EnrollToGroupModal } from "@/components/alumnos/enroll-to-group-modal";
import { TransferGroupModal } from "@/components/alumnos/transfer-group-modal";

export default async function AlumnoDetailPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const tenant = user?.activeTenantId ? await db.tenant.findUnique({ where: { id: user.activeTenantId } }) : null;
  if (!tenant) return null;

  const student = await db.student.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: {
      enrollments: {
        orderBy: { startDate: "desc" },
        include: {
          group: {
            include: {
              discipline: true,
              instructor: { include: { user: true } },
            },
          },
        },
      },
      payments: { orderBy: { dueDate: "desc" }, take: 10 },
      parents:  { include: { user: true } },
    },
  });

  if (!student) notFound();

  // Estadísticas de asistencia
  const attendances = await db.attendance.findMany({
    where:  { enrollment: { studentId: student.id } },
    select: { status: true },
  });

  const totalClasses  = attendances.length;
  const presentCount  = attendances.filter(a => a.status === "PRESENT").length;
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : null;

  const activeEnrollments = student.enrollments.filter(e => e.status === "ACTIVE");
  const totalPaid = student.payments
    .filter(p => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const overduePayments = student.payments.filter(p => p.status === "OVERDUE");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/alumnos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Alumnos</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>{fullName(student.firstName, student.lastName)}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 500 }}>
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
              {fullName(student.firstName, student.lastName)}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <StudentStatusBadge status={student.status} />
              {student.birthDate && (
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {calcAge(student.birthDate)} años · {formatDate(student.birthDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones: editar / cambiar estado / eliminar */}
        <StudentActions
          studentId={student.id}
          studentName={fullName(student.firstName, student.lastName)}
          status={student.status}
        />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Disciplinas activas", value: String(activeEnrollments.length) },
          { label: "Asistencia", value: attendanceRate !== null ? `${attendanceRate}%` : "—", alert: attendanceRate !== null && attendanceRate < 70 },
          { label: "Clases totales", value: String(totalClasses) },
          { label: "Total pagado", value: formatCurrency(totalPaid), alert: overduePayments.length > 0 },
        ].map(k => (
          <div key={k.label} style={{ background: k.alert ? "#fff5f5" : "var(--color-background-primary)", border: `0.5px solid ${k.alert ? "#fca5a5" : "var(--color-border-tertiary)"}`, borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{k.label}</p>
            <p style={{ fontSize: 22, fontWeight: 500, color: k.alert ? "#b91c1c" : "var(--color-text-primary)", margin: "4px 0 0" }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Datos personales */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Datos personales</h2>
            <Link href={`/dashboard/alumnos/${student.id}/editar`} style={{ fontSize: 12, color: "#1e3a5f", textDecoration: "none" }}>Editar</Link>
          </div>
          {[
            { label: "Email",    value: student.email  ?? "—" },
            { label: "Teléfono", value: student.phone  ?? "—" },
            { label: "Género",   value: student.gender ?? "—" },
            { label: "Alta",     value: formatDate(student.createdAt) },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
              <span style={{ color: "var(--color-text-primary)" }}>{row.value}</span>
            </div>
          ))}
          {student.notes && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--color-background-secondary)", borderRadius: 8, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--color-text-primary)" }}>Notas:</strong> {student.notes}
            </div>
          )}
        </div>

        {/* Tutores */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 14px" }}>Tutores / Responsables</h2>
          {student.parents.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin tutores registrados</p>
          )}
          {student.parents.map(p => (
            <div key={p.id} style={{ padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <p style={{ fontWeight: 500, fontSize: 13, margin: 0 }}>{p.user.name}</p>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>{p.relationship ?? ""} · {p.user.email}</p>
            </div>
          ))}
        </div>

        {/* Inscripciones activas */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Inscripciones activas</h2>
            <EnrollToGroupModal studentId={student.id} />
          </div>
          {activeEnrollments.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin inscripciones activas</p>
          )}
          {activeEnrollments.map(e => (
            <div key={e.id} style={{ padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>{e.group.discipline.name}</span>
                  <p style={{ fontWeight: 500, fontSize: 13, margin: "4px 0 0" }}>{e.group.name}</p>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                    {e.group.instructor?.user.name ?? "Sin instructor"} · Desde {formatDate(e.startDate)}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  {e.discount > 0 && (
                    <span style={{ background: "#fef3c7", color: "#b45309", borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>{e.discount}% desc.</span>
                  )}
                  <TransferGroupModal studentId={student.id} currentEnrollmentId={e.id} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Últimos pagos */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Últimos pagos</h2>
            <Link href={`/dashboard/pagos?student=${student.id}`} style={{ fontSize: 12, color: "#1e3a5f", textDecoration: "none" }}>Ver todos</Link>
          </div>
          {student.payments.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin pagos registrados</p>
          )}
          {student.payments.slice(0, 5).map(p => {
            const colors: Record<string, { bg: string; color: string }> = {
              PAID:      { bg: "#f0fdf4", color: "#15803d" },
              PENDING:   { bg: "#fffbeb", color: "#b45309" },
              OVERDUE:   { bg: "#fff1f2", color: "#be123c" },
              CANCELLED: { bg: "#f8fafc", color: "#475569" },
            };
            const c = colors[p.status] ?? colors.PENDING;
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{p.concept}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>{formatDate(p.dueDate)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>{formatCurrency(p.amount, p.currency)}</p>
                  <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "1px 8px", fontSize: 11 }}>{p.status}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
