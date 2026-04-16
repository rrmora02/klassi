"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/trpc";
import { useRouter } from "next/navigation";

// Tuvimos que importar/crear un schema simple aquí
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

  const fieldStyle = {
    display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 16
  };
  const labelStyle = { fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 };
  const inputStyle = {
    padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", 
    outline: "none", fontSize: 14, background: "var(--color-background-primary)", color: "var(--color-text-primary)"
  };
  const errorStyle = { fontSize: 12, color: "#e53e3e", marginTop: 2, margin: 0 };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ maxWidth: 640 }}>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 20px" }}>Identidad Corporativa</h2>
        
        <div style={fieldStyle}>
          <label style={labelStyle}>Nombre de la Institución</label>
          <input {...register("name")} style={inputStyle} placeholder="Ej. Klassi Dance Academy" />
          {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Color Principal (Hex)</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input {...register("primaryColor")} type="color" style={{ width: 42, height: 42, padding: 0, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent" }} />
              <input {...register("primaryColor")} style={{ ...inputStyle, flex: 1 }} placeholder="#1D3557" />
            </div>
            {errors.primaryColor && <p style={errorStyle}>{errors.primaryColor.message}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Link del Logotipo (URL)</label>
            <input {...register("logo")} style={inputStyle} placeholder="https://..." />
            {errors.logo && <p style={errorStyle}>{errors.logo.message}</p>}
          </div>
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 20px" }}>Datos de Contacto (Para WhatsApp/Correos)</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Teléfono / WhatsApp</label>
            <input {...register("phone")} style={inputStyle} placeholder="(123) 456-7890" />
            {errors.phone && <p style={errorStyle}>{errors.phone.message}</p>}
          </div>
          
          <div style={fieldStyle}>
            <label style={labelStyle}>Correo Electrónico</label>
            <input {...register("email")} style={inputStyle} placeholder="contacto@miescuela.com" />
            {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Dirección Física</label>
          <input {...register("address")} style={inputStyle} placeholder="Av. Principal #123, Ciudad" />
          {errors.address && <p style={errorStyle}>{errors.address.message}</p>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button 
          type="submit" 
          disabled={isSubmitting || update.isLoading}
          style={{ 
            padding: "10px 24px", borderRadius: 8, border: "none", background: "#1e3a5f", color: "#fff", 
            fontWeight: 500, cursor: (isSubmitting || update.isLoading) ? "not-allowed" : "pointer", opacity: (isSubmitting || update.isLoading) ? 0.7 : 1 
          }}
        >
          {isSubmitting || update.isLoading ? "Guardando..." : "Guardar Cambios"}
        </button>
        
        {isSuccess && (
          <span style={{ color: "#15803d", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
             <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
             Configuración actualizada
          </span>
        )}
      </div>

    </form>
  );
}
