import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { TenantForm } from "./tenant-form";

export default async function EscuelaConfigPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const tenantId = user?.activeTenantId;
  if (!tenantId) return null;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) notFound();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
          Mi Escuela
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>
          Configura los detalles de identidad y contacto para recibos, portal y notificaciones.
        </p>
      </div>

      {/* Formulario */}
      <TenantForm 
        initialData={{
          name: tenant.name,
          primaryColor: tenant.primaryColor,
          logo: tenant.logo,
          phone: tenant.phone,
          email: tenant.email,
          address: tenant.address
        }} 
      />
    </div>
  );
}
