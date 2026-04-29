import PDFDocument from "pdfkit";
import { type Readable } from "stream";

interface EventPDFData {
  eventName: string;
  description?: string;
  date: Date;
  groupNames: string[];
  amount: number;
  dueDate: Date;
}

/**
 * Genera un PDF con la invitación del evento
 */
export function generateEventInvitationPDF(data: EventPDFData): Readable {
  const doc = new PDFDocument({
    size: "letter",
    margin: 40,
  });

  // Formatear fechas
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

  // Header
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("🎉 ¡INVITACIÓN! 🎉", { align: "center" })
    .moveDown(1);

  // Título del evento
  doc.fontSize(24).text(data.eventName, { align: "center" }).moveDown(0.5);

  // Línea separadora
  doc.strokeColor("#cccccc").moveTo(50, doc.y).lineTo(514, doc.y).stroke();

  doc.moveDown(1);

  // Contenido
  doc.fontSize(12).fillColor("#000000").font("Helvetica");

  // Fecha
  doc.text("📅 Fecha del evento:", { continued: false }).moveDown(0.2);
  doc.font("Helvetica-Bold").fontSize(13).text(eventDateStr).moveDown(0.5);

  // Grupos
  if (groupsStr) {
    doc.font("Helvetica").fontSize(12).text("👥 Grupo(s):", { continued: false });
    doc.moveDown(0.2);
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(groupsStr)
      .moveDown(0.5);
  }

  // Monto a cobrar
  doc.font("Helvetica").fontSize(12).text("💰 Costo:", { continued: false });
  doc.moveDown(0.2);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#15803d")
    .text(amountStr)
    .moveDown(0.5);

  // Descripción
  if (data.description) {
    doc.fillColor("#000000").font("Helvetica").fontSize(11);
    doc.text("📝 Descripción:", { continued: false }).moveDown(0.2);
    doc.font("Helvetica").fontSize(11).text(data.description, { align: "left" });
    doc.moveDown(0.5);
  }

  // Fecha límite de pago
  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor("#000000")
    .text("⏰ Límite de pago:", { continued: false })
    .moveDown(0.2);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#b91c1c")
    .text(dueDateStr)
    .moveDown(1);

  // Línea separadora
  doc.strokeColor("#cccccc").moveTo(50, doc.y).lineTo(514, doc.y).stroke();

  doc.moveDown(1);

  // Mensaje final
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#666666")
    .text("Por favor, confirma tu asistencia y realiza el pago antes de la fecha límite.", {
      align: "center",
    })
    .moveDown(0.3);

  doc
    .font("Helvetica")
    .fontSize(11)
    .text("Contacta a la escuela si tienes dudas.", { align: "center" })
    .moveDown(2);

  // Footer
  doc
    .fontSize(10)
    .fillColor("#999999")
    .text("Generado por Klassi", { align: "center" });

  doc.end();

  return doc;
}

/**
 * Genera un HTML preview de la invitación (para mostrar en el dashboard)
 */
export function generateEventInvitationHTML(data: EventPDFData): string {
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
