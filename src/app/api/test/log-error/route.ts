import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🧪 [TEST-ERROR] Endpoint ejecutado, intentando capturar error...");

  try {
    // Simulamos un error
    throw new Error(
      "🧪 Test Error - This error should appear in Sentry dashboard. Thrown from /api/test/log-error"
    );
  } catch (error) {
    // Log en consola
    console.error("❌ [TEST-ERROR] Error capturado:", error);

    // Retornar error al cliente
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


