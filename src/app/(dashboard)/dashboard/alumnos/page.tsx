import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { fullName, calcAge } from "@/lib/utils";
import Link from "next/link";
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
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Alumnos
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            {total} {total === 1 ? "alumno registrado" : "alumnos registrados"}
          </p>
        </div>
        <Link
          href="/dashboard/alumnos/nuevo"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "#fff",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          + Nuevo alumno
        </Link>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 18,
          borderBottom: "1px solid var(--color-border-secondary)",
        }}
      >
        {[
          { label: "Todos",     value: undefined, count: Object.values(countMap).reduce((a: number, b: number) => a + b, 0) },
          { label: "Activos",   value: "ACTIVE",   count: countMap.ACTIVE ?? 0 },
          { label: "Inactivos", value: "INACTIVE", count: countMap.INACTIVE ?? 0 },
        ].map(tab => {
          const active = tab.value === status || (!tab.value && !status);
          return (
            <Link
              key={tab.label}
              href={buildUrl({ status: tab.value, page: "1" })}
              style={{
                padding: "9px 16px",
                fontSize: 13,
                textDecoration: "none",
                color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontWeight: active ? 600 : 400,
                borderBottom: active ? "2px solid var(--color-primary)" : "2px solid transparent",
                marginBottom: -1,
                transition: "all 0.15s",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab.label}
              <span
                style={{
                  fontSize: 11,
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: active ? "var(--color-primary-light)" : "var(--color-background-tertiary)",
                  color: active ? "var(--color-primary)" : "var(--color-text-tertiary)",
                  fontWeight: 500,
                }}
              >
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
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-tertiary)",
                pointerEvents: "none",
                fontSize: 14,
              }}
            >
              🔍
            </span>
            <input
              name="q"
              defaultValue={search}
              placeholder="Buscar nombre, email, teléfono..."
              style={{
                width: "100%",
                border: "1px solid var(--input-border)",
                borderRadius: 8,
                padding: "8px 12px 8px 32px",
                fontSize: 13,
                background: "var(--input-bg)",
                color: "var(--input-text)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </form>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ id: undefined, name: "Todas" }, ...disciplines].map(d => {
            const isActive = discId === d.id || (!discId && !d.id);
            return (
              <Link
                key={d.id ?? "all"}
                href={buildUrl({ disc: d.id, page: "1" })}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                  border: `1px solid ${isActive ? "var(--color-primary)" : "var(--color-border-secondary)"}`,
                  background: isActive ? "var(--color-primary-light)" : "var(--color-background-primary)",
                  color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {d.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tabla */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "1px solid var(--color-border-tertiary)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr
              style={{
                background: "var(--color-background-secondary)",
                borderBottom: "1px solid var(--color-border-tertiary)",
              }}
            >
              {["Alumno", "Edad", "Disciplinas", "Contacto", "Estado", ""].map(h => (
                <th
                  key={h}
                  style={{
                    padding: "11px 14px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: "center", padding: "52px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}
                >
                  No se encontraron alumnos
                </td>
              </tr>
            )}
            {students.map(s => (
              <tr
                key={s.id}
                style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}
              >
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "var(--color-primary-light)",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                        border: "1px solid rgba(99,102,241,0.15)",
                      }}
                    >
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div>
                      <Link
                        href={`/dashboard/alumnos/${s.id}`}
                        style={{
                          fontWeight: 500,
                          color: "var(--color-text-primary)",
                          textDecoration: "none",
                          fontSize: 13,
                        }}
                      >
                        {fullName(s.firstName, s.lastName)}
                      </Link>
                      {s.email && (
                        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0, marginTop: 1 }}>
                          {s.email}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)" }}>
                  {calcAge(s.birthDate) ?? "—"}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {s.enrollments.length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Sin grupo</span>
                    )}
                    {s.enrollments.map(e => (
                      <span
                        key={e.id}
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 500,
                          border: "1px solid #bfdbfe",
                        }}
                      >
                        {e.group.discipline.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)", fontSize: 12 }}>
                  {s.phone ?? s.email ?? "—"}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <StudentStatusBadge status={s.status} />
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <Link
                    href={`/dashboard/alumnos/${s.id}`}
                    style={{
                      fontSize: 12,
                      color: "var(--color-primary)",
                      textDecoration: "none",
                      fontWeight: 500,
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "1px solid rgba(99,102,241,0.2)",
                      background: "var(--color-primary-light)",
                      display: "inline-block",
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            fontSize: 13,
            color: "var(--color-text-secondary)",
          }}
        >
          <span>
            Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                style={{
                  padding: "6px 12px",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 7,
                  textDecoration: "none",
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                }}
              >
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
                    padding: "6px 10px",
                    borderRadius: 7,
                    textDecoration: "none",
                    border: "1px solid var(--color-border-secondary)",
                    background: p === page ? "var(--color-primary)" : "transparent",
                    color: p === page ? "#fff" : "var(--color-text-secondary)",
                    fontSize: 13,
                    fontWeight: p === page ? 600 : 400,
                  }}
                >
                  {p}
                </Link>
              ))}
            {page < pages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                style={{
                  padding: "6px 12px",
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 7,
                  textDecoration: "none",
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                }}
              >
                Sig →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
