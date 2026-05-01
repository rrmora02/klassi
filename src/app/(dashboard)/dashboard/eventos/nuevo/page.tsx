import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/eventos/create-event-form";
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
    <div style={{ maxWidth: 720, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/eventos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Eventos</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Nuevo evento</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Nuevo evento</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Crea un nuevo evento para tu escuela</p>
      </div>

      {/* Formulario */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28, marginBottom: 24 }}>
        <CreateEventForm groups={groups} />
      </div>

      {/* Info helpful */}
      <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "0.5px solid rgba(59, 130, 246, 0.30)", borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1e40af", margin: "0 0 12px" }}>
          💡 Consejos
        </h3>
        <ul style={{ fontSize: 12, color: "#1e3a8a", margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>
            Usa nombres claros como "Día del Niño 2025" para que los padres lo identifiquen fácilmente
          </li>
          <li>
            La fecha límite de pago debe ser antes que la fecha del evento
          </li>
          <li>
            Puedes enviar la invitación por WhatsApp una vez creado el evento
          </li>
          <li>
            Los alumnos podrán confirmar su asistencia desde el enlace de WhatsApp
          </li>
        </ul>
      </div>
    </div>
  );
}
