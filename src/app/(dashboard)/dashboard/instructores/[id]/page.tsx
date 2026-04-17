import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default async function InstructorDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;
  const loggedUser = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = loggedUser?.activeTenant;
  if (!tenant) return null;

  const instructor = await db.instructor.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: {
      user: true,
      groups: {
        include: {
          discipline: true,
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!instructor) redirect("/dashboard/instructores");

  const totalStudents = instructor.groups.reduce((acc, g) => acc + g._count.enrollments, 0);
  const activeGroups  = instructor.groups.filter(g => g.isActive).length;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13, color: "var(--color-text-tertiary)" }}>
        <Link href="/dashboard/instructores" style={{ color: "var(--color-text-tertiary)", textDecoration: "none" }}>
          Instructores
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{instructor.user.name}</span>
      </div>

      {/* Header card */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 24, background: "#fff", borderRadius: 14, padding: "20px 24px",
        border: "1px solid var(--color-border-tertiary)", boxShadow: "var(--shadow-xs)",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--color-primary-light)", color: "var(--color-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 600, border: "2px solid rgba(99,102,241,0.15)", flexShrink: 0,
          }}>
            {instructor.user.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
              {instructor.user.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{
                background: instructor.isActive ? "#ecfdf5" : "#f8fafc",
                color:      instructor.isActive ? "#065f46" : "#475569",
                border:     `1px solid ${instructor.isActive ? "#a7f3d0" : "#e2e8f0"}`,
                borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 5,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: instructor.isActive ? "#10b981" : "#94a3b8" }} />
                {instructor.isActive ? "Activo" : "Inactivo"}
              </span>
              {instructor.phone && (
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{instructor.phone}</span>
              )}
              <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>{instructor.user.email}</span>
            </div>
          </div>
        </div>
        <Link
          href={`/dashboard/instructores/${instructor.id}/editar`}
          style={{
            fontSize: 12, color: "var(--color-primary)", textDecoration: "none", fontWeight: 500,
            padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.2)",
            background: "var(--color-primary-light)", whiteSpace: "nowrap",
          }}
        >
          Editar
        </Link>
      </div>

      {/* KPIs */}
      <div className="r-grid-4" style={{ gap: 12, marginBottom: 20 }}>
        {[
          { label: "Grupos totales",  value: String(instructor.groups.length) },
          { label: "Grupos activos",  value: String(activeGroups) },
          { label: "Alumnos totales", value: String(totalStudents) },
          { label: "Grupos inactivos", value: String(instructor.groups.length - activeGroups) },
        ].map(k => (
          <div key={k.label} style={{
            background: "#fff", border: "1px solid var(--color-border-tertiary)",
            borderRadius: 12, padding: "14px 16px", boxShadow: "var(--shadow-xs)",
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)", margin: 0 }}>
              {k.label}
            </p>
            <p style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--color-text-primary)", margin: "6px 0 0" }}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="r-grid-1-2" style={{ gap: 16 }}>

        {/* Panel izquierdo: Bio + Contacto */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Bio */}
          <div style={{
            background: "#fff", border: "1px solid var(--color-border-tertiary)",
            borderRadius: 12, padding: "18px 20px", boxShadow: "var(--shadow-xs)",
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 12px" }}>
              Biografía
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7, margin: 0 }}>
              {instructor.bio ?? <span style={{ color: "var(--color-text-tertiary)" }}>Sin biografía registrada.</span>}
            </p>
          </div>

          {/* Contacto */}
          <div style={{
            background: "#fff", border: "1px solid var(--color-border-tertiary)",
            borderRadius: 12, padding: "18px 20px", boxShadow: "var(--shadow-xs)",
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 12px" }}>
              Contacto
            </h2>
            {[
              { label: "Email",    value: instructor.user.email ?? "—" },
              { label: "Teléfono", value: instructor.phone ?? "—" },
            ].map(row => (
              <div
                key={row.label}
                style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: "1px solid var(--color-border-tertiary)", fontSize: 13,
                }}
              >
                <span style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel derecho: Grupos */}
        <div style={{
          background: "#fff", border: "1px solid var(--color-border-tertiary)",
          borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-xs)",
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
              Grupos asignados
            </h2>
          </div>
          <div className="r-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-tertiary)" }}>
                  {["Grupo", "Disciplina", "Alumnos", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {instructor.groups.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-tertiary)" }}>
                      Sin grupos asignados
                    </td>
                  </tr>
                )}
                {instructor.groups.map(g => (
                  <tr key={g.id} style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>
                    <td style={{ padding: "11px 16px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {g.name}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        background: "#eff6ff", color: "#1d4ed8", borderRadius: 999,
                        padding: "2px 8px", fontSize: 11, fontWeight: 500, border: "1px solid #bfdbfe",
                      }}>
                        {g.discipline.name}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", color: "var(--color-text-secondary)" }}>
                      {g._count.enrollments} / {g.capacity}
                    </td>
                    <td style={{ padding: "11px 16px", textAlign: "right" }}>
                      <Link
                        href={`/dashboard/grupos/${g.id}`}
                        style={{
                          fontSize: 12, color: "var(--color-primary)", textDecoration: "none", fontWeight: 500,
                          padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.2)",
                          background: "var(--color-primary-light)", display: "inline-block",
                        }}
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
