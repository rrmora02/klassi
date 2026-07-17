-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BusinessEventType" AS ENUM ('PAYMENT_CREATED', 'PAYMENT_MARKED_AS_PAID', 'PAYMENT_CANCELLED', 'DISCOUNT_APPLIED', 'STUDENT_ENROLLED', 'STUDENT_UNENROLLED', 'STUDENT_CREATED', 'STUDENT_UPDATED', 'STUDENT_DELETED', 'ATTENDANCE_RECORDED', 'USER_INVITED', 'USER_ROLE_CHANGED', 'GROUP_CREATED', 'GROUP_UPDATED', 'EVENT_CREATED', 'EVENT_CANCELLED');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "errorType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "severity" "LogSeverity" NOT NULL DEFAULT 'MEDIUM',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "BusinessEventType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessEvent" ADD CONSTRAINT "BusinessEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessEvent" ADD CONSTRAINT "BusinessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_tenantId_idx" ON "ErrorLog"("tenantId");

-- CreateIndex
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");

-- CreateIndex
CREATE INDEX "ErrorLog_resolved_idx" ON "ErrorLog"("resolved");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "BusinessEvent_tenantId_idx" ON "BusinessEvent"("tenantId");

-- CreateIndex
CREATE INDEX "BusinessEvent_eventType_idx" ON "BusinessEvent"("eventType");

-- CreateIndex
CREATE INDEX "BusinessEvent_createdAt_idx" ON "BusinessEvent"("createdAt");

-- CreateIndex
CREATE INDEX "BusinessEvent_tenantId_createdAt_idx" ON "BusinessEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessEvent_entityType_entityId_idx" ON "BusinessEvent"("entityType", "entityId");
