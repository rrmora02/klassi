import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { PortalTabs } from "@/components/portal/portal-tabs";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title:       "Klassi — Portal de familias",
  description: "Avisos, pagos y comunicación con tu escuela",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Klassi" },
  icons:       { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor:   "#1D3557",
  width:        "device-width",
  initialScale: 1,
  maximumScale: 1, // evita zoom accidental en inputs en iOS
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-background-secondary)", display: "flex", flexDirection: "column" }}>
      <ServiceWorkerRegister />
      <main style={{ flex: 1, width: "100%", maxWidth: 520, margin: "0 auto", padding: "16px 16px 80px" }}>
        {children}
      </main>
      <PortalTabs />
    </div>
  );
}
