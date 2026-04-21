import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/pagos/payment-status-badge";
import { PaymentsClient } from "@/components/pagos/payments-client";
import Link from "next/link";
import type { PaymentStatus } from "@prisma/client";

interface PageProps {
  searchParams: { status?: string; q?: string; page?: string };
}

const STATUS_TABS: { label: string; value: PaymentStatus | undefined }[] = [
  { label: "Todos",     value: undefined },
  { label: "Pendientes",value: "PENDING" },
  { label: "Pagados",   value: "PAID" },
  { label: "Vencidos",  value: "OVERDUE" },
  { label: "Cancelados",value: "CANCELLED" },
];

export default async function PagosPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  const page      = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize  = 20;
  const status    = searchParams.status as PaymentStatus | undefined;
  const search    = searchParams.q?.trim() ?? "";

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const where = {
    tenantId: tenant.id,
    ...(status && { status }),
    ...(search && {
      student: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName:  { contains: search, mode: "insensitive" as const } },
        ],
      },
    }),
  };

  const [payments, total, summary, students, statusCounts] = await Promise.all([
    db.payment.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ status: "asc" }, { dueDate: "desc" }],
      include: { student: { select: { firstName: true, lastName: true } } },
    }),
    db.payment.count({ where }),
    Promise.all([
      db.payment.aggregate({ where: { tenantId: tenant.id, status: "PAID",    paidAt:  { gte: monthStart, lte: monthEnd } }, _sum: { amount: true }, _count: true }),
      db.payment.aggregate({ where: { tenantId: tenant.id, status: "PENDING"                                              }, _sum: { amount: true }, _count: true }),
      db.payment.aggregate({ where: { tenantId: tenant.id, status: "OVERDUE"                                              }, _sum: { amount: true }, _count: true }),
    ]),
    db.student.findMany({ where: { tenantId: tenant.id, status: "ACTIVE" }, select: { id: true, firstName: true, lastName: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    Promise.all([
      db.payment.count({ where: { tenantId: tenant.id, status: "PENDING"   } }),
      db.payment.count({ where: { tenantId: tenant.id, status: "PAID"      } }),
      db.payment.count({ where: { tenantId: tenant.id, status: "OVERDUE"   } }),
      db.payment.count({ where: { tenantId: tenant.id, status: "CANCELLED" } }),
    ]),
  ]);

  const [paid, pending, overdue] = summary;
  const [cntPending, cntPaid, cntOverdue, cntCancelled] = statusCounts;
  const countMap: Record<string, number> = {
    PENDING:   cntPending,
    PAID:      cntPaid,
    OVERDUE:   cntOverdue,
    CANCELLED: cntCancelled,
  };
  const pages = Math.ceil(total / pageSize);

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q: search || undefined, status: status as string | undefined, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return `/dashboard/pagos?${sp.toString()}`;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Pagos</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
            {total} {total === 1 ? "registro" : "registros"}
          </p>
        </div>
        {/* Button rendered by client component */}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Cobrado este mes</p>
          <p style={{ fontSize: 26, fontWeight: 600, color: "#15803d", margin: "4px 0 0" }}>
            {formatCurrency(paid._sum.amount ?? 0)}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{paid._count} pagos</p>
        </div>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Por cobrar</p>
          <p style={{ fontSize: 26, fontWeight: 600, color: "#b45309", margin: "4px 0 0" }}>
            {formatCurrency(pending._sum.amount ?? 0)}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{pending._count} pendientes</p>
        </div>
        <div style={{ background: overdue._count > 0 ? "rgba(220,38,38,0.08)" : "var(--color-background-primary)", border: `0.5px solid ${overdue._count > 0 ? "rgba(220,38,38,0.30)" : "var(--color-border-tertiary)"}`, borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Adeudos vencidos</p>
          <p style={{ fontSize: 26, fontWeight: 600, color: overdue._count > 0 ? "#b91c1c" : "#15803d", margin: "4px 0 0" }}>
            {formatCurrency(overdue._sum.amount ?? 0)}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{overdue._count} vencidos</p>
        </div>
      </div>

      {/* Tabs de estado */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {STATUS_TABS.map(tab => {
          const active = tab.value === status || (!tab.value && !status);
          const count  = tab.value ? (countMap[tab.value] ?? 0) : Object.values(countMap).reduce((a: number, b: number) => a + b, 0);
          return (
            <Link key={tab.label} href={buildUrl({ status: tab.value as string | undefined, page: "1" })} style={{
              padding: "8px 16px", fontSize: 13, textDecoration: "none",
              color: active ? "#006241" : "var(--color-text-secondary)",
              fontWeight: active ? 500 : 400,
              borderBottom: active ? "2px solid #006241" : "2px solid transparent",
              marginBottom: -1,
            }}>
              {tab.label} <span style={{ fontSize: 11 }}>{count}</span>
            </Link>
          );
        })}
      </div>

      {/* Búsqueda */}
      <div style={{ marginBottom: 16 }}>
        <form style={{ maxWidth: 320 }}>
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q" defaultValue={search}
            placeholder="Buscar por nombre de alumno..."
            style={{ width: "100%", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, padding: "7px 12px", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" }}
          />
        </form>
      </div>

      {/* Client component con tabla y modales */}
      <PaymentsClient payments={payments as any} students={students} />

      {/* Paginación */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 13, color: "var(--color-text-secondary)" }}>
          <span>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)" }}>← Ant</Link>
            )}
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + Math.max(1, page - 2)).filter(p => p <= pages).map(p => (
              <Link key={p} href={buildUrl({ page: String(p) })} style={{ padding: "5px 10px", borderRadius: 6, textDecoration: "none", border: "0.5px solid var(--color-border-secondary)", background: p === page ? "#006241" : "transparent", color: p === page ? "#fff" : "var(--color-text-secondary)" }}>{p}</Link>
            ))}
            {page < pages && (
              <Link href={buildUrl({ page: String(page + 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)" }}>Sig →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
