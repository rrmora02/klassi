import type { PaymentStatus } from "@prisma/client";

const config: Record<PaymentStatus, { label: string; bg: string; color: string }> = {
  PAID:      { label: "Pagado",    bg: "#f0fdf4", color: "#15803d" },
  PENDING:   { label: "Pendiente", bg: "#fffbeb", color: "#b45309" },
  OVERDUE:   { label: "Vencido",   bg: "#fef2f2", color: "#b91c1c" },
  CANCELLED: { label: "Cancelado", bg: "#f9fafb", color: "#6b7280" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, bg, color } = config[status];
  return (
    <span style={{ background: bg, color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500 }}>
      {label}
    </span>
  );
}
