-- ============================================================================
-- Migration: add_billing_fields_to_group
-- Agrega campos de cobro mensual automático al modelo Group
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

ALTER TABLE "Group"
  ADD COLUMN IF NOT EXISTS "monthlyFee" INTEGER,
  ADD COLUMN IF NOT EXISTS "billingDay"  INTEGER;

-- Índice para que el cron encuentre rápido los grupos que cobran hoy
CREATE INDEX IF NOT EXISTS "Group_billingDay_isActive_idx" ON "Group"("billingDay", "isActive");

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Group'
  AND column_name IN ('monthlyFee', 'billingDay');
