-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "userId" TEXT;

-- AlterTable
ALTER TABLE "BusinessEvent" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "BusinessEvent_userId_idx" ON "BusinessEvent"("userId");
