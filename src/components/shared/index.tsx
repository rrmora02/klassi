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
      className={cn(
        "rounded-xl border p-5",
        alert ? "border-red-200 bg-red-50" : "border-gray-200 bg-white",
        className
      )}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold", alert ? "text-red-700" : "text-gray-900")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
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
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  color?:   "blue" | "green" | "yellow" | "red" | "gray";
}

const badgeColors = {
  blue:   "bg-blue-50 text-blue-800",
  green:  "bg-green-50 text-green-800",
  yellow: "bg-yellow-50 text-yellow-800",
  red:    "bg-red-50 text-red-800",
  gray:   "bg-gray-100 text-gray-700",
};

export function Badge({ children, color = "gray" }: BadgeProps) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badgeColors[color])}>
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
      <p className="font-medium text-gray-600">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
        className
      )}
    />
  );
}
