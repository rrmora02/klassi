"use client";

import { api } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard } from "lucide-react";

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:   { label: "Pendiente", bg: "rgba(245,158,11,0.12)", color: "#b45309" },
  OVERDUE:   { label: "Vencido",   bg: "rgba(220,38,38,0.10)",  color: "#dc2626" },
  PAID:      { label: "Pagado",    bg: "rgba(16,185,129,0.12)", color: "#0f766e" },
  CANCELLED: { label: "Cancelado", bg: "rgba(0,0,0,0.06)",      color: "var(--color-text-tertiary)" },
};

export default function PagosPage() {
  const { data: payments, isLoading } = api.portal.myPayments.useQuery();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Pagos</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          Mensualidades y cargos de tus alumnos
        </p>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: "48px 0" }}>Cargando…</p>
      ) : !payments || payments.length === 0 ? (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "48px 20px", textAlign: "center" }}>
          <CreditCard size={28} style={{ color: "var(--color-text-tertiary)", marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", margin: 0 }}>Sin pagos registrados</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {payments.map((payment) => {
            const style = STATUS_STYLE[payment.status] ?? STATUS_STYLE.PENDING!;
            return (
              <div key={payment.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "13px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                      {payment.concept}
                    </p>
                    <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
                      {payment.student.firstName} {payment.student.lastName} · {payment.tenant.name}
                    </p>
                    <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
                      {payment.status === "PAID" && payment.paidAt
                        ? `Pagado el ${formatDate(payment.paidAt)}`
                        : payment.dueDate ? `Vence ${formatDate(payment.dueDate)}` : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    <span style={{ display: "inline-block", background: style.bg, color: style.color, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 600, marginTop: 4 }}>
                      {style.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
