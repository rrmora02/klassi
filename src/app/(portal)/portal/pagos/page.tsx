"use client";

import { api } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, PartyPopper } from "lucide-react";
import { ReceiptUpload } from "@/components/portal/receipt-upload";

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:   { label: "Pendiente", bg: "rgba(245,158,11,0.12)", color: "#b45309" },
  OVERDUE:   { label: "Vencido",   bg: "rgba(220,38,38,0.10)",  color: "#dc2626" },
  PAID:      { label: "Pagado",    bg: "rgba(16,185,129,0.12)", color: "#0f766e" },
  CANCELLED: { label: "Cancelado", bg: "rgba(0,0,0,0.06)",      color: "var(--color-text-tertiary)" },
};

const UPLOADABLE = ["PENDING", "OVERDUE"];

export default function PagosPage() {
  const utils = api.useContext();
  const { data: payments,      isLoading: loadingPayments } = api.portal.myPayments.useQuery();
  const { data: eventPayments, isLoading: loadingEvents }   = api.portal.myEventPayments.useQuery();

  const refresh = () => {
    utils.portal.myPayments.invalidate();
    utils.portal.myEventPayments.invalidate();
  };

  const isLoading = loadingPayments || loadingEvents;
  const hasEvents = (eventPayments?.length ?? 0) > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Pagos</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          Mensualidades y cargos de tus alumnos. Si ya pagaste por transferencia, adjunta tu comprobante.
        </p>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: "48px 0" }}>Cargando…</p>
      ) : (!payments || payments.length === 0) && !hasEvents ? (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "48px 20px", textAlign: "center" }}>
          <CreditCard size={28} style={{ color: "var(--color-text-tertiary)", marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", margin: 0 }}>Sin pagos registrados</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(payments ?? []).map((payment) => {
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
                  {UPLOADABLE.includes(payment.status) && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                      <ReceiptUpload kind="payment" id={payment.id} hasReceipt={!!payment.receiptUrl} onUploaded={refresh} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasEvents && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "8px 0 0" }}>
                <PartyPopper size={14} className="portal-accent-text" />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Eventos</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(eventPayments ?? []).map((eventPayment) => {
                  const style = STATUS_STYLE[eventPayment.status] ?? STATUS_STYLE.PENDING!;
                  const total = eventPayment.amount - eventPayment.discountAmount;
                  return (
                    <div key={eventPayment.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "13px 14px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                            {eventPayment.event.name}
                          </p>
                          <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
                            {eventPayment.student.firstName} {eventPayment.student.lastName} · {eventPayment.event.tenant.name}
                          </p>
                          <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
                            {eventPayment.status === "PAID" && eventPayment.paidAt
                              ? `Pagado el ${formatDate(eventPayment.paidAt)}`
                              : `Vence ${formatDate(eventPayment.dueDate)}`}
                          </p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                            {formatCurrency(total)}
                          </p>
                          <span style={{ display: "inline-block", background: style.bg, color: style.color, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 600, marginTop: 4 }}>
                            {style.label}
                          </span>
                        </div>
                      </div>
                      {eventPayment.status === "PENDING" && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                          <ReceiptUpload kind="event" id={eventPayment.id} hasReceipt={!!eventPayment.receiptUrl} onUploaded={refresh} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
