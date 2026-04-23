-- ============================================================================
-- Migration: add_performance_indexes
-- Adds missing indexes for query performance based on router usage analysis
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- User: email lookups from 4+ routers
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- TenantUser: tenantId-only queries (list members per tenant)
CREATE INDEX IF NOT EXISTS "TenantUser_tenantId_idx" ON "TenantUser"("tenantId");

-- TeamInvitation: filter pending invitations per tenant
CREATE INDEX IF NOT EXISTS "TeamInvitation_tenantId_status_idx" ON "TeamInvitation"("tenantId", "status");

-- Instructor: filter active instructors per tenant
CREATE INDEX IF NOT EXISTS "Instructor_tenantId_isActive_idx" ON "Instructor"("tenantId", "isActive");

-- Group: filter active groups per tenant
CREATE INDEX IF NOT EXISTS "Group_tenantId_isActive_idx" ON "Group"("tenantId", "isActive");

-- Student: filter by status and order by recent creation
CREATE INDEX IF NOT EXISTS "Student_tenantId_status_idx" ON "Student"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Student_tenantId_createdAt_idx" ON "Student"("tenantId", "createdAt");

-- Enrollment: filter by status (active enrollments per group / per student)
CREATE INDEX IF NOT EXISTS "Enrollment_groupId_status_idx" ON "Enrollment"("groupId", "status");
CREATE INDEX IF NOT EXISTS "Enrollment_studentId_status_idx" ON "Enrollment"("studentId", "status");

-- ClassSession: lookup session for a specific group on a specific date
CREATE INDEX IF NOT EXISTS "ClassSession_groupId_date_idx" ON "ClassSession"("groupId", "date");

-- Attendance: stats and report filtering by status
CREATE INDEX IF NOT EXISTS "Attendance_sessionId_status_idx" ON "Attendance"("sessionId", "status");
CREATE INDEX IF NOT EXISTS "Attendance_enrollmentId_status_idx" ON "Attendance"("enrollmentId", "status");

-- Payment: filter by student+status, and revenue reports by paidAt date range
CREATE INDEX IF NOT EXISTS "Payment_studentId_status_idx" ON "Payment"("studentId", "status");
CREATE INDEX IF NOT EXISTS "Payment_tenantId_paidAt_idx" ON "Payment"("tenantId", "paidAt");
