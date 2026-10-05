import { cn } from "@/lib/utils";

// Placeholder de carga (spec 001: RF-003). Usado por los loading.tsx para que
// todas las cargas se vean igual.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-[var(--color-background-secondary)] motion-reduce:animate-none", className)}
    />
  );
}
