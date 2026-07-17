import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect, notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EventDetailClient } from "@/components/eventos/event-detail-client";
import { EventDownloadButton } from "@/components/eventos/event-download-button";
import { EventInvitationPreview } from "@/components/eventos/event-invitation-preview";
import { EventActions } from "@/components/eventos/event-actions";
import { Users } from "lucide-react";

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
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/eventos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Eventos</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>{event.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>{event.name}</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>📅 {formatDate(event.date)}</p>
        </div>
        <EventDownloadButton eventId={event.id} eventName={event.name} />
      </div>

      {/* Grid de contenido */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 24 }} className="lg:grid-cols-3">
        {/* Columna principal */}
        <div style={{ gridColumn: "1 / -1" }} className="lg:col-span-2">
          {/* Detalles básicos */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>Información del evento</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Tipo de evento */}
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>Aplicable a:</p>
                {event.isSchoolWide ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 20, background: "rgba(21, 128, 61, 0.15)", padding: "6px 12px", fontSize: 13, fontWeight: 500, color: "#15803d" }}>
                    <Users className="h-4 w-4" />
                    Toda la escuela
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {event.groups.map((g) => (
                      <span key={g.id} style={{ display: "inline-block", borderRadius: 20, background: "var(--color-background-secondary)", padding: "6px 12px", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Descripción */}
              {event.description && (
                <div>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>Descripción:</p>
                  <p style={{ fontSize: 14, color: "var(--color-text-primary)", margin: 0 }}>{event.description}</p>
                </div>
              )}

              {/* Monto */}
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>Costo por alumno:</p>
                <p style={{ fontSize: 18, fontWeight: 600, color: "#15803d", margin: 0 }}>{formatCurrency(event.amount)}</p>
              </div>

              {/* Estado */}
              <div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>Estado:</p>
                <span style={{
                  display: "inline-block",
                  borderRadius: 20,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  background: event.status === "PENDING" ? "rgba(59, 130, 246, 0.15)" :
                             event.status === "ONGOING" ? "rgba(245, 158, 11, 0.15)" :
                             event.status === "COMPLETED" ? "rgba(34, 197, 94, 0.15)" :
                             "rgba(220, 38, 38, 0.15)",
                  color: event.status === "PENDING" ? "#3b82f6" :
                         event.status === "ONGOING" ? "#f59e0b" :
                         event.status === "COMPLETED" ? "#22c55e" :
                         "#dc2626"
                }}>
                  {event.status === "PENDING" ? "Pendiente" :
                   event.status === "ONGOING" ? "En curso" :
                   event.status === "COMPLETED" ? "Completado" :
                   "Cancelado"}
                </span>
              </div>
            </div>
          </div>

          {/* Vista previa de invitación */}
          <EventInvitationPreview
            eventName={event.name}
            description={event.description || undefined}
            date={event.date}
            groupNames={event.isSchoolWide
              ? ["Toda la escuela"]
              : event.groups.map((g) => g.name)}
            amount={event.amount}
            dueDate={event.paymentDueDate || event.date}
          />
        </div>

        {/* Estadísticas rápidas - Solo visible en pantallas grandes */}
        <div className="hidden lg:block">
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, position: "sticky", top: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>Resumen rápido</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 8, background: "var(--color-background-secondary)" }}>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 6px" }}>Fecha del evento</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>{formatDate(event.date)}</p>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: "var(--color-background-secondary)" }}>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 6px" }}>Estado</p>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color:
                  event.status === "PENDING" ? "#3b82f6" :
                  event.status === "ONGOING" ? "#f59e0b" :
                  event.status === "COMPLETED" ? "#22c55e" :
                  "#dc2626"
                }}>
                  ● {event.status === "PENDING" ? "Pendiente" :
                     event.status === "ONGOING" ? "En curso" :
                     event.status === "COMPLETED" ? "Completado" :
                     "Cancelado"}
                </p>
              </div>
            </div>

            <EventActions eventId={event.id} eventStatus={event.status as any} />
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
        eventStatus={event.status as any}
      />
    </div>
  );
}
