import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
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

  // Solo ADMIN y RECEPTIONIST
  const tenantUser = await db.tenantUser.findFirst({
    where: { tenantId: tenant.id, userId: user.id }
  });
  if (tenantUser?.role === "INSTRUCTOR") {
    redirect("/dashboard");
  }

  const page      = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize  = 10;
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

  // Sumas y conteos con agregaciones en la BD (antes se traían TODAS las
  // filas de pagos a Node solo para reducirlas a 3 números).
  const [payments, total, paidThisMonth, byStatus, students] = await Promise.all([
    db.payment.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ status: "asc" }, { dueDate: "desc" }],
      select: { id: true, concept: true, amount: true, currency: true, method: true, status: true, dueDate: true, paidAt: true, reference: true, discountAmount: true, student: { select: { firstName: true, lastName: true } } },
    }),
    db.payment.count({ where }),
    db.payment.aggregate({
      where: { tenantId: tenant.id, status: "PAID", paidAt: { gte: monthStart, lte: monthEnd } },
      _sum:   { amount: true, discountAmount: true },
      _count: { _all: true },
    }),
    db.payment.groupBy({
      by: ["status"],
      where: { tenantId: tenant.id },
      _count: { _all: true },
      _sum:   { amount: true },
    }),
    db.student.findMany({ where: { tenantId: tenant.id, status: "ACTIVE" }, select: { id: true, firstName: true, lastName: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
  ]);

  const statusRow = (s: string) => byStatus.find(r => r.status === s);

  const paidTotal    = (paidThisMonth._sum.amount ?? 0) - (paidThisMonth._sum.discountAmount ?? 0);
  const pendingTotal = statusRow("PENDING")?._sum.amount ?? 0;
  const overdueTotal = statusRow("OVERDUE")?._sum.amount ?? 0;

  const countMap = {
    PENDING:   statusRow("PENDING")?._count._all   ?? 0,
    PAID:      statusRow("PAID")?._count._all      ?? 0,
    OVERDUE:   statusRow("OVERDUE")?._count._all   ?? 0,
    CANCELLED: statusRow("CANCELLED")?._count._all ?? 0,
  } satisfies Record<PaymentStatus, number>;
  const pages = Math.ceil(total / pageSize);

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q: search || undefined, status: status as string | undefined, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return `/dashboard/pagos?${sp.toString()}`;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Pagos</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          {total} {total === 1 ? "registro" : "registros"}
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gap: 14, marginBottom: 24 }} className="grid-cols-1 sm:grid-cols-3">
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 16px" }} className="sm:p-5">
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Cobrado este mes</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#15803d", margin: "4px 0 0", wordBreak: "break-word", overflowWrap: "break-word" }} className="sm:text-2xl break-words">
            {formatCurrency(paidTotal)}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{paidThisMonth._count._all} pagos</p>
        </div>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 16px" }} className="sm:p-5">
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Por cobrar</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#b45309", margin: "4px 0 0", wordBreak: "break-word", overflowWrap: "break-word" }} className="sm:text-2xl break-words">
            {formatCurrency(pendingTotal)}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{countMap.PENDING} pendientes</p>
        </div>
        <div style={{ background: countMap.OVERDUE > 0 ? "rgba(220,38,38,0.08)" : "var(--color-background-primary)", border: `0.5px solid ${countMap.OVERDUE > 0 ? "rgba(220,38,38,0.30)" : "var(--color-border-tertiary)"}`, borderRadius: 12, padding: "12px 16px" }} className="sm:p-5">
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Adeudos vencidos</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: countMap.OVERDUE > 0 ? "#b91c1c" : "#15803d", margin: "4px 0 0", wordBreak: "break-word", overflowWrap: "break-word" }} className="sm:text-2xl break-words">
            {formatCurrency(overdueTotal)}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{countMap.OVERDUE} vencidos</p>
        </div>
      </div>

      {/* Tabs de estado */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)", overflowX: "auto" }} className="scrollbar-hide">
        {STATUS_TABS.map(tab => {
          const active = tab.value === status || (!tab.value && !status);
          const count  = tab.value ? (countMap[tab.value] ?? 0) : Object.values(countMap).reduce((a: number, b: number) => a + b, 0);
          return (
            <Link key={tab.label} href={buildUrl({ status: tab.value as string | undefined, page: "1" })} style={{
              padding: "8px 12px", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap",
              color: active ? "#006241" : "var(--color-text-secondary)",
              fontWeight: active ? 500 : 400,
              borderBottom: active ? "2px solid #006241" : "2px solid transparent",
              marginBottom: -1,
            }} className="sm:px-4 sm:text-sm">
              {tab.label} <span style={{ fontSize: 11 }}>{count}</span>
            </Link>
          );
        })}
      </div>

      {/* Búsqueda */}
      <div style={{ marginBottom: 16 }}>
        <form className="w-full">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q" defaultValue={search}
            placeholder="Buscar por nombre..."
            className="w-full sm:max-w-sm rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-[rgba(255,255,255,0.08)] text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 px-3.5 py-2 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors"
          />
        </form>
      </div>

      {/* Client component con tabla y modales */}
      <PaymentsClient payments={payments as any} students={students} />

      {/* Paginación */}
      {pages > 1 && (
        <div style={{ marginTop: 16, fontSize: 13, color: "var(--color-text-secondary)" }}>
          <p style={{ margin: "0 0 12px" }}>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</p>
          <div style={{ display: "flex", gap: 4, overflowX: "auto" }} className="flex-wrap sm:flex-nowrap">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>← Ant</Link>
            )}
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + Math.max(1, page - 2)).filter(p => p <= pages).map(p => (
              <Link key={p} href={buildUrl({ page: String(p) })} style={{ padding: "5px 10px", borderRadius: 6, textDecoration: "none", border: "0.5px solid var(--color-border-secondary)", background: p === page ? "#006241" : "transparent", color: p === page ? "#fff" : "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{p}</Link>
            ))}
            {page < pages && (
              <Link href={buildUrl({ page: String(page + 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>Sig →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
