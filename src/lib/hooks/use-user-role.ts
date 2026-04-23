"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/trpc";

export function useUserRole() {
  const [role, setRole] = useState<"ADMIN" | "RECEPTIONIST" | "INSTRUCTOR" | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: members } = api.team.getMembers.useQuery();

  useEffect(() => {
    if (members) {
      // Esta es una simplificación - en producción querrías el rol del usuario actual
      // Por ahora, asumimos que el primer miembro es el usuario actual
      // Esto debería venir del contexto de autenticación
      setRole(null); // Se llena cuando tenemos mejor info
      setLoading(false);
    }
  }, [members]);

  return { role, loading };
}

// Hook para obtener el rol desde el servidor
export async function getUserRole(userId: string, tenantId: string) {
  // Esto se llamaría en el servidor
  // Retorna el rol del usuario en el tenant
  return "ADMIN"; // placeholder
}
