import { PLANS } from "@/config/plans";
import type { SubscriptionPlan } from "@prisma/client";

export const PLAN_LIMITS: Record<SubscriptionPlan, {
  students:    number;
  groups:      number;
  instructors: number;
  schools:     number;
}> = {
  STARTER:    { students: PLANS.STARTER.maxStudents,    groups: PLANS.STARTER.maxGroups,    instructors: PLANS.STARTER.maxInstructors,    schools: PLANS.STARTER.schools    },
  PRO:        { students: PLANS.PRO.maxStudents,        groups: PLANS.PRO.maxGroups,        instructors: PLANS.PRO.maxInstructors,        schools: PLANS.PRO.schools        },
  ENTERPRISE: { students: PLANS.ENTERPRISE.maxStudents, groups: PLANS.ENTERPRISE.maxGroups, instructors: PLANS.ENTERPRISE.maxInstructors, schools: PLANS.ENTERPRISE.schools },
};

export const PLAN_PRICES: Record<SubscriptionPlan, { amount: number; currency: string; label: string }> = {
  STARTER:    { amount: PLANS.STARTER.priceMXN,    currency: "MXN", label: `$${PLANS.STARTER.priceMXN} MXN/mes`    },
  PRO:        { amount: PLANS.PRO.priceMXN,        currency: "MXN", label: `$${PLANS.PRO.priceMXN} MXN/mes`        },
  ENTERPRISE: { amount: PLANS.ENTERPRISE.priceMXN, currency: "MXN", label: `$${PLANS.ENTERPRISE.priceMXN} MXN/mes` },
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  STARTER:    PLANS.STARTER.name,
  PRO:        PLANS.PRO.name,
  ENTERPRISE: PLANS.ENTERPRISE.name,
};

export const STRIPE_PRICE_IDS: Record<SubscriptionPlan, string> = {
  STARTER:    process.env.STRIPE_PRICE_STARTER    ?? "",
  PRO:        process.env.STRIPE_PRICE_PRO        ?? "",
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE ?? "",
};

export function getLimits(plan: SubscriptionPlan) {
  return PLAN_LIMITS[plan];
}

export function isDowngrade(from: SubscriptionPlan, to: SubscriptionPlan): boolean {
  const order: SubscriptionPlan[] = ["STARTER", "PRO", "ENTERPRISE"];
  return order.indexOf(to) < order.indexOf(from);
}
