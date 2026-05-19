import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fullName, formatDate, calcAge, formatCurrency, translatePaymentStatus } from "@/lib/utils";
import { StudentStatusBadge } from "@/components/alumnos/student-status-badge";
import { StudentActions } from "@/components/alumnos/student-actions";
import { StudentEnrollmentsSection } from "@/components/alumnos/student-enrollments-section";
import { StudentShareButton } from "@/components/alumnos/student-share-button";
import { AssignFirstBeltSection } from "@/components/alumnos/assign-first-belt-section";

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
      parents: { include: { user: true } },
    },
  });

  if (!student) notFound();

  // Estadísticas de asistencia
  const attendances = await db.attendance.findMany({
    where: { enrollment: { studentId: student.id } },
    select: { status: true },
  });

  const totalClasses = attendances.length;
  const presentCount = attendances.filter(a => a.status === "PRESENT").length;
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : null;

  const activeEnrollments = student.enrollments.filter(e => e.status === "ACTIVE");
  const hasActiveKarateGroup = activeEnrollments.some(e => e.group.discipline?.name.toLowerCase().includes("karate"));
  const totalPaid = student.payments
    .filter(p => p.status === "PAID")
    .reduce((sum, p) => sum + (p.amount - (p.discountAmount || 0)), 0);
  const overduePayments = student.payments.filter(p => p.status === "OVERDUE");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/alumnos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Alumnos</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>{fullName(student.firstName, student.lastName)}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#d4e9e2", color: "#006241", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 500 }}>
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

        {/* Acciones */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <StudentShareButton studentId={student.id} />
          <StudentActions
            studentId={student.id}
            studentName={fullName(student.firstName, student.lastName)}
            status={student.status}
          />
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }} className="sm:grid-cols-4">
        {[
          { label: "Disciplinas activas", value: String(activeEnrollments.length) },
          { label: "Asistencia", value: attendanceRate !== null ? `${attendanceRate}%` : "—", alert: attendanceRate !== null && attendanceRate < 70 },
          { label: "Clases totales", value: String(totalClasses) },
          { label: "Total pagado", value: formatCurrency(totalPaid), alert: overduePayments.length > 0 },
        ].map(k => (
          <div key={k.label} style={{ background: k.alert ? "rgba(220,38,38,0.08)" : "var(--color-background-primary)", border: `0.5px solid ${k.alert ? "rgba(220,38,38,0.30)" : "var(--color-border-tertiary)"}`, borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{k.label}</p>
            <p style={{ fontSize: 18, fontWeight: 500, color: k.alert ? "#b91c1c" : "var(--color-text-primary)", margin: "4px 0 0" }} className="sm:text-2xl">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }} className="sm:grid-cols-2">

        {/* Datos personales */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Datos personales</h2>
            <Link href={`/dashboard/alumnos/${student.id}/editar`} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textDecoration: "none", cursor: "pointer" }}>
              Editar →
            </Link>
          </div>
          {[
            { label: "Email", value: student.email ?? "—" },
            { label: "Teléfono", value: student.phone ?? "—" },
            { label: "Género", value: student.gender ?? "—" },
            { label: "Alta", value: formatDate(student.createdAt) },
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
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>{p.relationship ?? ""} · {p.user.phone ?? "—"}</p>
            </div>
          ))}
        </div>

        {/* 🥋 Asignar primera cinta (solo si no tiene cinta y tiene grupo Karate) */}
        {!student.currentBeltColor && hasActiveKarateGroup && (
          <AssignFirstBeltSection
            studentId={student.id}
            studentName={fullName(student.firstName, student.lastName)}
          />
        )}

        {/* 🥋 Karate Belt (mostrar cuando ya tiene cinta asignada) */}
        {student.currentBeltColor && hasActiveKarateGroup && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>🥋 Cinta de Karate</h2>
              <Link href={`/dashboard/alumnos/${student.id}/editar`} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textDecoration: "none", cursor: "pointer" }}>
                Editar →
              </Link>
            </div>
            {(() => {
              const beltNames: Record<string, string> = {
                WHITE: "⚪ Blanca",
                YELLOW: "🟡 Amarilla",
                ORANGE: "🟠 Naranja",
                GREEN: "🟢 Verde",
                BLUE: "🔵 Azul",
                BROWN: "🟤 Marrón",
                BLACK: "⚫ Negra",
              };
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: 13 }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Cinta actual</span>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 500, fontSize: 16 }}>
                      {beltNames[student.currentBeltColor] || student.currentBeltColor}
                    </span>
                  </div>
                  {student.beltUpdatedAt && (
                    <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "6px 0 0" }}>
                      Última actualización: {formatDate(student.beltUpdatedAt)}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Inscripciones activas */}
        <StudentEnrollmentsSection studentId={student.id} activeEnrollments={activeEnrollments} />

        {/* Últimos pagos */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Últimos pagos</h2>
            <Link href={`/dashboard/pagos?student=${student.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textDecoration: "none", cursor: "pointer" }}>
              Ver todos →
            </Link>
          </div>
          {student.payments.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin pagos registrados</p>
          )}
          {student.payments.slice(0, 5).map(p => {
            const colors: Record<string, { bg: string; color: string }> = {
              PAID: { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
              PENDING: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
              OVERDUE: { bg: "#fff1f2", color: "#be123c" },
              CANCELLED: { bg: "rgba(100,116,139,0.10)", color: "#94a3b8" },
            };
            const c = colors[p.status] ?? colors["PENDING"]!;
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{p.concept}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>{formatDate(p.dueDate)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>{formatCurrency(p.amount, p.currency)}</p>
                  <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: "1px 8px", fontSize: 11 }}>{translatePaymentStatus(p.status)}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
