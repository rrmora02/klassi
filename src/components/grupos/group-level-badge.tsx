import { GroupLevel } from "@prisma/client";

const config: Record<GroupLevel, { label: string; bg: string; color: string }> = {
  BEGINNER:     { label: "Principiante", bg: "#f8fafc", color: "#475569" },
  INTERMEDIATE: { label: "Intermedio",   bg: "#d4e9e2", color: "#006241" },
  ADVANCED:     { label: "Avanzado",     bg: "#d4e9e2", color: "#006241" },
  PROFESSIONAL: { label: "Profesional",  bg: "#fefce8", color: "#a16207" },
};

export function GroupLevelBadge({ level }: { level: GroupLevel }) {
  const { label, bg, color } = config[level];
  return (
    <span style={{
      background: bg, color, borderRadius: 20,
      padding: "2px 10px", fontSize: 11, fontWeight: 500, display: "inline-block",
    }}>
      {label}
    </span>
  );
}
