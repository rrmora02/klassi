import { GroupLevel } from "@prisma/client";

const config: Record<GroupLevel, { label: string; bg: string; color: string; border: string }> = {
  BEGINNER:     { label: "Principiante", bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  INTERMEDIATE: { label: "Intermedio",   bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  ADVANCED:     { label: "Avanzado",     bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe" },
  PROFESSIONAL: { label: "Profesional",  bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
};

export function GroupLevelBadge({ level }: { level: GroupLevel }) {
  const { label, bg, color, border } = config[level];
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
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </span>
  );
}
