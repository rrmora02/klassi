import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { formatCurrency } from "@/lib/utils";
import { OrgGuard } from "@/components/layout/org-guard";

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
  // Si el servidor no ve el orgId (race condition post-setActive), el cliente lo detecta y recarga
  if (!orgId) return <OrgGuard />;

  let tenant = await db.tenant.findFirst({ where: { clerkOrgId: orgId } });

  // Auto-provisionar tenant si no existe (p.ej. en dev local donde el webhook no llega)
  if (!tenant) {
    try {
      const client = await clerkClient();
      const org    = await client.organizations.getOrganization({ organizationId: orgId });

      // Generar slug único a partir del nombre de la org
      const baseSlug = org.name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar acentos
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      tenant = await db.tenant.create({
        data: {
          clerkOrgId:  orgId,
          name:        org.name,
          slug,
          plan:        "STARTER",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (err) {
      console.error("[Dashboard] Error auto-provisionando tenant:", err);
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-medium">No se pudo conectar con la base de datos.</p>
          <p className="mt-1 text-xs text-red-500">
            Verifica que DATABASE_URL y DIRECT_URL estén configuradas correctamente en .env.local
          </p>
          <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs">
            {err instanceof Error ? err.message : String(err)}
          </pre>
        </div>
      );
    }
  }

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
