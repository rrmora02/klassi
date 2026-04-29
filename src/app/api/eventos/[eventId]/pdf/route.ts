import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { generateEventInvitationPDFBuffer } from "@/server/services/event-pdf-lib.service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: { eventId: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.error("No userId found in auth");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { activeTenant: true },
    });

    const tenant = user?.activeTenant;
    if (!tenant) {
      console.error("No tenant found for user:", userId);
      return new NextResponse("No tenant found", { status: 404 });
    }

    // Obtener evento
    const event = await db.event.findFirst({
      where: { id: params.eventId, tenantId: tenant.id },
      include: { groups: { select: { id: true, name: true } } },
    });

    if (!event) {
      console.error("Event not found:", params.eventId);
      return new NextResponse("Event not found", { status: 404 });
    }

    // Generar PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateEventInvitationPDFBuffer({
        eventName: event.name,
        description: event.description || undefined,
        date: event.date,
        groupNames: event.isSchoolWide
          ? ["Toda la escuela"]
          : event.groups.map((g) => g.name),
        amount: event.amount,
        dueDate: new Date(), // TODO: guardar dueDate en modelo Event
      });
    } catch (pdfError) {
      console.error("PDF generation error:", pdfError);
      return new NextResponse(
        `PDF Error: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`,
        { status: 500 }
      );
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error("Generated PDF buffer is empty");
      return new NextResponse("Generated PDF is empty", { status: 500 });
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${event.name}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in PDF route:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new NextResponse(`Server Error: ${errorMessage}`, { status: 500 });
  }
}
