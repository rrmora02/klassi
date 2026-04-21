"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";
import { StudentSearchPicker, type StudentOption } from "@/components/shared/student-search-picker";

const schema = z.object({
  concept: z.string().min(1, "Escribe el concepto"),
  amount:  z.number({ invalid_type_error: "Ingresa un monto" }).positive("Debe ser mayor a 0"),
  method:  z.enum(["CASH", "TRANSFER", "CARD", "OXXO", "SPEI"] as [PaymentMethod, ...PaymentMethod[]]),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  students: StudentOption[];
  onClose:  () => void;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", OXXO: "OXXO", SPEI: "SPEI",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--color-border-secondary)", fontSize: 14,
  outline: "none", boxSizing: "border-box",
};

export function NewPaymentModal({ students, onClose }: Props) {
  const router  = useRouter();
  const create  = api.payments.create.useMutation();

  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [studentError,    setStudentError]    = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { method: "CASH" },
  });

  const onSubmit = async (data: FormValues) => {
    if (!selectedStudent) {
      setStudentError("Selecciona un alumno");
      return;
    }
    setStudentError("");
    await create.mutateAsync({
      studentId: selectedStudent.id,
      concept:   data.concept,
      amount:    Math.round(data.amount * 100),
      method:    data.method,
      dueDate:   data.dueDate ? new Date(data.dueDate) : undefined,
    });
    router.refresh();
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{ background: "var(--color-background-primary)", width: 460, borderRadius: 12, padding: 28, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 20px" }}>
          Nuevo pago
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Alumno</label>
            <StudentSearchPicker
              students={students}
              value={selectedStudent}
              onChange={s => { setSelectedStudent(s); setStudentError(""); }}
              placeholder="Buscar alumno por nombre..."
              error={studentError}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Concepto</label>
            <input {...register("concept")} placeholder="Ej. Mensualidad Mayo 2026" style={inputStyle} />
            {errors.concept && <p style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{errors.concept.message}</p>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Monto (MXN)</label>
              <input type="number" step="0.01" min="0" {...register("amount", { valueAsNumber: true })} placeholder="0.00" style={inputStyle} />
              {errors.amount && <p style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{errors.amount.message}</p>}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Método</label>
              <select {...register("method")} style={inputStyle}>
                {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Fecha límite <span style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <input type="date" {...register("dueDate")} style={inputStyle} />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
              background: "transparent", fontSize: 13, cursor: "pointer",
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={create.isLoading} style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: "#00754A", color: "#fff", fontSize: 13, fontWeight: 500,
              cursor: create.isLoading ? "not-allowed" : "pointer",
            }}>
              {create.isLoading ? "Creando..." : "Crear pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
