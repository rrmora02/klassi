import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { generateEventInvitationPDF } from "@/server/services/event-pdf.service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: { eventId: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { activeTenant: true },
    });

    const tenant = user?.activeTenant;
    if (!tenant) {
      return new NextResponse("No tenant found", { status: 404 });
    }

    // Obtener evento
    const event = await db.event.findFirst({
      where: { id: params.eventId, tenantId: tenant.id },
      include: { groups: { select: { id: true, name: true } } },
    });

    if (!event) {
      return new NextResponse("Event not found", { status: 404 });
    }

    // Generar PDF
    const pdfStream = generateEventInvitationPDF({
      eventName: event.name,
      description: event.description || undefined,
      date: event.date,
      groupNames: event.isSchoolWide
        ? ["Toda la escuela"]
        : event.groups.map((g) => g.name),
      amount: event.amount,
      dueDate: new Date(), // TODO: guardar dueDate en modelo Event
    });

    // Convertir stream a buffer
    const chunks: Buffer[] = [];

    return new Promise((resolve) => {
      pdfStream.on("data", (chunk) => {
        chunks.push(chunk);
      });

      pdfStream.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${event.name}.pdf"`,
            },
          })
        );
      });

      pdfStream.on("error", (error) => {
        resolve(
          new NextResponse("Error generating PDF", {
            status: 500,
          })
        );
      });
    });
  } catch (error) {
    console.error("Error generating event PDF:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
