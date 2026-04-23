-- ============================================================================
-- Script para borrar completamente un usuario de rrmora02@icloud.com
-- y todos sus datos asociados
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

BEGIN;

-- 1. Obtener el ID del usuario
WITH user_to_delete AS (
  SELECT id FROM "User" WHERE email = 'rrmora02@icloud.com'
)

-- 2. Borrar invitaciones enviadas por este usuario
DELETE FROM "TeamInvitation"
WHERE "invitedBy" IN (SELECT id FROM user_to_delete);

-- 3. Borrar registros de asistencia
DELETE FROM "Attendance"
WHERE "userId" IN (SELECT id FROM user_to_delete);

-- 4. Borrar relaciones padre-estudiante
DELETE FROM "ParentStudent"
WHERE "parentId" IN (SELECT id FROM user_to_delete);

-- 5. Borrar registros de instructor
DELETE FROM "Instructor"
WHERE "userId" IN (SELECT id FROM user_to_delete);

-- 6. Borrar membresías de tenant (TenantUser)
DELETE FROM "TenantUser"
WHERE "userId" IN (SELECT id FROM user_to_delete);

-- 7. Borrar el usuario
DELETE FROM "User"
WHERE email = 'rrmora02@icloud.com';

COMMIT;

-- Verificar que el usuario fue eliminado
SELECT COUNT(*) as usuarios_con_ese_email FROM "User" WHERE email = 'rrmora02@icloud.com';
