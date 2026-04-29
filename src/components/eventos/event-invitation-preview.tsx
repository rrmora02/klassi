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
<div style="max-width: 600px; margin: 0 auto; padding: 24px; background: #f8f9fa; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 28px; margin: 0; color: #1f2937;">🎉 ¡INVITACIÓN! 🎉</h1>
    </div>

    <!-- Título evento -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="font-size: 24px; margin: 0; color: #1f2937; font-weight: 600;">${data.eventName}</h2>
    </div>

    <!-- Línea separadora -->
    <div style="height: 1px; background: #e5e7eb; margin-bottom: 24px;"></div>

    <!-- Contenido -->
    <div style="margin-bottom: 24px;">
      <!-- Fecha -->
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 500; color: #4b5563; font-size: 14px;">📅 Fecha del evento:</div>
        <div style="font-weight: 600; font-size: 16px; color: #1f2937; margin-top: 4px;">${eventDateStr}</div>
      </div>

      <!-- Grupos -->
      ${groupsStr ? `
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 500; color: #4b5563; font-size: 14px;">👥 Grupo(s):</div>
        <div style="font-weight: 600; font-size: 16px; color: #1f2937; margin-top: 4px;">${groupsStr}</div>
      </div>
      ` : ""}

      <!-- Monto -->
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 500; color: #4b5563; font-size: 14px;">💰 Costo:</div>
        <div style="font-weight: 600; font-size: 18px; color: #15803d; margin-top: 4px;">${amountStr}</div>
      </div>

      <!-- Descripción -->
      ${data.description ? `
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 500; color: #4b5563; font-size: 14px;">📝 Descripción:</div>
        <div style="font-size: 14px; color: #1f2937; margin-top: 4px;">${data.description}</div>
      </div>
      ` : ""}

      <!-- Fecha límite -->
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 500; color: #4b5563; font-size: 14px;">⏰ Límite de pago:</div>
        <div style="font-weight: 600; font-size: 16px; color: #b91c1c; margin-top: 4px;">${dueDateStr}</div>
      </div>
    </div>

    <!-- Línea separadora -->
    <div style="height: 1px; background: #e5e7eb; margin-bottom: 24px;"></div>

    <!-- Mensaje final -->
    <div style="text-align: center; color: #666; font-size: 14px;">
      <p style="margin: 0 0 8px;">Por favor, confirma tu asistencia y realiza el pago antes de la fecha límite.</p>
      <p style="margin: 0;">Contacta a la escuela si tienes dudas.</p>
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
    <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift overflow-hidden">
      {/* Header acordeón */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-sb-house/50 transition-colors border-b border-gray-200 dark:border-[rgba(255,255,255,0.07)]"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Vista previa de la invitación
        </h2>
        <ChevronDown
          className={`h-5 w-5 text-gray-600 dark:text-sb-light/70 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Contenido acordeón */}
      {isOpen && (
        <div className="p-5 max-w-none overflow-auto bg-white">
          <div
            id="invitation-preview"
            className="bg-white"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      )}
    </div>
  );
}
