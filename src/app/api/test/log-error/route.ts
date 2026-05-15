import { NextResponse } from "next/server";

export async function POST() {
  console.log("🧪 [TEST-ERROR] Error de prueba registrado");

  return NextResponse.json(
    {
      success: true,
      message: "Error de prueba registrado en logs",
      timestamp: new Date().toISOString(),
      note: "Revisa la consola del servidor para ver el log",
    },
    { status: 200 }
  );
}

