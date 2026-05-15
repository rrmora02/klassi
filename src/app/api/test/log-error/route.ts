import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/loggingService";

const logger = createLogger("test-error");

export async function POST(req: NextRequest) {
  try {
    // Log a Pino
    logger.info("Test error request received");

    // Simular un error y loguear
    const error = new Error("Test error message - This is a controlled test error");

    logger.error("Test error triggered", error, {
      timestamp: new Date().toISOString(),
      testType: "manual-error-trigger",
      endpoint: "/api/test/log-error",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Error de prueba registrado en logs y Sentry",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to log test error", error as Error);
    return NextResponse.json(
      { success: false, error: "Error al procesar la prueba" },
      { status: 500 }
    );
  }
}

