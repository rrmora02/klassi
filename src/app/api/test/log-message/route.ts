import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/loggingService";

const logger = createLogger("test-message");

export async function POST(req: NextRequest) {
  try {
    const timestamp = new Date().toISOString();

    // Log a diferentes niveles
    logger.debug("Debug log test", { timestamp, level: "debug" });
    logger.info("Info log test - Test message logged to Pino", {
      timestamp,
      level: "info",
      source: "api/test/log-message",
    });
    logger.warn("Warning log test", { timestamp, level: "warn" });

    return NextResponse.json(
      {
        success: true,
        message: "Logs de prueba enviados a Pino",
        timestamp,
        instructions: "Revisa la consola del servidor (npm run dev) para ver los logs",
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Failed to log test message", error as Error);
    return NextResponse.json(
      { success: false, error: "Error al procesar la prueba" },
      { status: 500 }
    );
  }
}
