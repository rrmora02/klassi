import { NextResponse } from "next/server";
import { dispatchPendingDeliveries } from "@/server/services/notification.service";

export const dynamic = "force-dynamic";

// Red de seguridad del despachador: el envío principal ocurre inline
// (tras crear las notificaciones); este cron reintenta PENDING/FAILED.

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchPendingDeliveries();

  console.log(`[cron/dispatch-notifications] processed: ${result.processed}, sent: ${result.sent}, failed: ${result.failed}`);

  return NextResponse.json({ ok: true, ...result, date: new Date().toISOString() });
}
