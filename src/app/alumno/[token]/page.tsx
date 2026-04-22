import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, fullName, calcAge, initials } from "@/lib/utils";
import type { Metadata } from "next";

// ─── Helpers ──────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  MON: "Lunes", TUE: "Martes", WED: "Miércoles",
  THU: "Jueves", FRI: "Viernes", SAT: "Sábado", SUN: "Domingo",
};
const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_INDEX: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

const PAYMENT_STATUS_CONFIG = {
  PAID:      { label: "Pagado",    color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  PENDING:   { label: "Pendiente", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  OVERDUE:   { label: "Vencido",   color: "#b91c1c", bg: "#fff1f2", border: "#fecdd3" },
  CANCELLED: { label: "Cancelado", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
} as const;

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia",
  CARD: "Tarjeta",  OXXO: "OXXO", SPEI: "SPEI",
};

// ─── Lógica tabla semanal ─────────────────────────────────────────

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "JUSTIFIED";

type WeekRow = {
  label: string;       // "21 abr – 27 abr 2026"
  days:  Record<string, AttendanceStatus | "NO_CLASS" | null>;
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateToDay(date: Date): string {
  return DAY_ORDER[date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1];
}

const MONTH_SHORT: Record<number, string> = {
  0: "ene", 1: "feb", 2: "mar", 3: "abr", 4: "may", 5: "jun",
  6: "jul", 7: "ago", 8: "sep", 9: "oct", 10: "nov", 11: "dic",
};

function fmtDay(d: Date) {
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
}

function buildWeeklyTable(
  attendances: { status: string; session: { date: Date } }[],
  scheduleDays: string[],   // ['MON', 'WED', 'FRI']
): WeekRow[] {
  const sorted = [...attendances].sort(
    (a, b) => new Date(a.session.date).getTime() - new Date(b.session.date).getTime()
  );

  const weekMap = new Map<string, WeekRow>();

  for (const att of sorted) {
    const date     = new Date(att.session.date);
    const monday   = getMonday(date);
    const key      = monday.toISOString().slice(0, 10);
    const sunday   = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
    const sameYear = monday.getUTCFullYear() === sunday.getUTCFullYear();
    const label    = `${fmtDay(monday)} – ${fmtDay(sunday)} ${sunday.getUTCFullYear()}`;

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        label,
        days: Object.fromEntries(scheduleDays.map(d => [d, "NO_CLASS" as const])),
      });
    }

    const dayKey = dateToDay(date);
    const row    = weekMap.get(key)!;
    if (dayKey in row.days) row.days[dayKey] = att.status as AttendanceStatus;
  }

  return [...weekMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v);
}

// ─── Metadata dinámica ────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: { token: string } }
): Promise<Metadata> {
  const student = await db.student.findUnique({
    where: { id: params.token },
    select: { firstName: true, lastName: true, tenant: { select: { name: true } } },
  });
  if (!student) return { title: "Perfil no encontrado" };
  return {
    title: `${fullName(student.firstName, student.lastName)} — ${student.tenant.name}`,
    robots: { index: false, follow: false },
  };
}

// ─── Página ───────────────────────────────────────────────────────

