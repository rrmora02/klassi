"use client";

import { api } from "@/lib/trpc";
import { Users } from "lucide-react";

interface ClassAttendanceIndicatorProps {
  groupId: string;
}

export function ClassAttendanceIndicator({ groupId }: ClassAttendanceIndicatorProps) {
  const { data, isLoading } = api.groups.getTodayAttendance.useQuery(
    { groupId },
    {
      enabled: !!groupId,
    }
  );

  if (isLoading || !data) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-sb-light/60">
      <Users className="h-3 w-3" />
      <span>{data.totalStudents} alumnos</span>
    </div>
  );
}

