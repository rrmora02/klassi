import { PDFDocument, rgb } from "pdf-lib";

interface EventPDFData {
  eventName: string;
  description?: string;
  date: Date;
  groupNames: string[];
  amount: number;
  dueDate: Date;
}

export async function generateEventInvitationPDFBuffer(
  data: EventPDFData
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size

    const { height } = page.getSize();
    let yPosition = height - 50;

    // Title
    page.drawText("¡INVITACIÓN!", {
      x: 50,
      y: yPosition,
      size: 28,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Event name
    page.drawText(data.eventName, {
      x: 50,
      y: yPosition,
      size: 24,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Separator line
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 562, y: yPosition },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    yPosition -= 30;

    // Event date
    const eventDateStr = new Date(data.date).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    page.drawText("Fecha del evento:", {
      x: 50,
      y: yPosition,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 18;
    page.drawText(eventDateStr, {
      x: 50,
      y: yPosition,
      size: 14,
      color: rgb(0, 0, 0),
    });
    yPosition -= 25;

    // Groups
    const groupsStr = data.groupNames.join(", ");
    if (groupsStr) {
      page.drawText("Grupo(s):", {
        x: 50,
        y: yPosition,
        size: 12,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 18;
      page.drawText(groupsStr, {
        x: 50,
        y: yPosition,
        size: 14,
        color: rgb(0, 0, 0),
      });
      yPosition -= 25;
    }

    // Amount
    const amountStr = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(data.amount / 100);

    page.drawText("Costo:", {
      x: 50,
      y: yPosition,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 18;
    page.drawText(amountStr, {
      x: 50,
      y: yPosition,
      size: 14,
      color: rgb(0.2, 0.6, 0.2),
    });
    yPosition -= 25;

    // Description
    if (data.description) {
      page.drawText("Descripción:", {
        x: 50,
        y: yPosition,
        size: 12,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 18;

      // Wrap description text
      const words = data.description.split(" ");
      let line = "";
      const maxWidth = 512;

      for (const word of words) {
        const testLine = line + (line ? " " : "") + word;
        const testWidth = testLine.length * 6; // Approximate width

        if (testWidth > maxWidth) {
          page.drawText(line, {
            x: 50,
            y: yPosition,
            size: 11,
            color: rgb(0, 0, 0),
          });
          yPosition -= 16;
          line = word;
        } else {
          line = testLine;
        }
      }

      if (line) {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: 11,
          color: rgb(0, 0, 0),
        });
        yPosition -= 25;
      }
    }

    // Due date
    const dueDateStr = new Date(data.dueDate).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    page.drawText("Límite de pago:", {
      x: 50,
      y: yPosition,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 18;
    page.drawText(dueDateStr, {
      x: 50,
      y: yPosition,
      size: 14,
      color: rgb(0.7, 0.1, 0.1),
    });
    yPosition -= 40;

    // Separator line
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 562, y: yPosition },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    yPosition -= 30;

    // Final message
    page.drawText(
      "Por favor, confirma tu asistencia y realiza el pago antes de la fecha límite.",
      {
        x: 50,
        y: yPosition,
        size: 11,
        color: rgb(0.4, 0.4, 0.4),
      }
    );
    yPosition -= 18;
    page.drawText("Contacta a la escuela si tienes dudas.", {
      x: 50,
      y: yPosition,
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Footer
    page.drawText("Generado por Klassi", {
      x: 50,
      y: 30,
      size: 10,
      color: rgb(0.6, 0.6, 0.6),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Error in generateEventInvitationPDFBuffer:", error);
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
