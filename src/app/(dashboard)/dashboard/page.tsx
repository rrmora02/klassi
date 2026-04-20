import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { formatCurrency, formatDate, fullName, initials } from "@/lib/utils";
import { StatCard } from "@/components/shared";
import {
  Users,
  BookOpen,
  CreditCard,
  AlertTriangle,
  Plus,
  ChevronRight,
  Clock,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────

async function getDashboardData(tenantId: string) {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    totalStudents,
    activeGroups,
    monthRevenue,
    overdueCount,
    overduePayments,
    recentStudents,
  ] = await Promise.all([
    db.student.count({ where: { tenantId, status: "ACTIVE" } }),

    db.group.count({ where: { tenantId, isActive: true } }),

    db.payment.aggregate({
      where: { tenantId, status: "PAID", paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),

    db.payment.count({ where: { tenantId, status: "OVERDUE" } }),

    db.payment.findMany({
      where:   { tenantId, status: "OVERDUE" },
      include: { student: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      orderBy: { dueDate: "asc" },
      take:    6,
    }),

    db.student.findMany({
      where:   { tenantId },
      orderBy: { createdAt: "desc" },
      take:    6,
      select: {
        id: true, firstName: true, lastName: true, status: true, createdAt: true,
        enrollments: {
          where:   { status: "ACTIVE" },
          include: { group: { select: { discipline: { select: { name: true, color: true } } } } },
          take:    1,
        },
      },
    }),
  ]);

  return {
    stats: {
      totalStudents,
      activeGroups,
      monthRevenue: monthRevenue._sum.amount ?? 0,
      overdueCount,
    },
    overduePayments,
    recentStudents,
  };
}

function daysOverdue(dueDate: Date): number {
  return Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86_400_000));
}

function trialDaysLeft(trialEndsAt: Date): number {
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000));
}

// ─── Page ────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  let user;
  try {
    user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { activeTenant: true }
    });
  } catch (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-medium">No se pudo conectar con la base de datos o hubo un error.</p>
        <p className="mt-1 text-xs text-red-500">
          Revisa tu conexión a Supabase. {String(err)}
        </p>
      </div>
    );
  }

  if (!user || !user.activeTenant) return null; // DashboardLayout redirects this to /onboarding

  const tenant = user.activeTenant;

  const { stats, overduePayments, recentStudents } = await getDashboardData(tenant.id);

  const showTrialBanner =
    tenant.status === "TRIAL" && tenant.trialEndsAt && trialDaysLeft(tenant.trialEndsAt) >= 0;
  const daysLeft = tenant.trialEndsAt ? trialDaysLeft(tenant.trialEndsAt) : 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Inicio</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{tenant.name}</p>
      </div>

      {/* Trial banner */}
      {showTrialBanner && (
        <div className={`flex items-center justify-between rounded-xl px-5 py-4 ${
          daysLeft <= 3
            ? "border border-red-200 bg-red-50"
            : "border border-amber-200 bg-amber-50"
        }`}>
          <div className="flex items-center gap-3">
            <Clock className={`h-5 w-5 flex-shrink-0 ${daysLeft <= 3 ? "text-red-500" : "text-amber-500"}`} />
            <p className={`text-sm font-medium ${daysLeft <= 3 ? "text-red-800" : "text-amber-800"}`}>
              {daysLeft === 0
                ? "Tu período de prueba vence hoy."
                : `Tu período de prueba vence en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}.`}
            </p>
          </div>
          <span className="ml-4 rounded-lg bg-violet-900 px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap">
            Actualizar plan
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Alumnos activos"
          value={stats.totalStudents}
          hint="Total inscritos"
        />
        <StatCard
          label="Grupos activos"
          value={stats.activeGroups}
          hint="Con clases programadas"
        />
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(stats.monthRevenue)}
          hint="Pagos recibidos este mes"
        />
        <StatCard
          label="Adeudos vencidos"
          value={stats.overdueCount}
          hint={stats.overdueCount === 0 ? "Sin adeudos pendientes" : "Requieren atención"}
          alert={stats.overdueCount > 0}
        />
      </div>

      {/* Main content: two columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Adeudos vencidos */}
        <section className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Adeudos vencidos</h2>
              {stats.overdueCount > 0 && (
                <span className="rounded-full bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                  {stats.overdueCount}
                </span>
              )}
            </div>
            {stats.overdueCount > 0 && (
              <Link
                href="/dashboard/pagos?status=OVERDUE"
                className="flex items-center gap-1 text-xs text-violet-700 hover:underline"
              >
                Ver todos <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {overduePayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
                <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Sin adeudos vencidos</p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Todos los pagos están al corriente</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {overduePayments.map((p) => {
                const days = p.dueDate ? daysOverdue(p.dueDate) : 0;
                return (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                    {/* Avatar */}
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 text-xs font-semibold text-red-700 dark:text-red-300">
                      {initials(p.student.firstName, p.student.lastName)}
                    </span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/alumnos/${p.student.id}`}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-violet-700 dark:hover:text-violet-400"
                      >
                        {fullName(p.student.firstName, p.student.lastName)}
                      </Link>
                      <p className="truncate text-xs text-gray-400 dark:text-gray-500">{p.concept}</p>
                    </div>

                    {/* Amount */}
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                      {formatCurrency(p.amount)}
                    </span>

                    {/* Days overdue */}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      days > 30
                        ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                        : days > 7
                        ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                    }`}>
                      {days}d
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Alumnos recientes */}
        <section className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500 dark:text-violet-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Alumnos recientes</h2>
            </div>
            <Link
              href="/dashboard/alumnos"
              className="flex items-center gap-1 text-xs text-violet-700 hover:underline"
            >
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {recentStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950">
                <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Sin alumnos aún</p>
              <Link
                href="/dashboard/alumnos/nuevo"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar alumno
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {recentStudents.map((s) => {
                const disc = s.enrollments[0]?.group.discipline;
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                    {/* Avatar */}
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900 text-xs font-semibold text-violet-800 dark:text-violet-300">
                      {initials(s.firstName, s.lastName)}
                    </span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/alumnos/${s.id}`}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-violet-700 dark:hover:text-violet-400"
                      >
                        {fullName(s.firstName, s.lastName)}
                      </Link>
                      {disc ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500">{disc.name}</p>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Sin grupo activo</p>
                      )}
                    </div>

                    {/* Date */}
                    <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {formatDate(s.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Acciones rápidas
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/alumnos/nuevo"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-800 dark:hover:text-violet-400"
          >
            <Plus className="h-4 w-4" /> Nuevo alumno
          </Link>
          <Link
            href="/dashboard/grupos/nuevo"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-800 dark:hover:text-violet-400"
          >
            <BookOpen className="h-4 w-4" /> Nuevo grupo
          </Link>
          <Link
            href="/dashboard/alumnos"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-800 dark:hover:text-violet-400"
          >
            <Users className="h-4 w-4" /> Ver alumnos
          </Link>
          {stats.overdueCount > 0 && (
            <Link
              href="/dashboard/pagos?status=OVERDUE"
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm transition hover:border-red-300"
            >
              <AlertTriangle className="h-4 w-4" />
              {stats.overdueCount} {stats.overdueCount === 1 ? "adeudo vencido" : "adeudos vencidos"}
            </Link>
          )}
        </div>
      </section>

    </div>
  );
}
