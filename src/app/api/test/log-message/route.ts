import { NextResponse } from "next/server";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const timestamp = new Date().toISOString();

  // Log a diferentes niveles
  console.log("📝 [TEST-MESSAGE] Debug log test", { timestamp, level: "debug" });
  console.log("📝 [TEST-MESSAGE] Info log test", {
    timestamp,
    level: "info",
    source: "api/test/log-message",
  });
  console.log("⚠️  [TEST-MESSAGE] Warning log test", { timestamp, level: "warn" });

  return NextResponse.json(
    {
      success: true,
      message: "Logs de prueba enviados a consola",
      timestamp,
      instructions: "Revisa la consola del servidor (npm run dev) para ver los logs",
    },
    { status: 200 }
  );
}
