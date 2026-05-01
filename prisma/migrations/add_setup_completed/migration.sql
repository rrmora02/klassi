-- Add setupCompleted column to Tenant
ALTER TABLE "Tenant" ADD COLUMN "setupCompleted" BOOLEAN NOT NULL DEFAULT false;
