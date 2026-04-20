import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import Link from "next/link";
import { GroupLevelBadge } from "@/components/grupos/group-level-badge";
import type { ScheduleSlot } from "@/lib/schemas/group.schema";
import type { GroupLevel } from "@prisma/client";

// ─── Helper de formato de horario ─────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  MON: "Lun", TUE: "Mar", WED: "Mié",
  THU: "Jue", FRI: "Vie", SAT: "Sáb", SUN: "Dom",
};

function formatSchedule(schedule: ScheduleSlot[]): string {
  return schedule
    .map((s) => `${DAY_LABELS[s.day] ?? s.day} ${s.startTime}–${s.endTime}`)
    .join(", ");
}

// ─── Página ───────────────────────────────────────────────────────

interface PageProps {
  searchParams: {
    q?:      string;
    active?: string;
    disc?:   string;
    level?:  string;
    page?:   string;
  };
}

export default async function GruposPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const tenant = user?.activeTenantId ? await db.tenant.findUnique({ where: { id: user.activeTenantId } }) : null;
  if (!tenant) return null;

  const page     = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 20;
  const search   = searchParams.q?.trim() ?? "";
  const discId   = searchParams.disc;
  const levelFilter = searchParams.level as GroupLevel | undefined;
  const activeFilter = searchParams.active === "false" ? false : searchParams.active === "true" ? true : undefined;

  const where: Parameters<typeof db.group.findMany>[0]["where"] = {
    tenantId: tenant.id,
    ...(activeFilter !== undefined && { isActive: activeFilter }),
    ...(levelFilter && { level: levelFilter }),
    ...(discId && { disciplineId: discId }),
    ...(search && { name: { contains: search, mode: "insensitive" } }),
  };

  const [groups, total, disciplines, counts] = await Promise.all([
    db.group.findMany({
      where,
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      orderBy: { name: "asc" },
      include: {
        discipline: { select: { name: true, color: true } },
        instructor: { include: { user: { select: { name: true } } } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    }),
    db.group.count({ where }),
    db.discipline.findMany({
      where:   { tenantId: tenant.id, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.group.groupBy({
      by:    ["isActive"],
      where: { tenantId: tenant.id },
      _count: true,
    }),
  ]);

  const pages    = Math.ceil(total / pageSize);
  const countMap = Object.fromEntries(counts.map((c) => [String(c.isActive), c._count]));
  const totalAll = (countMap["true"] ?? 0) + (countMap["false"] ?? 0);

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = {
      q:      search || undefined,
      active: activeFilter !== undefined ? String(activeFilter) : undefined,
      disc:   discId,
      level:  levelFilter,
      ...params,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v !== undefined) sp.set(k, v); });
    return `/dashboard/grupos?${sp.toString()}`;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Grupos</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
            {total} {total === 1 ? "grupo" : "grupos"}
          </p>
        </div>
        <Link
          href="/dashboard/grupos/nuevo"
          style={{
            background: "#5b21b6", color: "#fff", borderRadius: 8,
            padding: "8px 18px", fontSize: 13, fontWeight: 500, textDecoration: "none",
          }}
        >
          + Nuevo grupo
        </Link>
      </div>

      {/* Tabs activos / inactivos */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {[
          { label: "Todos",     value: undefined,  count: totalAll },
          { label: "Activos",   value: "true",     count: countMap["true"]  ?? 0 },
          { label: "Inactivos", value: "false",    count: countMap["false"] ?? 0 },
        ].map((tab) => {
          const active =
            tab.value === undefined
              ? activeFilter === undefined
              : String(activeFilter) === tab.value;
          return (
            <Link
              key={tab.label}
              href={buildUrl({ active: tab.value, page: "1" })}
              style={{
                padding: "8px 16px", fontSize: 13, textDecoration: "none",
                color:       active ? "#5b21b6" : "var(--color-text-secondary)",
                fontWeight:  active ? 500 : 400,
                borderBottom: active ? "2px solid #5b21b6" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {tab.label} <span style={{ fontSize: 11 }}>{tab.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <form style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar grupo..."
            style={{
              width: "100%", border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 8, padding: "7px 12px", fontSize: 13,
              background: "var(--color-background-primary)", color: "var(--color-text-primary)",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </form>

        {/* Filtro por disciplina */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ id: undefined, name: "Todas" }, ...disciplines].map((d) => (
            <Link
              key={d.id ?? "all"}
              href={buildUrl({ disc: d.id, page: "1" })}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12,
                textDecoration: "none", border: "0.5px solid var(--color-border-secondary)",
                background: discId === d.id || (!discId && !d.id) ? "#5b21b6" : "var(--color-background-primary)",
                color:      discId === d.id || (!discId && !d.id) ? "#fff"     : "var(--color-text-secondary)",
              }}
            >
              {d.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Grupo", "Disciplina", "Instructor", "Nivel", "Horario", "Alumnos", "Estado", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 14px", textAlign: "left", fontSize: 11,
                    fontWeight: 500, textTransform: "uppercase",
                    letterSpacing: "0.05em", color: "var(--color-text-secondary)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>
                  No se encontraron grupos
                </td>
              </tr>
            )}
            {groups.map((g) => {
              const enrolled  = g._count.enrollments;
              const isFull    = enrolled >= g.capacity;
              const schedule  = g.schedule as unknown as ScheduleSlot[];

              return (
                <tr key={g.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "11px 14px" }}>
                    <Link
                      href={`/dashboard/grupos/${g.id}`}
                      style={{ fontWeight: 500, color: "var(--color-text-primary)", textDecoration: "none" }}
                    >
                      {g.name}
                    </Link>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      background: "#f5f3ff", color: "#7c3aed",
                      borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500,
                    }}>
                      {g.discipline.name}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)" }}>
                    {g.instructor?.user.name ?? <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <GroupLevelBadge level={g.level} />
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)", fontSize: 12, maxWidth: 200 }}>
                    {schedule.length > 0 ? formatSchedule(schedule) : "—"}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ color: isFull ? "#b91c1c" : "var(--color-text-primary)", fontWeight: isFull ? 500 : 400 }}>
                      {enrolled}/{g.capacity}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      background: g.isActive ? "#f0fdf4" : "#f8fafc",
                      color:      g.isActive ? "#15803d" : "#475569",
                      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500,
                    }}>
                      {g.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", textAlign: "right" }}>
                    <Link href={`/dashboard/grupos/${g.id}`} style={{ fontSize: 12, color: "#5b21b6", textDecoration: "none" }}>
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 13, color: "var(--color-text-secondary)" }}>
          <span>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)" }}>
                ← Ant
              </Link>
            )}
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + Math.max(1, page - 2))
              .filter((p) => p <= pages)
              .map((p) => (
                <Link
                  key={p}
                  href={buildUrl({ page: String(p) })}
                  style={{
                    padding: "5px 10px", borderRadius: 6, textDecoration: "none",
                    border: "0.5px solid var(--color-border-secondary)",
                    background: p === page ? "#5b21b6" : "transparent",
                    color:      p === page ? "#fff"     : "var(--color-text-secondary)",
                  }}
                >
                  {p}
                </Link>
              ))}
            {page < pages && (
              <Link href={buildUrl({ page: String(page + 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)" }}>
                Sig →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
