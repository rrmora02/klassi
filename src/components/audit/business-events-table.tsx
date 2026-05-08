"use client";

import { formatDate } from "@/lib/utils";
import type { BusinessEvent, User } from "@prisma/client";

interface BusinessEventsTableProps {
  events: (BusinessEvent & { user: User | null })[];
  isLoading?: boolean;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  PAYMENT_CREATED: "Pago Creado",
  PAYMENT_MARKED_AS_PAID: "Pago Pagado",
  PAYMENT_CANCELLED: "Pago Cancelado",
  DISCOUNT_APPLIED: "Descuento Aplicado",
  STUDENT_ENROLLED: "Alumno Inscrito",
  STUDENT_UNENROLLED: "Alumno Desinscrito",
  STUDENT_CREATED: "Alumno Creado",
  STUDENT_UPDATED: "Alumno Actualizado",
  STUDENT_DELETED: "Alumno Eliminado",
  ATTENDANCE_RECORDED: "Asistencia Registrada",
  USER_INVITED: "Usuario Invitado",
  USER_ROLE_CHANGED: "Rol Cambiado",
  GROUP_CREATED: "Grupo Creado",
  GROUP_UPDATED: "Grupo Actualizado",
  EVENT_CREATED: "Evento Creado",
  EVENT_CANCELLED: "Evento Cancelado",
};

const EVENT_COLORS: Record<string, string> = {
  PAYMENT: "#3b82f6",
  STUDENT: "#10b981",
  ATTENDANCE: "#8b5cf6",
  USER: "#f59e0b",
  GROUP: "#06b6d4",
  EVENT: "#ec4899",
};

function getEventCategory(eventType: string): string {
  if (eventType.includes("PAYMENT")) return "PAYMENT";
  if (eventType.includes("STUDENT")) return "STUDENT";
  if (eventType.includes("ATTENDANCE")) return "ATTENDANCE";
  if (eventType.includes("USER")) return "USER";
  if (eventType.includes("GROUP")) return "GROUP";
  return "EVENT";
}

export function BusinessEventsTable({ events, isLoading }: BusinessEventsTableProps) {
  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>
        Cargando...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>
        No hay eventos de negocio
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }} className="text-xs sm:text-sm">
        <thead>
          <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Evento", "Entidad", "Usuario", "Fecha", "Detalles"].map(h => (
              <th
                key={h}
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-secondary)",
                }}
                className="sm:px-3.5 sm:py-2.5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map(event => {
            const category = getEventCategory(event.eventType);
            const color = EVENT_COLORS[category];
            return (
              <tr key={event.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "8px 10px" }} className="sm:px-3.5 sm:py-2.5">
                  <span
                    style={{
                      display: "inline-block",
                      background: color + "20",
                      color: color,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 12 }} className="sm:px-3.5 sm:py-2.5">
                  <div>{event.entityType}</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                    {event.entityId.slice(0, 8)}...
                  </div>
                </td>
                <td style={{ padding: "8px 10px", color: "var(--color-text-primary)" }} className="sm:px-3.5 sm:py-2.5">
                  {event.user?.name ?? "Sistema"}
                </td>
                <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 12 }} className="sm:px-3.5 sm:py-2.5">
                  {formatDate(event.createdAt)}
                </td>
                <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 11 }} className="sm:px-3.5 sm:py-2.5">
                  {event.metadata ? "Ver detalles" : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
