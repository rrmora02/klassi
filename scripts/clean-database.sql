-- Script para limpiar la base de datos y dejarla lista para pruebas
-- Ejecutar en Supabase SQL Editor
-- ADVERTENCIA: Esto elimina TODOS los datos. No hay vuelta atrás.

-- Desactivar verificación de foreign keys temporalmente
SET session_replication_role = replica;

-- Eliminar todos los datos en orden correcto (respetando relaciones)
TRUNCATE TABLE "Attendance" CASCADE;
TRUNCATE TABLE "ParentStudent" CASCADE;
TRUNCATE TABLE "Enrollment" CASCADE;
TRUNCATE TABLE "ClassSession" CASCADE;
TRUNCATE TABLE "EventPayment" CASCADE;
TRUNCATE TABLE "Payment" CASCADE;
TRUNCATE TABLE "Event" CASCADE;
TRUNCATE TABLE "Group" CASCADE;
TRUNCATE TABLE "Instructor" CASCADE;
TRUNCATE TABLE "Student" CASCADE;
TRUNCATE TABLE "Discipline" CASCADE;
TRUNCATE TABLE "TeamInvitation" CASCADE;
TRUNCATE TABLE "TenantUser" CASCADE;
TRUNCATE TABLE "Announcement" CASCADE;
TRUNCATE TABLE "Subscription" CASCADE;
TRUNCATE TABLE "User" CASCADE;
TRUNCATE TABLE "Tenant" CASCADE;

-- Reactivar verificación de foreign keys
SET session_replication_role = DEFAULT;

-- Confirmar estado
SELECT 'Base de datos limpiada exitosamente' AS mensaje;
SELECT
  tablename,
  (SELECT count(*) FROM pg_class c WHERE c.relname = tablename) as existe
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
