import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { GroupLevelBadge } from "@/components/grupos/group-level-badge";
import { GroupActions } from "@/components/grupos/group-actions";
import { StudentStatusBadge } from "@/components/alumnos/student-status-badge";
import { EnrollStudentModal } from "@/components/grupos/enroll-student-modal";
import type { ScheduleSlot } from "@/lib/schemas/group.schema";

// ─── Helpers ──────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  MON: "Lunes", TUE: "Martes", WED: "Miércoles",
  THU: "Jueves", FRI: "Viernes", SAT: "Sábado", SUN: "Domingo",
};

export default async function GrupoDetailPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const tenant = user?.activeTenantId ? await db.tenant.findUnique({ where: { id: user.activeTenantId } }) : null;
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
              background: group.isActive ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.10)",
              color:      group.isActive ? "#10b981" : "#94a3b8",
              borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500,
            }}>
              {group.isActive ? "Activo" : "Inactivo"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: "#d4e9e2", color: "#006241",
              borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500,
            }}>
              {group.discipline.name}
            </span>
            <span style={{
              background: group.type === "FIXED" ? "rgba(100,116,139,0.10)" : "rgba(0,117,74,0.12)", 
              color: group.type === "FIXED" ? "#475569" : "#00754A",
              borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500,
            }}>
              {group.type === "FIXED" ? "Estación Fija" : "Grupo Generacional"}
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
              background: k.alert ? "rgba(220,38,38,0.08)" : "var(--color-background-primary)",
              border: `0.5px solid ${k.alert ? "rgba(220,38,38,0.30)" : "var(--color-border-tertiary)"}`,
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

      {/* Cobro mensual */}
      {(group.monthlyFee || group.billingDay) && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 14px" }}>Cobro mensual</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>Mensualidad</p>
              <p style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                {group.monthlyFee ? `$${(group.monthlyFee / 100).toFixed(2)} MXN` : "—"}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>Día de cobro</p>
              <p style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                {group.billingDay ? `${group.billingDay}° de cada mes` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alumnos inscritos */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>
            Alumnos inscritos <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 400 }}>({group.enrollments.length})</span>
          </h2>
          <EnrollStudentModal groupId={group.id} />
        </div>
        <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
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
                  <Link href={`/dashboard/alumnos/${e.student.id}`} className="inline-flex items-center gap-1 rounded-md border border-sb-light bg-sb-light/30 px-2.5 py-1.5 text-xs font-medium text-sb-accent transition-colors hover:bg-sb-light/50 hover:border-sb-accent dark:border-sb-uplift dark:bg-sb-house dark:text-sb-light dark:hover:bg-sb-uplift dark:hover:border-sb-light">
                    Ver <ArrowRight className="h-3 w-3" />
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
