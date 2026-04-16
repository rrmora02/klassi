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
    <div style={{ maxWidth: 880, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          fontSize: 13,
          color: "var(--color-text-tertiary)",
        }}
      >
        <Link
          href="/dashboard/alumnos"
          style={{ color: "var(--color-text-tertiary)", textDecoration: "none" }}
        >
          Alumnos
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-secondary)" }}>
          {fullName(student.firstName, student.lastName)}
        </span>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
          background: "#fff",
          borderRadius: 14,
          padding: "20px 24px",
          border: "1px solid var(--color-border-tertiary)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--color-primary-light)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 600,
              border: "2px solid rgba(99,102,241,0.15)",
              flexShrink: 0,
            }}
          >
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {fullName(student.firstName, student.lastName)}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Disciplinas activas", value: String(activeEnrollments.length), alert: false },
          {
            label: "Asistencia",
            value: attendanceRate !== null ? `${attendanceRate}%` : "—",
            alert: attendanceRate !== null && attendanceRate < 70,
          },
          { label: "Clases totales", value: String(totalClasses), alert: false },
          { label: "Total pagado", value: formatCurrency(totalPaid), alert: overduePayments.length > 0 },
        ].map(k => (
          <div
            key={k.label}
            style={{
              background: k.alert ? "#fef2f2" : "#fff",
              border: `1px solid ${k.alert ? "#fecaca" : "var(--color-border-tertiary)"}`,
              borderRadius: 12,
              padding: "14px 16px",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: k.alert ? "#dc2626" : "var(--color-text-tertiary)", margin: 0 }}>
              {k.label}
            </p>
            <p style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: k.alert ? "#b91c1c" : "var(--color-text-primary)", margin: "6px 0 0" }}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Datos personales */}
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: "18px 20px",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
              Datos personales
            </h2>
            <Link
              href={`/dashboard/alumnos/${student.id}/editar`}
              style={{
                fontSize: 12,
                color: "var(--color-primary)",
                textDecoration: "none",
                fontWeight: 500,
                padding: "3px 10px",
                borderRadius: 6,
                border: "1px solid rgba(99,102,241,0.2)",
                background: "var(--color-primary-light)",
              }}
            >
              Editar
            </Link>
          </div>
          {[
            { label: "Email",    value: student.email  ?? "—" },
            { label: "Teléfono", value: student.phone  ?? "—" },
            { label: "Género",   value: student.gender ?? "—" },
            { label: "Alta",     value: formatDate(student.createdAt) },
          ].map(row => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--color-border-tertiary)",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
              <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}
          {student.notes && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "var(--color-background-secondary)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
                border: "1px solid var(--color-border-tertiary)",
              }}
            >
              <strong style={{ color: "var(--color-text-primary)" }}>Notas:</strong> {student.notes}
            </div>
          )}
        </div>

        {/* Tutores */}
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: "18px 20px",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 14px" }}>
            Tutores / Responsables
          </h2>
          {student.parents.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin tutores registrados</p>
          )}
          {student.parents.map(p => (
            <div
              key={p.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--color-border-tertiary)",
              }}
            >
              <p style={{ fontWeight: 500, fontSize: 13, margin: 0, color: "var(--color-text-primary)" }}>
                {p.user.name}
              </p>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                {p.relationship ?? ""} · {p.user.email}
              </p>
            </div>
          ))}
        </div>

        {/* Inscripciones activas */}
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: "18px 20px",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
              Inscripciones activas
            </h2>
            <EnrollToGroupModal studentId={student.id} />
          </div>
          {activeEnrollments.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin inscripciones activas</p>
          )}
          {activeEnrollments.map(e => (
            <div
              key={e.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--color-border-tertiary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 500,
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    {e.group.discipline.name}
                  </span>
                  <p style={{ fontWeight: 500, fontSize: 13, margin: "5px 0 0", color: "var(--color-text-primary)" }}>
                    {e.group.name}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                    {e.group.instructor?.user.name ?? "Sin instructor"} · Desde {formatDate(e.startDate)}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  {e.discount > 0 && (
                    <span
                      style={{
                        background: "#fffbeb",
                        color: "#92400e",
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 11,
                        border: "1px solid #fde68a",
                      }}
                    >
                      {e.discount}% desc.
                    </span>
                  )}
                  <TransferGroupModal studentId={student.id} currentEnrollmentId={e.id} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Últimos pagos */}
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: "18px 20px",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
              Últimos pagos
            </h2>
            <Link
              href={`/dashboard/pagos?student=${student.id}`}
              style={{
                fontSize: 12,
                color: "var(--color-primary)",
                textDecoration: "none",
                fontWeight: 500,
                padding: "3px 10px",
                borderRadius: 6,
                border: "1px solid rgba(99,102,241,0.2)",
                background: "var(--color-primary-light)",
              }}
            >
              Ver todos
            </Link>
          </div>
          {student.payments.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin pagos registrados</p>
          )}
          {student.payments.slice(0, 5).map(p => {
            const colors: Record<string, { bg: string; color: string; border: string }> = {
              PAID:      { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
              PENDING:   { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
              OVERDUE:   { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
              CANCELLED: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
            };
            const c = colors[p.status] ?? colors.PENDING;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 0",
                  borderBottom: "1px solid var(--color-border-tertiary)",
                  fontSize: 13,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 500, color: "var(--color-text-primary)" }}>{p.concept}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                    {formatDate(p.dueDate)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {formatCurrency(p.amount, p.currency)}
                  </p>
                  <span
                    style={{
                      background: c.bg,
                      color: c.color,
                      borderRadius: 999,
                      padding: "1px 8px",
                      fontSize: 11,
                      fontWeight: 500,
                      border: `1px solid ${c.border}`,
                      marginTop: 3,
                      display: "inline-block",
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
