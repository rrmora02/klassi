"use client";

import { useState } from "react";
import { MarkAsPaidModal } from "./mark-as-paid-modal";
import { NewPaymentModal } from "./new-payment-modal";
import { PaymentStatusBadge } from "./payment-status-badge";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import type { PaymentStatus, PaymentMethod } from "@prisma/client";

interface Payment {
  id:        string;
  concept:   string;
  amount:    number;
  currency:  string;
  method:    PaymentMethod;
  status:    PaymentStatus;
  dueDate:   Date | null;
  paidAt:    Date | null;
  reference: string | null;
  student: { firstName: string; lastName: string };
}

interface Student { id: string; firstName: string; lastName: string; }

interface Props {
  payments: Payment[];
  students: Student[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", OXXO: "OXXO", SPEI: "SPEI",
};

export function PaymentsClient({ payments, students }: Props) {
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [showNew, setShowNew]     = useState(false);

  const markingPayment = payments.find(p => p.id === markingId);

  return (
    <>
      <button
        onClick={() => setShowNew(true)}
        style={{ background: "#5b21b6", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer" }}
      >
        + Nuevo pago
      </button>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto", marginTop: 16 }}>
        <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Alumno", "Concepto", "Monto", "Método", "Vencimiento", "Estado", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>
                  No se encontraron pagos
                </td>
              </tr>
            )}
            {payments.map(p => (
              <tr key={p.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "11px 14px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {fullName(p.student.firstName, p.student.lastName)}
                </td>
                <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)", maxWidth: 200 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.concept}
                  </span>
                </td>
                <td style={{ padding: "11px 14px", fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                  {formatCurrency(p.amount, p.currency)}
                </td>
                <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)" }}>
                  {METHOD_LABELS[p.method] ?? p.method}
                </td>
                <td style={{ padding: "11px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                  {p.paidAt ? formatDate(p.paidAt) : (p.dueDate ? formatDate(p.dueDate) : "—")}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <PaymentStatusBadge status={p.status} />
                </td>
                <td style={{ padding: "11px 14px", textAlign: "right" }}>
                  {(p.status === "PENDING" || p.status === "OVERDUE") && (
                    <button
                      onClick={() => setMarkingId(p.id)}
                      style={{ fontSize: 12, color: "#5b21b6", background: "none", border: "none", cursor: "pointer", fontWeight: 500, display: "inline-flex", alignItems: "center", minHeight: 32 }}
                    >
                      Marcar pagado
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {markingPayment && (
        <MarkAsPaidModal
          paymentId={markingPayment.id}
          concept={markingPayment.concept}
          amount={formatCurrency(markingPayment.amount, markingPayment.currency)}
          onClose={() => setMarkingId(null)}
        />
      )}

      {showNew && (
        <NewPaymentModal
          students={students}
          onClose={() => setShowNew(false)}
        />
      )}
    </>
  );
}
