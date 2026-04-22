import { StudentStatus } from "@prisma/client";

const config: Record<StudentStatus, { label: string; className: string }> = {
  ACTIVE:    { label: "Activo",     className: "bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-400  border border-green-200  dark:border-green-800" },
  INACTIVE:  { label: "Inactivo",   className: "bg-slate-50  dark:bg-slate-800/40  text-slate-600  dark:text-slate-400  border border-slate-200  dark:border-slate-700" },
  SUSPENDED: { label: "Suspendido", className: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800" },
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
