import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect, notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EventDetailClient } from "@/components/eventos/event-detail-client";
import { EventDownloadButton } from "@/components/eventos/event-download-button";
import { Calendar, Users, DollarSign, ArrowLeft } from "lucide-react";

interface PageProps {
  params: { id: string };
}

export default async function EventoDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { activeTenant: true },
  });

  const tenant = user?.activeTenant;
  if (!tenant) return null;

  // Solo ADMIN
  const tenantUser = await db.tenantUser.findFirst({
    where: { tenantId: tenant.id, userId: user.id },
  });

  if (tenantUser?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Obtener evento
  const event = await db.event.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: { groups: { select: { id: true, name: true } } },
  });

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/eventos"
            className="inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-sb-house p-2"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-sb-light/70" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {event.name}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-sb-light/70">
              📅 {formatDate(event.date)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <EventDownloadButton eventId={event.id} eventName={event.name} />
        </div>
      </div>

      {/* Información del evento */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Detalles principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalles básicos */}
          <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Información del evento
            </h2>

            <div className="space-y-4">
              {/* Tipo de evento */}
              <div>
                <p className="text-sm text-gray-600 dark:text-sb-light/70">
                  Aplicable a:
                </p>
                {event.isSchoolWide ? (
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-sb-green/20 dark:bg-sb-green/30 px-3 py-1.5 text-sm font-medium text-sb-green dark:text-sb-light">
                    <Users className="h-4 w-4" />
                    Toda la escuela
                  </div>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {event.groups.map((g) => (
                      <span
                        key={g.id}
                        className="inline-block rounded-full bg-gray-100 dark:bg-sb-house px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-sb-light/80"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Descripción */}
              {event.description && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-sb-light/70">
                    Descripción:
                  </p>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Monto */}
              <div>
                <p className="text-sm text-gray-600 dark:text-sb-light/70">
                  Costo por alumno:
                </p>
                <p className="mt-1 text-xl font-semibold text-sb-green dark:text-sb-light">
                  {formatCurrency(event.amount)}
                </p>
              </div>

              {/* Estado */}
              <div>
                <p className="text-sm text-gray-600 dark:text-sb-light/70">
                  Estado:
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1.5 text-sm font-medium ${
                    event.status === "ACTIVE"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  }`}
                >
                  {event.status === "ACTIVE" ? "Activo" : "Cancelado"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Estadísticas rápidas */}
        <div>
          <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-5 sticky top-20">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Resumen rápido
            </h2>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-sb-house/50">
                <p className="text-xs text-gray-600 dark:text-sb-light/70">
                  Fecha del evento
                </p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(event.date)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-sb-house/50">
                <p className="text-xs text-gray-600 dark:text-sb-light/70">
                  Estado
                </p>
                <p className="mt-1 font-semibold text-sm">
                  {event.status === "ACTIVE" ? (
                    <span className="text-sb-green dark:text-sb-light">
                      ● Activo
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      ● Cancelado
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 dark:border-[rgba(255,255,255,0.10)] pt-4">
              <Link
                href={`/dashboard/eventos/${event.id}/editar`}
                className="block w-full rounded-lg bg-sb-accent text-center px-3 py-2.5 text-sm font-medium text-white hover:bg-sb-green transition-colors mb-2"
              >
                Editar evento
              </Link>
              <button className="block w-full rounded-lg border border-red-300 dark:border-red-900/50 text-center px-3 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                Cancelar evento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de pagos y detalles */}
      <EventDetailClient
        eventId={event.id}
        eventName={event.name}
        eventDate={event.date}
        eventAmount={event.amount}
        isSchoolWide={event.isSchoolWide}
        groups={event.groups}
      />
    </div>
  );
}
