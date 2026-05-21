import Link from "next/link";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Calendar, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { getDashboardContext } from "@/server/auth/dashboard-context";

interface EventosPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function EventosPage({ searchParams }: EventosPageProps) {
  const { tenant, userRole } = await getDashboardContext();
  if (userRole !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const pageSize = 9; // 3x3 grid
  const page = parseInt(params.page || "1", 10);
  const skip = (page - 1) * pageSize;

  // Obtener total de eventos
  const totalEvents = await db.event.count({
    where: { tenantId: tenant.id },
  });

  // Obtener eventos con paginación
  const events = await db.event.findMany({
    where: { tenantId: tenant.id },
    orderBy: { date: "desc" },
    skip,
    take: pageSize,
    include: {
      groups: { select: { id: true, name: true } },
    },
  });

  const payments = events.length > 0
    ? await db.eventPayment.findMany({
        where: { eventId: { in: events.map((event) => event.id) } },
        select: { eventId: true, status: true, willAttend: true },
      })
    : [];

  const eventStatsMap = payments.reduce<Record<string, { eventId: string; total: number; paid: number; pending: number; willAttend: number }>>(
    (stats, payment) => {
      const current = stats[payment.eventId] ?? {
        eventId: payment.eventId,
        total: 0,
        paid: 0,
        pending: 0,
        willAttend: 0,
      };

      current.total += 1;
      if (payment.status === "PAID") current.paid += 1;
      if (payment.status === "PENDING") current.pending += 1;
      if (payment.willAttend === true) current.willAttend += 1;
      stats[payment.eventId] = current;

      return stats;
    },
    {}
  );

  const pages = Math.ceil(totalEvents / pageSize);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Eventos
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-sb-light/70">
            {totalEvents} evento{totalEvents !== 1 ? "s" : ""} registrado{totalEvents !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/eventos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-sb-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-sb-green transition-colors"
        >
          <Plus className="h-4 w-4" />
          Crear evento
        </Link>
      </div>

      {/* Lista de eventos */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-[rgba(255,255,255,0.20)] bg-gray-50 dark:bg-sb-uplift/50 py-16">
          <Calendar className="h-12 w-12 text-gray-400 dark:text-sb-light/40" />
          <p className="mt-4 text-center text-sm font-medium text-gray-600 dark:text-sb-light/80">
            Sin eventos registrados
          </p>
          <p className="mt-1 text-center text-sm text-gray-400 dark:text-sb-light/50">
            Crea tu primer evento haciendo click en el botón superior
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const stat = eventStatsMap[event.id] ?? {
                eventId: event.id,
                total: 0,
                paid: 0,
                pending: 0,
                willAttend: 0,
              };
              const paidPercentage =
                stat.willAttend > 0
                  ? Math.round((stat.paid / stat.willAttend) * 100)
                  : 0;

              return (
                <Link
                  key={event.id}
                  href={`/dashboard/eventos/${event.id}`}
                  className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-5 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {event.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-sb-light/60 mt-1">
                      📅 {formatDate(event.date)}
                    </p>
                  </div>

                  {/* Grupos */}
                  <div className="mb-4 flex items-center gap-2 flex-wrap">
                    {event.isSchoolWide ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sb-green/20 dark:bg-sb-green/30 px-2.5 py-1 text-xs font-medium text-sb-green dark:text-sb-light">
                        <Users className="h-3 w-3" />
                        Toda la escuela
                      </span>
                    ) : event.groups.length > 0 ? (
                      event.groups.slice(0, 2).map((g) => (
                        <span
                          key={g.id}
                          className="inline-block rounded-full bg-gray-100 dark:bg-sb-house px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-sb-light/80"
                        >
                          {g.name}
                        </span>
                      ))
                    ) : null}
                    {event.groups.length > 2 && (
                      <span className="text-xs text-gray-500 dark:text-sb-light/60">
                        +{event.groups.length - 2} más
                      </span>
                    )}
                  </div>

                  {/* Monto */}
                  <div className="mb-4 rounded-lg bg-gray-50 dark:bg-sb-house p-3">
                    <p className="text-xs text-gray-600 dark:text-sb-light/70">
                      Costo por alumno
                    </p>
                    <p className="text-lg font-semibold text-sb-green dark:text-sb-light">
                      {formatCurrency(event.amount)}
                    </p>
                  </div>

                  {/* Estadísticas */}
                  <div className="border-t border-gray-100 dark:border-[rgba(255,255,255,0.07)] pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-sb-light/70">
                          Alumnos
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {stat.willAttend}/{stat.total}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-sb-light/70">
                          Cobrado
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {stat.paid}/{stat.willAttend}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {stat.willAttend > 0 && (
                      <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-sb-house overflow-hidden">
                        <div
                          className="h-full bg-sb-green transition-all"
                          style={{ width: `${paidPercentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Paginación */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <Link
                href={`?page=${Math.max(1, page - 1)}`}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  page === 1
                    ? "border-gray-200 dark:border-[rgba(255,255,255,0.10)] text-gray-400 dark:text-sb-light/40 cursor-not-allowed opacity-50"
                    : "border-gray-200 dark:border-[rgba(255,255,255,0.10)] text-gray-700 dark:text-sb-light/80 hover:bg-gray-50 dark:hover:bg-sb-house"
                }`}
                aria-disabled={page === 1}
                onClick={(e) => page === 1 && e.preventDefault()}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Link>

              <div className="text-sm text-gray-600 dark:text-sb-light/70">
                Página {page} de {pages}
              </div>

              <Link
                href={`?page=${Math.min(pages, page + 1)}`}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  page === pages
                    ? "border-gray-200 dark:border-[rgba(255,255,255,0.10)] text-gray-400 dark:text-sb-light/40 cursor-not-allowed opacity-50"
                    : "border-gray-200 dark:border-[rgba(255,255,255,0.10)] text-gray-700 dark:text-sb-light/80 hover:bg-gray-50 dark:hover:bg-sb-house"
                }`}
                aria-disabled={page === pages}
                onClick={(e) => page === pages && e.preventDefault()}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
