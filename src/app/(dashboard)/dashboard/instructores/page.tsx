import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return `/dashboard/instructores?${sp.toString()}`;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Instructores</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>{total} {total === 1 ? "instructor" : "instructores"}</p>
        </div>
        <Link href="/dashboard/instructores/nuevo" style={{ background: "#00754A", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
          + Nuevo instructor
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {[
          { label: "Todos", value: undefined, count: totalAll },
          { label: "Activos", value: "true", count: countMap["true"] ?? 0 },
          { label: "Inactivos", value: "false", count: countMap["false"] ?? 0 },
        ].map(tab => {
          const active = tab.value === undefined ? activeFilter === undefined : String(activeFilter) === tab.value;
          return (
            <Link key={tab.label} href={buildUrl({ active: tab.value, page: "1" })} style={{
              padding: "8px 16px", fontSize: 13, textDecoration: "none",
              color: active ? "#006241" : "var(--color-text-secondary)",
              fontWeight: active ? 500 : 400,
              borderBottom: active ? "2px solid #006241" : "2px solid transparent",
              marginBottom: -1,
            }}>
              {tab.label} <span style={{ fontSize: 11 }}>{tab.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <form style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
          <input name="q" defaultValue={search} placeholder="Buscar por nombre, email o teléfono..." className="w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors" />
        </form>
      </div>

      {/* Tabla */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Instructor", "Contacto", "Grupos", "Biografía", "Estado", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {instructors.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>No se encontraron instructores</td></tr>
            )}
            {instructors.map(inst => (
              <tr key={inst.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                
                {/* Avatar y Nombre */}
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#d4e9e2", color: "#006241", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                      {inst.user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link href={`/dashboard/instructores/${inst.id}`} style={{ fontWeight: 500, color: "var(--color-text-primary)", textDecoration: "none" }}>{inst.user.name}</Link>
                    </div>
                  </div>
                </td>

                {/* Contacto */}
                <td style={{ padding: "11px 14px" }}>
                   <div style={{ display: "flex", flexDirection: "column" }}>
                     <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{inst.user.email}</span>
                     {inst.phone && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{inst.phone}</span>}
                   </div>
                </td>

                <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)" }}>{inst._count.groups} activos</td>
                
                <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)", fontSize: 12, maxWidth: 220 }}>
                  {inst.bio ? (inst.bio.length > 50 ? `${inst.bio.substring(0, 50)}...` : inst.bio) : "—"}
                </td>

                <td style={{ padding: "11px 14px" }}>
                  <span style={{
                      background: inst.isActive ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.10)",
                      color:      inst.isActive ? "#10b981" : "#94a3b8",
                      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500,
                  }}>
                    {inst.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>

                <td style={{ padding: "11px 14px", textAlign: "right" }}>
                  <Link href={`/dashboard/instructores/${inst.id}`} className="inline-flex items-center gap-1 rounded-md border border-sb-light bg-sb-light/30 px-2.5 py-1.5 text-xs font-medium text-sb-accent transition-colors hover:bg-sb-light/50 hover:border-sb-accent dark:border-sb-uplift dark:bg-sb-house dark:text-sb-light dark:hover:bg-sb-uplift dark:hover:border-sb-light">
                    Ver <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 13, color: "var(--color-text-secondary)" }}>
          <span>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)" }}>← Ant</Link>}
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + Math.max(1, page - 2)).filter(p => p <= pages).map(p => (
              <Link key={p} href={buildUrl({ page: String(p) })} style={{ padding: "5px 10px", borderRadius: 6, textDecoration: "none", border: "0.5px solid var(--color-border-secondary)", background: p === page ? "#006241" : "transparent", color: p === page ? "#fff" : "var(--color-text-secondary)" }}>{p}</Link>
            ))}
            {page < pages && <Link href={buildUrl({ page: String(page + 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)" }}>Sig →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
