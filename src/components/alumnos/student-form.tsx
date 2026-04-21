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
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{error}</p>
      )}
    </div>
  );
}

import React from "react";

const inputCls = "w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const selectCls = "w-full appearance-none rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ error, className, ...props }, ref) => (
    <input
      {...props}
      ref={ref}
      className={cn(inputCls, error && "border-red-300 dark:border-red-500", className)}
    />
  )
);
Input.displayName = "Input";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  ({ error, className, children, ...props }, ref) => (
    <select
      {...props}
      ref={ref}
      className={cn(selectCls, error && "border-red-300 dark:border-red-500", className)}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em",
      color: "var(--color-text-tertiary)", paddingBottom: 10,
      borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 16,
    }}>
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

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>

      {/* Error global del servidor */}
      {serverError && (
        <div style={{
          background: "rgba(220,38,38,0.08)", border: "0.5px solid rgba(220,38,38,0.25)", borderRadius: 8,
          padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#ef4444",
        }}>
          {serverError}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Field label="Fecha de nacimiento" error={errors.birthDate?.message}>
          <Input
            {...register("birthDate")}
            type="date"
            error={!!errors.birthDate}
            max={new Date().toISOString().split("T")[0]}
            className="[color-scheme:light] dark:[color-scheme:dark]"
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
            inputMode="tel"
            placeholder="Ej: 81 1234 5678"
            error={!!errors.phone}
          />
        </Field>
      </div>

      <div style={{ marginBottom: 24 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Field label="Teléfono del tutor" error={errors.tutorPhone?.message}>
          <Input
            {...register("tutorPhone")}
            type="tel"
            inputMode="tel"
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
      <div style={{ marginBottom: 28 }}>
        <Field label="Observaciones" error={errors.notes?.message}>
          <textarea
            {...register("notes")}
            placeholder="Alergias, condiciones médicas relevantes, observaciones del instructor..."
            rows={3}
            className={cn(
              "w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2.5 text-sm outline-none resize-y focus:border-sb-accent dark:focus:border-sb-accent transition-colors",
              errors.notes && "border-red-300 dark:border-red-500"
            )}
          />
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
            Solo visible para el personal de la escuela
          </p>
        </Field>
      </div>

      {/* ── Acciones ─────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: 8, padding: "8px 20px", fontSize: 13,
            background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (isEdit && !isDirty)}
          style={{
            background: isSubmitting || (isEdit && !isDirty) ? "#64748b" : "#006241",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 24px", fontSize: 13, fontWeight: 500, cursor: isSubmitting ? "wait" : "pointer",
          }}
        >
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
