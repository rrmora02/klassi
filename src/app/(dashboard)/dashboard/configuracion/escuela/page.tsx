import { db } from "@/server/db";
import { getCurrentContext } from "@/server/request-context";
import { notFound, redirect } from "next/navigation";
import { TenantForm } from "./tenant-form";

export default async function EscuelaConfigPage() {
  // Identidad compartida del request (React.cache): el layout ya la pagó
  const ctx = await getCurrentContext();
  if (!ctx?.activeTenant) return null;

  // Solo ADMIN
  if (ctx.activeRole !== "ADMIN") {
    redirect("/dashboard");
  }

  // El formulario necesita TODOS los campos del tenant (logo, colores,
  // contacto…), que el contexto compartido no incluye a propósito.
  const tenant = await db.tenant.findUnique({
    where: { id: ctx.activeTenant.id },
  });

  if (!tenant) notFound();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", paddingLeft: 16, paddingRight: 16, paddingBottom: 40 }} className="lg:px-0">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
          Mi Escuela
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>
          Configura los detalles de identidad y contacto para los recibos, portal y notificaciones.
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
