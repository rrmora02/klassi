import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, fullName, calcAge, initials } from "@/lib/utils";
import type { Metadata } from "next";

// ─── Helpers ──────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  MON: "Lun", TUE: "Mar", WED: "Mié", THU: "Jue",
  FRI: "Vie", SAT: "Sáb", SUN: "Dom",
};

const ATTENDANCE_CONFIG = {
  PRESENT:   { label: "Presente",   color: "#16a34a", bg: "#dcfce7" },
  ABSENT:    { label: "Falta",      color: "#b91c1c", bg: "#fee2e2" },
  LATE:      { label: "Tarde",      color: "#d97706", bg: "#fef3c7" },
  JUSTIFIED: { label: "Justificada",color: "#0284c7", bg: "#e0f2fe" },
} as const;

const PAYMENT_STATUS_CONFIG = {
  PAID:      { label: "Pagado",    color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  PENDING:   { label: "Pendiente", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  OVERDUE:   { label: "Vencido",   color: "#b91c1c", bg: "#fff1f2", border: "#fecdd3" },
  CANCELLED: { label: "Cancelado", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
} as const;

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia",
  CARD: "Tarjeta",  OXXO: "OXXO", SPEI: "SPEI",
};

// ─── Metadata dinámica ────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: { token: string } }
): Promise<Metadata> {
  const student = await db.student.findUnique({
    where: { shareToken: params.token },
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
    where: { shareToken: params.token },
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
            orderBy: { session: { date: "desc" } },
            take: 40,
            select: {
              status:  true,
              session: { select: { date: true, startTime: true, endTime: true } },
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

  const accentColor = student.tenant.primaryColor ?? "#00754A";

  // Estadísticas rápidas por enrollment activo
  const allAttendances = student.enrollments.flatMap(e => e.attendances);
  const totalSessions  = allAttendances.length;
  const presentCount   = allAttendances.filter(a => a.status === "PRESENT").length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null;
  const pendingPayments = student.payments.filter(p => p.status === "PENDING" || p.status === "OVERDUE");

  const age = calcAge(student.birthDate);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── Header escuela ──────────────────────────────────────────── */}
      <header style={{
        background: accentColor, color: "#fff",
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {student.tenant.logo ? (
            <img src={student.tenant.logo} alt={student.tenant.name} style={{ height: 32, borderRadius: 6 }} />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
            }}>
              {student.tenant.name[0]}
            </div>
          )}
          <span style={{ fontSize: 15, fontWeight: 600 }}>{student.tenant.name}</span>
        </div>
        <span style={{ fontSize: 12, opacity: 0.8 }}>Historial del alumno</span>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 48px" }}>

        {/* ── Tarjeta del alumno ──────────────────────────────────── */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "24px 24px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 18,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `${accentColor}22`, color: accentColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(student.firstName, student.lastName)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "#111" }}>
              {fullName(student.firstName, student.lastName)}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#6b7280" }}>
              {age !== null && <span>{age} años</span>}
              {student.gender && <span>· {student.gender === "F" ? "Femenino" : student.gender === "M" ? "Masculino" : "Otro"}</span>}
              <span>· Alta: {formatDate(student.createdAt)}</span>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: attendanceRate !== null && attendanceRate < 70 ? "#b91c1c" : accentColor }}>
                {attendanceRate !== null ? `${attendanceRate}%` : "—"}
              </p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>Asistencia</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: pendingPayments.length > 0 ? "#b91c1c" : accentColor }}>
                {pendingPayments.length > 0 ? pendingPayments.length : "✓"}
              </p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
                {pendingPayments.length > 0 ? "Pendientes" : "Al corriente"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Grupos activos ──────────────────────────────────────── */}
        {student.enrollments.length > 0 && (
          <section style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", margin: "0 0 10px" }}>
              Grupos inscritos
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {student.enrollments.map(enr => {
                const schedule = (enr.group.schedule as any[]) ?? [];
                const discColor = enr.group.discipline.color ?? accentColor;

                return (
                  <div key={enr.id} style={{
                    background: "#fff", borderRadius: 12,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden",
                  }}>
                    {/* Banda de disciplina */}
                    <div style={{ background: discColor, padding: "8px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{enr.group.discipline.name}</span>
                    </div>

                    <div style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "#111" }}>{enr.group.name}</p>
                          <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
                            {enr.group.instructor?.user.name ?? "Sin instructor asignado"}
                            {enr.group.room ? ` · ${enr.group.room}` : ""}
                          </p>
                        </div>
                        {enr.discount > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 500, background: "#fffbeb", color: "#92400e", padding: "2px 8px", borderRadius: 20, border: "1px solid #fde68a" }}>
                            {enr.discount}% desc.
                          </span>
                        )}
                      </div>

                      {/* Horario */}
                      {schedule.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                          {schedule.map((slot: any, i: number) => (
                            <span key={i} style={{
                              fontSize: 12, padding: "3px 10px", borderRadius: 20,
                              background: `${discColor}18`, color: discColor,
                              fontWeight: 500, border: `1px solid ${discColor}33`,
                            }}>
                              {DAY_LABELS[slot.day] ?? slot.day} {slot.startTime}–{slot.endTime}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Historial de asistencias */}
                      {enr.attendances.length > 0 && (
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", marginBottom: 8 }}>
                            Últimas {enr.attendances.length} sesiones
                          </p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {[...enr.attendances].reverse().map((att, i) => {
                              const cfg = ATTENDANCE_CONFIG[att.status as keyof typeof ATTENDANCE_CONFIG];
                              return (
                                <div
                                  key={i}
                                  title={`${formatDate(att.session.date)} — ${cfg.label}`}
                                  style={{
                                    width: 28, height: 28, borderRadius: 6,
                                    background: cfg.bg,
                                    border: `1.5px solid ${cfg.color}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 11, color: cfg.color, fontWeight: 700,
                                    cursor: "default",
                                  }}
                                >
                                  {att.status === "PRESENT" ? "✓" : att.status === "ABSENT" ? "✗" : att.status === "LATE" ? "T" : "J"}
                                </div>
                              );
                            })}
                          </div>
                          {/* Leyenda */}
                          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                            {Object.entries(ATTENDANCE_CONFIG).map(([k, v]) => (
                              <span key={k} style={{ fontSize: 10, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: v.bg, border: `1.5px solid ${v.color}`, display: "inline-block" }} />
                                {v.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {enr.attendances.length === 0 && (
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Sin sesiones registradas aún.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {student.enrollments.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px", textAlign: "center", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin grupos inscritos actualmente.</p>
          </div>
        )}

        {/* ── Historial de pagos ──────────────────────────────────── */}
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", margin: "0 0 10px" }}>
            Estado de pagos
          </h2>
          {student.payments.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 12, padding: "24px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin historial de pagos.</p>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {student.payments.map((p, i) => {
                const cfg  = PAYMENT_STATUS_CONFIG[p.status as keyof typeof PAYMENT_STATUS_CONFIG];
                const isLast = i === student.payments.length - 1;
                return (
                  <div key={i} style={{
                    padding: "14px 18px",
                    borderBottom: isLast ? "none" : "0.5px solid #f1f5f9",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: "#111" }}>{p.concept}</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
                        {p.status === "PAID" && p.paidAt
                          ? `Pagado el ${formatDate(p.paidAt)}${p.method ? ` · ${METHOD_LABELS[p.method] ?? p.method}` : ""}`
                          : p.dueDate
                          ? `Vence: ${formatDate(p.dueDate)}`
                          : "Sin fecha"
                        }
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>
                        {formatCurrency(p.amount)}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "#d1d5db" }}>
            Historial generado por {student.tenant.name}
            {student.tenant.phone ? ` · ${student.tenant.phone}` : ""}
            {student.tenant.email ? ` · ${student.tenant.email}` : ""}
          </p>
          <p style={{ fontSize: 10, color: "#e5e7eb", marginTop: 4 }}>Powered by Klassi</p>
        </div>
      </main>
    </div>
  );
}
