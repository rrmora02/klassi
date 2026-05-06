"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";

const schema = z.object({
  method:    z.enum(["CASH", "TRANSFER", "CARD", "OXXO", "SPEI"] as [PaymentMethod, ...PaymentMethod[]]),
  reference: z.string().max(100, "Máximo 100 caracteres").optional(),
  paidAt:    z.string().refine(v => !v || !isNaN(Date.parse(v)), "Fecha inválida").optional(),
  discountAmount: z.coerce.number().min(0).default(0),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  paymentId:    string;
  concept:      string;
  amount:       string;
  studentName?: string;
  onClose:      () => void;
}

const METHOD_LABELS: Record<string, string> = {
  CASH:     "Efectivo",
  TRANSFER: "Transferencia",
  CARD:     "Tarjeta",
  OXXO:     "OXXO",
  SPEI:     "SPEI",
};

const inputCls = "w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const selectCls = "w-full appearance-none rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const dateCls = `${inputCls} [color-scheme:light] dark:[color-scheme:dark]`;

export function MarkAsPaidModal({ paymentId, concept, amount, studentName, onClose }: Props) {
  const router  = useRouter();
  const markPaid = api.payments.markAsPaid.useMutation();
  const [discountAmount, setDiscountAmount] = useState(0);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { method: "CASH", reference: "", paidAt: new Date().toISOString().slice(0, 10), discountAmount: 0 },
  });

  const amountInCents = parseInt(amount) || 0;
  const discountPercentage = amountInCents > 0 ? ((discountAmount / amountInCents) * 100).toFixed(1) : "0";
  const totalToPay = amountInCents - discountAmount;

  const onSubmit = async (data: FormValues) => {
    await markPaid.mutateAsync({
      id:        paymentId,
      method:    data.method,
      reference: data.reference || undefined,
      paidAt:    data.paidAt ? new Date(data.paidAt) : new Date(),
      discountAmount: discountAmount,
    });
    router.refresh();
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{ background: "var(--color-background-primary)", width: 420, borderRadius: 12, padding: 28, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 4px" }}>
          Registrar pago recibido
        </h2>
        {studentName && (
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>
            {studentName}
          </p>
        )}
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
          {concept} — <strong>{amount}</strong>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-secondary)" }}>
              <span>Monto original:</span>
              <strong>${(amountInCents / 100).toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>
                  Descuento
                </label>
                <input
                  type="number"
                  value={discountAmount > 0 ? discountAmount : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setDiscountAmount(0);
                    } else {
                      setDiscountAmount(Math.max(0, Math.min(amountInCents, parseInt(val) || 0)));
                    }
                  }}
                  min="0"
                  max={amountInCents}
                  step="1"
                  className={inputCls}
                  placeholder="0"
                />
              </div>
              <div style={{ textAlign: "right", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  {discountPercentage}%
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500, paddingTop: 8, borderTop: "1px solid var(--color-border-secondary)" }}>
              <span>Total a pagar:</span>
              <strong>${(totalToPay / 100).toFixed(2)}</strong>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Método de pago
            </label>
            <select {...register("method")} className={selectCls}>
              {Object.entries(METHOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Referencia / folio <span style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <input {...register("reference")} placeholder="Ej. TRF-2024-001" className={inputCls} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Fecha de pago
            </label>
            <input type="date" {...register("paidAt")} className={dateCls} />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
              background: "transparent", fontSize: 13, cursor: "pointer",
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={markPaid.isLoading} style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: "#00754A", color: "#fff", fontSize: 13, fontWeight: 500,
              cursor: markPaid.isLoading ? "not-allowed" : "pointer",
            }}>
              {markPaid.isLoading ? "Guardando..." : "Confirmar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
