import { StudentStatus } from "@prisma/client";

const config: Record<StudentStatus, { label: string; bg: string; color: string }> = {
  ACTIVE:    { label: "Activo",     bg: "#f0fdf4", color: "#15803d" },
  INACTIVE:  { label: "Inactivo",   bg: "#f8fafc", color: "#475569" },
  SUSPENDED: { label: "Suspendido", bg: "#fff7ed", color: "#c2410c" },
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { label, bg, color } = config[status];
  return (
    <span style={{ background: bg, color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500, display: "inline-block" }}>
      {label}
    </span>
  );
}
