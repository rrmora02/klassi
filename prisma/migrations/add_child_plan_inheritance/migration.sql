-- AlterTable
ALTER TABLE "Tenant" 
ADD COLUMN "effectivePlanCache" "SubscriptionPlan",
ADD COLUMN "effectivePlanCacheAt" TIMESTAMP(3),
ADD COLUMN "blockChildWrites" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "blockChildWritesReason" TEXT;

-- Add indexes for efficient querying
CREATE INDEX "Tenant_blockChildWrites_idx" ON "Tenant"("blockChildWrites");
CREATE INDEX "Tenant_effectivePlanCacheAt_idx" ON "Tenant"("effectivePlanCacheAt");
