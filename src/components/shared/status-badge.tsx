import { CheckCircle2, Clock, AlertCircle, MinusCircle, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Insignia de estado única para todo el producto (spec 001: RF-003, RF-004).
// Siempre lleva icono + texto: el estado nunca depende solo del color.
// Colores desde tokens semánticos (globals.css), AA en claro y oscuro.

export type Tone = "success" | "warning" | "danger" | "neutral" | "brand";

const TONE_CLASS: Record<Tone, string> = {
  success: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]",
  warning: "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]",
  danger:  "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]",
  neutral: "border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-[var(--neutral-fg)]",
  brand:   "border-transparent bg-[var(--brand-tint)] text-[var(--brand-text)]",
};

const TONE_ICON: Record<Tone, LucideIcon> = {
  success: CheckCircle2,
  warning: Clock,
  danger:  AlertCircle,
  neutral: MinusCircle,
  brand:   Info,
};

interface StatusBadgeProps {
  tone:      Tone;
  children:  React.ReactNode;
  icon?:     LucideIcon;
  className?: string;
}

export function StatusBadge({ tone, children, icon, className }: StatusBadgeProps) {
  const Icon = icon ?? TONE_ICON[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
        TONE_CLASS[tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

// Estados de pagos y eventos → tono y texto. Fuente única; los códigos son
// los de Prisma (PaymentStatus y EventPayment.status).
export const PAYMENT_STATUS: Record<string, { tone: Tone; label: string }> = {
  PAID:          { tone: "success", label: "Pagado" },
  PENDING:       { tone: "warning", label: "Pendiente" },
  OVERDUE:       { tone: "danger",  label: "Vencido" },
  CANCELLED:     { tone: "neutral", label: "Cancelado" },
  NOT_ATTENDING: { tone: "neutral", label: "No asistirá" },
};

export function PaymentStatus({ status, className }: { status: string; className?: string }) {
  const { tone, label } = PAYMENT_STATUS[status] ?? PAYMENT_STATUS.PENDING!;
  return <StatusBadge tone={tone} className={className}>{label}</StatusBadge>;
}
