import { cn } from "@/lib/utils";

// ─── Stat Card ────────────────────────────────────────────────────

interface StatCardProps {
  label:   string;
  value:   string | number;
  hint?:   string;
  alert?:  boolean;
  className?: string;
}

export function StatCard({ label, value, hint, alert, className }: StatCardProps) {
  return (
    <div
      className={cn("rounded-xl p-5 transition-all", className)}
      style={{
        background: alert ? "#fff5f5" : "#ffffff",
        border: `1px solid ${alert ? "#fecaca" : "var(--color-border-tertiary)"}`,
        boxShadow: alert
          ? "0 1px 3px rgba(239,68,68,0.08)"
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: alert ? "#dc2626" : "var(--color-text-tertiary)",
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          marginTop: 8,
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: alert ? "#b91c1c" : "var(--color-text-primary)",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {hint && (
        <p style={{ marginTop: 6, fontSize: 12, color: alert ? "#dc2626" : "var(--color-text-tertiary)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────

interface PageHeaderProps {
  title:    string;
  subtitle?: string;
  action?:  React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ marginTop: 4, fontSize: 13, color: "var(--color-text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  color?:   "blue" | "green" | "yellow" | "red" | "gray" | "purple";
}

const badgeStyles: Record<string, { background: string; color: string; border: string }> = {
  blue:   { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
  green:  { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" },
  yellow: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" },
  red:    { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
  gray:   { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" },
  purple: { background: "#f5f3ff", color: "#5b21b6", border: "1px solid #ddd6fe" },
};

export function Badge({ children, color = "gray" }: BadgeProps) {
  const style = badgeStyles[color];
  return (
    <span
      style={{
        ...style,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────

interface EmptyStateProps {
  title:   string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        border: "1.5px dashed var(--color-border-secondary)",
        background: "var(--color-background-secondary)",
        padding: "64px 32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--color-primary-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          fontSize: 22,
        }}
      >
        📋
      </div>
      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)", margin: 0 }}>
        {title}
      </p>
      <p style={{ marginTop: 4, fontSize: 13, color: "var(--color-text-tertiary)", maxWidth: 280 }}>
        {message}
      </p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 animate-spin rounded-full border-2 border-gray-200",
        className
      )}
      style={{ borderTopColor: "var(--color-primary)" }}
    />
  );
}
