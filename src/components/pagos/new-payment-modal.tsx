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
  concept: z.string().min(1, "Escribe el concepto").max(200, "Máximo 200 caracteres"),
  amount:  z.number({ invalid_type_error: "Ingresa un monto" }).positive("Debe ser mayor a 0").max(1_000_000, "Monto demasiado alto"),
  method:  z.enum(["CASH", "TRANSFER", "CARD", "OXXO", "SPEI"] as [PaymentMethod, ...PaymentMethod[]]),
  dueDate: z.string().refine(v => !v || !isNaN(Date.parse(v)), "Fecha inválida").optional(),
  markAsPaid: z.boolean().default(false),
  paidAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  students: StudentOption[];
  onClose:  () => void;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", OXXO: "OXXO", SPEI: "SPEI",
};

const inputCls = "w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const selectCls = "w-full appearance-none rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const dateCls = `${inputCls} [color-scheme:light] dark:[color-scheme:dark]`;

export function NewPaymentModal({ students, onClose }: Props) {
  const router  = useRouter();
  const create  = api.payments.create.useMutation();
  const markPaid = api.payments.markAsPaid.useMutation();

  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [studentError,    setStudentError]    = useState("");

  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: "CASH",
      dueDate: today,
      markAsPaid: false,
      paidAt: today,
    },
  });

  const markAsPaid = watch("markAsPaid");
  const paidAt = watch("paidAt");

  const onSubmit = async (data: FormValues) => {
    if (!selectedStudent) {
      setStudentError("Selecciona un alumno");
      return;
    }
    setStudentError("");

    const payment = await create.mutateAsync({
      studentId: selectedStudent.id,
      concept:   data.concept,
      amount:    Math.round(data.amount * 100),
      method:    data.method,
      dueDate:   data.dueDate ? new Date(data.dueDate) : undefined,
    });

    // Si se marca como pagado inmediatamente
    if (data.markAsPaid && paidAt) {
      await markPaid.mutateAsync({
        id: payment.id,
        method: data.method,
        paidAt: new Date(paidAt),
      });
    }

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
            <input {...register("concept")} placeholder="Ej. Mensualidad Mayo 2026" className={inputCls} />
            {errors.concept && <p style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{errors.concept.message}</p>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Monto (MXN)</label>
              <input type="number" step="0.01" min="0" {...register("amount", { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
              {errors.amount && <p style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{errors.amount.message}</p>}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Método</label>
              <select {...register("method")} className={selectCls}>
                {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Fecha límite <span style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <input type="date" {...register("dueDate")} className={dateCls} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", backgroundColor: "var(--color-background-secondary)", borderRadius: 8 }}>
            <input
              type="checkbox"
              id="markAsPaid"
              {...register("markAsPaid")}
              style={{ cursor: "pointer", width: 18, height: 18 }}
            />
            <label htmlFor="markAsPaid" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", cursor: "pointer", flex: 1 }}>
              Marcar como pagado inmediatamente
            </label>
          </div>

          {markAsPaid && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                  Fecha de pago
                </label>
                <input type="date" {...register("paidAt")} className={dateCls} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
              background: "transparent", fontSize: 13, cursor: "pointer",
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={create.isLoading || markPaid.isLoading} style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: "#00754A", color: "#fff", fontSize: 13, fontWeight: 500,
              cursor: (create.isLoading || markPaid.isLoading) ? "not-allowed" : "pointer",
              opacity: (create.isLoading || markPaid.isLoading) ? 0.6 : 1,
            }}>
              {create.isLoading ? "Creando..." : markPaid.isLoading ? "Guardando pago..." : "Crear pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
