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
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/eventos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Eventos</Link>
        <span>/</span>
        <Link href={`/dashboard/eventos/${event.id}`} style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>{event.name}</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Editar</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
        Editar — {event.name}
      </h1>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28, marginBottom: 20 }}>
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

      {/* Info helpful */}
      <div style={{ background: "rgba(59,130,246,0.08)", border: "0.5px solid rgba(59,130,246,0.25)", borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontWeight: 600, color: "#1e40af", fontSize: 13, margin: 0, marginBottom: 8 }}>
          💡 Nota
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: "#1e3a8a", lineHeight: 1.6 }}>
          <li>Los cambios se aplicarán inmediatamente para los alumnos</li>
          <li>Los pagos ya registrados no se modificarán automáticamente</li>
          <li>Si necesitas cambiar los grupos, considera crear un nuevo evento</li>
        </ul>
      </div>
    </div>
  );
}
