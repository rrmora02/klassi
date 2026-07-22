"use client";

import { api } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReceiptUpload } from "@/components/portal/receipt-upload";
import { useToast } from "@/hooks/use-toast";
import { Check, X, CalendarCheck } from "lucide-react";

interface EventPayment {
  id:             string;
  amount:         number;
  discountAmount: number;
  status:         string;
  willAttend:     boolean | null;
  paidAt:         Date | string | null;
  dueDate:        Date | string;
  receiptUrl:     string | null;
  student: { firstName: string; lastName: string };
  event:   { name: string; description: string | null; tenant: { name: string } };
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:       { label: "Pendiente",   bg: "rgba(245,158,11,0.12)", color: "#b45309" },
  PAID:          { label: "Pagado",      bg: "rgba(16,185,129,0.12)", color: "#0f766e" },
  NOT_ATTENDING: { label: "No asistirá", bg: "rgba(0,0,0,0.06)",      color: "var(--color-text-tertiary)" },
};

export function EventPaymentCard({ eventPayment, onChange }: { eventPayment: EventPayment; onChange: () => void }) {
  const { toast } = useToast();
  const confirm = api.portal.confirmEventAttendance.useMutation({
    onSuccess: (r) => {
      toast({
        title:       r.willAttend ? "Asistencia confirmada" : "Registrado",
        description: r.willAttend
          ? "Ya puedes adjuntar tu comprobante de pago."
          : "Marcaste que tu alumno no asistirá. Puedes cambiarlo cuando quieras.",
      });
      onChange();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const ep    = eventPayment;
  const style = STATUS_STYLE[ep.status] ?? STATUS_STYLE.PENDING!;
  const total = ep.amount - ep.discountAmount;
  const unconfirmed = ep.willAttend === null && ep.status !== "PAID";
  const attending   = ep.willAttend === true || ep.status === "PAID";

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "13px 14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>{ep.event.name}</p>
          <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
            {ep.student.firstName} {ep.student.lastName} · {ep.event.tenant.name}
          </p>
          <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
            {ep.status === "PAID" && ep.paidAt ? `Pagado el ${formatDate(ep.paidAt)}` : `Vence ${formatDate(ep.dueDate)}`}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{formatCurrency(total)}</p>
          <span style={{ display: "inline-block", background: style.bg, color: style.color, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 600, marginTop: 4 }}>
            {style.label}
          </span>
        </div>
      </div>

      {ep.event.description && (
        <p style={{ fontSize: 11.5, color: "var(--color-text-secondary)", margin: "8px 0 0", lineHeight: 1.45 }}>{ep.event.description}</p>
      )}

      {/* Paso 1 — confirmar asistencia */}
      {unconfirmed && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 8px" }}>
            ¿{ep.student.firstName} asistirá a este evento?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => confirm.mutate({ eventPaymentId: ep.id, willAttend: true })}
              disabled={confirm.isLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#1D3557", color: "#fff", border: "none", borderRadius: 18, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <Check size={13} /> Sí, asistirá
            </button>
            <button
              onClick={() => confirm.mutate({ eventPaymentId: ep.id, willAttend: false })}
              disabled={confirm.isLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 18, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <X size={13} /> No asistirá
            </button>
          </div>
        </div>
      )}

      {/* Paso 2 — ya confirmó que asiste: adjuntar comprobante */}
      {attending && ep.status !== "PAID" && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#0f766e", margin: "0 0 8px" }}>
            <CalendarCheck size={13} /> Asistencia confirmada
          </p>
          <ReceiptUpload kind="event" id={ep.id} hasReceipt={!!ep.receiptUrl} onUploaded={onChange} />
        </div>
      )}

      {/* Declinó — permitir cambiar de opinión */}
      {ep.willAttend === false && ep.status !== "PAID" && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <button
            onClick={() => confirm.mutate({ eventPaymentId: ep.id, willAttend: true })}
            disabled={confirm.isLoading}
            className="portal-accent-text"
            style={{ background: "transparent", border: "none", padding: 0, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            ¿Cambió de opinión? Sí asistirá →
          </button>
        </div>
      )}
    </div>
  );
}
