import { Users } from "lucide-react";

interface ClassAttendanceIndicatorProps {
  count: number;
}

// El conteo llega como prop desde el server (incluido en la query de grupos
// del dashboard) — antes cada indicador disparaba su propia query tRPC.
export function ClassAttendanceIndicator({ count }: ClassAttendanceIndicatorProps) {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-sb-light/60">
      <Users className="h-3 w-3" />
      <span>{count} alumnos</span>
    </div>
  );
}
