import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function POST() {
  console.log("🧪 [TEST-ERROR] Registrando error de prueba en Sentry...");

  const testError = new Error("🧪 Test Error - This error should appear in Sentry dashboard");

  // Capturar explícitamente en Sentry
  Sentry.captureException(testError, {
    tags: {
      test: "true",
      endpoint: "api/test/log-error",
    },
    contexts: {
      test: {
        timestamp: new Date().toISOString(),
        message: "Manual test error from /api/test/log-error endpoint",
      },
    },
  });

  console.log("✅ [TEST-ERROR] Error capturado y enviado a Sentry");

  return NextResponse.json(
    {
      success: true,
      message: "Error de prueba capturado y enviado a Sentry",
      timestamp: new Date().toISOString(),
      instructions: "Revisa tu dashboard en https://sentry.io - busca el tag test:true",
    },
    { status: 200 }
  );
}

