import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/topbar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { db } from "@/server/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { activeTenantId: true },
  });

  if (!user || !user.activeTenantId) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell topbar={<TopBar />}>
      {children}
    </DashboardShell>
  );
}
