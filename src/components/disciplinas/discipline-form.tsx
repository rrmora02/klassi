"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { disciplineFormSchema, type DisciplineFormValues, disciplineFormDefaults } from "@/lib/schemas/discipline.schema";
import { useRouter } from "next/navigation";
import React from "react";

interface DisciplineFormProps {
  initialData?: DisciplineFormValues;
  onSubmit: (data: DisciplineFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

const inputBaseStyle = (hasError?: boolean): React.CSSProperties => ({
  width: "100%",
  border: `1px solid ${hasError ? "var(--input-error-border)" : "var(--input-border)"}`,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 14,
  background: "var(--input-bg)",
  color: "var(--input-text)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
});

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", letterSpacing: "0.01em" }}>
        {label}
        {required && <span style={{ color: "#f87171", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 11.5, color: "var(--color-error)" }}>{error}</span>}
    </div>
  );
}

function addFocusBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, hasError: boolean, isFocus: boolean) {
  if (isFocus) {
    e.target.style.borderColor = hasError ? "var(--input-error-border)" : "var(--input-focus-border)";
    e.target.style.boxShadow = hasError ? "0 0 0 3px var(--input-error-ring)" : "0 0 0 3px var(--input-focus-ring)";
  } else {
    e.target.style.borderColor = hasError ? "var(--input-error-border)" : "var(--input-border)";
    e.target.style.boxShadow = "none";
  }
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
    <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Name */}
        <Field label="Nombre de la disciplina" required error={errors.name?.message}>
          <input
            {...form.register("name")}
            placeholder="Ej. Ballet, Natación, Yoga"
            style={inputBaseStyle(!!errors.name)}
            onFocus={e => addFocusBlur(e, !!errors.name, true)}
            onBlur={e => addFocusBlur(e, !!errors.name, false)}
          />
        </Field>

        {/* Color Hexadecimal */}
        <Field label="Color (Identificador visual)" error={errors.color?.message}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              {...form.register("color")}
              style={{
                width: 42,
                height: 42,
                padding: 2,
                border: "1px solid var(--input-border)",
                borderRadius: 8,
                cursor: "pointer",
                background: "#fff",
              }}
            />
            <input
              {...form.register("color")}
              placeholder="#1e40af"
              style={{
                ...inputBaseStyle(!!errors.color),
                textTransform: "uppercase",
              }}
              onFocus={e => addFocusBlur(e, !!errors.color, true)}
              onBlur={e => addFocusBlur(e, !!errors.color, false)}
            />
          </div>
        </Field>

        {/* Status */}
        <Field label="Estado" error={errors.isActive?.message as string | undefined}>
          <select
            {...form.register("isActive", { setValueAs: v => String(v) === "true" })}
            style={{
              ...inputBaseStyle(!!errors.isActive),
              cursor: "pointer",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              paddingRight: 36,
            }}
            onFocus={e => addFocusBlur(e, !!errors.isActive, true)}
            onBlur={e => addFocusBlur(e, !!errors.isActive, false)}
          >
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
        </Field>
      </div>

      {/* Description */}
      <Field label="Descripción" error={errors.description?.message}>
        <textarea
          {...form.register("description")}
          placeholder="Pequeña descripción descriptiva de la disciplina..."
          rows={3}
          style={{
            ...inputBaseStyle(!!errors.description),
            resize: "vertical",
            fontFamily: "inherit",
            lineHeight: 1.5,
          }}
          onFocus={e => addFocusBlur(e, !!errors.description, true)}
          onBlur={e => addFocusBlur(e, !!errors.description, false)}
        />
      </Field>

      {/* Acciones */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 8,
          paddingTop: 20,
          borderTop: "1px solid var(--color-border-tertiary)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "9px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            background: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border-secondary)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "9px 24px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            background: isSubmitting
              ? "var(--color-border-secondary)"
              : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: isSubmitting ? "var(--color-text-tertiary)" : "#fff",
            border: "none",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            boxShadow: isSubmitting ? "none" : "0 2px 8px rgba(99,102,241,0.35)",
            transition: "all 0.15s",
          }}
        >
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
