import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import Link from "next/link";

interface PageProps {
  searchParams: { q?: string; active?: string; page?: string; };
}

export default async function InstructoresPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 20;
  const search = searchParams.q?.trim() ?? "";
  const activeFilter = searchParams.active === "false" ? false : searchParams.active === "true" ? true : undefined;

  const where: Parameters<typeof db.instructor.findMany>[0]["where"] = {
    tenantId: tenant.id,
    ...(activeFilter !== undefined && { isActive: activeFilter }),
    ...(search && { OR: [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { phone: { contains: search } },
    ]}),
  };

  const [instructors, total, counts] = await Promise.all([
    db.instructor.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: { user: { name: "asc" } },
      include: {
        user: true,
        _count: { select: { groups: { where: { isActive: true } } } },
      },
    }),
    db.instructor.count({ where }),
    db.instructor.groupBy({ by: ["isActive"], where: { tenantId: tenant.id }, _count: true }),
  ]);

  const pages = Math.ceil(total / pageSize);
  const countMap = Object.fromEntries(counts.map(c => [String(c.isActive), c._count]));
  const totalAll = (countMap["true"] ?? 0) + (countMap["false"] ?? 0);

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q: search || undefined, active: activeFilter !== undefined ? String(activeFilter) : undefined, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v !== undefined) sp.set(k, v); });
    return `/dashboard/instructores?${sp.toString()}`;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
            Instructores
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            {total} {total === 1 ? "instructor" : "instructores"}
          </p>
        </div>
        <Link
          href="/dashboard/instructores/nuevo"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "#fff", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500,
            textDecoration: "none", boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          + Nuevo instructor
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 18, borderBottom: "1px solid var(--color-border-secondary)" }}>
        {[
          { label: "Todos",     value: undefined, count: totalAll },
          { label: "Activos",   value: "true",    count: countMap["true"]  ?? 0 },
          { label: "Inactivos", value: "false",   count: countMap["false"] ?? 0 },
        ].map(tab => {
          const active = tab.value === undefined ? activeFilter === undefined : String(activeFilter) === tab.value;
          return (
            <Link
              key={tab.label}
              href={buildUrl({ active: tab.value, page: "1" })}
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

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <form style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              color: "var(--color-text-tertiary)", pointerEvents: "none", fontSize: 14,
            }}>
              🔍
            </span>
            <input
              name="q"
              defaultValue={search}
              placeholder="Buscar por nombre, email o teléfono..."
              style={{
                width: "100%", border: "1px solid var(--input-border)", borderRadius: 8,
                padding: "8px 12px 8px 32px", fontSize: 13, background: "var(--input-bg)",
                color: "var(--input-text)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </form>
      </div>

      {/* Tabla */}
      <div
        className="r-table-scroll"
        style={{
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-tertiary)",
          borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-xs)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-tertiary)" }}>
              {["Instructor", "Contacto", "Grupos", "Biografía", "Estado", ""].map(h => (
                <th
                  key={h}
                  style={{
                    padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {instructors.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "52px 0", color: "var(--color-text-tertiary)" }}>
                  No se encontraron instructores
                </td>
              </tr>
            )}
            {instructors.map(inst => (
              <tr key={inst.id} style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: "var(--color-primary-light)", color: "var(--color-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                      border: "1px solid rgba(99,102,241,0.15)",
                    }}>
                      {inst.user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/dashboard/instructores/${inst.id}`}
                        style={{ fontWeight: 500, color: "var(--color-text-primary)", textDecoration: "none", fontSize: 13 }}
                      >
                        {inst.user.name}
                      </Link>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{inst.user.email}</span>
                    {inst.phone && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>{inst.phone}</span>}
                  </div>
                </td>
                <td className="r-hide-sm" style={{ padding: "12px 14px", color: "var(--color-text-secondary)" }}>
                  <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{inst._count.groups}</span> activos
                </td>
                <td className="r-hide-sm" style={{ padding: "12px 14px", color: "var(--color-text-secondary)", fontSize: 12, maxWidth: 220 }}>
                  {inst.bio
                    ? (inst.bio.length > 50 ? `${inst.bio.substring(0, 50)}…` : inst.bio)
                    : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
                  }
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{
                    background: inst.isActive ? "#ecfdf5" : "#f8fafc",
                    color:      inst.isActive ? "#065f46" : "#475569",
                    border:     `1px solid ${inst.isActive ? "#a7f3d0" : "#e2e8f0"}`,
                    borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 500,
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: inst.isActive ? "#10b981" : "#94a3b8", flexShrink: 0 }} />
                    {inst.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <Link
                    href={`/dashboard/instructores/${inst.id}`}
                    style={{
                      fontSize: 12, color: "var(--color-primary)", textDecoration: "none", fontWeight: 500,
                      padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.2)",
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

      {/* Paginación */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 13, color: "var(--color-text-secondary)", flexWrap: "wrap", gap: 8 }}>
          <span>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} style={{ padding: "6px 12px", border: "1px solid var(--color-border-secondary)", borderRadius: 7, textDecoration: "none", color: "var(--color-text-secondary)", fontSize: 13 }}>
                ← Ant
              </Link>
            )}
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + Math.max(1, page - 2))
              .filter(p => p <= pages)
              .map(p => (
                <Link
                  key={p}
                  href={buildUrl({ page: String(p) })}
                  style={{
                    padding: "6px 10px", borderRadius: 7, textDecoration: "none",
                    border: "1px solid var(--color-border-secondary)",
                    background: p === page ? "var(--color-primary)" : "transparent",
                    color: p === page ? "#fff" : "var(--color-text-secondary)",
                    fontSize: 13, fontWeight: p === page ? 600 : 400,
                  }}
                >
                  {p}
                </Link>
              ))}
            {page < pages && (
              <Link href={buildUrl({ page: String(page + 1) })} style={{ padding: "6px 12px", border: "1px solid var(--color-border-secondary)", borderRadius: 7, textDecoration: "none", color: "var(--color-text-secondary)", fontSize: 13 }}>
                Sig →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
