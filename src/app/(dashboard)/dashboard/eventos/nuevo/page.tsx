import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/eventos/create-event-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NuevoEventoPage() {
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

  // Obtener grupos activos
  const groups = await db.group.findMany({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/eventos"
          className="inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-sb-house p-2"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-sb-light/70" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Crear evento
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-sb-light/70">
            Crea un nuevo evento para tu escuela
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="max-w-2xl">
        <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-6">
          <CreateEventForm groups={groups} />
        </div>
      </div>

      {/* Info helpful */}
      <div className="max-w-2xl rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
          💡 Consejos
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-200">
          <li>
            • Usa nombres claros como "Día del Niño 2025" para que los padres
            lo identifiquen fácilmente
          </li>
          <li>
            • La fecha límite de pago debe ser antes que la fecha del evento
          </li>
          <li>
            • Puedes enviar la invitación por WhatsApp una vez creado el evento
          </li>
          <li>
            • Los alumnos podrán confirmar su asistencia desde el enlace de
            WhatsApp
          </li>
        </ul>
      </div>
    </div>
  );
}
