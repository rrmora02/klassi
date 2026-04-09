import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { GroupLevelBadge } from "@/components/grupos/group-level-badge";
import { GroupActions } from "@/components/grupos/group-actions";
import { StudentStatusBadge } from "@/components/alumnos/student-status-badge";
import type { ScheduleSlot } from "@/lib/schemas/group.schema";

// ─── Helpers ──────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  MON: "Lunes", TUE: "Martes", WED: "Miércoles",
  THU: "Jueves", FRI: "Viernes", SAT: "Sábado", SUN: "Domingo",
};

export default async function GrupoDetailPage({ params }: { params: { id: string } }) {
  const { orgId } = await auth();
  if (!orgId) return null;
  const tenant = await db.tenant.findFirst({ where: { clerkOrgId: orgId } });
  if (!tenant) return null;

  const group = await db.group.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: {
      discipline: true,
      instructor: { include: { user: true } },
      enrollments: {
        orderBy: { startDate: "desc" },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, status: true },
          },
        },
      },
      _count: {
        select: {
          enrollments: { where: { status: "ACTIVE" } },
          sessions:    true,
        },
      },
    },
  });

  if (!group) notFound();

  const schedule     = group.schedule as unknown as ScheduleSlot[];
  const activeCount  = group._count.enrollments;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/grupos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Grupos</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>{group.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
              {group.name}
            </h1>
            <span style={{
              background: group.isActive ? "#f0fdf4" : "#f8fafc",
              color:      group.isActive ? "#15803d" : "#475569",
              borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500,
            }}>
              {group.isActive ? "Activo" : "Inactivo"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: "#eff6ff", color: "#1d4ed8",
              borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500,
            }}>
              {group.discipline.name}
            </span>
            <GroupLevelBadge level={group.level} />
          </div>
        </div>

        <GroupActions
          groupId={group.id}
          groupName={group.name}
          isActive={group.isActive}
        />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Alumnos activos",   value: String(activeCount), alert: activeCount >= group.capacity },
          { label: "Capacidad máxima",  value: String(group.capacity) },
          { label: "Instructor",        value: group.instructor?.user.name ?? "Sin asignar" },
          { label: "Aula / Cancha",     value: group.room ?? "Sin asignar" },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: k.alert ? "#fff5f5" : "var(--color-background-primary)",
              border: `0.5px solid ${k.alert ? "#fca5a5" : "var(--color-border-tertiary)"}`,
              borderRadius: 10, padding: "12px 14px",
            }}
          >
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{k.label}</p>
            <p style={{
              fontSize: 17, fontWeight: 500,
              color: k.alert ? "#b91c1c" : "var(--color-text-primary)",
              margin: "4px 0 0", wordBreak: "break-word",
            }}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Horario */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 14px" }}>Horario</h2>
          {schedule.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin horario configurado</p>
          ) : (
            schedule.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13,
                }}
              >
                <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{DAY_LABELS[s.day] ?? s.day}</span>
                <span style={{ color: "var(--color-text-primary)" }}>{s.startTime} – {s.endTime}</span>
              </div>
            ))
          )}
        </div>

        {/* Info de disciplina */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 14px" }}>Detalles</h2>
          {[
            { label: "Disciplina",    value: group.discipline.name },
            { label: "Nivel",         value: <GroupLevelBadge level={group.level} /> },
            { label: "Clases dadas",  value: String(group._count.sessions) },
            { label: "Alta",          value: formatDate(group.createdAt) },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
              <span style={{ color: "var(--color-text-primary)" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alumnos inscritos */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
            Alumnos inscritos <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 400 }}>({group.enrollments.length})</span>
          </h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Alumno", "Estado", "Inscripción", ""].map((h) => (
                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.enrollments.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-tertiary)" }}>
                  Sin alumnos inscritos
                </td>
              </tr>
            )}
            {group.enrollments.map((e) => (
              <tr key={e.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "10px 16px" }}>
                  <Link
                    href={`/dashboard/alumnos/${e.student.id}`}
                    style={{ fontWeight: 500, color: "var(--color-text-primary)", textDecoration: "none" }}
                  >
                    {e.student.firstName} {e.student.lastName}
                  </Link>
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <StudentStatusBadge status={e.student.status} />
                </td>
                <td style={{ padding: "10px 16px", color: "var(--color-text-secondary)", fontSize: 12 }}>
                  {formatDate(e.startDate)}
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  <Link href={`/dashboard/alumnos/${e.student.id}`} style={{ fontSize: 12, color: "#1e3a5f", textDecoration: "none" }}>
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
