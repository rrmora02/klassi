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
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } }
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!instructor) {
    redirect("/dashboard/instructores");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/instructores" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Instructores</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>{instructor.user.name}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 500, flexShrink: 0 }}>
             {instructor.user.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 4px" }}>
              {instructor.user.name}
            </h1>
            <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
              <span>{instructor.user.email}</span>
              {instructor.phone && (
                <>
                  <span>•</span>
                  <span>{instructor.phone}</span>
                </>
              )}
              <span>•</span>
              <span style={{
                  background: instructor.isActive ? "#f0fdf4" : "#f8fafc",
                  color:      instructor.isActive ? "#15803d" : "#475569",
                  borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500,
              }}>
                {instructor.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>
        <Link href={`/dashboard/instructores/${instructor.id}/editar`} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)", textDecoration: "none" }}>
          Editar
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
        
        {/* Panel izquierdo */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Biografía</h3>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.5, margin: 0 }}>
               {instructor.bio || "No se ha proporcionado una biografía para este instructor."}
            </p>
          </div>

          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Estadísticas</h3>
            <div style={{ display: "flex", gap: 24 }}>
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>Grupos totales</p>
                <p style={{ fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>{instructor.groups.length}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>Alumnos totales</p>
                <p style={{ fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                  {instructor.groups.reduce((acc, g) => acc + g._count.enrollments, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho: Grupos asignados */}
        <div>
           <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Grupos asignados</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Grupo</th>
                    <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Disciplina</th>
                    <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Alumnos</th>
                    <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {instructor.groups.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-tertiary)" }}>No tiene grupos asignados.</td></tr>
                  )}
                  {instructor.groups.map(g => (
                    <tr key={g.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "12px 20px", fontWeight: 500, color: "var(--color-text-primary)" }}>{g.name}</td>
                      <td style={{ padding: "12px 20px" }}>
                        <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
                          {g.discipline.name}
                        </span>
                      </td>
                      <td style={{ padding: "12px 20px", color: "var(--color-text-secondary)" }}>
                        {g._count.enrollments} / {g.capacity}
                      </td>
                      <td style={{ padding: "12px 20px", textAlign: "right" }}>
                        <Link href={`/dashboard/grupos/${g.id}`} style={{ fontSize: 12, color: "#1e3a5f", textDecoration: "none" }}>Ver grupo →</Link>
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
