"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface EventInvitationPreviewProps {
  eventName: string;
  description?: string;
  date: Date;
  groupNames: string[];
  amount: number;
  dueDate: Date;
}

function generateInvitationHTML(data: EventInvitationPreviewProps): string {
  const eventDateStr = new Date(data.date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dueDateStr = new Date(data.dueDate).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const amountStr = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(data.amount / 100);

  const groupsStr = data.groupNames.join(", ");

  return `
<style>
  @media (max-width: 640px) {
    #invitation-container {
      padding: 16px !important;
    }
    #invitation-card {
      padding: 20px !important;
    }
    #invitation-title {
      font-size: 20px !important;
    }
    #invitation-event-name {
      font-size: 18px !important;
    }
    #invitation-content > div {
      margin-bottom: 12px !important;
    }
    #invitation-label {
      font-size: 12px !important;
    }
    #invitation-value {
      font-size: 14px !important;
    }
    #invitation-footer-text {
      font-size: 13px !important;
    }
  }
</style>
<div id="invitation-container" style="max-width: 100%; padding: 24px; background: #f8f9fa; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-sizing: border-box;">
  <div id="invitation-card" style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); box-sizing: border-box;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 id="invitation-title" style="font-size: 28px; margin: 0; color: #1f2937;">🎉 ¡INVITACIÓN! 🎉</h1>
    </div>

    <!-- Título evento -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 id="invitation-event-name" style="font-size: 24px; margin: 0; color: #1f2937; font-weight: 600;">${data.eventName}</h2>
    </div>

    <!-- Línea separadora -->
    <div style="height: 1px; background: #e5e7eb; margin-bottom: 24px;"></div>

    <!-- Contenido -->
    <div id="invitation-content" style="margin-bottom: 24px;">
      <!-- Fecha -->
      <div style="margin-bottom: 16px;">
        <div id="invitation-label" style="font-weight: 500; color: #4b5563; font-size: 14px;">📅 Fecha del evento:</div>
        <div id="invitation-value" style="font-weight: 600; font-size: 16px; color: #1f2937; margin-top: 4px;">${eventDateStr}</div>
      </div>

      <!-- Grupos -->
      ${groupsStr ? `
      <div style="margin-bottom: 16px;">
        <div id="invitation-label" style="font-weight: 500; color: #4b5563; font-size: 14px;">👥 Grupo(s):</div>
        <div id="invitation-value" style="font-weight: 600; font-size: 16px; color: #1f2937; margin-top: 4px; word-break: break-word;">${groupsStr}</div>
      </div>
      ` : ""}

      <!-- Monto -->
      <div style="margin-bottom: 16px;">
        <div id="invitation-label" style="font-weight: 500; color: #4b5563; font-size: 14px;">💰 Costo:</div>
        <div id="invitation-value" style="font-weight: 600; font-size: 18px; color: #15803d; margin-top: 4px;">${amountStr}</div>
      </div>

      <!-- Descripción -->
      ${data.description ? `
      <div style="margin-bottom: 16px;">
        <div id="invitation-label" style="font-weight: 500; color: #4b5563; font-size: 14px;">📝 Descripción:</div>
        <div id="invitation-value" style="font-size: 14px; color: #1f2937; margin-top: 4px; word-break: break-word;">${data.description}</div>
      </div>
      ` : ""}

      <!-- Fecha límite -->
      <div style="margin-bottom: 16px;">
        <div id="invitation-label" style="font-weight: 500; color: #4b5563; font-size: 14px;">⏰ Límite de pago:</div>
        <div id="invitation-value" style="font-weight: 600; font-size: 16px; color: #b91c1c; margin-top: 4px;">${dueDateStr}</div>
      </div>
    </div>

    <!-- Línea separadora -->
    <div style="height: 1px; background: #e5e7eb; margin-bottom: 24px;"></div>

    <!-- Mensaje final -->
    <div style="text-align: center; color: #666;">
      <p id="invitation-footer-text" style="margin: 0 0 8px; font-size: 14px;">Por favor, confirma tu asistencia y realiza el pago antes de la fecha límite.</p>
      <p id="invitation-footer-text" style="margin: 0; font-size: 14px;">Contacta a la escuela si tienes dudas.</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; color: #999; font-size: 12px; margin-top: 16px;">
    Generado por Klassi
  </div>
</div>
  `.trim();
}

export function EventInvitationPreview({
  eventName,
  description,
  date,
  groupNames,
  amount,
  dueDate,
}: EventInvitationPreviewProps) {
  const [isOpen, setIsOpen] = useState(true);
  const htmlContent = generateInvitationHTML({
    eventName,
    description,
    date,
    groupNames,
    amount,
    dueDate,
  });

  return (
    <div style={{ borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", overflow: "hidden" }}>
      {/* Header acordeón */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          cursor: "pointer",
          transition: "background 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        <h2 style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
          Vista previa de la invitación
        </h2>
        <ChevronDown
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ width: 20, height: 20, color: "var(--color-text-secondary)", flexShrink: 0 }}
        />
      </button>

      {/* Contenido acordeón */}
      {isOpen && (
        <div style={{ padding: "16px", background: "var(--color-background-primary)", overflowX: "auto" }}>
          <div
            id="invitation-preview"
            style={{ width: "100%", boxSizing: "border-box" }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      )}
    </div>
  );
}
