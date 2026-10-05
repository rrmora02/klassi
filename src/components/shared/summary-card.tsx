import { cn } from "@/lib/utils";
import { Card } from "./card";

// Tarjeta de cifra destacada (spec 001: H6.2, RF-005). Sustituirá a StatCard al
// migrar el dashboard; el tono usa los colores semánticos AA.
type SummaryTone = "default" | "success" | "warning" | "danger";

const VALUE_TONE: Record<SummaryTone, string> = {
  default: "text-[var(--color-text-primary)]",
  success: "text-[var(--success-fg)]",
  warning: "text-[var(--warning-fg)]",
  danger:  "text-[var(--danger-fg)]",
};

interface SummaryCardProps {
  label:      string;
  value:      React.ReactNode;
  hint?:      React.ReactNode;
  tone?:      SummaryTone;
  className?: string;
}

export function SummaryCard({ label, value, hint, tone = "default", className }: SummaryCardProps) {
  return (
    <Card className={cn("flex flex-col gap-1", className)}>
      <p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
      <p className={cn("break-words text-2xl font-semibold tabular-nums leading-tight", VALUE_TONE[tone])}>{value}</p>
      {hint && <p className="text-xs text-[var(--color-text-secondary)]">{hint}</p>}
    </Card>
  );
}
