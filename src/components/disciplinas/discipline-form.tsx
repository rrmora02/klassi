"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { disciplineFormSchema, type DisciplineFormValues, disciplineFormDefaults } from "@/lib/schemas/discipline.schema";
import { useRouter } from "next/navigation";

interface DisciplineFormProps {
  initialData?: DisciplineFormValues;
  onSubmit: (data: DisciplineFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function DisciplineForm({
  initialData = disciplineFormDefaults,
  onSubmit,
  onCancel,
  submitLabel,
}: DisciplineFormProps) {
  const router = useRouter();
  const form = useForm<DisciplineFormValues>({
    resolver: zodResolver(disciplineFormSchema),
    defaultValues: initialData,
  });

  const { formState: { errors, isSubmitting } } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        
        {/* Name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Nombre de la disciplina <span style={{ color: "#ef4444" }}>*</span></label>
          <input
            {...form.register("name")}
            placeholder="Ej. Ballet, Natación, Yoga"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent"
          />
          {errors.name && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.name.message}</span>}
        </div>

        {/* Color Hexadecimal */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Color (Identificador visual)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              {...form.register("color")}
              style={{
                width: 42, height: 42, padding: 0, border: "1px solid var(--color-border-secondary)",
                borderRadius: 8, cursor: "pointer", background: "var(--color-background-primary)"
              }}
            />
            <input
              {...form.register("color")}
              placeholder="#1e40af"
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 text-sm outline-none uppercase focus:border-sb-accent dark:focus:border-sb-accent"
            />
          </div>
          {errors.color && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.color.message}</span>}
        </div>

        {/* Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Estado</label>
          <select
            {...form.register("isActive", { setValueAs: v => String(v) === "true" })}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent"
          >
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Descripción</label>
        <textarea
          {...form.register("description")}
          placeholder="Pequeña descripción descriptiva de la disciplina..."
          rows={3}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 text-sm outline-none resize-y focus:border-sb-accent dark:focus:border-sb-accent"
        />
        {errors.description && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors.description.message}</span>}
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
