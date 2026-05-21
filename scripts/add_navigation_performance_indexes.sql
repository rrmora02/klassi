-- ============================================================================
-- Navigation/page-load performance indexes
-- Run in Supabase SQL Editor, or convert to a Prisma migration before deploy.
-- ============================================================================

-- Sidebar destinations commonly order active catalog data by display fields.
CREATE INDEX IF NOT EXISTS "Discipline_tenantId_isActive_sortOrder_idx"
  ON "Discipline"("tenantId", "isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "Group_tenantId_isActive_name_idx"
  ON "Group"("tenantId", "isActive", "name");

-- Events report filters by tenant and month.
CREATE INDEX IF NOT EXISTS "Event_tenantId_date_idx"
  ON "Event"("tenantId", "date");

-- Event revenue aggregations filter paid event payments by status and paid date.
CREATE INDEX IF NOT EXISTS "EventPayment_status_paidAt_idx"
  ON "EventPayment"("status", "paidAt");
