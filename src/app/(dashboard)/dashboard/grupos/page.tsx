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
            Grupos
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            {total} {total === 1 ? "grupo" : "grupos"}
          </p>
        </div>
        <Link
          href="/dashboard/grupos/nuevo"
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
          + Nuevo grupo
        </Link>
      </div>

      {/* Tabs activos / inactivos */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 18,
          borderBottom: "1px solid var(--color-border-secondary)",
        }}
      >
        {[
          { label: "Todos",     value: undefined, count: totalAll },
          { label: "Activos",   value: "true",    count: countMap["true"]  ?? 0 },
          { label: "Inactivos", value: "false",   count: countMap["false"] ?? 0 },
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
        <form style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
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
              placeholder="Buscar grupo..."
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

        {/* Filtro por disciplina */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ id: undefined, name: "Todas" }, ...disciplines].map((d) => {
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
              {["Grupo", "Disciplina", "Instructor", "Nivel", "Horario", "Alumnos", "Estado", ""].map((h) => (
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
            {groups.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", padding: "52px 0", color: "var(--color-text-tertiary)" }}
                >
                  No se encontraron grupos
                </td>
              </tr>
            )}
            {groups.map((g) => {
              const enrolled  = g._count.enrollments;
              const isFull    = enrolled >= g.capacity;
              const schedule  = g.schedule as unknown as ScheduleSlot[];

              return (
                <tr key={g.id} style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <Link
                      href={`/dashboard/grupos/${g.id}`}
                      style={{
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                        textDecoration: "none",
                        fontSize: 13,
                      }}
                    >
                      {g.name}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderRadius: 999,
                        padding: "2px 9px",
                        fontSize: 11,
                        fontWeight: 500,
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      {g.discipline.name}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--color-text-secondary)", fontSize: 12 }}>
                    {g.instructor?.user.name ?? (
                      <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <GroupLevelBadge level={g.level} />
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      maxWidth: 180,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {schedule.length > 0 ? formatSchedule(schedule) : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        color: isFull ? "#b91c1c" : "var(--color-text-primary)",
                        fontWeight: isFull ? 600 : 400,
                        fontSize: 13,
                      }}
                    >
                      {enrolled}/{g.capacity}
                    </span>
                    {isFull && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          color: "#b91c1c",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: 999,
                          padding: "1px 5px",
                        }}
                      >
                        lleno
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        background: g.isActive ? "#ecfdf5" : "#f8fafc",
                        color:      g.isActive ? "#065f46" : "#475569",
                        border:     `1px solid ${g.isActive ? "#a7f3d0" : "#e2e8f0"}`,
                        borderRadius: 999,
                        padding: "2px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: g.isActive ? "#10b981" : "#94a3b8",
                        }}
                      />
                      {g.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Link
                      href={`/dashboard/grupos/${g.id}`}
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
              );
            })}
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
              .filter((p) => p <= pages)
              .map((p) => (
                <Link
                  key={p}
                  href={buildUrl({ page: String(p) })}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 7,
                    textDecoration: "none",
                    border: "1px solid var(--color-border-secondary)",
                    background: p === page ? "var(--color-primary)" : "transparent",
                    color:      p === page ? "#fff" : "var(--color-text-secondary)",
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
