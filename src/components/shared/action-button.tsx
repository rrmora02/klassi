import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Botón de acción único (spec 001: RF-002, RF-003, RF-008).
// Área táctil mínima desde --tap-min (44 px en el portal y en pantallas
// táctiles), estado "presionado" y respeto a prefers-reduced-motion.

export type ActionVariant = "primary" | "secondary" | "danger" | "ghost";
export type ActionSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-transform duration-150 " +
  "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-text)]";

const VARIANT: Record<ActionVariant, string> = {
  primary:   "border border-transparent bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90",
  secondary: "border border-[var(--color-border-secondary)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)]",
  danger:    "border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)] hover:opacity-90",
  ghost:     "border border-transparent bg-transparent text-[var(--brand-text)] hover:bg-[var(--brand-tint)]",
};

// md: siempre --tap-min. sm: 36 px con puntero fino y --tap-min en pantallas táctiles.
const SIZE: Record<ActionSize, string> = {
  md: "min-h-[var(--tap-min)] min-w-[var(--tap-min)] px-5 text-sm",
  sm: "min-h-9 min-w-9 px-3.5 text-xs [@media(pointer:coarse)]:min-h-[var(--tap-min)] [@media(pointer:coarse)]:min-w-[var(--tap-min)]",
};

export function actionClasses(variant: ActionVariant = "primary", size: ActionSize = "md", className?: string) {
  return cn(BASE, VARIANT[variant], SIZE[size], className);
}

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  size?:    ActionSize;
  /** Muestra progreso y bloquea el botón mientras la acción se ejecuta */
  loading?: boolean;
}

export function ActionButton({ variant, size, loading, disabled, className, children, type = "button", ...rest }: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={actionClasses(variant, size, className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

interface ActionLinkProps extends React.ComponentProps<typeof Link> {
  variant?: ActionVariant;
  size?:    ActionSize;
}

/** Enlace con la apariencia y el área táctil de ActionButton. */
export function ActionLink({ variant, size, className, ...rest }: ActionLinkProps) {
  return <Link className={actionClasses(variant, size, className)} {...rest} />;
}
