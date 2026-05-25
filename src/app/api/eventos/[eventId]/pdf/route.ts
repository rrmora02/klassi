import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { generateEventInvitationPDFBuffer } from "@/server/services/event-pdf-lib.service";
import { NextRequest, NextResponse } from "next/server";

// CUID v1 pattern — validates the eventId before touching the DB
const CUID_RE = /^c[a-z0-9]{24}$/i;

interface RouteParams {
  params: { eventId: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Validate route param before using it in a DB query
    if (!CUID_RE.test(params.eventId)) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, activeTenantId: true },
    });

    const tenantId = user?.activeTenantId;
    if (!tenantId) {
      return new NextResponse("No tenant found", { status: 404 });
    }

    // Only ADMIN users can generate PDFs
    const membership = await db.tenantUser.findFirst({
      where: { userId: user!.id, tenantId },
      select: { role: true },
    });
    if (!membership || membership.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const event = await db.event.findFirst({
      where: { id: params.eventId, tenantId },
      include: { groups: { select: { id: true, name: true } } },
    });

    if (!event) {
      return new NextResponse("Event not found", { status: 404 });
    }

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
        dueDate: new Date(),
      });
    } catch (pdfError) {
      console.error("[pdf] generation error:", pdfError);
      return new NextResponse("Error generating PDF", { status: 500 });
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error("[pdf] buffer vacío para evento:", params.eventId);
      return new NextResponse("Error generating PDF", { status: 500 });
    }

    const safeName = event.name.replace(/[^a-z0-9\-_. ]/gi, "_");
    return new NextResponse(new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[pdf] unexpected error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
