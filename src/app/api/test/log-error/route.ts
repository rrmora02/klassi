import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function POST() {
  console.log("🧪 [TEST-ERROR] Capturando error de prueba para Sentry...");

  const error = new Error(
    "🧪 Test Error - This error should appear in Sentry dashboard. Thrown from /api/test/log-error"
  );

  // Capturar explícitamente en Sentry
  Sentry.captureException(error, {
    tags: { test: "true", endpoint: "api/test/log-error" },
    level: "error",
  });

  console.log("✅ [TEST-ERROR] Error capturado y enviado a Sentry");

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


