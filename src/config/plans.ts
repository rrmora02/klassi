export const PLANS = {
  STARTER: {
    name:           "Starter",
    maxStudents:    80,
    maxDisciplines: 2,
    maxGroups:      10,
    maxUsers:       3,
    parentPortal:   false,
    multiSede:      false,
    priceId:        process.env.STRIPE_STARTER_PRICE_ID!,
    price:          29,
  },
  PRO: {
    name:           "Pro",
    maxStudents:    300,
    maxDisciplines: Infinity,
    maxGroups:      50,
    maxUsers:       10,
    parentPortal:   true,
    multiSede:      false,
    priceId:        process.env.STRIPE_PRO_PRICE_ID!,
    price:          79,
  },
  ENTERPRISE: {
    name:           "Enterprise",
    maxStudents:    Infinity,
    maxDisciplines: Infinity,
    maxGroups:      Infinity,
    maxUsers:       Infinity,
    parentPortal:   true,
    multiSede:      true,
    priceId:        process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    price:          199,
  },
} as const;

export type Plan = keyof typeof PLANS;

export const APP_CONFIG = {
  name:       "Klassi",
  url:        process.env.NEXT_PUBLIC_APP_URL ?? "https://klassi.io",
  supportEmail: "soporte@klassi.io",
  trialDays:  14,
} as const;
