import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { exportMetricsAsJSON, getMetricsHTML } from "@/server/metrics/metricsExport";

export async function GET(request: NextRequest) {
  // Only allow access if metrics are enabled
  if (process.env.ENABLE_METRICS !== "true") {
    return NextResponse.json({ error: "Metrics not enabled" }, { status: 403 });
  }

  // Only allow super admin access
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawFormat = request.nextUrl.searchParams.get("format");
  const format = rawFormat === "html" ? "html" : "json";

  if (format === "html") {
    return new NextResponse(getMetricsHTML(), {
      headers: { "content-type": "text/html" },
    });
  }

  return NextResponse.json(exportMetricsAsJSON());
}
