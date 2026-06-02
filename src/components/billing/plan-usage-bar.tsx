"use client";

interface PlanUsageBarProps {
  label: string;
  used:  number;
  limit: number;
}

export function PlanUsageBar({ label, used, limit }: PlanUsageBarProps) {
  const pct  = Math.min((used / limit) * 100, 100);
  const over = pct >= 90;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className={over ? "text-red-500 font-medium" : "text-gray-700 dark:text-gray-300"}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-sb-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