export default async function AlumnoPublicPage({ params }: { params: { token: string } }) {
  const student = await db.student.findUnique({
    where: { id: params.token },
    select: {
      firstName:  true,
      lastName:   true,
      birthDate:  true,
      gender:     true,
      avatarUrl:  true,
      status:     true,
      createdAt:  true,
      tenant: {
        select: { name: true, logo: true, primaryColor: true, phone: true, email: true },
      },
      enrollments: {
        where:   { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        select: {
          id:        true,
          startDate: true,
          discount:  true,
          group: {
            select: {
              name:     true,
              level:    true,
              room:     true,
              schedule: true,
              discipline: { select: { name: true, color: true } },
              instructor: { select: { user: { select: { name: true } } } },
            },
          },
          attendances: {
            orderBy: { session: { date: "asc" } },
            take: 60,
            select: {
              status:  true,
              session: { select: { date: true } },
            },
          },
        },
      },
      payments: {
        where:   { status: { not: "CANCELLED" } },
        orderBy: { dueDate: "desc" },
        take: 12,
        select: {
          concept:  true,
          amount:   true,
          status:   true,
          dueDate:  true,
          paidAt:   true,
          method:   true,
        },
      },
    },
  });

  if (!student) notFound();

  const accent = student.tenant.primaryColor ?? "#00754A";
  const dark   = "#1E3932";

  const allAttendances  = student.enrollments.flatMap(e => e.attendances);
  const totalSessions   = allAttendances.length;
  const presentCount    = allAttendances.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
  const attendanceRate  = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null;
  const pendingPayments = student.payments.filter(p => p.status === "PENDING" || p.status === "OVERDUE");
  const age = calcAge(student.birthDate);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f2", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <header style={{ background: dark, color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {student.tenant.logo ? (
            <img src={student.tenant.logo} alt={student.tenant.name} style={{ height: 30, borderRadius: 6 }} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: 6, background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
              {student.tenant.name[0]}
            </div>
          )}
          <span style={{ fontSize: 15, fontWeight: 600 }}>{student.tenant.name}</span>
        </div>
        <span style={{ fontSize: 12, color: "#d4e9e2", opacity: 0.8 }}>Historial del alumno</span>
      </header>

      {/* ── Franja verde ───────────────────────────────────────────── */}
      <div style={{ background: accent, padding: "20px 20px 28px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: "rgba(255,255,255,0.20)",
            border: "2px solid rgba(255,255,255,0.40)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {initials(student.firstName, student.lastName)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
              {fullName(student.firstName, student.lastName)}
            </h1>
            <p style={{ fontSize: 13, color: "#d4e9e2", margin: 0 }}>
              {age !== null ? `${age} años` : ""}
              {student.birthDate ? ` · Nacimiento: ${formatDate(student.birthDate)}` : ""}
              {` · Inscrito desde ${formatDate(student.createdAt)}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 700, margin: "-14px auto 0", padding: "0 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${accent}` }}>
            <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Asistencia general</p>
            <p style={{ fontSize: 26, fontWeight: 700, margin: 0, color: attendanceRate !== null && attendanceRate < 70 ? "#b91c1c" : dark }}>
              {attendanceRate !== null ? `${attendanceRate}%` : "—"}
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>{totalSessions} sesiones registradas</p>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${pendingPayments.length > 0 ? "#f59e0b" : accent}` }}>
            <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Estado de pagos</p>
            <p style={{ fontSize: 26, fontWeight: 700, margin: 0, color: pendingPayments.length > 0 ? "#b45309" : dark }}>
              {pendingPayments.length > 0 ? `${pendingPayments.length} pendiente${pendingPayments.length > 1 ? "s" : ""}` : "Al corriente"}
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
              {pendingPayments.length > 0 ? "Requiere atención" : "Sin adeudos"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Contenido principal ────────────────────────────────────── */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 48px" }}>

        {/* Grupos + tabla de asistencias */}
        {student.enrollments.map(enr => {
          const schedule    = (enr.group.schedule as any[]) ?? [];
          const scheduleDays = schedule
            .map((s: any) => s.day as string)
            .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
          const weeks = buildWeeklyTable(enr.attendances, scheduleDays);
          const discColor = enr.group.discipline.color ?? accent;

          return (
            <section key={enr.id} style={{ marginBottom: 20 }}>
              {/* Cabecera del grupo */}
              <div style={{ background: dark, borderRadius: "12px 12px 0 0", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#d4e9e2", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {enr.group.discipline.name}
                  </span>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "2px 0 0" }}>
                    {enr.group.name}
                  </h2>
                </div>
                {enr.group.instructor && (
                  <span style={{ fontSize: 12, color: "#d4e9e2" }}>
                    {enr.group.instructor.user.name}
                  </span>
                )}
              </div>

              {/* Horario chips */}
              <div style={{ background: "#e8f0ee", padding: "10px 18px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {schedule.map((s: any, i: number) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 500, color: dark, background: "#d4e9e2", padding: "3px 10px", borderRadius: 20, border: `1px solid ${accent}40` }}>
                    {DAY_LABELS[s.day] ?? s.day} {s.startTime}–{s.endTime}
                  </span>
                ))}
                {enr.group.room && (
                  <span style={{ fontSize: 12, color: "#6b7280" }}>· {enr.group.room}</span>
                )}
              </div>

              {/* Tabla semanal */}
              <div style={{ background: "#fff", borderRadius: "0 0 12px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                {weeks.length === 0 ? (
                  <p style={{ padding: "20px 18px", fontSize: 13, color: "#9ca3af", margin: 0 }}>
                    Sin clases registradas aún.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f8faf9", borderBottom: "2px solid #e2ece8" }}>
                          <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: dark, whiteSpace: "nowrap", minWidth: 160 }}>
                            Semana
                          </th>
                          {scheduleDays.map(day => (
                            <th key={day} style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, color: dark, whiteSpace: "nowrap" }}>
                              {DAY_LABELS[day]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {weeks.map((week, wi) => (
                          <tr key={wi} style={{ borderBottom: "0.5px solid #f1f5f3" }}>
                            <td style={{ padding: "10px 16px", color: "#374151", whiteSpace: "nowrap", fontSize: 12 }}>
                              {week.label}
                            </td>
                            {scheduleDays.map(day => {
                              const status = week.days[day];
                              if (status === "NO_CLASS" || status == null) {
                                return (
                                  <td key={day} style={{ padding: "10px 14px", textAlign: "center", color: "#d1d5db" }}>—</td>
                                );
                              }
                              const cfg = {
                                PRESENT:   { icon: "✓", color: "#15803d", bg: "#f0fdf4", label: "Presente" },
                                ABSENT:    { icon: "✗", color: "#b91c1c", bg: "#fff1f2", label: "Falta" },
                                LATE:      { icon: "T", color: "#b45309", bg: "#fffbeb", label: "Tarde" },
                                JUSTIFIED: { icon: "J", color: "#0369a1", bg: "#eff6ff", label: "Justificada" },
                              }[status] ?? { icon: "?", color: "#6b7280", bg: "#f9fafb", label: status };
                              return (
                                <td key={day} style={{ padding: "8px 14px", textAlign: "center" }}>
                                  <span title={cfg.label} style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: 28, height: 28, borderRadius: 6,
                                    background: cfg.bg, color: cfg.color,
                                    fontWeight: 700, fontSize: 13,
                                  }}>
                                    {cfg.icon}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Leyenda */}
                {weeks.length > 0 && (
                  <div style={{ padding: "10px 16px", borderTop: "0.5px solid #f1f5f3", display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {[
                      { icon: "✓", color: "#15803d", bg: "#f0fdf4", label: "Presente" },
                      { icon: "✗", color: "#b91c1c", bg: "#fff1f2", label: "Falta" },
                      { icon: "T", color: "#b45309", bg: "#fffbeb", label: "Tarde" },
                      { icon: "J", color: "#0369a1", bg: "#eff6ff", label: "Justificada" },
                    ].map(l => (
                      <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 4, background: l.bg, color: l.color, fontWeight: 700, fontSize: 11 }}>{l.icon}</span>
                        {l.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}

        {student.enrollments.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin grupos inscritos actualmente.</p>
          </div>
        )}

        {/* ── Historial de pagos ───────────────────────────────────── */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: dark, margin: "0 0 10px" }}>
            Historial de pagos
          </h2>

          {student.payments.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin historial de pagos.</p>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8faf9", borderBottom: "2px solid #e2ece8" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: dark }}>Concepto</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, color: dark, whiteSpace: "nowrap" }}>Fecha</th>
                    <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: dark }}>Monto</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: dark }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {student.payments.map((p, i) => {
                    const cfg = PAYMENT_STATUS_CONFIG[p.status as keyof typeof PAYMENT_STATUS_CONFIG];
                    return (
                      <tr key={i} style={{ borderBottom: i < student.payments.length - 1 ? "0.5px solid #f1f5f3" : "none" }}>
                        <td style={{ padding: "11px 16px", color: "#111827" }}>
                          <span style={{ fontWeight: 500 }}>{p.concept}</span>
                          {p.method && p.status === "PAID" && (
                            <span style={{ fontSize: 11, color: "#9ca3af", display: "block", marginTop: 1 }}>
                              {METHOD_LABELS[p.method] ?? p.method}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "11px 14px", textAlign: "center", color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>
                          {p.status === "PAID" && p.paidAt ? formatDate(p.paidAt) : p.dueDate ? formatDate(p.dueDate) : "—"}
                        </td>
                        <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>
                          {formatCurrency(p.amount)}
                        </td>
                        <td style={{ padding: "11px 16px", textAlign: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap" }}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", background: "#fff", borderRadius: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: accent }} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>{student.tenant.name}</span>
            {student.tenant.phone && <span style={{ fontSize: 12, color: "#9ca3af" }}>· {student.tenant.phone}</span>}
          </div>
          <p style={{ fontSize: 10, color: "#d1d5db", marginTop: 10 }}>Powered by Klassi</p>
        </div>
      </div>
    </div>
  );
}
