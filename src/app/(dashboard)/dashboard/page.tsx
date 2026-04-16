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
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #fecaca",
          background: "#fef2f2",
          padding: 24,
          fontSize: 13,
          color: "#991b1b",
        }}
      >
        <p style={{ fontWeight: 600, margin: 0 }}>No se pudo conectar con la base de datos o hubo un error.</p>
        <p style={{ marginTop: 6, fontSize: 12, color: "#b91c1c" }}>
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
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Inicio
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: "var(--color-text-secondary)" }}>
          {tenant.name}
        </p>
      </div>

      {/* Trial banner */}
      {showTrialBanner && (
        <div
          className={`flex items-center justify-between rounded-xl px-5 py-4`}
          style={{
            background: daysLeft <= 3 ? "#fef2f2" : "#fffbeb",
            border: `1px solid ${daysLeft <= 3 ? "#fecaca" : "#fde68a"}`,
          }}
        >
          <div className="flex items-center gap-3">
            <Clock
              className="h-5 w-5 flex-shrink-0"
              style={{ color: daysLeft <= 3 ? "#ef4444" : "#f59e0b" }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: daysLeft <= 3 ? "#991b1b" : "#92400e" }}
            >
              {daysLeft === 0
                ? "Tu período de prueba vence hoy."
                : `Tu período de prueba vence en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}.`}
            </p>
          </div>
          <span
            style={{
              marginLeft: 16,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 500,
              color: "#fff",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(99,102,241,0.3)",
            }}
          >
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

        {/* Adeudos vencidos */}
        <section
          className="lg:col-span-3 rounded-xl"
          style={{
            background: "#fff",
            border: "1px solid var(--color-border-tertiary)",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444" }} />
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                Adeudos vencidos
              </h2>
              {stats.overdueCount > 0 && (
                <span
                  style={{
                    borderRadius: 999,
                    background: "#fef2f2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {stats.overdueCount}
                </span>
              )}
            </div>
            {stats.overdueCount > 0 && (
              <Link
                href="/dashboard/pagos?status=OVERDUE"
                className="flex items-center gap-1"
                style={{ fontSize: 12, color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}
              >
                Ver todos <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {overduePayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <CreditCard className="h-5 w-5" style={{ color: "#10b981" }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                Sin adeudos vencidos
              </p>
              <p style={{ marginTop: 4, fontSize: 13, color: "var(--color-text-tertiary)" }}>
                Todos los pagos están al corriente
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {overduePayments.map((p) => {
                const days = p.dueDate ? daysOverdue(p.dueDate) : 0;
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}
                  >
                    {/* Avatar */}
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "#fef2f2",
                        color: "#b91c1c",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                        border: "1px solid #fecaca",
                      }}
                    >
                      {initials(p.student.firstName, p.student.lastName)}
                    </span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/alumnos/${p.student.id}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--color-text-primary)",
                          textDecoration: "none",
                        }}
                      >
                        {fullName(p.student.firstName, p.student.lastName)}
                      </Link>
                      <p className="truncate" style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>
                        {p.concept}
                      </p>
                    </div>

                    {/* Amount */}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {formatCurrency(p.amount)}
                    </span>

                    {/* Days overdue */}
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        background: days > 30 ? "#fef2f2" : days > 7 ? "#fff7ed" : "#fffbeb",
                        color: days > 30 ? "#b91c1c" : days > 7 ? "#9a3412" : "#92400e",
                        border: `1px solid ${days > 30 ? "#fecaca" : days > 7 ? "#fed7aa" : "#fde68a"}`,
                      }}
                    >
                      {days}d
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Alumnos recientes */}
        <section
          className="lg:col-span-2 rounded-xl"
          style={{
            background: "#fff",
            border: "1px solid var(--color-border-tertiary)",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                Alumnos recientes
              </h2>
            </div>
            <Link
              href="/dashboard/alumnos"
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: "var(--color-primary)", textDecoration: "none", fontWeight: 500 }}
            >
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {recentStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--color-primary-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Users className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                Sin alumnos aún
              </p>
              <Link
                href="/dashboard/alumnos/nuevo"
                className="inline-flex items-center gap-1.5 mt-4"
                style={{
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#fff",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(99,102,241,0.3)",
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Agregar alumno
              </Link>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {recentStudents.map((s) => {
                const disc = s.enrollments[0]?.group.discipline;
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}
                  >
                    {/* Avatar */}
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "var(--color-primary-light)",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                        border: "1px solid rgba(99,102,241,0.15)",
                      }}
                    >
                      {initials(s.firstName, s.lastName)}
                    </span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/alumnos/${s.id}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--color-text-primary)",
                          textDecoration: "none",
                        }}
                      >
                        {fullName(s.firstName, s.lastName)}
                      </Link>
                      {disc ? (
                        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>
                          {disc.name}
                        </p>
                      ) : (
                        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>
                          Sin grupo activo
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <span style={{ flexShrink: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
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
        <h2
          style={{
            marginBottom: 12,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-text-tertiary)",
          }}
        >
          Acciones rápidas
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/alumnos/nuevo"
            className="inline-flex items-center gap-2"
            style={{
              borderRadius: 10,
              border: "1px solid var(--color-border-secondary)",
              background: "#fff",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              boxShadow: "var(--shadow-xs)",
              transition: "all 0.15s",
            }}
          >
            <Plus className="h-4 w-4" style={{ color: "var(--color-primary)" }} /> Nuevo alumno
          </Link>
          <Link
            href="/dashboard/grupos/nuevo"
            className="inline-flex items-center gap-2"
            style={{
              borderRadius: 10,
              border: "1px solid var(--color-border-secondary)",
              background: "#fff",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              boxShadow: "var(--shadow-xs)",
              transition: "all 0.15s",
            }}
          >
            <BookOpen className="h-4 w-4" style={{ color: "var(--color-primary)" }} /> Nuevo grupo
          </Link>
          <Link
            href="/dashboard/alumnos"
            className="inline-flex items-center gap-2"
            style={{
              borderRadius: 10,
              border: "1px solid var(--color-border-secondary)",
              background: "#fff",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              boxShadow: "var(--shadow-xs)",
              transition: "all 0.15s",
            }}
          >
            <Users className="h-4 w-4" style={{ color: "var(--color-primary)" }} /> Ver alumnos
          </Link>
          {stats.overdueCount > 0 && (
            <Link
              href="/dashboard/pagos?status=OVERDUE"
              className="inline-flex items-center gap-2"
              style={{
                borderRadius: 10,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 500,
                color: "#b91c1c",
                textDecoration: "none",
                boxShadow: "var(--shadow-xs)",
                transition: "all 0.15s",
              }}
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
