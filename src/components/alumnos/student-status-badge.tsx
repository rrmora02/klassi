import { StudentStatus } from "@prisma/client";

const config: Record<StudentStatus, { label: string; bg: string; color: string; border: string }> = {
  ACTIVE:    { label: "Activo",     bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
  INACTIVE:  { label: "Inactivo",   bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  SUSPENDED: { label: "Suspendido", bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" },
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { label, bg, color, border } = config[status];
  return (
    <span
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        letterSpacing: "0.01em",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
