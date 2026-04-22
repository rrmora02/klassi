import type { PaymentStatus } from "@prisma/client";

const config: Record<PaymentStatus, { label: string; className: string }> = {
  PAID:      { label: "Pagado",    className: "bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-400  border border-green-200  dark:border-green-800" },
  PENDING:   { label: "Pendiente", className: "bg-amber-50  dark:bg-amber-900/20  text-amber-700  dark:text-amber-400  border border-amber-200  dark:border-amber-800" },
  OVERDUE:   { label: "Vencido",   className: "bg-red-50    dark:bg-red-900/20    text-red-700    dark:text-red-400    border border-red-200    dark:border-red-900"   },
  CANCELLED: { label: "Cancelado", className: "bg-slate-50  dark:bg-slate-800/40  text-slate-600  dark:text-slate-400  border border-slate-200  dark:border-slate-700" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
