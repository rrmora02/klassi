import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: { active?: string };
}

export default async function DisciplinasPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  // Solo ADMIN
  const tenantUser = await db.tenantUser.findFirst({
    where: { tenantId: tenant.id, userId: user.id }
  });
  if (tenantUser?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const activeFilter = searchParams.active === "false" ? false : searchParams.active === "true" ? true : undefined;

  const where: any = {
    tenantId: tenant.id,
    ...(activeFilter !== undefined && { isActive: activeFilter }),
  };

  const [disciplines, total, counts] = await Promise.all([
    db.discipline.findMany({
      where, 
      orderBy: { name: "asc" },
      include: { _count: { select: { groups: true } } },
    }),
    db.discipline.count({ where }),
    db.discipline.groupBy({ by: ["isActive"], where: { tenantId: tenant.id }, _count: true }),
  ]);

  const countMap = Object.fromEntries(counts.map(c => [String(c.isActive), c._count]));
  const totalAll = (countMap["true"] ?? 0) + (countMap["false"] ?? 0);

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { active: activeFilter !== undefined ? String(activeFilter) : undefined, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return `/dashboard/configuracion/disciplinas?${sp.toString()}`;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <span>Configuración / Disciplinas</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Disciplinas</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Administra las categorías de clases de tu escuela.</p>
        </div>
        <Link href="/dashboard/configuracion/disciplinas/nuevo" style={{ background: "#00754A", color: "#fff", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
          + Nueva disciplina
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)", overflowX: "auto" }} className="scrollbar-hide">
        {[
          { label: "Todas", value: undefined, count: totalAll },
          { label: "Activas", value: "true", count: countMap["true"] ?? 0 },
          { label: "Inactivas", value: "false", count: countMap["false"] ?? 0 },
        ].map(tab => {
          const active = tab.value === undefined ? activeFilter === undefined : String(activeFilter) === tab.value;
          return (
            <Link key={tab.label} href={buildUrl({ active: tab.value })} style={{
              padding: "8px 12px", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap",
              color: active ? "#006241" : "var(--color-text-secondary)",
              fontWeight: active ? 500 : 400,
              borderBottom: active ? "2px solid #006241" : "2px solid transparent",
              marginBottom: -1,
            }} className="sm:px-4 sm:text-sm">
              {tab.label} <span style={{ fontSize: 11 }}>{tab.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Tabla */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Disciplina", "Descripción", "Grupos", "Estado", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {disciplines.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>No se encontraron disciplinas</td></tr>
            )}
            {disciplines.map(disc => (
              <tr key={disc.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: disc.color || "#1e40af", flexShrink: 0 }} />
                    <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{disc.name}</span>
                  </div>
                </td>

                <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)", maxWidth: 300 }}>
                   {disc.description ? (disc.description.length > 60 ? `${disc.description.substring(0, 60)}...` : disc.description) : "—"}
                </td>

                <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)" }}>{disc._count.groups} activos</td>
                
                <td style={{ padding: "11px 14px" }}>
                  <span style={{
                      background: disc.isActive ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.10)",
                      color:      disc.isActive ? "#10b981" : "#94a3b8",
                      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500,
                  }}>
                    {disc.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>

                <td style={{ padding: "11px 14px", textAlign: "right" }}>
                  <Link href={`/dashboard/configuracion/disciplinas/${disc.id}/editar`} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textDecoration: "none", cursor: "pointer" }}>
                    Editar →
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
