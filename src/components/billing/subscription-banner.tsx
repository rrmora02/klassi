"use client";

import Link from "next/link";

interface SubscriptionBannerProps {
  status:       string;
  trialEndsAt:  Date | null;
  pendingPlan:  string | null;
  pendingPlanAt: Date | null;
}

export function SubscriptionBanner({ status, trialEndsAt, pendingPlan, pendingPlanAt }: SubscriptionBannerProps) {
  if (status === "ACTIVE" && !pendingPlan) return null;

  if (status === "TRIAL" && trialEndsAt) {
    const daysLeft = Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000);
    if (daysLeft > 7) return null;
    return (
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Tu prueba gratuita termina en <strong>{daysLeft} día{daysLeft === 1 ? "" : "s"}</strong>.
        </p>
        <Link href="/dashboard/billing" className="text-sm font-medium text-amber-900 dark:text-amber-100 underline whitespace-nowrap">
          Elegir plan
        </Link>
      </div>
    );
  }

  if (status === "SUSPENDED") {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-red-800 dark:text-red-200">
          Tu suscripción está suspendida. Actualiza tu método de pago para recuperar el acceso completo.
        </p>
        <Link href="/dashboard/billing" className="text-sm font-medium text-red-900 dark:text-red-100 underline whitespace-nowrap">
          Ir a billing
        </Link>
      </div>
    );
  }

  if (pendingPlan && pendingPlanAt) {
    const date = pendingPlanAt.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
    return (
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Tu plan cambiará a <strong>{pendingPlan}</strong> el {date}.
        </p>
        <Link href="/dashboard/billing" className="text-sm font-medium text-blue-900 dark:text-blue-100 underline whitespace-nowrap">
          Ver detalles
        </Link>
      </div>
    );
  }

  return null;
}
