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
        alert ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950" : "border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift",
        className
      )}
    >
      <p className="text-sm text-gray-500 dark:text-sb-light/70">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold", alert ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-gray-100")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-400 dark:text-sb-light/50">{hint}</p>}
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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-sb-light/70">{subtitle}</p>}
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
  blue:   "bg-sb-light/30 dark:bg-sb-house text-sb-green dark:text-sb-light",
  green:  "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  yellow: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  red:    "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  gray:   "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400",
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-uplift py-16">
      <p className="font-medium text-gray-600 dark:text-sb-light/80">{title}</p>
      <p className="mt-1 text-sm text-gray-400 dark:text-sb-light/50">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 animate-spin rounded-full border-2 border-gray-200 dark:border-sb-uplift border-t-sb-accent",
        className
      )}
    />
  );
}
