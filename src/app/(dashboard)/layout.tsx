import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { OrgGuard } from "@/components/layout/org-guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // orgId is NOT checked here. The JWT cookie (__session, httpOnly) is stale
  // immediately after setActive() — the Clerk handshake that updates it is
  // async and can lag behind. OrgGuard reads from Clerk's in-memory client
  // state which is always correct, and redirects client-side if needed.
  return (
    <OrgGuard>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </OrgGuard>
  );
}
