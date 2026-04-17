"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/trpc";
import { useRouter } from "next/navigation";

const tenantSchema = z.object({
  name:         z.string().min(2, "Mínimo 2 caracteres"),
  primaryColor: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Código Hex (Ej. #1D3557)").optional().or(z.literal("")),
  logo:         z.string().url("Debe ser URL válida").optional().or(z.literal("")),
  phone:        z.string().optional().or(z.literal("")),
  email:        z.string().email("Correo inválido").optional().or(z.literal("")),
  address:      z.string().optional().or(z.literal("")),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

interface Props {
  initialData: {
    name:         string;
    primaryColor: string | null;
    logo:         string | null;
    phone:        string | null;
    email:        string | null;
    address:      string | null;
  };
}

export function TenantForm({ initialData }: Props) {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name:         initialData.name,
      primaryColor: initialData.primaryColor ?? "#4f46e5",
      logo:         initialData.logo ?? "",
      phone:        initialData.phone ?? "",
      email:        initialData.email ?? "",
      address:      initialData.address ?? "",
    },
  });

  const update = api.tenants.updateMyTenant.useMutation();

  const onSubmit = async (data: TenantFormValues) => {
    setIsSuccess(false);
    try {
      await update.mutateAsync(data);
      setIsSuccess(true);
      router.refresh();
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Error al actualizar la configuración.");
    }
  };

  const inputStyle = (name: string, hasError?: boolean) => ({
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${hasError ? "var(--input-error-border)" : focused === name ? "var(--input-focus-border)" : "var(--input-border)"}`,
    outline: "none",
    fontSize: 13,
    background: "var(--input-bg)",
    color: "var(--input-text)",
    width: "100%",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
    boxShadow: focused === name && !hasError ? "0 0 0 3px var(--input-focus-ring)" : hasError ? "0 0 0 3px var(--input-error-ring)" : "none",
  });

  const fb = (name: string) => ({
    onFocus: () => setFocused(name),
    onBlur:  () => setFocused(null),
  });

  const sectionCard = {
    background: "#fff",
    border: "1px solid var(--color-border-tertiary)",
    borderRadius: 12,
    padding: "22px 24px",
    marginBottom: 20,
    boxShadow: "var(--shadow-xs)",
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>

      {/* Identidad Corporativa */}
      <div style={sectionCard}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 18px", letterSpacing: "-0.01em" }}>
          Identidad Corporativa
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)", marginBottom: 6 }}>
            Nombre de la Institución
          </label>
          <input {...register("name")} {...fb("name")} style={inputStyle("name", !!errors.name)} placeholder="Ej. Klassi Dance Academy" />
          {errors.name && <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4, margin: "4px 0 0" }}>{errors.name.message}</p>}
        </div>

        <div className="r-grid-2" style={{ gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)", marginBottom: 6 }}>
              Color Principal
            </label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                {...register("primaryColor")}
                type="color"
                style={{ width: 40, height: 40, padding: 2, border: "1px solid var(--input-border)", borderRadius: 8, cursor: "pointer", background: "#fff", flexShrink: 0 }}
              />
              <input {...register("primaryColor")} {...fb("primaryColor")} style={inputStyle("primaryColor", !!errors.primaryColor)} placeholder="#4f46e5" />
            </div>
            {errors.primaryColor && <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4, margin: "4px 0 0" }}>{errors.primaryColor.message}</p>}
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)", marginBottom: 6 }}>
              Logotipo (URL)
            </label>
            <input {...register("logo")} {...fb("logo")} style={inputStyle("logo", !!errors.logo)} placeholder="https://..." />
            {errors.logo && <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4, margin: "4px 0 0" }}>{errors.logo.message}</p>}
          </div>
        </div>
      </div>

      {/* Datos de Contacto */}
      <div style={sectionCard}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 18px", letterSpacing: "-0.01em" }}>
          Datos de Contacto
        </h2>
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "-12px 0 16px" }}>
          Usados en recibos, correos y notificaciones de WhatsApp.
        </p>

        <div className="r-grid-2" style={{ gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)", marginBottom: 6 }}>
              Teléfono / WhatsApp
            </label>
            <input {...register("phone")} {...fb("phone")} style={inputStyle("phone", !!errors.phone)} placeholder="(123) 456-7890" />
            {errors.phone && <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4, margin: "4px 0 0" }}>{errors.phone.message}</p>}
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)", marginBottom: 6 }}>
              Correo Electrónico
            </label>
            <input {...register("email")} {...fb("email")} type="email" style={inputStyle("email", !!errors.email)} placeholder="contacto@miescuela.com" />
            {errors.email && <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4, margin: "4px 0 0" }}>{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)", marginBottom: 6 }}>
            Dirección Física
          </label>
          <input {...register("address")} {...fb("address")} style={inputStyle("address", !!errors.address)} placeholder="Av. Principal #123, Ciudad" />
          {errors.address && <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4, margin: "4px 0 0" }}>{errors.address.message}</p>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={isSubmitting || update.isLoading}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none", cursor: (isSubmitting || update.isLoading) ? "not-allowed" : "pointer",
            background: (isSubmitting || update.isLoading) ? "var(--color-border-secondary)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: (isSubmitting || update.isLoading) ? "var(--color-text-tertiary)" : "#fff",
            fontWeight: 600, fontSize: 13, boxShadow: (isSubmitting || update.isLoading) ? "none" : "0 2px 8px rgba(99,102,241,0.35)",
            transition: "all 0.15s",
          }}
        >
          {isSubmitting || update.isLoading ? "Guardando…" : "Guardar Cambios"}
        </button>

        {isSuccess && (
          <span style={{ color: "#065f46", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "8px 14px" }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Configuración actualizada
          </span>
        )}
      </div>

    </form>
  );
}
