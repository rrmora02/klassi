import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { formatCurrency } from "@/lib/utils";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default async function ReportesPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59);
  const yearStart  = new Date(year, 0, 1);
  const yearEnd    = new Date(year, 11, 31, 23, 59, 59);

  // Revenue por mes del año actual
  const monthlyRevenue = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const from = new Date(year, i, 1);
      const to   = new Date(year, i + 1, 0, 23, 59, 59);
      const r = await db.payment.aggregate({
        where: { tenantId: tenant.id, status: "PAID", paidAt: { gte: from, lte: to } },
        _sum: { amount: true }, _count: true,
      });
      return { month: i, total: r._sum.amount ?? 0, count: r._count };
    })
  );

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.total), 1);
  const yearTotal  = monthlyRevenue.reduce((s, m) => s + m.total, 0);

  // Alumnos por disciplina
  const disciplines = await db.discipline.findMany({
    where: { tenantId: tenant.id, isActive: true },
    include: {
      groups: {
        where: { tenantId: tenant.id, isActive: true },
        include: { enrollments: { where: { status: "ACTIVE" } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const discStats = disciplines.map(d => ({
    name:     d.name,
    color:    d.color ?? "#6b7280",
    students: d.groups.reduce((a, g) => a + g.enrollments.length, 0),
  })).sort((a, b) => b.students - a.students);

  const totalStudents = discStats.reduce((a, d) => a + d.students, 0);

  // Pagos: resumen del mes actual
  const [paidMonth, pendingAll, overdueAll, collectionPaid, collectionTotal] = await Promise.all([
    db.payment.aggregate({ where: { tenantId: tenant.id, status: "PAID",    paidAt:  { gte: monthStart, lte: monthEnd } }, _sum: { amount: true }, _count: true }),
    db.payment.aggregate({ where: { tenantId: tenant.id, status: "PENDING"                                              }, _sum: { amount: true }, _count: true }),
    db.payment.aggregate({ where: { tenantId: tenant.id, status: "OVERDUE"                                              }, _sum: { amount: true }, _count: true }),
    db.payment.count({ where: { tenantId: tenant.id, status: "PAID",    paidAt:  { gte: monthStart, lte: monthEnd } } }),
    db.payment.count({ where: { tenantId: tenant.id, status: { in: ["PAID","PENDING","OVERDUE"] }, dueDate: { gte: monthStart, lte: monthEnd } } }),
  ]);

  const collectionRate = collectionTotal > 0 ? Math.round((collectionPaid / collectionTotal) * 100) : 0;

  // Asistencia del mes
  const [attPresent, attAbsent, attJustified, attLate] = await Promise.all([
    db.attendance.count({ where: { enrollment: { group: { tenantId: tenant.id } }, status: "PRESENT",   session: { date: { gte: monthStart, lte: monthEnd } } } }),
    db.attendance.count({ where: { enrollment: { group: { tenantId: tenant.id } }, status: "ABSENT",    session: { date: { gte: monthStart, lte: monthEnd } } } }),
    db.attendance.count({ where: { enrollment: { group: { tenantId: tenant.id } }, status: "JUSTIFIED", session: { date: { gte: monthStart, lte: monthEnd } } } }),
    db.attendance.count({ where: { enrollment: { group: { tenantId: tenant.id } }, status: "LATE",      session: { date: { gte: monthStart, lte: monthEnd } } } }),
  ]);

  const attTotal = attPresent + attAbsent + attJustified + attLate;
  const attRate  = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Reportes</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          Año {year} — {MONTHS[month]} {year}
        </p>
      </div>

      {/* KPI cards superiores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Ingresos del mes",   value: formatCurrency(paidMonth._sum.amount ?? 0), sub: `${paidMonth._count} cobros`, color: "#15803d" },
          { label: "Ingresos del año",   value: formatCurrency(yearTotal), sub: `Año ${year}`, color: "#7c3aed" },
          { label: "Tasa de cobranza",   value: `${collectionRate}%`, sub: `${collectionPaid}/${collectionTotal} pagos`, color: collectionRate >= 80 ? "#15803d" : collectionRate >= 50 ? "#b45309" : "#b91c1c" },
          { label: "Asistencia del mes", value: `${attRate}%`, sub: `${attPresent}/${attTotal} registros`, color: attRate >= 80 ? "#15803d" : attRate >= 50 ? "#b45309" : "#b91c1c" },
        ].map(card => (
          <div key={card.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{card.label}</p>
            <p style={{ fontSize: 26, fontWeight: 600, color: card.color, margin: "4px 0 0" }}>{card.value}</p>
            <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de barras: ingresos por mes */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 20px" }}>
          Ingresos mensuales — {year}
        </h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
          {monthlyRevenue.map(m => {
            const heightPct = maxRevenue > 0 ? (m.total / maxRevenue) * 100 : 0;
            const isCurrent = m.month === month;
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                  {m.total > 0 ? formatCurrency(m.total) : ""}
                </span>
                <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: 120 }}>
                  <div style={{
                    width: "100%",
                    height: `${Math.max(heightPct, m.total > 0 ? 4 : 0)}%`,
                    background: isCurrent ? "#5b21b6" : "#ddd6fe",
                    borderRadius: "4px 4px 0 0",
                    minHeight: m.total > 0 ? 4 : 0,
                    transition: "height 0.3s",
                  }} />
                </div>
                <span style={{ fontSize: 10, color: isCurrent ? "#5b21b6" : "var(--color-text-secondary)", fontWeight: isCurrent ? 600 : 400 }}>
                  {MONTHS[m.month]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Alumnos por disciplina */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>
            Alumnos por disciplina
          </h2>
          {discStats.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin disciplinas activas</p>
          )}
          {discStats.map(d => {
            const pct = totalStudents > 0 ? Math.round((d.students / totalStudents) * 100) : 0;
            return (
              <div key={d.name} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{d.name}</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{d.students} alumnos · {pct}%</span>
                </div>
                <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: d.color, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
          {totalStudents > 0 && (
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "12px 0 0" }}>
              Total: {totalStudents} inscripciones activas
            </p>
          )}
        </div>

        {/* Asistencia del mes */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>
            Asistencia — {MONTHS[month]} {year}
          </h2>
          {attTotal === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin registros de asistencia este mes</p>
          ) : (
            <>
              {[
                { label: "Presentes",  count: attPresent,   color: "#15803d", bg: "#f0fdf4" },
                { label: "Ausentes",   count: attAbsent,    color: "#b91c1c", bg: "#fef2f2" },
                { label: "Justificados",count: attJustified, color: "#b45309", bg: "#fffbeb" },
                { label: "Tarde",      count: attLate,      color: "#6b7280", bg: "#f9fafb" },
              ].map(item => {
                const pct = attTotal > 0 ? Math.round((item.count / attTotal) * 100) : 0;
                return (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{ width: 90, fontSize: 13, color: "var(--color-text-secondary)" }}>{item.label}</span>
                    <div style={{ flex: 1, height: 8, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: 4 }} />
                    </div>
                    <span style={{ width: 60, textAlign: "right", fontSize: 12, color: item.color, fontWeight: 600 }}>
                      {item.count} <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: 16, padding: "12px 16px", background: attRate >= 80 ? "#f0fdf4" : "#fffbeb", borderRadius: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: attRate >= 80 ? "#15803d" : "#b45309", margin: 0 }}>
                  Tasa de asistencia: {attRate}%
                </p>
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
                  {attPresent} de {attTotal} registros
                </p>
              </div>
            </>
          )}
        </div>

        {/* Adeudos */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>
            Estado de pagos
          </h2>
          {[
            { label: "Pagados este mes", amount: paidMonth._sum.amount ?? 0,    count: paidMonth._count,   color: "#15803d" },
            { label: "Pendientes",       amount: pendingAll._sum.amount ?? 0,   count: pendingAll._count,  color: "#b45309" },
            { label: "Vencidos",         amount: overdueAll._sum.amount ?? 0,   count: overdueAll._count,  color: "#b91c1c" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>{row.label}</p>
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{row.count} {row.count === 1 ? "pago" : "pagos"}</p>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: row.color }}>{formatCurrency(row.amount)}</span>
            </div>
          ))}
        </div>

        {/* Tabla resumen mensual */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>
            Resumen por mes — {year}
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Mes", "Ingresos", "Pagos"].map(h => (
                  <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyRevenue.slice(0, month + 1).reverse().map(m => (
                <tr key={m.month} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "7px 8px", color: m.month === month ? "#5b21b6" : "var(--color-text-primary)", fontWeight: m.month === month ? 600 : 400 }}>
                    {MONTHS[m.month]}
                  </td>
                  <td style={{ padding: "7px 8px", color: m.total > 0 ? "#15803d" : "var(--color-text-tertiary)", fontWeight: 500 }}>
                    {m.total > 0 ? formatCurrency(m.total) : "—"}
                  </td>
                  <td style={{ padding: "7px 8px", color: "var(--color-text-secondary)" }}>
                    {m.count > 0 ? m.count : "—"}
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
