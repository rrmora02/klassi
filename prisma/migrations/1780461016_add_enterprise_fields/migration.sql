-- Migration: add_enterprise_fields
-- Agrega relación padre-hijo entre tenants y tracking de creador

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "parentTenantId"   TEXT,
  ADD COLUMN IF NOT EXISTS "createdByUserId"  TEXT;

-- Índice para listar escuelas hijas de un Enterprise
CREATE INDEX IF NOT EXISTS "idx_tenant_parent" ON "Tenant"("parentTenantId");

-- Índice para listar escuelas creadas por un usuario
CREATE INDEX IF NOT EXISTS "idx_tenant_created_by" ON "Tenant"("createdByUserId");
