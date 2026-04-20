import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import Link from "next/link";

interface PageProps {
  searchParams: { active?: string };
}

export default async function DisciplinasPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  const activeFilter = searchParams.active === "false" ? false : searchParams.active === "true" ? true : undefined;

  const where: Parameters<typeof db.discipline.findMany>[0]["where"] = {
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
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Disciplinas</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>Administra las categorías de clases de tu escuela.</p>
        </div>
        <Link href="/dashboard/configuracion/disciplinas/nuevo" style={{ background: "#5b21b6", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
          + Nueva disciplina
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {[
          { label: "Todas", value: undefined, count: totalAll },
          { label: "Activas", value: "true", count: countMap["true"] ?? 0 },
          { label: "Inactivas", value: "false", count: countMap["false"] ?? 0 },
        ].map(tab => {
          const active = tab.value === undefined ? activeFilter === undefined : String(activeFilter) === tab.value;
          return (
            <Link key={tab.label} href={buildUrl({ active: tab.value })} style={{
              padding: "8px 16px", fontSize: 13, textDecoration: "none",
              color: active ? "#5b21b6" : "var(--color-text-secondary)",
              fontWeight: active ? 500 : 400,
              borderBottom: active ? "2px solid #5b21b6" : "2px solid transparent",
              marginBottom: -1,
            }}>
              {tab.label} <span style={{ fontSize: 11 }}>{tab.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Tabla */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}>
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
                      background: disc.isActive ? "#f0fdf4" : "#f8fafc",
                      color:      disc.isActive ? "#15803d" : "#475569",
                      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500,
                  }}>
                    {disc.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>

                <td style={{ padding: "11px 14px", textAlign: "right" }}>
                  <Link href={`/dashboard/configuracion/disciplinas/${disc.id}/editar`} style={{ fontSize: 12, color: "#5b21b6", textDecoration: "none" }}>Editar →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
