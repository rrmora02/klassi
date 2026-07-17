-- Fase 4 de auditoría (robustez)
-- Aplicar con: npx prisma db push  (o ejecutar este SQL directo en Supabase)

-- Una sesión de clase por grupo y fecha (evita sesiones duplicadas cuando
-- dos usuarios abren la asistencia a la vez).
-- NOTA: falla si ya existen sesiones duplicadas; en ese caso eliminar
-- duplicados antes (conservar la que tenga asistencias).
CREATE UNIQUE INDEX "ClassSession_groupId_date_key" ON "ClassSession"("groupId", "date");
DROP INDEX IF EXISTS "ClassSession_groupId_date_idx";
DROP INDEX IF EXISTS "ClassSession_groupId_date_id_createdAt_startTime_endTime_idx";

-- Grupo que originó cada cobro automático (dedupe del cron por
-- alumno+grupo+vencimiento en lugar del texto del concepto).
ALTER TABLE "Payment" ADD COLUMN "groupId" TEXT;
CREATE INDEX "Payment_studentId_groupId_dueDate_idx" ON "Payment"("studentId", "groupId", "dueDate");
