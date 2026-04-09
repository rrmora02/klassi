import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { formatCurrency } from "@/lib/utils";

async function getDashboardStats(tenantId: string) {
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();
  const from  = new Date(year, month, 1);
  const to    = new Date(year, month + 1, 0, 23, 59, 59);

  const [totalStudents, activeGroups, monthRevenue, overdueCount] = await Promise.all([
    db.student.count({ where: { tenantId, status: "ACTIVE" } }),
    db.group.count({ where: { tenantId, isActive: true } }),
    db.payment.aggregate({
      where: { tenantId, status: "PAID", paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    db.payment.count({ where: { tenantId, status: "OVERDUE" } }),
  ]);

  return {
    totalStudents,
    activeGroups,
    monthRevenue: monthRevenue._sum.amount ?? 0,
    overdueCount,
  };
}

export default async function DashboardPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const tenant = await db.tenant.findFirst({ where: { clerkOrgId: orgId } });
  if (!tenant) return null;

  const stats = await getDashboardStats(tenant.id);

  const cards = [
    { label: "Alumnos activos",    value: stats.totalStudents.toString(),              hint: "Total inscritos" },
    { label: "Grupos activos",     value: stats.activeGroups.toString(),               hint: "Con clases programadas" },
    { label: "Ingresos del mes",   value: formatCurrency(stats.monthRevenue),          hint: "Pagos recibidos este mes" },
    { label: "Adeudos pendientes", value: stats.overdueCount.toString(),               hint: "Alumnos con pago vencido", alert: stats.overdueCount > 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Inicio</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 ${card.alert ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`mt-1 text-3xl font-semibold ${card.alert ? "text-red-700" : "text-gray-900"}`}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-gray-400">{card.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
