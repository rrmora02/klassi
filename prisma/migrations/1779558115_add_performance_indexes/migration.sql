-- Add performance indexes for critical queries

-- Student search optimization
CREATE INDEX IF NOT EXISTS "idx_student_first_name" ON "Student"(tenantId, firstName);
CREATE INDEX IF NOT EXISTS "idx_student_last_name" ON "Student"(tenantId, lastName);
CREATE INDEX IF NOT EXISTS "idx_student_email" ON "Student"(tenantId, email);
CREATE INDEX IF NOT EXISTS "idx_student_status" ON "Student"(tenantId, status);

-- Enrollment lookup optimization
CREATE INDEX IF NOT EXISTS "idx_enrollment_group_status" ON "Enrollment"(groupId, status);
CREATE INDEX IF NOT EXISTS "idx_enrollment_student_status" ON "Enrollment"(studentId, status);

-- ClassSession lookup optimization
CREATE INDEX IF NOT EXISTS "idx_class_session_group_date" ON "ClassSession"(groupId, date);

-- Group filtering optimization
CREATE INDEX IF NOT EXISTS "idx_group_tenant_active" ON "Group"(tenantId, isActive);
CREATE INDEX IF NOT EXISTS "idx_group_instructor_tenant" ON "Group"(instructorId, tenantId);

-- Attendance lookup optimization
CREATE INDEX IF NOT EXISTS "idx_attendance_session_student" ON "Attendance"(sessionId, enrollmentId);

-- TenantUser lookup optimization
CREATE INDEX IF NOT EXISTS "idx_tenant_user_tenant_user" ON "TenantUser"(tenantId, userId);
