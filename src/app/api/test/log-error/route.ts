import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createLogger } from "@/lib/loggingService";

const logger = createLogger("test-error");

export async function POST(req: NextRequest) {
  try {
    // Log a Pino
    logger.info("Test error request received");

    // Simular un error
    const error = new Error("Test error message - This is a controlled test error");

    // Capturar a Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        tags: {
          type: "test",
          endpoint: "/api/test/log-error",
        },
        contexts: {
          test: {
            timestamp: new Date().toISOString(),
            testType: "manual-error-trigger",
          },
        },
      });

      logger.info("Error sent to Sentry", { errorMessage: error.message });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Error de prueba enviado a Sentry",
        sentryConfigured: !!process.env.SENTRY_DSN,
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
