import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { fullName, calcAge } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { StudentStatusBadge } from "@/components/alumnos/student-status-badge";

interface PageProps {
  searchParams: { q?: string; status?: string; disc?: string; page?: string; };
}

export default async function AlumnosPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  // Proteger acceso: solo ADMIN y RECEPTIONIST
  const tenantUser = await db.tenantUser.findFirst({
    where: { tenantId: tenant.id, userId: user.id }
  });
  if (tenantUser?.role === "INSTRUCTOR") {
    redirect("/dashboard");
  }

  const page     = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 20;
  const search   = searchParams.q?.trim() ?? "";
  const status   = searchParams.status as "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
  const discId   = searchParams.disc;

  const where: Parameters<typeof db.student.findMany>[0]["where"] = {
    tenantId: tenant.id,
    ...(status && { status }),
    ...(search && { OR: [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName:  { contains: search, mode: "insensitive" } },
      { email:     { contains: search, mode: "insensitive" } },
      { phone:     { contains: search } },
    ]}),
    ...(discId && { enrollments: { some: { status: "ACTIVE", group: { disciplineId: discId } } } }),
  };

  const [students, total, disciplines, counts] = await Promise.all([
    db.student.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { enrollments: { where: { status: "ACTIVE" }, include: { group: { include: { discipline: true } } } } },
    }),
    db.student.count({ where }),
    db.discipline.findMany({ where: { tenantId: tenant.id, isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.student.groupBy({ by: ["status"], where: { tenantId: tenant.id }, _count: true }),
  ]);

  const pages    = Math.ceil(total / pageSize);
  const countMap = Object.fromEntries(counts.map(c => [c.status, c._count]));

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q: search || undefined, status, disc: discId, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return `/dashboard/alumnos?${sp.toString()}`;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Alumnos</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>{total} {total === 1 ? "alumno" : "alumnos"}</p>
        </div>
        <Link href="/dashboard/alumnos/nuevo" style={{ background: "#00754A", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
          + Nuevo alumno
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {[
          { label: "Todos", value: undefined, count: Object.values(countMap).reduce((a: number, b: number) => a + b, 0) },
          { label: "Activos", value: "ACTIVE", count: countMap.ACTIVE ?? 0 },
          { label: "Inactivos", value: "INACTIVE", count: countMap.INACTIVE ?? 0 },
        ].map(tab => {
          const active = tab.value === status || (!tab.value && !status);
          return (
            <Link key={tab.label} href={buildUrl({ status: tab.value, page: "1" })} style={{
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
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <form style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
          <input name="q" defaultValue={search} placeholder="Buscar nombre, email, teléfono..." className="w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-[rgba(255,255,255,0.08)] text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 px-3.5 py-2 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors" />
        </form>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ id: undefined, name: "Todas" }, ...disciplines].map(d => (
            <Link key={d.id ?? "all"} href={buildUrl({ disc: d.id, page: "1" })} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, textDecoration: "none", border: "0.5px solid var(--color-border-secondary)", background: discId === d.id || (!discId && !d.id) ? "#00754A" : "var(--color-background-primary)", color: discId === d.id || (!discId && !d.id) ? "#fff" : "var(--color-text-secondary)" }}>
              {d.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Alumno", "Edad", "Disciplinas", "Contacto", "Estado", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>No se encontraron alumnos</td></tr>
            )}
            {students.map(s => (
              <tr key={s.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#d4e9e2", color: "#006241", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div>
                      <Link href={`/dashboard/alumnos/${s.id}`} style={{ fontWeight: 500, color: "var(--color-text-primary)", textDecoration: "none" }}>{fullName(s.firstName, s.lastName)}</Link>
                      {s.email && <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>{s.email}</p>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)" }}>{calcAge(s.birthDate) ?? "—"}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {s.enrollments.length === 0 && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Sin grupo</span>}
                    {s.enrollments.map(e => (
                      <span key={e.id} style={{ background: "#d4e9e2", color: "#006241", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>{e.group.discipline.name}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)", fontSize: 12 }}>{s.phone ?? s.email ?? "—"}</td>
                <td style={{ padding: "11px 14px" }}><StudentStatusBadge status={s.status} /></td>
                <td style={{ padding: "11px 14px", textAlign: "right" }}>
                  <Link href={`/dashboard/alumnos/${s.id}`} className="inline-flex items-center gap-1 rounded-md border border-sb-light bg-sb-light/30 px-2.5 py-1.5 text-xs font-medium text-sb-accent transition-colors hover:bg-sb-light/50 hover:border-sb-accent dark:border-sb-uplift dark:bg-sb-house dark:text-sb-light dark:hover:bg-sb-uplift dark:hover:border-sb-light">
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
              <Link key={p} href={buildUrl({ page: String(p) })} style={{ padding: "5px 10px", borderRadius: 6, textDecoration: "none", border: "0.5px solid var(--color-border-secondary)", background: p === page ? "#00754A" : "transparent", color: p === page ? "#fff" : "var(--color-text-secondary)" }}>{p}</Link>
            ))}
            {page < pages && <Link href={buildUrl({ page: String(page + 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)" }}>Sig →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
