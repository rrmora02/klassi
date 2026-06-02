export const PLANS = {
  STARTER: {
    name:           "Starter",
    maxStudents:    100,
    maxGroups:      5,
    maxInstructors: 5,
    maxDisciplines: Infinity,
    maxUsers:       Infinity,
    schools:        1,
    priceId:        process.env.STRIPE_PRICE_STARTER!,
    priceMXN:       199,
  },
  PRO: {
    name:           "PRO",
    maxStudents:    200,
    maxGroups:      10,
    maxInstructors: 10,
    maxDisciplines: Infinity,
    maxUsers:       Infinity,
    schools:        1,
    priceId:        process.env.STRIPE_PRICE_PRO!,
    priceMXN:       349,
  },
  ENTERPRISE: {
    name:           "Enterprise",
    maxStudents:    200,  // por escuela
    maxGroups:      10,   // por escuela
    maxInstructors: 10,   // por escuela
    maxDisciplines: Infinity,
    maxUsers:       Infinity,
    schools:        5,
    priceId:        process.env.STRIPE_PRICE_ENTERPRISE!,
    priceMXN:       699,
  },
} as const;

export type Plan = keyof typeof PLANS;

export const APP_CONFIG = {
  name:         "Klassi",
  url:          process.env.NEXT_PUBLIC_APP_URL ?? "https://klassi.io",
  supportEmail: "soporte@klassi.io",
  trialDays:    30,
} as const;
