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
    Object.entries(merged).forEach(([k, v]) => { if (v !== undefined) sp.set(k, v); });
    return `/dashboard/configuracion/disciplinas?${sp.toString()}`;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
            Disciplinas
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            {total} {total === 1 ? "disciplina" : "disciplinas"} · categorías de clases de tu escuela
          </p>
        </div>
        <Link
          href="/dashboard/configuracion/disciplinas/nuevo"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "#fff", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500,
            textDecoration: "none", boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          + Nueva disciplina
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 18, borderBottom: "1px solid var(--color-border-secondary)" }}>
        {[
          { label: "Todas",    value: undefined, count: totalAll },
          { label: "Activas",  value: "true",    count: countMap["true"]  ?? 0 },
          { label: "Inactivas",value: "false",   count: countMap["false"] ?? 0 },
        ].map(tab => {
          const active = tab.value === undefined ? activeFilter === undefined : String(activeFilter) === tab.value;
          return (
            <Link
              key={tab.label}
              href={buildUrl({ active: tab.value })}
              style={{
                padding: "9px 16px", fontSize: 13, textDecoration: "none",
                color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontWeight: active ? 600 : 400,
                borderBottom: active ? "2px solid var(--color-primary)" : "2px solid transparent",
                marginBottom: -1, transition: "all 0.15s",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              {tab.label}
              <span style={{
                fontSize: 11, padding: "1px 7px", borderRadius: 999,
                background: active ? "var(--color-primary-light)" : "var(--color-background-tertiary)",
                color: active ? "var(--color-primary)" : "var(--color-text-tertiary)",
                fontWeight: 500,
              }}>
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Tabla */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "1px solid var(--color-border-tertiary)",
        borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-xs)",
      }}>
        <div className="r-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-tertiary)" }}>
                {(() => {
                  const th = { padding: "11px 14px", textAlign: "left" as const, fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--color-text-tertiary)" };
                  return (<>
                    <th style={th}>Disciplina</th>
                    <th className="r-hide-sm" style={th}>Descripción</th>
                    <th className="r-hide-xs" style={th}>Grupos</th>
                    <th style={th}>Estado</th>
                    <th style={th}></th>
                  </>);
                })()}
              </tr>
            </thead>
            <tbody>
              {disciplines.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "52px 0", color: "var(--color-text-tertiary)" }}>
                    No se encontraron disciplinas
                  </td>
                </tr>
              )}
              {disciplines.map(disc => (
                <tr key={disc.id} style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>

                  {/* Nombre + color dot */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: disc.color || "var(--color-primary)",
                        flexShrink: 0, border: "2px solid rgba(0,0,0,0.08)",
                      }} />
                      <span style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: 13 }}>
                        {disc.name}
                      </span>
                    </div>
                  </td>

                  {/* Descripción */}
                  <td className="r-hide-sm" style={{ padding: "12px 14px", color: "var(--color-text-secondary)", fontSize: 12, maxWidth: 260 }}>
                    {disc.description
                      ? (disc.description.length > 60 ? `${disc.description.substring(0, 60)}…` : disc.description)
                      : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    }
                  </td>

                  {/* Grupos */}
                  <td className="r-hide-xs" style={{ padding: "12px 14px", color: "var(--color-text-secondary)" }}>
                    <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{disc._count.groups}</span> grupos
                  </td>

                  {/* Estado */}
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      background: disc.isActive ? "#ecfdf5" : "#f8fafc",
                      color:      disc.isActive ? "#065f46" : "#475569",
                      border:     `1px solid ${disc.isActive ? "#a7f3d0" : "#e2e8f0"}`,
                      borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 500,
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: disc.isActive ? "#10b981" : "#94a3b8", flexShrink: 0 }} />
                      {disc.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>

                  {/* Acción */}
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Link
                      href={`/dashboard/configuracion/disciplinas/${disc.id}/editar`}
                      style={{
                        fontSize: 12, color: "var(--color-primary)", textDecoration: "none", fontWeight: 500,
                        padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.2)",
                        background: "var(--color-primary-light)", display: "inline-block",
                      }}
                    >
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
