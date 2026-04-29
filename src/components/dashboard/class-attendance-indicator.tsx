"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/trpc";
import { Users } from "lucide-react";

interface ClassAttendanceIndicatorProps {
  groupId: string;
}

export function ClassAttendanceIndicator({ groupId }: ClassAttendanceIndicatorProps) {
  const [showAttendance, setShowAttendance] = useState(false);
  const { data, isLoading } = api.groups.getTodayAttendance.useQuery(
    { groupId },
    {
      refetchInterval: 5000, // Actualizar cada 5 segundos
      enabled: !!groupId,
    }
  );

  useEffect(() => {
    if (!data?.startTime || !data?.endTime) {
      setShowAttendance(false);
      return;
    }

    // Verificar si estamos dentro del horario de la clase
    const now = new Date();
    const [startHour, startMin] = data.startTime.split(":").map(Number);
    const [endHour, endMin] = data.endTime.split(":").map(Number);

    const classStart = new Date();
    classStart.setHours(startHour, startMin, 0, 0);

    const classEnd = new Date();
    classEnd.setHours(endHour, endMin, 59, 999);

    // Mostrar asistencia si estamos dentro de 15 minutos antes de la clase o durante ella
    const fifteenMinBefore = new Date(classStart.getTime() - 15 * 60 * 1000);
    setShowAttendance(now >= fifteenMinBefore && now <= classEnd);
  }, [data?.startTime, data?.endTime]);

  if (isLoading || !data) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-sb-light/60">
      <Users className="h-3 w-3" />
      {showAttendance && data.presentStudents !== null ? (
        <span className="font-semibold text-gray-700 dark:text-sb-light/80">
          {data.presentStudents}/{data.totalStudents}
        </span>
      ) : (
        <span>{data.totalStudents} alumnos</span>
      )}
    </div>
  );
}
