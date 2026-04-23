import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
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

  // Obtener el rol del usuario en el tenant
  const tenantUser = await db.tenantUser.findFirst({
    where: {
      userId: user.id,
      tenantId: user.activeTenantId
    },
  });

  const userRole = tenantUser?.role || "RECEPTIONIST";

  return (
    <DashboardShell sidebar={<Sidebar userRole={userRole} />} topbar={<TopBar />}>
      {children}
    </DashboardShell>
  );
}
