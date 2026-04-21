"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { instructorFormSchema, type InstructorFormValues, instructorFormDefaults } from "@/lib/schemas/instructor.schema";
import { useRouter } from "next/navigation";

interface InstructorFormProps {
  initialData?: InstructorFormValues;
  onSubmit: (data: InstructorFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function InstructorForm({
  initialData = instructorFormDefaults,
  onSubmit,
  onCancel,
  submitLabel,
}: InstructorFormProps) {
  const router = useRouter();
  const form = useForm<InstructorFormValues>({
    resolver: zodResolver(instructorFormSchema),
    defaultValues: initialData,
  });

  const { formState: { errors, isSubmitting } } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        
        {/* Name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Nombre completo <span style={{ color: "#ef4444" }}>*</span></label>
          <input
            {...form.register("name")}
            placeholder="Ej. Juan Pérez"
            style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
              fontSize: 14, outline: "none",
            }}
          />
          {errors.name && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.name.message}</span>}
        </div>

        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Correo electrónico <span style={{ color: "#ef4444" }}>*</span></label>
          <input
            {...form.register("email")}
            type="email"
            placeholder="Ej. juan@escuela.com"
            style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
              fontSize: 14, outline: "none",
            }}
          />
          {errors.email && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.email.message}</span>}
        </div>

        {/* Phone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Teléfono</label>
          <input
            {...form.register("phone")}
            placeholder="Opcional"
            style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
              fontSize: 14, outline: "none",
            }}
          />
          {errors.phone && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.phone.message}</span>}
        </div>

        {/* Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Estado</label>
          <select
            {...form.register("isActive", { setValueAs: v => String(v) === "true" })}
            style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
              fontSize: 14, outline: "none", background: "#fff",
            }}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Bio */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Biografía corta</label>
        <textarea
          {...form.register("bio")}
          placeholder="Experiencia, certificaciones..."
          rows={3}
          style={{
            padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
            fontSize: 14, outline: "none", resize: "vertical",
          }}
        />
        {errors.bio && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.bio.message}</span>}
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500,
            background: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-secondary)",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500,
            background: "#00754A", color: "#fff", border: "none",
            cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
