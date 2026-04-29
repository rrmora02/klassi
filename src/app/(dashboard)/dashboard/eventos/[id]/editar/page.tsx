import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect, notFound } from "next/navigation";
import { EditEventForm } from "@/components/eventos/edit-event-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: { id: string };
}

export default async function EditEventPage({ params }: PageProps) {
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
  });

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/eventos/${event.id}`}
          className="inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-sb-house p-2"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-sb-light/70" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Editar evento
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-sb-light/70">
            Modifica los detalles de {event.name}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="max-w-2xl">
        <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-6">
          <EditEventForm
            eventId={event.id}
            initialData={{
              name: event.name,
              description: event.description || undefined,
              date: event.date,
              amount: event.amount,
              status: event.status,
            }}
          />
        </div>
      </div>

      {/* Info helpful */}
      <div className="max-w-2xl rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
          💡 Nota
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-200">
          <li>
            • Los cambios se aplicarán inmediatamente para los alumnos
          </li>
          <li>
            • Los pagos ya registrados no se modificarán automáticamente
          </li>
          <li>
            • Si necesitas cambiar los grupos, considera crear un nuevo evento
          </li>
        </ul>
      </div>
    </div>
  );
}
