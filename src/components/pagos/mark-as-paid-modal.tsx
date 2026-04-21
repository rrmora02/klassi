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
  reference: z.string().optional(),
  paidAt:    z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  paymentId:  string;
  concept:    string;
  amount:     string;
  onClose:    () => void;
}

const METHOD_LABELS: Record<string, string> = {
  CASH:     "Efectivo",
  TRANSFER: "Transferencia",
  CARD:     "Tarjeta",
  OXXO:     "OXXO",
  SPEI:     "SPEI",
};

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--color-border-secondary)", fontSize: 14,
  outline: "none", boxSizing: "border-box" as const,
};

export function MarkAsPaidModal({ paymentId, concept, amount, onClose }: Props) {
  const router  = useRouter();
  const markPaid = api.payments.markAsPaid.useMutation();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { method: "CASH", reference: "", paidAt: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = async (data: FormValues) => {
    await markPaid.mutateAsync({
      id:        paymentId,
      method:    data.method,
      reference: data.reference || undefined,
      paidAt:    data.paidAt ? new Date(data.paidAt) : new Date(),
    });
    router.refresh();
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{ background: "#fff", width: 420, borderRadius: 12, padding: 28, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 4px" }}>
          Registrar pago recibido
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
          {concept} — <strong>{amount}</strong>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Método de pago
            </label>
            <select {...register("method")} style={inputStyle}>
              {Object.entries(METHOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Referencia / folio <span style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <input {...register("reference")} placeholder="Ej. TRF-2024-001" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
              Fecha de pago
            </label>
            <input type="date" {...register("paidAt")} style={inputStyle} />
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
