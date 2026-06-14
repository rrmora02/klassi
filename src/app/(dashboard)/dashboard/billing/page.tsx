"use client";

import { api } from "@/lib/trpc";
import { PlanUsageBar } from "@/components/billing/plan-usage-bar";
import { PLAN_LABELS, PLAN_PRICES, PLAN_LIMITS } from "@/lib/plan-limits";
import type { SubscriptionPlan } from "@prisma/client";
import { AlertTriangle } from "lucide-react";

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  STARTER:    ["100 alumnos activos", "5 grupos", "5 instructores", "Todas las funciones incluidas"],
  PRO:        ["200 alumnos activos", "10 grupos", "10 instructores", "Todas las funciones incluidas"],
  ENTERPRISE: ["200 alumnos por escuela", "10 grupos por escuela", "Hasta 5 escuelas", "Todas las funciones incluidas"],
};

export default function BillingPage() {
  const { data: sub,   isLoading: loadingSub   } = api.billing.getSubscription.useQuery(undefined, { staleTime: 0 });
  const { data: usage, isLoading: loadingUsage } = api.billing.getPlanUsage.useQuery(undefined, { staleTime: 0 });
  const { data: plans, isLoading: loadingPlans } = api.billing.getPlans.useQuery();
  const { data: allTenants, isLoading: loadingTenants } = api.tenants.getAllTenants.useQuery();

  const checkoutMutation = api.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
  });
  const portalMutation = api.billing.getPortalUrl.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
  });

  if (loadingSub || loadingUsage || loadingPlans || loadingTenants) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sb-accent" />
      </div>
    );
  }

  const hasActiveSubscription = (sub?.status === "ACTIVE" || sub?.status === "SUSPENDED") && !!sub?.stripeCustomerId;
  
  // Contar child tenants bloqueados si hay downgrade programado
  const blockedChildTenants = allTenants?.filter(t => t.isBlocked && t.isChild) || [];
  const willAffectChildren = sub?.pendingPlan && sub.pendingPlan !== "ENTERPRISE" && blockedChildTenants.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Suscripción</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona tu plan y método de pago.</p>
      </div>

      {/* Tarjeta de estado actual */}
      {sub && (
        <div className="bg-white dark:bg-sb-house rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.10)] p-6 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Plan actual</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{sub.planLabel}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{sub.planPrice.label}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {sub.status === "TRIAL" && (
                <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium px-3 py-1 rounded-full">
                  Prueba gratuita
                </span>
              )}
              {sub.status === "ACTIVE" && (
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-3 py-1 rounded-full">
                  Activa
                </span>
              )}
              {sub.status === "SUSPENDED" && (
                <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium px-3 py-1 rounded-full">
                  Suspendida
                </span>
              )}
              {sub.status === "CANCELLED" && (
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium px-3 py-1 rounded-full">
                  Cancelada
                </span>
              )}

              {sub.currentPeriodEnd && sub.status === "ACTIVE" && (
                <p className="text-xs text-gray-400">
                  Renueva el {new Date(sub.currentPeriodEnd).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              {sub.trialEndsAt && sub.status === "TRIAL" && (
                <p className="text-xs text-gray-400">
                  Prueba termina el {new Date(sub.trialEndsAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {sub.pendingPlan && sub.pendingPlanAt && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
              Tu plan cambiará a <strong>{sub.pendingLabel}</strong> el{" "}
              {new Date(sub.pendingPlanAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}.
              {willAffectChildren && (
                <div className="mt-2 flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Esta acción deshabilitará {blockedChildTenants.length} escuela{blockedChildTenants.length > 1 ? "s" : ""} secundaria{blockedChildTenants.length > 1 ? "s" : ""}. No podrás agregar datos ahí hasta que actualices a Enterprise.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Uso actual */}
          {usage && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-[rgba(255,255,255,0.07)]">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Uso del plan</p>
              <PlanUsageBar label="Alumnos activos" used={usage.students.used}    limit={usage.students.limit}    />
              <PlanUsageBar label="Grupos"          used={usage.groups.used}      limit={usage.groups.limit}      />
              <PlanUsageBar label="Instructores"    used={usage.instructors.used} limit={usage.instructors.limit} />
            </div>
          )}

          {hasActiveSubscription && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.15)] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-60"
            >
              {portalMutation.isPending ? "Redirigiendo..." : "Gestionar suscripción (cancelar, cambiar tarjeta)"}
            </button>
          )}
        </div>
      )}

      {/* Planes disponibles */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Planes disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans?.map(({ plan, label, price, limits }) => {
            const isCurrent = sub?.plan === plan && !sub?.pendingPlan;
            const isPending = sub?.pendingPlan === plan;
            return (
              <div
                key={plan}
                className={`rounded-xl border p-5 space-y-4 ${
                  isCurrent
                    ? "border-sb-accent bg-sb-accent/5 dark:bg-sb-accent/10"
                    : "border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-house"
                }`}
              >
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{label}</p>
                  <p className="text-sb-accent font-semibold">{price.label}</p>
                </div>

                <ul className="space-y-1.5">
                  {PLAN_FEATURES[plan].map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <span className="block text-center text-sm text-sb-accent font-medium">Plan actual</span>
                ) : isPending ? (
                  <span className="block text-center text-sm text-blue-500 font-medium">Entrará en vigor pronto</span>
                ) : (
                  <button
                    onClick={() => {
                      if (hasActiveSubscription) {
                        portalMutation.mutate();
                      } else {
                        checkoutMutation.mutate({ plan: plan as "STARTER" | "PRO" | "ENTERPRISE" });
                      }
                    }}
                    disabled={checkoutMutation.isPending || portalMutation.isPending}
                    className="w-full py-2 rounded-lg bg-sb-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {checkoutMutation.isPending || portalMutation.isPending ? "..." : `Cambiar a ${label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
