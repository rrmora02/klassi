import { NextResponse } from "next/server";

export async function POST() {
  console.log("🧪 [TEST-ERROR] Capturando error de prueba para Sentry...");

  try {
    // Lanzar error para que Sentry lo capture
    throw new Error(
      "🧪 Test Error - This error should appear in Sentry dashboard. Thrown from /api/test/log-error"
    );
  } catch (error) {
    // Log en consola
    console.error("✅ [TEST-ERROR] Error capturado por Sentry:", error);

    // Retornar respuesta amigable al cliente
    return NextResponse.json(
      {
        success: true,
        message: "✅ Error de prueba capturado y enviado a Sentry",
        timestamp: new Date().toISOString(),
        instructions: "Revisa https://sentry.io en la pestaña 'Issues' para ver el error",
      },
      { status: 200 }
    );
  }
}


