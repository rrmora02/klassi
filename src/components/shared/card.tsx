import { cn } from "@/lib/utils";

// Superficie base de tarjeta (spec 001: RF-003). Reemplaza los bloques repetidos
// "fondo + borde + radio" escritos en línea en cada pantalla.

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?:      "div" | "section" | "article" | "li";
  /** Franja de color de marca a la izquierda (p. ej. avisos no leídos) */
  accent?:  boolean;
  padding?: "none" | "md" | "lg";
}

const PADDING = { none: "", md: "p-4", lg: "p-5" } as const;

export function Card({ as: Tag = "div", accent, padding = "md", className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-[var(--color-border-tertiary)] bg-[var(--color-background-primary)]",
        accent && "border-l-[3px] border-l-[var(--brand)]",
        PADDING[padding],
        className,
      )}
      {...rest}
    />
  );
}
