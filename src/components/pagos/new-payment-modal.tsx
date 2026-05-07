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
  discountAmount: z.coerce.number().min(0).default(0),
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
  const checkMonthly = api.payments.checkMonthlyPaymentExists.useMutation();

  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [studentError,    setStudentError]    = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountInputValue, setDiscountInputValue] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [existingMonthlyPayment, setExistingMonthlyPayment] = useState<any>(null);
  const [pendingPaymentData, setPendingPaymentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const today = new Date().toISOString().split('T')[0];

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    setDiscountInputValue(inputVal);

    if (inputVal === "" || inputVal === ".") {
      setDiscountAmount(0);
      return;
    }

    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed) && parsed >= 0) {
      const amountInPesos = amount || 0;
      const amountInCents = Math.round(amountInPesos * 100);
      const discountInCents = Math.round(parsed * 100);
      const maxDiscount = Math.min(amountInCents, discountInCents);
      setDiscountAmount(maxDiscount);
    }
  };

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: "CASH",
      dueDate: today,
      markAsPaid: false,
      paidAt: today,
      discountAmount: 0,
    },
  });

  const markAsPaid = watch("markAsPaid");
  const paidAt = watch("paidAt");
  const amount = watch("amount");

  // Calcular descuento basado en el input actual para sincronización inmediata
  const amountInCents = Math.round((amount || 0) * 100);
  const calculatedDiscountAmount = (() => {
    if (discountInputValue === "" || discountInputValue === ".") {
      return 0;
    }
    const parsed = parseFloat(discountInputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      const discountInCents = Math.round(parsed * 100);
      return Math.min(amountInCents, discountInCents);
    }
    return 0;
  })();

  const discountExceedsAmount = amountInCents > 0 && calculatedDiscountAmount > amountInCents;

  const createPayment = async (data: FormValues) => {
    try {
      setErrorMessage("");
      const paymentDate = data.dueDate ? new Date(data.dueDate) : new Date();

      const payment = await create.mutateAsync({
        studentId: selectedStudent!.id,
        concept:   data.concept,
        amount:    Math.round(data.amount * 100),
        method:    data.method,
        dueDate:   paymentDate,
      });

      if (data.markAsPaid && paidAt) {
        await markPaid.mutateAsync({
          id: payment.id,
          method: data.method,
          paidAt: new Date(paidAt),
          discountAmount: calculatedDiscountAmount,
        });
      }

      router.refresh();
      onClose();
    } catch (error: any) {
      const message = error?.message || "Error al crear el pago";
      setErrorMessage(message);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!selectedStudent) {
      setStudentError("Selecciona un alumno");
      return;
    }
    setStudentError("");

    try {
      const paymentDate = data.dueDate ? new Date(data.dueDate) : new Date();
      const month = paymentDate.getMonth() + 1;
      const year = paymentDate.getFullYear();

      const result = await checkMonthly.mutateAsync({
        studentId: selectedStudent.id,
        month,
        year,
      });

      if (result.exists && result.payment) {
        setShowConfirmation(true);
        setPendingPaymentData(data);
        return;
      }
    } catch (error) {
      console.error("Error checking payment:", error);
    }

    await createPayment(data);
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
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
                    Fecha de pago
                  </label>
                  <input type="date" {...register("paidAt")} className={dateCls} />
                </div>
              </div>

              {!amount || amount <= 0 ? (
                <div style={{ background: "rgba(251, 146, 60, 0.1)", borderRadius: 8, padding: 12, border: "1px solid rgba(251, 146, 60, 0.3)" }}>
                  <p style={{ fontSize: 13, color: "#ea580c", margin: 0 }}>
                    Ingresa un monto válido para aplicar descuento
                  </p>
                </div>
              ) : (
                <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-secondary)" }}>
                    <span>Monto:</span>
                    <strong>${(amount || 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>
                        Descuento (MXN)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={discountInputValue}
                        onChange={handleDiscountChange}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val === "" || val === ".") {
                            setDiscountInputValue("");
                          } else {
                            const num = parseFloat(val);
                            if (!isNaN(num) && num >= 0 && num <= ((amount || 0))) {
                              setDiscountInputValue(num.toFixed(2));
                            }
                          }
                        }}
                        className={inputCls}
                        placeholder="0.00"
                        maxLength={10}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ textAlign: "right", marginBottom: 10, minWidth: 40 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: amountInCents > 0 ? "var(--color-text-secondary)" : "var(--color-text-tertiary)" }}>
                        {(amountInCents > 0 ? ((calculatedDiscountAmount / amountInCents) * 100).toFixed(1) : "0")}%
                      </span>
                    </div>
                  </div>
                  {discountExceedsAmount && (
                    <p style={{ fontSize: 12, color: "#b91c1c", margin: 0 }}>
                      El descuento no puede ser mayor al monto
                    </p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500, paddingTop: 8, borderTop: "1px solid var(--color-border-secondary)" }}>
                    <span>Total a pagar:</span>
                    <strong>${((amountInCents - calculatedDiscountAmount) / 100).toFixed(2)}</strong>
                  </div>
                </div>
              )}
            </>
          )}

          {errorMessage && (
            <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#b91c1c", margin: 0 }}>
                {errorMessage}
              </p>
              <p style={{ fontSize: 12, color: "#b91c1c", margin: "8px 0 0", fontStyle: "italic" }}>
                Cambia la fecha de límite para otro mes o cancela
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" onClick={() => {
              setErrorMessage("");
              onClose();
            }} style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
              background: "transparent", fontSize: 13, cursor: "pointer",
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={create.isLoading || markPaid.isLoading || !!errorMessage} style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: errorMessage ? "#ccc" : "#00754A", color: "#fff", fontSize: 13, fontWeight: 500,
              cursor: (create.isLoading || markPaid.isLoading || errorMessage) ? "not-allowed" : "pointer",
              opacity: (create.isLoading || markPaid.isLoading || errorMessage) ? 0.6 : 1,
            }}>
              {create.isLoading ? "Creando..." : markPaid.isLoading ? "Guardando pago..." : "Crear pago"}
            </button>
          </div>
        </form>
      </div>

      {showConfirmation && existingMonthlyPayment && pendingPaymentData && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000,
        }}>
          <div style={{ background: "var(--color-background-primary)", width: 420, borderRadius: 12, padding: 28, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 8px" }}>
              ⚠️ Pago ya existe en este mes
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
              Este estudiante ya tiene un pago registrado para el mismo mes. ¿Deseas continuar creando otro pago?
            </p>

            <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>
                <strong>Pago existente:</strong>
              </p>
              <p style={{ fontSize: 13, color: "var(--color-text-primary)", margin: "0 0 4px" }}>
                {existingMonthlyPayment.concept}
              </p>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                Monto: ${(existingMonthlyPayment.amount / 100).toFixed(2)} · Estado: <strong>{existingMonthlyPayment.status}</strong>
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmation(false);
                  setPendingPaymentData(null);
                }}
                disabled={checkMonthly.isLoading || create.isLoading}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
                  background: "transparent", fontSize: 13, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmation(false);
                  await createPayment(pendingPaymentData);
                  setPendingPaymentData(null);
                }}
                disabled={checkMonthly.isLoading || create.isLoading}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "none",
                  background: "#00754A", color: "#fff", fontSize: 13, fontWeight: 500,
                  cursor: (checkMonthly.isLoading || create.isLoading) ? "not-allowed" : "pointer",
                  opacity: (checkMonthly.isLoading || create.isLoading) ? 0.6 : 1,
                }}
              >
                {checkMonthly.isLoading ? "Verificando..." : create.isLoading ? "Creando..." : "Continuar de todas formas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
