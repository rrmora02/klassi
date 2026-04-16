"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentFormSchema, studentFormDefaults, type StudentFormValues } from "@/lib/schemas/student.schema";
import { cn } from "@/lib/utils";
import { useState } from "react";

// ─── Primitivos del formulario ────────────────────────────────────

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          letterSpacing: "0.01em",
        }}
      >
        {label}
        {required && <span style={{ color: "#f87171", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 11.5, color: "var(--color-error)", marginTop: 1 }}>{error}</p>
      )}
    </div>
  );
}

import React from "react";

const inputBaseStyle = (error?: boolean): React.CSSProperties => ({
  width: "100%",
  border: `1px solid ${error ? "var(--input-error-border)" : "var(--input-border)"}`,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 14,
  background: "var(--input-bg)",
  color: "var(--input-text)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
});

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ error, ...props }, ref) => {
    return (
      <input
        {...props}
        ref={ref}
        style={{ ...inputBaseStyle(error), ...(props.style ?? {}) }}
        onFocus={e => {
          e.target.style.borderColor = error ? "var(--input-error-border)" : "var(--input-focus-border)";
          e.target.style.boxShadow = error ? "0 0 0 3px var(--input-error-ring)" : "0 0 0 3px var(--input-focus-ring)";
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? "var(--input-error-border)" : "var(--input-border)";
          e.target.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
      />
    );
  }
);
Input.displayName = "Input";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  ({ error, children, ...props }, ref) => {
    return (
      <select
        {...props}
        ref={ref}
        style={{
          ...inputBaseStyle(error),
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          paddingRight: 36,
        }}
        onFocus={e => {
          e.target.style.borderColor = "var(--input-focus-border)";
          e.target.style.boxShadow = "0 0 0 3px var(--input-focus-ring)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? "var(--input-error-border)" : "var(--input-border)";
          e.target.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--color-text-tertiary)",
        paddingBottom: 12,
        borderBottom: "1px solid var(--color-border-tertiary)",
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

// ─── Props del formulario ─────────────────────────────────────────

interface StudentFormProps {
  defaultValues?: Partial<StudentFormValues>;
  onSubmit:       (data: StudentFormValues) => Promise<void>;
  onCancel:       () => void;
  submitLabel?:   string;
  isEdit?:        boolean;
}

// ─── Componente principal ─────────────────────────────────────────

export function StudentForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Guardar alumno",
  isEdit = false,
}: StudentFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<StudentFormValues>({
    resolver:      zodResolver(studentFormSchema),
    defaultValues: { ...studentFormDefaults, ...defaultValues },
    mode:          "onBlur", // validar al salir de cada campo
  });

  const tutorName = watch("tutorName");

  async function handleFormSubmit(data: StudentFormValues) {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setServerError(msg);
      setIsSubmitting(false);
    }
  }

  const disabled = isSubmitting || (isEdit && !isDirty);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>

      {/* Error global del servidor */}
      {serverError && (
        <div
          style={{
            background: "var(--color-error-bg)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 24,
            fontSize: 13,
            color: "var(--color-error-text)",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 15, flexShrink: 0 }}>⚠</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Datos personales ─────────────────────────── */}
      <SectionTitle>Datos personales</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Field label="Nombre" required error={errors.firstName?.message}>
          <Input
            {...register("firstName")}
            placeholder="Ej: María"
            error={!!errors.firstName}
            autoFocus={!isEdit}
          />
        </Field>
        <Field label="Apellido" required error={errors.lastName?.message}>
          <Input
            {...register("lastName")}
            placeholder="Ej: López García"
            error={!!errors.lastName}
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Field label="Fecha de nacimiento" error={errors.birthDate?.message}>
          <Input
            {...register("birthDate")}
            type="date"
            error={!!errors.birthDate}
            max={new Date().toISOString().split("T")[0]}
          />
        </Field>
        <Field label="Sexo" error={errors.gender?.message}>
          <Select {...register("gender")} error={!!errors.gender}>
            <option value="">Sin especificar</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <Field label="Teléfono" error={errors.phone?.message}>
          <Input
            {...register("phone")}
            type="tel"
            placeholder="Ej: 81 1234 5678"
            error={!!errors.phone}
          />
        </Field>
      </div>

      <div style={{ marginBottom: 28 }}>
        <Field label="Correo electrónico" error={errors.email?.message}>
          <Input
            {...register("email")}
            type="email"
            placeholder="alumno@correo.com"
            error={!!errors.email}
          />
        </Field>
      </div>

      {/* ── Tutor / Responsable ──────────────────────── */}
      <SectionTitle>Tutor / Responsable</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Field label="Nombre del tutor" error={errors.tutorName?.message}>
          <Input
            {...register("tutorName")}
            placeholder="Ej: Roberto López"
            error={!!errors.tutorName}
          />
        </Field>
        <Field label="Relación" error={errors.tutorRelationship?.message}>
          <Select {...register("tutorRelationship")} error={!!errors.tutorRelationship}>
            <option value="">Sin especificar</option>
            <option value="madre">Madre</option>
            <option value="padre">Padre</option>
            <option value="tutor">Tutor legal</option>
            <option value="abuelo">Abuelo/a</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <Field label="Teléfono del tutor" error={errors.tutorPhone?.message}>
          <Input
            {...register("tutorPhone")}
            type="tel"
            placeholder="Ej: 81 9876 5432"
            error={!!errors.tutorPhone}
          />
        </Field>
        <Field label="Correo del tutor" error={errors.tutorEmail?.message}>
          <Input
            {...register("tutorEmail")}
            type="email"
            placeholder="tutor@correo.com"
            error={!!errors.tutorEmail}
          />
        </Field>
      </div>

      {/* ── Notas internas ───────────────────────────── */}
      <SectionTitle>Notas internas</SectionTitle>
      <div style={{ marginBottom: 32 }}>
        <Field label="Observaciones" error={errors.notes?.message}>
          <textarea
            {...register("notes")}
            placeholder="Alergias, condiciones médicas relevantes, observaciones del instructor..."
            rows={3}
            style={{
              ...inputBaseStyle(!!errors.notes),
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
            Solo visible para el personal de la escuela
          </p>
        </Field>
      </div>

      {/* ── Acciones ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          paddingTop: 20,
          borderTop: "1px solid var(--color-border-tertiary)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 8,
            padding: "9px 20px",
            fontSize: 13,
            fontWeight: 500,
            background: "transparent",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={disabled}
          style={{
            background: disabled
              ? "var(--color-border-secondary)"
              : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: disabled ? "var(--color-text-tertiary)" : "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 24px",
            fontSize: 13,
            fontWeight: 500,
            cursor: isSubmitting ? "wait" : disabled ? "not-allowed" : "pointer",
            boxShadow: disabled ? "none" : "0 2px 8px rgba(99,102,241,0.35)",
            transition: "all 0.15s",
          }}
        >
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
