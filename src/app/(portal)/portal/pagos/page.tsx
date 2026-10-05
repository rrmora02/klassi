"use client";

import { api } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, PartyPopper } from "lucide-react";
import { ReceiptUpload } from "@/components/portal/receipt-upload";
import { EventPaymentCard } from "@/components/portal/event-payment-card";
import { Card, EmptyState, PaymentStatus, Skeleton, SummaryCard } from "@/components/shared";

const UPLOADABLE = ["PENDING", "OVERDUE"];

// Lo vencido primero, luego lo pendiente, y al final lo ya resuelto.
const PRIORITY: Record<string, number> = { OVERDUE: 0, PENDING: 1, PAID: 2, CANCELLED: 3 };

const time = (d: Date | string | null) => (d ? new Date(d).getTime() : 0);

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

  const sorted = [...(payments ?? [])].sort((a, b) => {
    const byStatus = (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    const open = a.status === "OVERDUE" || a.status === "PENDING";
    return open ? time(a.dueDate) - time(b.dueDate) : time(b.dueDate) - time(a.dueDate);
  });

  // Resumen: mensualidades por pagar + eventos a los que ya confirmó asistencia
  const owedPayments = sorted.filter((p) => p.status === "OVERDUE" || p.status === "PENDING");
  const owedEvents   = (eventPayments ?? []).filter((e) => e.status === "PENDING" && e.willAttend === true);
  const overdueCount = owedPayments.filter((p) => p.status === "OVERDUE").length;
  const owedCount    = owedPayments.length + owedEvents.length;
  const owedTotal =
    owedPayments.reduce((sum, p) => sum + p.amount, 0) +
    owedEvents.reduce((sum, e) => sum + (e.amount - e.discountAmount), 0);
  const currency = owedPayments[0]?.currency ?? "MXN";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="m-0 text-xl font-semibold text-[var(--color-text-primary)]">Pagos</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          Mensualidades y cargos de tus alumnos. Si ya pagaste por transferencia, adjunta tu comprobante.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando pagos">
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : sorted.length === 0 && !hasEvents ? (
        <EmptyState
          icon={<CreditCard size={28} />}
          title="Sin pagos registrados"
          message="Cuando tu escuela genere un cargo, lo verás aquí."
        />
      ) : (
        <>
          {/* Resumen: cuánto debo y qué está vencido */}
          <div className="grid grid-cols-2 gap-2">
            <SummaryCard
              label="Por pagar"
              value={formatCurrency(owedTotal, currency)}
              hint={owedCount > 0 ? `${owedCount} ${owedCount === 1 ? "pago pendiente" : "pagos pendientes"}` : "Sin pagos pendientes"}
              tone={overdueCount > 0 ? "danger" : owedCount > 0 ? "warning" : "success"}
            />
            <SummaryCard
              label="Vencidos"
              value={overdueCount}
              hint={overdueCount > 0 ? "Atiéndelos primero" : "Estás al corriente"}
              tone={overdueCount > 0 ? "danger" : "success"}
            />
          </div>

          {sorted.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {sorted.map((payment) => {
                const overdue = payment.status === "OVERDUE";
                return (
                  <Card as="li" key={payment.id} danger={overdue}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">{payment.concept}</p>
                        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                          {payment.student.firstName} {payment.student.lastName} · {payment.tenant.name}
                        </p>
                        <p className={`mt-0.5 text-xs ${overdue ? "font-semibold text-[var(--danger-fg)]" : "text-[var(--color-text-secondary)]"}`}>
                          {payment.status === "PAID" && payment.paidAt
                            ? `Pagado el ${formatDate(payment.paidAt)}`
                            : payment.dueDate
                              ? `${overdue ? "Venció" : "Vence"} ${formatDate(payment.dueDate)}`
                              : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <p className="m-0 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <PaymentStatus status={payment.status} />
                      </div>
                    </div>
                    {UPLOADABLE.includes(payment.status) && (
                      <div className="mt-3 border-t border-[var(--color-border-tertiary)] pt-3">
                        <ReceiptUpload kind="payment" id={payment.id} hasReceipt={!!payment.receiptUrl} onUploaded={refresh} />
                      </div>
                    )}
                  </Card>
                );
              })}
            </ul>
          )}

          {hasEvents && (
            <>
              <div className="mt-2 flex items-center gap-1.5">
                <PartyPopper size={16} className="text-[var(--brand-text)]" aria-hidden="true" />
                <h2 className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">Eventos</h2>
              </div>
              <div className="flex flex-col gap-2">
                {(eventPayments ?? []).map((eventPayment) => (
                  <EventPaymentCard key={eventPayment.id} eventPayment={eventPayment} onChange={refresh} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
