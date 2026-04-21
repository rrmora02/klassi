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
  phone:        z.string().regex(/^[\d\s\+\-\(\)]{7,20}$/, "Solo dígitos, espacios y caracteres +/- ( ) (7-20 caracteres)").optional().or(z.literal("")),
  email:        z.string().email("Correo inválido").optional().or(z.literal("")),
  address:      z.string().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
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

const sanitizePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = e.target.value.replace(/[^\d\s+\-()]/g, "");
};

const inputCls = "w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const labelStyle = { display: "block" as const, fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 6 };
const errorStyle = { fontSize: 12, color: "#e53e3e", marginTop: 4, margin: 0 };

export function TenantForm({ initialData }: Props) {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name:         initialData.name,
      primaryColor: initialData.primaryColor ?? "#1D3557",
      logo:         initialData.logo ?? "",
      phone:        initialData.phone ?? "",
      email:        initialData.email ?? "",
      address:      initialData.address ?? "",
    }
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ maxWidth: 640 }}>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 20px", color: "var(--color-text-primary)" }}>Identidad Corporativa</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nombre de la Institución</label>
          <input {...register("name")} className={inputCls} placeholder="Ej. Klassi Dance Academy" />
          {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Color Principal (Hex)</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input {...register("primaryColor")} type="color" style={{ width: 42, height: 42, padding: 0, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent" }} />
              <input {...register("primaryColor")} className={inputCls} style={{ flex: 1 }} placeholder="#1D3557" />
            </div>
            {errors.primaryColor && <p style={errorStyle}>{errors.primaryColor.message}</p>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Link del Logotipo (URL)</label>
            <input {...register("logo")} className={inputCls} placeholder="https://..." />
            {errors.logo && <p style={errorStyle}>{errors.logo.message}</p>}
          </div>
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 20px", color: "var(--color-text-primary)" }}>Datos de Contacto (Para WhatsApp/Correos)</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Teléfono / WhatsApp</label>
            <input {...register("phone", { onChange: sanitizePhone })} type="tel" inputMode="tel" className={inputCls} placeholder="Ej. 81 1234 5678" />
            {errors.phone && <p style={errorStyle}>{errors.phone.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>Correo Electrónico</label>
            <input {...register("email")} className={inputCls} placeholder="contacto@miescuela.com" />
            {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Dirección Física</label>
          <input {...register("address")} className={inputCls} placeholder="Av. Principal #123, Ciudad" />
          {errors.address && <p style={errorStyle}>{errors.address.message}</p>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="submit"
          disabled={isSubmitting || update.isLoading}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none", background: "#00754A", color: "#fff",
            fontWeight: 500, cursor: (isSubmitting || update.isLoading) ? "not-allowed" : "pointer",
            opacity: (isSubmitting || update.isLoading) ? 0.7 : 1
          }}
        >
          {isSubmitting || update.isLoading ? "Guardando..." : "Guardar Cambios"}
        </button>

        {isSuccess && (
          <span style={{ color: "#15803d", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            Configuración actualizada
          </span>
        )}
      </div>

    </form>
  );
}
