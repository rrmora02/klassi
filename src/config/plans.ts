// En modo test (PLAN_TEST_MODE=true en .env.local) se usan límites bajos
// para poder probar las validaciones sin crear cientos de registros.
const TEST = process.env.PLAN_TEST_MODE === "true";

export const PLANS = {
  STARTER: {
    name:           "Starter",
    maxStudents:    TEST ? 3  : 100,
    maxGroups:      TEST ? 1  : 5,
    maxInstructors: TEST ? 1  : 5,
    maxDisciplines: Infinity,
    maxUsers:       Infinity,
    schools:        1,
    priceId:        process.env.STRIPE_PRICE_STARTER!,
    priceMXN:       199,
  },
  PRO: {
    name:           "PRO",
    maxStudents:    TEST ? 6  : 200,
    maxGroups:      TEST ? 2  : 10,
    maxInstructors: TEST ? 2  : 10,
    maxDisciplines: Infinity,
    maxUsers:       Infinity,
    schools:        1,
    priceId:        process.env.STRIPE_PRICE_PRO!,
    priceMXN:       349,
  },
  ENTERPRISE: {
    name:           "Enterprise",
    maxStudents:    TEST ? 6  : 200,  // por escuela
    maxGroups:      TEST ? 2  : 10,   // por escuela
    maxInstructors: TEST ? 2  : 10,   // por escuela
    maxDisciplines: Infinity,
    maxUsers:       Infinity,
    schools:        TEST ? 2  : 5,
    priceId:        process.env.STRIPE_PRICE_ENTERPRISE!,
    priceMXN:       699,
  },
} as const;

export type Plan = keyof typeof PLANS;

export const APP_CONFIG = {
  name:         "Klassi",
  url:          process.env.NEXT_PUBLIC_APP_URL ?? "https://klassi.io",
  supportEmail: "soporte@klassi.io",
  trialDays:    TEST ? 0 : 30,
} as const;
