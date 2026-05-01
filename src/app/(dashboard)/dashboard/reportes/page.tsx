import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { DataExportsClient } from "./data-exports-client";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default async function ReportesPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  // Solo ADMIN
  const tenantUser = await db.tenantUser.findFirst({
    where: { tenantId: tenant.id, userId: user.id }
  });
  if (tenantUser?.role !== "ADMIN") {
    redirect("/dashboard");
  }

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

  // Eventos del mes
  const events = await db.event.findMany({
    where: { tenantId: tenant.id },
    include: {
      eventPayments: {
        select: {
          id: true,
          amount: true,
          status: true,
          paidAt: true,
        },
      },
    },
  });

  const monthEvents = events.filter(e => e.date >= monthStart && e.date < monthEnd);
  const eventsPaid = monthEvents.reduce((sum, e) => {
    const paid = e.eventPayments.filter(p => p.status === "PAID" && p.paidAt !== null).reduce((s, p) => s + p.amount, 0);
    return sum + paid;
  }, 0);
  const eventsExpected = monthEvents.reduce((sum, e) => {
    const total = e.eventPayments.filter(p => p.willAttend === true).length * e.amount;
    return sum + total;
  }, 0);
  const eventCount = monthEvents.length;
  const eventPaymentsPaid = monthEvents.reduce((sum, e) => sum + e.eventPayments.filter(p => p.status === "PAID").length, 0);
  const eventPaymentsPending = monthEvents.reduce((sum, e) => sum + e.eventPayments.filter(p => p.status === "PENDING").length, 0);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0 space-y-6">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Reportes</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          Año {year} — {MONTHS[month]} {year}
        </p>
      </div>

      {/* Descargas de datos */}
      <DataExportsClient />

      {/* KPI cards superiores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4">
        {[
          { label: "Ingresos del mes",   value: formatCurrency(paidMonth._sum.amount ?? 0), sub: `${paidMonth._count} cobros`, color: "#15803d" },
          { label: "Ingresos del año",   value: formatCurrency(yearTotal), sub: `Año ${year}`, color: "#006241" },
          { label: "Tasa de cobranza",   value: `${collectionRate}%`, sub: `${collectionPaid}/${collectionTotal} pagos`, color: collectionRate >= 80 ? "#15803d" : collectionRate >= 50 ? "#b45309" : "#b91c1c" },
          { label: "Asistencia del mes", value: `${attRate}%`, sub: `${attPresent}/${attTotal} registros`, color: attRate >= 80 ? "#15803d" : attRate >= 50 ? "#b45309" : "#b91c1c" },
          { label: "Eventos (ingresos)",  value: formatCurrency(eventsPaid), sub: `${eventPaymentsPaid}/${eventPaymentsPaid + eventPaymentsPending} pagos`, color: "#0891b2" },
        ].map(card => (
          <div key={card.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 16px" }} className="sm:p-5">
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{card.label}</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: card.color, margin: "4px 0 0" }} className="sm:text-2xl break-words">{card.value}</p>
            <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de barras: ingresos por mes */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 12px" }} className="sm:p-6">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }} className="sm:mb-5">
          Ingresos mensuales — {year}
        </h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140 }} className="sm:gap-2 sm:h-40">
          {monthlyRevenue.map(m => {
            const heightPct = maxRevenue > 0 ? (m.total / maxRevenue) * 100 : 0;
            const isCurrent = m.month === month;
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }} className="sm:gap-2">
                <span style={{ fontSize: 7, color: "var(--color-text-tertiary)", whiteSpace: "nowrap", lineHeight: "1" }} className="sm:text-xs">
                  {m.total > 0 ? formatCurrency(m.total) : ""}
                </span>
                <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: 100 }} className="sm:h-24">
                  <div style={{
                    width: "100%",
                    height: `${Math.max(heightPct, m.total > 0 ? 4 : 0)}%`,
                    background: isCurrent ? "#00754A" : "#d4e9e2",
                    borderRadius: "4px 4px 0 0",
                    minHeight: m.total > 0 ? 4 : 0,
                    transition: "height 0.3s",
                  }} />
                </div>
                <span style={{ fontSize: 8, color: isCurrent ? "#00754A" : "var(--color-text-secondary)", fontWeight: isCurrent ? 600 : 400, textAlign: "center", lineHeight: "1" }} className="sm:text-sm">
                  {MONTHS[m.month]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Alumnos por disciplina */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 12px" }} className="sm:p-6">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 12px" }} className="sm:mb-4">
            Alumnos por disciplina
          </h2>
          {discStats.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin disciplinas activas</p>
          )}
          {discStats.map(d => {
            const pct = totalStudents > 0 ? Math.round((d.students / totalStudents) * 100) : 0;
            return (
              <div key={d.name} style={{ marginBottom: 10 }} className="sm:mb-3.5">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 2, flexWrap: "wrap" }} className="sm:mb-2">
                  <span style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }} className="sm:text-sm">{d.name}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }} className="sm:text-xs">{d.students} alumnos · {pct}%</span>
                </div>
                <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: d.color, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
          {totalStudents > 0 && (
            <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "8px 0 0" }} className="sm:text-xs sm:mt-3">
              Total: {totalStudents} inscripciones activas
            </p>
          )}
        </div>

        {/* Asistencia del mes */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 12px" }} className="sm:p-6">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 12px" }} className="sm:mb-4">
            Asistencia — {MONTHS[month]} {year}
          </h2>
          {attTotal === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin registros de asistencia este mes</p>
          ) : (
            <>
              {[
                { label: "Presentes",  count: attPresent,   color: "#10b981", bg: "rgba(16,185,129,0.10)" },
                { label: "Ausentes",   count: attAbsent,    color: "#ef4444", bg: "rgba(220,38,38,0.10)" },
                { label: "Justificados",count: attJustified, color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
                { label: "Tarde",      count: attLate,      color: "#94a3b8", bg: "rgba(100,116,139,0.10)" },
              ].map(item => {
                const pct = attTotal > 0 ? Math.round((item.count / attTotal) * 100) : 0;
                return (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }} className="sm:gap-3 sm:mb-3">
                    <span style={{ minWidth: 70, fontSize: 12, color: "var(--color-text-secondary)" }} className="sm:min-w-fit sm:w-24 sm:text-sm">{item.label}</span>
                    <div style={{ flex: 1, height: 6, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }} className="sm:h-2">
                      <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: 4 }} />
                    </div>
                    <span style={{ minWidth: 50, textAlign: "right", fontSize: 11, color: item.color, fontWeight: 600 }} className="sm:min-w-fit sm:text-xs">
                      {item.count} <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
              <div style={{ marginTop: 12, padding: "10px 12px", background: attRate >= 80 ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.10)", borderRadius: 8 }} className="sm:mt-4 sm:p-4">
                <p style={{ fontSize: 12, fontWeight: 600, color: attRate >= 80 ? "#15803d" : "#b45309", margin: 0 }} className="sm:text-sm">
                  Tasa de asistencia: {attRate}%
                </p>
                <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "2px 0 0" }} className="sm:text-xs">
                  {attPresent} de {attTotal} registros
                </p>
              </div>
            </>
          )}
        </div>

        {/* Adeudos */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 12px" }} className="sm:p-6">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 12px" }} className="sm:mb-4">
            Estado de pagos
          </h2>
          {[
            { label: "Pagados este mes", amount: paidMonth._sum.amount ?? 0,    count: paidMonth._count,   color: "#15803d" },
            { label: "Pendientes",       amount: pendingAll._sum.amount ?? 0,   count: pendingAll._count,  color: "#b45309" },
            { label: "Vencidos",         amount: overdueAll._sum.amount ?? 0,   count: overdueAll._count,  color: "#b91c1c" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", gap: 8 }} className="sm:p-2.5 sm:gap-4">
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }} className="sm:text-sm sm:font-medium truncate">{row.label}</p>
                <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "2px 0 0" }} className="sm:text-xs">{row.count} {row.count === 1 ? "pago" : "pagos"}</p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: row.color }} className="sm:text-base whitespace-nowrap">{formatCurrency(row.amount)}</span>
            </div>
          ))}
        </div>

        {/* Resumen de Eventos */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 12px" }} className="sm:p-6">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 12px" }} className="sm:mb-4">
            Eventos — {MONTHS[month]} {year}
          </h2>
          {eventCount === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin eventos este mes</p>
          ) : (
            <>
              {[
                { label: "Ingresos eventos",    amount: eventsPaid,      count: eventPaymentsPaid,      color: "#0891b2" },
                { label: "Pagos pendientes",    amount: eventsExpected - eventsPaid, count: eventPaymentsPending, color: "#f59e0b" },
                { label: "Total esperado",      amount: eventsExpected,  count: eventPaymentsPaid + eventPaymentsPending, color: "#06b6d4" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", gap: 8 }} className="sm:p-2.5 sm:gap-4">
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }} className="sm:text-sm sm:font-medium truncate">{row.label}</p>
                    <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "2px 0 0" }} className="sm:text-xs">{row.count} {row.count === 1 ? "pago" : "pagos"}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: row.color }} className="sm:text-base whitespace-nowrap">{formatCurrency(row.amount)}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(8,145,178,0.10)", borderRadius: 8 }} className="sm:mt-4 sm:p-4">
                <p style={{ fontSize: 12, fontWeight: 600, color: "#0891b2", margin: 0 }} className="sm:text-sm">
                  Total de eventos: {eventCount}
                </p>
                <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "2px 0 0" }} className="sm:text-xs">
                  {eventPaymentsPaid} de {eventPaymentsPaid + eventPaymentsPending} pagos completados
                </p>
              </div>
            </>
          )}
        </div>

        {/* Tabla resumen mensual */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 12px" }} className="sm:p-6">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 12px" }} className="sm:mb-4">
            Resumen por mes — {year}
          </h2>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 300, borderCollapse: "collapse" }} className="text-xs sm:text-sm">
            <thead>
              <tr>
                {["Mes", "Ingresos", "Pagos"].map(h => (
                  <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }} className="sm:px-3 sm:py-2 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyRevenue.slice(0, month + 1).reverse().map(m => (
                <tr key={m.month} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "6px 8px", color: m.month === month ? "#006241" : "var(--color-text-primary)", fontWeight: m.month === month ? 600 : 400 }} className="sm:px-3 sm:py-2">
                    {MONTHS[m.month]}
                  </td>
                  <td style={{ padding: "6px 8px", color: m.total > 0 ? "#15803d" : "var(--color-text-tertiary)", fontWeight: 500 }} className="sm:px-3 sm:py-2">
                    {m.total > 0 ? formatCurrency(m.total) : "—"}
                  </td>
                  <td style={{ padding: "6px 8px", color: "var(--color-text-secondary)" }} className="sm:px-3 sm:py-2">
                    {m.count > 0 ? m.count : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

      </div>
    </div>
  );
}
