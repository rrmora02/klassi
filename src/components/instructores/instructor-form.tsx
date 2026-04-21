"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { instructorFormSchema, type InstructorFormValues, instructorFormDefaults } from "@/lib/schemas/instructor.schema";

const sanitizePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
};

// ─── Shared input class tokens ─────────────────────────────────────
const inputCls = "w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const selectCls = "w-full appearance-none rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const textareaCls = "w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2.5 text-sm outline-none resize-y focus:border-sb-accent dark:focus:border-sb-accent transition-colors";

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
  const form = useForm<InstructorFormValues>({
    resolver: zodResolver(instructorFormSchema),
    defaultValues: initialData,
  });

  const { formState: { errors, isSubmitting } } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* Nombre */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
            Nombre completo <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            {...form.register("name")}
            placeholder="Ej. Juan Pérez"
            className={`${inputCls}${errors.name ? " border-red-300 dark:border-red-500" : ""}`}
          />
          {errors.name && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.name.message}</span>}
        </div>

        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
            Correo electrónico <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            {...form.register("email")}
            type="email"
            placeholder="Ej. juan@escuela.com"
            className={`${inputCls}${errors.email ? " border-red-300 dark:border-red-500" : ""}`}
          />
          {errors.email && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.email.message}</span>}
        </div>

        {/* Teléfono */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Teléfono</label>
          <input
            {...form.register("phone", { onChange: sanitizePhone })}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10 dígitos"
            className={inputCls}
          />
          {errors.phone && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.phone.message}</span>}
        </div>

        {/* Estado */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Estado</label>
          <select
            {...form.register("isActive", { setValueAs: v => String(v) === "true" })}
            className={selectCls}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Biografía */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Biografía corta</label>
        <textarea
          {...form.register("bio")}
          placeholder="Experiencia, certificaciones..."
          rows={3}
          className={textareaCls}
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
          }}
        >
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
