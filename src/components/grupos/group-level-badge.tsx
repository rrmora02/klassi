import { GroupLevel } from "@prisma/client";

const config: Record<GroupLevel, { label: string; className: string }> = {
  BEGINNER:     { label: "Principiante", className: "bg-slate-50     dark:bg-slate-800/40  text-slate-600  dark:text-slate-400  border border-slate-200  dark:border-slate-700" },
  INTERMEDIATE: { label: "Intermedio",   className: "bg-sb-light/40  dark:bg-sb-house      text-sb-green   dark:text-sb-light   border border-sb-light   dark:border-sb-uplift"  },
  ADVANCED:     { label: "Avanzado",     className: "bg-sb-light/60  dark:bg-sb-house      text-sb-green   dark:text-sb-light   border border-sb-light   dark:border-sb-uplift"  },
  PROFESSIONAL: { label: "Profesional",  className: "bg-amber-50     dark:bg-amber-900/20  text-amber-700  dark:text-amber-400  border border-amber-200  dark:border-amber-800"  },
};

export function GroupLevelBadge({ level }: { level: GroupLevel }) {
  const { label, className } = config[level];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
