"use client";

import { api } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReceiptUpload } from "@/components/portal/receipt-upload";
import { useToast } from "@/hooks/use-toast";
import { ActionButton, Card, PaymentStatus } from "@/components/shared";
import { Check, X, CalendarCheck, CalendarX } from "lucide-react";

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

interface Props {
  eventPayment: EventPayment;
  onChange:     () => void;
  /** Nombra la escuela solo si la familia tiene alumnos en más de una */
  showSchool?:  boolean;
}

// Tarjeta de evento del portal. Dos pasos: 1) confirmar si el alumno asiste;
// 2) si asiste, adjuntar el comprobante. Estado visible en cada paso.
export function EventPaymentCard({ eventPayment, onChange, showSchool }: Props) {
  const { toast } = useToast();
  const confirm = api.portal.confirmEventAttendance.useMutation({
    onSuccess: (r) => {
      toast({
        title:       r.willAttend ? "Asistencia confirmada" : "Registrado: no asistirá",
        description: r.willAttend
          ? "Ahora puedes adjuntar tu comprobante de pago."
          : "Si cambias de opinión, puedes volver a confirmar desde esta tarjeta.",
      });
      onChange();
    },
    onError: () =>
      toast({
        title:       "No se pudo guardar tu respuesta",
        description: "Revisa tu conexión e intenta de nuevo.",
        variant:     "destructive",
      }),
  });

  const ep          = eventPayment;
  const total       = ep.amount - ep.discountAmount;
  const paid        = ep.status === "PAID";
  const unconfirmed = ep.willAttend === null && !paid;
  const attending   = (ep.willAttend === true || paid);
  const declined    = ep.willAttend === false && !paid;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">{ep.event.name}</h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {ep.student.firstName} {ep.student.lastName}
            {showSchool && <span className="block">{ep.event.tenant.name}</span>}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {paid && ep.paidAt ? `Pagado el ${formatDate(ep.paidAt)}` : `Vence ${formatDate(ep.dueDate)}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="m-0 text-base font-bold tabular-nums text-[var(--color-text-primary)]">{formatCurrency(total)}</p>
          <PaymentStatus status={ep.status} />
        </div>
      </div>

      {ep.event.description && (
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{ep.event.description}</p>
      )}

      {/* Paso 1 — responder si asistirá: lo más prominente de la tarjeta */}
      {unconfirmed && (
        <div className="mt-3 rounded-lg bg-[var(--brand-tint)] p-3">
          <p className="m-0 text-base font-semibold text-[var(--color-text-primary)]">
            ¿{ep.student.firstName} asistirá a este evento?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ActionButton
              variant="primary"
              onClick={() => confirm.mutate({ eventPaymentId: ep.id, willAttend: true })}
              loading={confirm.isLoading && confirm.variables?.willAttend === true}
              disabled={confirm.isLoading}
            >
              <Check className="h-4 w-4" aria-hidden="true" /> Sí asistirá
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => confirm.mutate({ eventPaymentId: ep.id, willAttend: false })}
              loading={confirm.isLoading && confirm.variables?.willAttend === false}
              disabled={confirm.isLoading}
            >
              <X className="h-4 w-4" aria-hidden="true" /> No asistirá
            </ActionButton>
          </div>
        </div>
      )}

      {/* Paso 2 — asistencia confirmada: adjuntar comprobante */}
      {attending && !paid && (
        <div className="mt-3 border-t border-[var(--color-border-tertiary)] pt-3">
          <p className="m-0 flex items-center gap-1.5 text-sm font-semibold text-[var(--success-fg)]">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Asistencia confirmada
          </p>
          <p className="mb-3 mt-1 text-sm text-[var(--color-text-secondary)]">
            Para terminar, adjunta tu comprobante de pago.
          </p>
          <ReceiptUpload kind="event" id={ep.id} hasReceipt={!!ep.receiptUrl} onUploaded={onChange} />
        </div>
      )}

      {/* Declinó: se puede cambiar de opinión con un toque */}
      {declined && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-tertiary)] pt-3">
          <p className="m-0 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
            <CalendarX className="h-4 w-4" aria-hidden="true" /> Marcaste que no asistirá
          </p>
          <ActionButton
            variant="ghost"
            onClick={() => confirm.mutate({ eventPaymentId: ep.id, willAttend: true })}
            loading={confirm.isLoading}
          >
            Cambiar a: sí asistirá
          </ActionButton>
        </div>
      )}
    </Card>
  );
}
