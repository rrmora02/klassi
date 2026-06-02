-- Migration: add_pending_plan_fields
-- Agrega campos para manejar downgrades programados (plan B+C)

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "pendingPlan"   "SubscriptionPlan",
  ADD COLUMN IF NOT EXISTS "pendingPlanAt" TIMESTAMP(3);
