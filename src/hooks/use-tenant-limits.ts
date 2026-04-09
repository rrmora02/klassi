"use client";

import { api } from "@/lib/trpc";
import { PLANS } from "@/config/plans";

/**
 * Hook que expone los límites del plan actual del tenant.
 * Úsalo en componentes cliente para mostrar alertas de límite.
 */
export function useTenantLimits() {
  // Este hook llama al endpoint que devuelve los límites del tenant actual.
  // Se agrega el router cuando se implemente tenantRouter.limits.
  // Por ahora retorna un placeholder tipado.
  return {
    students:    { used: 0, limit: 80 },
    disciplines: { used: 0, limit: 2 },
    users:       { used: 0, limit: 3 },
    parentPortal: false,
    multiSede:   false,
    isLoading:   false,
  };
}

/**
 * Retorna true si el plan actual incluye acceso a una funcionalidad.
 */
export function usePlanFeature(feature: "parentPortal" | "multiSede") {
  // Se conecta a tenantRouter cuando esté disponible
  return false;
}
